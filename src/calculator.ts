import { computeISKTax, computeLegacyIskTax, type LegacyIskTaxInput, type TaxProfile } from './tax'

export type ProjectionMode = 'deterministic' | 'monteCarlo'
export type TimingConvention = 'endOfMonth' | 'midMonth'

export interface YearlyBalance {
  age: number
  balance: number
  realBalance: number
  contributions: number
  withdrawals: number
  investmentReturn: number
  growth: number
  withdrawalRate: number // Annual withdrawal rate as a percentage
  taxPaid: number
  yearlyTax: number
}

export interface Period {
  startAge: number
  endAge: number
  monthlyContribution: number
  monthlySpending: number
  annualReturn?: number
}

export interface MonteCarloYear {
  age: number
  p10: number
  p50: number
  p90: number
  successProbability: number
}

export interface MonteCarloProjection {
  mode: 'monteCarlo'
  years: MonteCarloYear[]
  successProbability: number
  depletionAgeP50: number | null
  sampleSize: number
}

export interface DeterministicProjection {
  mode: 'deterministic'
  yearlyBalances: YearlyBalance[]
}

export type ProjectionResult = DeterministicProjection | MonteCarloProjection

export interface CalculationInputs {
  initialAmount: number
  periods: Period[]
  annualReturn: number
  endAge?: number // Optional, defaults to 100
  inflationRate?: number // Annual inflation rate as percentage, default 0
  contributionIndexationRate?: number
  projectionMode?: ProjectionMode
  annualVolatility?: number
  simulationCount?: number
  seed?: number
  timingConvention?: TimingConvention
  taxProfile?: TaxProfile
  iskTax?: LegacyIskTaxInput
}

// Legacy interface for backward compatibility
export interface LegacyCalculationInputs {
  initialAmount: number
  monthlyContribution: number
  monthlySpending: number
  annualReturn: number
  startAge: number
  retirementAge: number
  endAge?: number
}

interface SimulationInputs {
  sortedPeriods: Period[]
  startAge: number
  endAge: number
  initialAmount: number
  annualReturn: number
  inflationRate: number
  contributionIndexationRate: number
  timingConvention: TimingConvention
  taxProfile?: TaxProfile
  iskTax?: LegacyIskTaxInput
  monthlyReturnFromAnnual: (annualReturnPercent: number) => number
}

interface SimulationResult {
  yearlyBalances: YearlyBalance[]
  depletionAge: number | null
}

const DEFAULT_END_AGE = 100
const DEFAULT_SIMULATION_COUNT = 5000
const DEFAULT_TIMING_CONVENTION: TimingConvention = 'midMonth'

function annualToMonthlyEffectiveRate(annualRatePercent: number): number {
  const annualRate = annualRatePercent / 100
  if (annualRate <= -1) {
    throw new Error('Annual return must be greater than -100%')
  }
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

function validatePeriods(periods: Period[]): Period[] {
  if (periods.length === 0) {
    throw new Error('At least one period is required')
  }

  const sortedPeriods = [...periods].sort((a, b) => a.startAge - b.startAge)

  for (let i = 0; i < sortedPeriods.length; i++) {
    const period = sortedPeriods[i]

    if (period.startAge < 0 || period.endAge < 0) {
      throw new Error('Ages must be non-negative')
    }

    if (period.endAge <= period.startAge) {
      throw new Error('Each period must have endAge greater than startAge')
    }

    if (period.monthlyContribution < 0 || period.monthlySpending < 0) {
      throw new Error('Contributions and spending must be non-negative')
    }

    if (period.annualReturn !== undefined && period.annualReturn <= -100) {
      throw new Error('Period annual return must be greater than -100%')
    }

    if (i > 0 && period.startAge < sortedPeriods[i - 1].endAge) {
      throw new Error('Periods cannot overlap')
    }
  }

  return sortedPeriods
}

function getPeriodForAge(periods: Period[], age: number): Period | null {
  for (const period of periods) {
    if (age >= period.startAge && age < period.endAge) {
      return period
    }
  }
  return null
}

function runSinglePath(inputs: SimulationInputs): SimulationResult {
  const {
    sortedPeriods,
    startAge,
    endAge,
    initialAmount,
    annualReturn,
    inflationRate,
    contributionIndexationRate,
    timingConvention,
    taxProfile,
    iskTax,
    monthlyReturnFromAnnual
  } = inputs

  const totalYears = endAge - startAge
  const months = totalYears * 12
  const inflation = inflationRate / 100
  const contributionIndexation = contributionIndexationRate / 100

  const monthlyInflationFactor = Math.pow(1 + inflation, 1 / 12)
  const monthlyContributionIndexFactor = Math.pow(1 + contributionIndexation, 1 / 12)

  let balance = initialAmount
  let inflationMultiplier = 1
  let contributionMultiplier = 1

  let cumulativeContributions = initialAmount
  let cumulativeWithdrawals = 0
  let cumulativeInvestmentReturn = 0
  let cumulativeTaxPaid = 0
  let depletionAge: number | null = null

  const yearQuarterBalances: [number, number, number, number] = [balance, balance, balance, balance]
  let yearlyDeposits = 0

  const initialPeriod = getPeriodForAge(sortedPeriods, startAge)
  const initialAnnualSpending = initialPeriod ? initialPeriod.monthlySpending * 12 : 0
  const initialWithdrawalRate = balance > 0 ? (initialAnnualSpending / balance) * 100 : 0

  const yearlyBalances: YearlyBalance[] = [
    {
      age: startAge,
      balance,
      realBalance: balance,
      contributions: cumulativeContributions,
      withdrawals: cumulativeWithdrawals,
      investmentReturn: cumulativeInvestmentReturn,
      growth: cumulativeInvestmentReturn,
      withdrawalRate: initialWithdrawalRate,
      taxPaid: cumulativeTaxPaid,
      yearlyTax: 0
    }
  ]

  for (let month = 1; month <= months; month++) {
    const monthOfYear = ((month - 1) % 12) + 1
    const currentAge = startAge + (month - 1) / 12

    if (monthOfYear === 1) {
      yearQuarterBalances[0] = balance
      yearlyDeposits = 0
    } else if (monthOfYear === 4) {
      yearQuarterBalances[1] = balance
    } else if (monthOfYear === 7) {
      yearQuarterBalances[2] = balance
    } else if (monthOfYear === 10) {
      yearQuarterBalances[3] = balance
    }

    const activePeriod = getPeriodForAge(sortedPeriods, currentAge)
    const effectiveAnnualReturn = activePeriod?.annualReturn ?? annualReturn
    const monthlyRate = monthlyReturnFromAnnual(effectiveAnnualReturn)

    const monthlyContribution = (activePeriod?.monthlyContribution ?? 0) * contributionMultiplier
    const monthlySpending = (activePeriod?.monthlySpending ?? 0) * inflationMultiplier

    cumulativeContributions += monthlyContribution
    cumulativeWithdrawals += monthlySpending
    yearlyDeposits += monthlyContribution

    if (timingConvention === 'midMonth') {
      balance += monthlyContribution / 2
      balance -= monthlySpending / 2
    }

    const monthlyReturn = balance * monthlyRate
    cumulativeInvestmentReturn += monthlyReturn
    balance += monthlyReturn

    if (timingConvention === 'midMonth') {
      balance += monthlyContribution / 2
      balance -= monthlySpending / 2
    } else {
      balance += monthlyContribution
      balance -= monthlySpending
    }

    if (depletionAge === null && balance <= 0) {
      depletionAge = currentAge
    }

    inflationMultiplier *= monthlyInflationFactor
    contributionMultiplier *= monthlyContributionIndexFactor

    if (month % 12 === 0) {
      const age = startAge + month / 12
      const yearsElapsed = month / 12
      let yearlyTax = 0

      if (taxProfile?.country === 'SE' && taxProfile.accountType === 'ISK') {
        const taxResult = computeISKTax(taxProfile, {
          yearStartBalances: yearQuarterBalances,
          yearlyDeposits
        })
        yearlyTax = taxResult.annualTax
      } else if (iskTax?.enabled) {
        yearlyTax = computeLegacyIskTax(balance, iskTax)
      }

      if (yearlyTax > 0) {
        balance -= yearlyTax
        cumulativeTaxPaid += yearlyTax
        if (depletionAge === null && balance <= 0) {
          depletionAge = age
        }
      }

      const currentPeriod = getPeriodForAge(sortedPeriods, age)
      const annualSpending = currentPeriod ? currentPeriod.monthlySpending * 12 * inflationMultiplier : 0
      const withdrawalRate = balance > 0 ? (annualSpending / balance) * 100 : 0
      const realBalance = balance / Math.pow(1 + inflation, yearsElapsed)

      yearlyBalances.push({
        age,
        balance,
        realBalance,
        contributions: cumulativeContributions,
        withdrawals: cumulativeWithdrawals,
        investmentReturn: cumulativeInvestmentReturn,
        growth: cumulativeInvestmentReturn,
        withdrawalRate,
        taxPaid: cumulativeTaxPaid,
        yearlyTax
      })
    }
  }

  return {
    yearlyBalances,
    depletionAge
  }
}

function createSeededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createNormalRandom(uniformRandom: () => number): () => number {
  let spare: number | null = null

  return () => {
    if (spare !== null) {
      const value = spare
      spare = null
      return value
    }

    let u = 0
    let v = 0
    while (u === 0) {
      u = uniformRandom()
    }
    while (v === 0) {
      v = uniformRandom()
    }

    const mag = Math.sqrt(-2.0 * Math.log(u))
    const z0 = mag * Math.cos(2.0 * Math.PI * v)
    const z1 = mag * Math.sin(2.0 * Math.PI * v)

    spare = z1
    return z0
  }
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    return 0
  }

  const clamped = Math.min(1, Math.max(0, p))
  const index = (sortedValues.length - 1) * clamped
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) {
    return sortedValues[lower]
  }

  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

export function calculateGrowth({
  initialAmount,
  periods,
  annualReturn,
  endAge = DEFAULT_END_AGE,
  inflationRate = 0,
  contributionIndexationRate = 0,
  timingConvention = DEFAULT_TIMING_CONVENTION,
  taxProfile,
  iskTax
}: CalculationInputs): YearlyBalance[] {
  if (initialAmount < 0) {
    throw new Error('Initial amount must be non-negative')
  }

  if (endAge <= 0) {
    throw new Error('endAge must be positive')
  }

  if (annualReturn <= -100) {
    throw new Error('Annual return must be greater than -100%')
  }

  if (inflationRate <= -100) {
    throw new Error('Inflation rate must be greater than -100%')
  }

  if (contributionIndexationRate <= -100) {
    throw new Error('Contribution indexation rate must be greater than -100%')
  }

  const sortedPeriods = validatePeriods(periods)
  const startAge = sortedPeriods[0].startAge

  if (endAge <= startAge) {
    throw new Error('endAge must be greater than the first period startAge')
  }

  const deterministicMonthlyRate = (rate: number) => annualToMonthlyEffectiveRate(rate)

  return runSinglePath({
    sortedPeriods,
    startAge,
    endAge,
    initialAmount,
    annualReturn,
    inflationRate,
    contributionIndexationRate,
    timingConvention,
    taxProfile,
    iskTax,
    monthlyReturnFromAnnual: deterministicMonthlyRate
  }).yearlyBalances
}

export function calculateProjection(inputs: CalculationInputs): ProjectionResult {
  const {
    projectionMode = 'deterministic',
    annualVolatility = 15,
    simulationCount = DEFAULT_SIMULATION_COUNT,
    seed = 42,
    ...baseInputs
  } = inputs

  if (projectionMode === 'deterministic') {
    return {
      mode: 'deterministic',
      yearlyBalances: calculateGrowth(baseInputs)
    }
  }

  if (annualVolatility < 0) {
    throw new Error('Annual volatility must be non-negative')
  }

  if (!Number.isInteger(simulationCount) || simulationCount < 100 || simulationCount > 20000) {
    throw new Error('simulationCount must be an integer between 100 and 20000')
  }

  const sortedPeriods = validatePeriods(baseInputs.periods)
  const endAge = baseInputs.endAge ?? DEFAULT_END_AGE
  const startAge = sortedPeriods[0].startAge

  if (endAge <= startAge) {
    throw new Error('endAge must be greater than the first period startAge')
  }

  const yearCount = endAge - startAge + 1
  const balancesByYear = Array.from({ length: yearCount }, () => [] as number[])
  const aliveByYear = Array.from({ length: yearCount }, () => 0)
  const depletionAges: number[] = []

  for (let i = 0; i < simulationCount; i++) {
    const random = createSeededRandom(seed + i * 1013904223)
    const normal = createNormalRandom(random)

    const stochasticMonthlyRate = (expectedAnnualReturn: number): number => {
      const monthlyMean = annualToMonthlyEffectiveRate(expectedAnnualReturn)
      const sigma = (annualVolatility / 100) / Math.sqrt(12)

      if (sigma === 0) {
        return monthlyMean
      }

      const mu = Math.log(1 + monthlyMean) - 0.5 * sigma * sigma
      return Math.exp(mu + sigma * normal()) - 1
    }

    const simulation = runSinglePath({
      sortedPeriods,
      startAge,
      endAge,
      initialAmount: baseInputs.initialAmount,
      annualReturn: baseInputs.annualReturn,
      inflationRate: baseInputs.inflationRate ?? 0,
      contributionIndexationRate: baseInputs.contributionIndexationRate ?? 0,
      timingConvention: baseInputs.timingConvention ?? DEFAULT_TIMING_CONVENTION,
      taxProfile: baseInputs.taxProfile,
      iskTax: baseInputs.iskTax,
      monthlyReturnFromAnnual: stochasticMonthlyRate
    })

    const defaultDepletionAge = endAge + 1
    depletionAges.push(simulation.depletionAge ?? defaultDepletionAge)

    for (let yearIndex = 0; yearIndex < simulation.yearlyBalances.length; yearIndex++) {
      const year = simulation.yearlyBalances[yearIndex]
      balancesByYear[yearIndex].push(year.balance)
      if (year.balance > 0) {
        aliveByYear[yearIndex] += 1
      }
    }
  }

  const years: MonteCarloYear[] = balancesByYear.map((balances, index) => {
    const sorted = [...balances].sort((a, b) => a - b)
    return {
      age: startAge + index,
      p10: percentile(sorted, 0.1),
      p50: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
      successProbability: (aliveByYear[index] / simulationCount) * 100
    }
  })

  const sortedDepletionAges = depletionAges.sort((a, b) => a - b)
  const depletionMedian = percentile(sortedDepletionAges, 0.5)

  return {
    mode: 'monteCarlo',
    years,
    successProbability: years[years.length - 1]?.successProbability ?? 0,
    depletionAgeP50: depletionMedian > endAge ? null : depletionMedian,
    sampleSize: simulationCount
  }
}

export function calculateGrowthLegacy({
  initialAmount,
  monthlyContribution,
  monthlySpending,
  annualReturn,
  startAge,
  retirementAge,
  endAge = DEFAULT_END_AGE
}: LegacyCalculationInputs): YearlyBalance[] {
  const periods: Period[] = []

  if (retirementAge > startAge) {
    periods.push({
      startAge,
      endAge: Math.min(retirementAge, endAge),
      monthlyContribution,
      monthlySpending: 0
    })
  }

  if (endAge > retirementAge) {
    periods.push({
      startAge: Math.max(startAge, retirementAge),
      endAge,
      monthlyContribution: 0,
      monthlySpending
    })
  }

  if (periods.length === 0) {
    periods.push({
      startAge,
      endAge,
      monthlyContribution,
      monthlySpending: 0
    })
  }

  return calculateGrowth({
    initialAmount,
    periods,
    annualReturn,
    endAge
  })
}

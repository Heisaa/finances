export interface YearlyBalance {
  age: number
  balance: number
  realBalance: number
  contributions: number
  growth: number
  withdrawalRate: number // Annual withdrawal rate as a percentage
  taxPaid: number
}

export interface Period {
  startAge: number
  endAge: number
  monthlyContribution: number
  monthlySpending: number
  annualReturn?: number
}

export interface CalculationInputs {
  initialAmount: number
  periods: Period[]
  annualReturn: number
  endAge?: number // Optional, defaults to 100
  inflationRate?: number // Annual inflation rate as percentage, default 0
  iskTax?: { enabled: boolean; governmentBorrowingRate: number }
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

export function calculateGrowth({
  initialAmount,
  periods,
  annualReturn,
  endAge = 100,
  inflationRate = 0,
  iskTax
}: CalculationInputs): YearlyBalance[] {
  // Sort periods by startAge and validate
  const sortedPeriods = [...periods].sort((a, b) => a.startAge - b.startAge)

  if (sortedPeriods.length === 0) {
    throw new Error('At least one period is required')
  }

  const startAge = sortedPeriods[0].startAge
  const totalYears = endAge - startAge
  const months = totalYears * 12
  const inflation = inflationRate / 100
  const monthlyInflationFactor = Math.pow(1 + inflation, 1 / 12)

  let balance = initialAmount
  let inflationMultiplier = 1.0
  let cumulativeTaxPaid = 0
  const yearlyBalances: YearlyBalance[] = []
  let totalContributions = initialAmount

  // Helper function to get the active period for a given age
  const getPeriodForAge = (age: number): Period | null => {
    for (const period of sortedPeriods) {
      if (age >= period.startAge && age < period.endAge) {
        return period
      }
    }
    return null
  }

  // Add initial balance at start age
  const initialPeriod = getPeriodForAge(startAge)
  const initialAnnualSpending = initialPeriod ? initialPeriod.monthlySpending * 12 : 0
  const initialWithdrawalRate = balance > 0 ? (initialAnnualSpending / balance) * 100 : 0

  yearlyBalances.push({
    age: startAge,
    balance,
    realBalance: balance,
    contributions: totalContributions,
    growth: 0,
    withdrawalRate: initialWithdrawalRate,
    taxPaid: 0
  })

  for (let month = 1; month <= months; month++) {
    const currentAge = startAge + (month - 1) / 12

    // Find the active period and apply contribution/spending
    const activePeriod = getPeriodForAge(currentAge)

    // Apply growth using period-specific or global return rate
    const effectiveReturn = activePeriod?.annualReturn ?? annualReturn
    const monthlyRate = effectiveReturn / 100 / 12
    balance = balance * (1 + monthlyRate)

    // Advance inflation multiplier
    inflationMultiplier *= monthlyInflationFactor

    if (activePeriod) {
      balance += activePeriod.monthlyContribution
      // Inflate spending: prices go up with inflation
      balance -= activePeriod.monthlySpending * inflationMultiplier
      totalContributions += activePeriod.monthlyContribution
    }

    if (month % 12 === 0) {
      const age = startAge + month / 12
      const yearsElapsed = month / 12

      // Apply ISK tax at yearly boundary
      if (iskTax?.enabled) {
        const annualTax = balance * (iskTax.governmentBorrowingRate / 100) * 0.30
        balance -= annualTax
        cumulativeTaxPaid += annualTax
      }

      const growth = balance - totalContributions

      // Calculate withdrawal rate: (annual spending / balance) * 100
      const currentPeriod = getPeriodForAge(age)
      const annualSpending = currentPeriod ? currentPeriod.monthlySpending * 12 * inflationMultiplier : 0
      const withdrawalRate = balance > 0 ? (annualSpending / balance) * 100 : 0
      const realBalance = balance / Math.pow(1 + inflation, yearsElapsed)

      yearlyBalances.push({
        age,
        balance,
        realBalance,
        contributions: totalContributions,
        growth,
        withdrawalRate,
        taxPaid: cumulativeTaxPaid
      })
    }
  }

  return yearlyBalances
}

// Legacy function for backward compatibility with tests
export function calculateGrowthLegacy({
  initialAmount,
  monthlyContribution,
  monthlySpending,
  annualReturn,
  startAge,
  retirementAge,
  endAge = 100
}: LegacyCalculationInputs): YearlyBalance[] {
  const periods: Period[] = [
    {
      startAge,
      endAge: retirementAge,
      monthlyContribution,
      monthlySpending: 0
    },
    {
      startAge: retirementAge,
      endAge: endAge,
      monthlyContribution: 0,
      monthlySpending
    }
  ]

  return calculateGrowth({
    initialAmount,
    periods,
    annualReturn,
    endAge
  })
}

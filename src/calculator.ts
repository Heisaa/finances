export interface YearlyBalance {
  age: number
  balance: number
  contributions: number
  growth: number
  withdrawalRate: number // Annual withdrawal rate as a percentage
}

export interface Period {
  startAge: number
  endAge: number
  monthlyContribution: number
  monthlySpending: number
}

export interface CalculationInputs {
  initialAmount: number
  periods: Period[]
  annualReturn: number
  endAge?: number // Optional, defaults to 100
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
  endAge = 100
}: CalculationInputs): YearlyBalance[] {
  const monthlyRate = annualReturn / 100 / 12

  // Sort periods by startAge and validate
  const sortedPeriods = [...periods].sort((a, b) => a.startAge - b.startAge)

  if (sortedPeriods.length === 0) {
    throw new Error('At least one period is required')
  }

  const startAge = sortedPeriods[0].startAge
  const totalYears = endAge - startAge
  const months = totalYears * 12

  let balance = initialAmount
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
    contributions: totalContributions,
    growth: 0,
    withdrawalRate: initialWithdrawalRate
  })

  for (let month = 1; month <= months; month++) {
    const currentAge = startAge + (month - 1) / 12

    // Apply growth
    balance = balance * (1 + monthlyRate)

    // Find the active period and apply contribution/spending
    const activePeriod = getPeriodForAge(currentAge)
    if (activePeriod) {
      balance += activePeriod.monthlyContribution
      balance -= activePeriod.monthlySpending
      totalContributions += activePeriod.monthlyContribution
    }

    if (month % 12 === 0) {
      const age = startAge + month / 12
      const growth = balance - totalContributions

      // Calculate withdrawal rate: (annual spending / balance) * 100
      // Use the period that applies at this exact age (not middle of year)
      const currentPeriod = getPeriodForAge(age)
      const annualSpending = currentPeriod ? currentPeriod.monthlySpending * 12 : 0
      const withdrawalRate = balance > 0 ? (annualSpending / balance) * 100 : 0

      yearlyBalances.push({
        age,
        balance,
        contributions: totalContributions,
        growth,
        withdrawalRate
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

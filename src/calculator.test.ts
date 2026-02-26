import { describe, it, expect } from 'vitest'
import { calculateGrowth, calculateGrowthLegacy } from './calculator'

describe('calculateGrowth', () => {
  it('should calculate correctly with no monthly contributions during working years', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 0,
      monthlySpending: 0,
      annualReturn: 12,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })

    expect(result).toHaveLength(2)
    expect(result[0].age).toBe(30)
    expect(result[1].age).toBe(31)
    expect(result[1].contributions).toBe(10000)
    // 10000 * (1.01)^12 ≈ 11268.25
    expect(result[1].balance).toBeCloseTo(11268.25, 2)
    expect(result[1].growth).toBeCloseTo(1268.25, 2)
  })

  it('should calculate correctly with monthly contributions', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 12,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })

    expect(result).toHaveLength(2)
    expect(result[1].age).toBe(31)
    expect(result[1].contributions).toBe(10000 + 500 * 12)
    // With 12% annual return and monthly compounding, balance should be around $17,610
    expect(result[1].balance).toBeGreaterThan(17000)
    expect(result[1].balance).toBeLessThan(18000)
    expect(result[1].growth).toBeGreaterThan(0)
  })

  it('should return correct number of yearly data points', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 60,
      endAge: 60
    })

    expect(result).toHaveLength(31)
    expect(result[0].age).toBe(30)
    expect(result[30].age).toBe(60)
  })

  it('should handle 0% return correctly', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 0,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })

    expect(result).toHaveLength(2)
    expect(result[1].balance).toBe(10000 + 500 * 12)
    expect(result[1].contributions).toBe(10000 + 500 * 12)
    expect(result[1].growth).toBe(0)
  })

  it('should show exponential growth over time', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 35,
      endAge: 35
    })

    // Growth should increase each year (compound effect)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].growth).toBeGreaterThan(result[i - 1].growth)
    }
  })

  it('should calculate total contributions correctly during working years', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 33,
      endAge: 33
    })

    // Initial + (monthly * 12 * years)
    expect(result[0].contributions).toBe(10000) // Age 30 (start)
    expect(result[1].contributions).toBe(10000 + 500 * 12) // Age 31
    expect(result[2].contributions).toBe(10000 + 500 * 24) // Age 32
    expect(result[3].contributions).toBe(10000 + 500 * 36) // Age 33
  })

  it('should stop contributions after retirement age', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 32,
      endAge: 35
    })

    // Contributions should stop at retirement age
    const retirementYearIndex = 2 // Age 32 (index 2: 30, 31, 32)
    const contributionsAtRetirement = result[retirementYearIndex].contributions

    // All subsequent years should have the same contributions
    for (let i = retirementYearIndex + 1; i < result.length; i++) {
      expect(result[i].contributions).toBe(contributionsAtRetirement)
    }

    // But balance should keep growing
    for (let i = retirementYearIndex + 1; i < result.length; i++) {
      expect(result[i].balance).toBeGreaterThan(result[i - 1].balance)
    }
  })

  it('should match known compound interest formula for simple case', () => {
    // Testing with a known case: $1000 at 10% for 1 year, no contributions
    const result = calculateGrowthLegacy({
      initialAmount: 1000,
      monthlyContribution: 0,
      monthlySpending: 0,
      annualReturn: 10,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })

    // Formula: A = P(1 + r/n)^(nt)
    // Where n = 12 (monthly), t = 1 year, r = 0.1
    const expected = 1000 * Math.pow(1 + 0.1 / 12, 12)
    expect(result[1].balance).toBeCloseTo(expected, 2)
  })

  it('should correctly separate balance into contributions and growth', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })

    // Balance should equal contributions + growth
    expect(result[0].balance).toBeCloseTo(
      result[0].contributions + result[0].growth,
      2
    )
  })

  it('should calculate to age 100 by default', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 65
    })

    expect(result).toHaveLength(71)
    expect(result[0].age).toBe(30)
    expect(result[70].age).toBe(100)
  })

  it('should handle retirement scenario with growth after retirement', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 65,
      endAge: 100
    })

    const retirementIndex = 34 // Age 65 (35 years of work)
    const finalIndex = result.length - 1

    // After 50 years with 7% return, growth should be substantial
    expect(result[finalIndex].growth).toBeGreaterThan(result[finalIndex].contributions)

    // Growth should continue after retirement even without contributions
    expect(result[finalIndex].growth).toBeGreaterThan(result[retirementIndex].growth)
  })

  it('should handle realistic FIRE scenario', () => {
    // Typical FIRE scenario: Start at 30, save $2k/month at 7% until 45
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 2000,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 45,
      endAge: 45
    })

    const final = result[15] // Age 45 (index 15: 30, 31, ..., 45)

    // Total contributions should be initial + monthly * months
    expect(final.contributions).toBe(10000 + 2000 * 12 * 15)

    // Final balance should be significantly higher due to compound growth
    expect(final.balance).toBeGreaterThan(final.contributions)

    // Balance should be contributions + growth
    expect(final.balance).toBeCloseTo(final.contributions + final.growth, 2)
  })

  it('should calculate barista FIRE scenario correctly', () => {
    // Barista FIRE: Save aggressively until 40, then let it grow until traditional retirement
    const result = calculateGrowthLegacy({
      initialAmount: 50000,
      monthlyContribution: 3000,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 25,
      retirementAge: 40,
      endAge: 65
    })

    const baristaAgeIndex = 14 // Age 40 (15 years of aggressive saving)
    const traditionalRetirementIndex = 39 // Age 65

    // At barista FIRE age, should have substantial savings
    expect(result[baristaAgeIndex].balance).toBeGreaterThan(500000)

    // Should continue growing without contributions
    expect(result[traditionalRetirementIndex].balance).toBeGreaterThan(
      result[baristaAgeIndex].balance * 2
    )
  })

  it('should withdraw monthly spending after retirement', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 100000,
      monthlyContribution: 0,
      monthlySpending: 1000,
      annualReturn: 7,
      startAge: 65,
      retirementAge: 65,
      endAge: 70
    })

    // Balance should start at initial amount, then decrease after first year
    expect(result[0].balance).toBe(100000)
    expect(result[1].balance).toBeLessThan(100000)

    // Balance should continue decreasing
    for (let i = 2; i < result.length; i++) {
      expect(result[i].balance).toBeLessThan(result[i - 1].balance)
    }
  })

  it('should handle sustainable withdrawal rate (4% rule)', () => {
    // 4% rule: Start with $1M, withdraw $40k/year ($3333/month) at 7% return
    const result = calculateGrowthLegacy({
      initialAmount: 1000000,
      monthlyContribution: 0,
      monthlySpending: 3333,
      annualReturn: 7,
      startAge: 65,
      retirementAge: 65,
      endAge: 95
    })

    // After 30 years, should still have money left
    const final = result[result.length - 1]
    expect(final.balance).toBeGreaterThan(0)

    // Should have substantial balance remaining
    expect(final.balance).toBeGreaterThan(500000)
  })

  it('should calculate retirement with contributions then withdrawals', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 2000,
      monthlySpending: 8000,
      annualReturn: 5,
      startAge: 30,
      retirementAge: 55,
      endAge: 70
    })

    const retirementIndex = 24 // Age 55 (25 years of saving)
    const finalIndex = result.length - 1 // Age 70

    // At retirement, should have built up substantial savings
    expect(result[retirementIndex].balance).toBeGreaterThan(500000)

    // After retirement with high withdrawals and moderate returns, balance should decrease
    expect(result[finalIndex].balance).toBeLessThan(result[retirementIndex].balance)

    // Should still have money after 15 years of retirement
    expect(result[finalIndex].balance).toBeGreaterThan(0)
  })

  it('should deplete funds if spending is too high', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 100000,
      monthlyContribution: 0,
      monthlySpending: 5000,
      annualReturn: 3,
      startAge: 65,
      retirementAge: 65,
      endAge: 75
    })

    // With high spending and low return, funds should deplete
    const final = result[result.length - 1]

    // Balance can go negative (spending more than available)
    expect(final.balance).toBeLessThan(100000)
  })

  // New period-based tests
  it('should handle multiple savings periods with different contribution rates', () => {
    const result = calculateGrowth({
      initialAmount: 10000,
      periods: [
        { startAge: 25, endAge: 30, monthlyContribution: 500, monthlySpending: 0 },
        { startAge: 30, endAge: 40, monthlyContribution: 2000, monthlySpending: 0 },
        { startAge: 40, endAge: 100, monthlyContribution: 0, monthlySpending: 3000 }
      ],
      annualReturn: 7,
      endAge: 100
    })

    // Should have data from age 25 to 100
    expect(result).toHaveLength(76)
    expect(result[0].age).toBe(25)
    expect(result[75].age).toBe(100)

    // At age 40, should have built significant savings
    const age40Index = result.findIndex(r => r.age === 40)
    expect(result[age40Index].balance).toBeGreaterThan(300000)
  })

  it('should handle part-time work with reduced contributions', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [
        { startAge: 30, endAge: 50, monthlyContribution: 3000, monthlySpending: 0 }, // Full-time
        { startAge: 50, endAge: 60, monthlyContribution: 1000, monthlySpending: 0 }, // Part-time
        { startAge: 60, endAge: 100, monthlyContribution: 0, monthlySpending: 4000 } // Retired
      ],
      annualReturn: 7
    })

    const age50 = result.find(r => r.age === 50)
    const age60 = result.find(r => r.age === 60)

    // Should have substantial balance at 50 after 20 years full-time
    expect(age50!.balance).toBeGreaterThan(1000000)

    // Balance should continue growing during part-time period
    expect(age60!.balance).toBeGreaterThan(age50!.balance)
  })

  it('should handle mixed saving and spending periods', () => {
    const result = calculateGrowth({
      initialAmount: 50000,
      periods: [
        { startAge: 25, endAge: 35, monthlyContribution: 2000, monthlySpending: 0 },
        { startAge: 35, endAge: 45, monthlyContribution: 0, monthlySpending: 3000 }, // Career break with spending
        { startAge: 45, endAge: 65, monthlyContribution: 3000, monthlySpending: 0 },
        { startAge: 65, endAge: 100, monthlyContribution: 0, monthlySpending: 4000 }
      ],
      annualReturn: 5
    })

    const age35 = result.find(r => r.age === 35)
    const age45 = result.find(r => r.age === 45)
    const age65 = result.find(r => r.age === 65)

    // Balance should decrease during career break with high spending (35-45)
    expect(age45!.balance).toBeLessThan(age35!.balance)

    // But should recover and grow significantly by retirement with aggressive saving
    expect(age65!.balance).toBeGreaterThan(age35!.balance)
  })

  // Variable return rate tests
  it('should use global rate when period has no annualReturn', () => {
    const withGlobal = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 7,
      endAge: 40
    })
    const withExplicit = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0, annualReturn: 7 }],
      annualReturn: 7,
      endAge: 40
    })
    expect(withGlobal[10].balance).toBeCloseTo(withExplicit[10].balance, 2)
  })

  it('should use period-specific return rate when provided', () => {
    const highReturn = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0, annualReturn: 10 }],
      annualReturn: 5,
      endAge: 40
    })
    const lowReturn = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0, annualReturn: 5 }],
      annualReturn: 5,
      endAge: 40
    })
    expect(highReturn[10].balance).toBeGreaterThan(lowReturn[10].balance)
  })

  it('should handle mixed periods with different return rates', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [
        { startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0, annualReturn: 10 },
        { startAge: 40, endAge: 50, monthlyContribution: 0, monthlySpending: 0, annualReturn: 3 }
      ],
      annualReturn: 7,
      endAge: 50
    })
    const age40 = result.find(r => r.age === 40)!
    const age50 = result.find(r => r.age === 50)!
    // Growth from 40-50 at 3% should be modest
    expect(age50.balance).toBeGreaterThan(age40.balance)
    expect(age50.balance).toBeLessThan(age40.balance * 2)
  })

  it('should not affect legacy function with variable returns', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })
    expect(result[1].contributions).toBe(10000 + 500 * 12)
    expect(result[1].balance).toBeGreaterThan(16000)
  })

  it('should handle gap periods with no contributions or spending', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [
        { startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0 },
        { startAge: 40, endAge: 50, monthlyContribution: 0, monthlySpending: 0 }, // Coast period
        { startAge: 50, endAge: 100, monthlyContribution: 0, monthlySpending: 2000 }
      ],
      annualReturn: 7
    })

    const age40 = result.find(r => r.age === 40)
    const age50 = result.find(r => r.age === 50)

    // During coast period, balance should grow from returns only
    expect(age50!.balance).toBeGreaterThan(age40!.balance)

    // Contributions should stay the same during coast period
    expect(age50!.contributions).toBe(age40!.contributions)
  })

  // Inflation tests
  it('should have realBalance equal to balance when inflationRate is 0', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 50, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 7,
      endAge: 50,
      inflationRate: 0
    })
    for (const entry of result) {
      expect(entry.realBalance).toBeCloseTo(entry.balance, 2)
    }
  })

  it('should have realBalance less than balance when inflationRate > 0', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 50, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 7,
      endAge: 50,
      inflationRate: 3
    })
    // At year 0, realBalance === balance
    expect(result[0].realBalance).toBeCloseTo(result[0].balance, 2)
    // After year 0, realBalance < balance
    for (let i = 1; i < result.length; i++) {
      expect(result[i].realBalance).toBeLessThan(result[i].balance)
    }
  })

  it('should reduce final balance with higher inflation due to spending growth', () => {
    const lowInflation = calculateGrowth({
      initialAmount: 1000000,
      periods: [{ startAge: 65, endAge: 100, monthlyContribution: 0, monthlySpending: 3000 }],
      annualReturn: 7,
      endAge: 95,
      inflationRate: 1
    })
    const highInflation = calculateGrowth({
      initialAmount: 1000000,
      periods: [{ startAge: 65, endAge: 100, monthlyContribution: 0, monthlySpending: 3000 }],
      annualReturn: 7,
      endAge: 95,
      inflationRate: 5
    })
    const lowFinal = lowInflation[lowInflation.length - 1]
    const highFinal = highInflation[highInflation.length - 1]
    expect(highFinal.balance).toBeLessThan(lowFinal.balance)
  })

  it('should deflate realBalance correctly', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 0,
      endAge: 40,
      inflationRate: 2
    })
    // With 0% return and 0 spending, balance stays 100k but real value decreases
    // After 10 years at 2%: realBalance ≈ 100000 / (1.02)^10
    const final = result[result.length - 1]
    const expected = 100000 / Math.pow(1.02, 10)
    expect(final.realBalance).toBeCloseTo(expected, 0)
  })

  it('should not inflate contributions', () => {
    const result = calculateGrowth({
      initialAmount: 0,
      periods: [{ startAge: 30, endAge: 32, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 0,
      endAge: 32,
      inflationRate: 5
    })
    // 24 months of 1000 contributions
    expect(result[result.length - 1].contributions).toBe(1000 * 24)
  })

  // ISK Tax tests
  it('should have taxPaid 0 when ISK is disabled', () => {
    const result = calculateGrowth({
      initialAmount: 1000000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 7,
      endAge: 40
    })
    for (const entry of result) {
      expect(entry.taxPaid).toBe(0)
    }
  })

  it('should compute ISK tax correctly for simple case', () => {
    // 1M balance, 2.5% gov rate → annual tax floor = 1M * 0.025 * 0.30 = 7500
    const result = calculateGrowth({
      initialAmount: 1000000,
      periods: [{ startAge: 30, endAge: 32, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 0,
      endAge: 32,
      iskTax: { enabled: true, governmentBorrowingRate: 2.5 }
    })
    // After first year at 0% return: tax = 1000000 * 0.025 * 0.30 = 7500
    expect(result[1].taxPaid).toBeCloseTo(7500, 0)
    // After second year: tax on reduced balance
    expect(result[2].taxPaid).toBeGreaterThan(result[1].taxPaid)
  })

  it('should accumulate ISK tax over time', () => {
    const result = calculateGrowth({
      initialAmount: 1000000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 7,
      endAge: 40,
      iskTax: { enabled: true, governmentBorrowingRate: 2.5 }
    })
    // Tax should grow each year
    for (let i = 2; i < result.length; i++) {
      expect(result[i].taxPaid).toBeGreaterThan(result[i - 1].taxPaid)
    }
  })

  it('should reduce final balance with ISK tax vs without', () => {
    const base = { initialAmount: 500000, periods: [{ startAge: 30, endAge: 50, monthlyContribution: 2000, monthlySpending: 0 }], annualReturn: 7, endAge: 50 }
    const withoutTax = calculateGrowth(base)
    const withTax = calculateGrowth({ ...base, iskTax: { enabled: true, governmentBorrowingRate: 2.5 } })
    expect(withTax[withTax.length - 1].balance).toBeLessThan(withoutTax[withoutTax.length - 1].balance)
  })

  it('should produce proportional tax with different borrowing rates', () => {
    const base = { initialAmount: 1000000, periods: [{ startAge: 30, endAge: 31, monthlyContribution: 0, monthlySpending: 0 }], annualReturn: 0, endAge: 31 }
    const low = calculateGrowth({ ...base, iskTax: { enabled: true, governmentBorrowingRate: 1.0 } })
    const high = calculateGrowth({ ...base, iskTax: { enabled: true, governmentBorrowingRate: 2.0 } })
    // Tax should be roughly double
    expect(high[1].taxPaid).toBeCloseTo(low[1].taxPaid * 2, 0)
  })
})

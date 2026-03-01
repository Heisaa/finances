import { describe, expect, it } from 'vitest'
import { calculateGrowth, calculateGrowthLegacy, calculateProjection } from './calculator'
import { computeISKTax } from './tax'

describe('calculateGrowth deterministic engine', () => {
  it('uses effective annual-to-monthly conversion', () => {
    const result = calculateGrowth({
      initialAmount: 1000,
      periods: [{ startAge: 30, endAge: 31, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 10,
      endAge: 31
    })

    expect(result).toHaveLength(2)
    expect(result[1].balance).toBeCloseTo(1100, 2)
  })

  it('supports timing convention and midMonth gives higher balance with contributions', () => {
    const endOfMonth = calculateGrowth({
      initialAmount: 0,
      periods: [{ startAge: 30, endAge: 31, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 12,
      endAge: 31,
      timingConvention: 'endOfMonth'
    })

    const midMonth = calculateGrowth({
      initialAmount: 0,
      periods: [{ startAge: 30, endAge: 31, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 12,
      endAge: 31,
      timingConvention: 'midMonth'
    })

    expect(midMonth[1].balance).toBeGreaterThan(endOfMonth[1].balance)
  })

  it('tracks accounting identity across yearly rows', () => {
    const result = calculateGrowth({
      initialAmount: 200000,
      periods: [
        { startAge: 35, endAge: 45, monthlyContribution: 3000, monthlySpending: 0 },
        { startAge: 45, endAge: 60, monthlyContribution: 0, monthlySpending: 4000 }
      ],
      annualReturn: 6,
      inflationRate: 2,
      endAge: 60,
      taxProfile: {
        country: 'SE',
        accountType: 'ISK',
        rulesYear: 2025,
        stateLoanRate: 2.5
      }
    })

    for (const row of result) {
      const recomposed = row.contributions - row.withdrawals + row.investmentReturn - row.taxPaid
      expect(row.balance).toBeCloseTo(recomposed, 2)
      expect(row.growth).toBeCloseTo(row.investmentReturn, 6)
    }
  })

  it('can index contributions over time', () => {
    const flat = calculateGrowth({
      initialAmount: 0,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 0,
      endAge: 40,
      contributionIndexationRate: 0
    })

    const indexed = calculateGrowth({
      initialAmount: 0,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 0,
      endAge: 40,
      contributionIndexationRate: 3
    })

    expect(indexed[indexed.length - 1].contributions).toBeGreaterThan(flat[flat.length - 1].contributions)
  })

  it('deflates real balance with inflation', () => {
    const result = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 0,
      inflationRate: 2,
      endAge: 40
    })

    expect(result[0].realBalance).toBeCloseTo(result[0].balance, 2)
    expect(result[result.length - 1].realBalance).toBeLessThan(result[result.length - 1].balance)
  })

  it('uses period-specific annual return when provided', () => {
    const high = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0, annualReturn: 9 }],
      annualReturn: 4,
      endAge: 40
    })

    const low = calculateGrowth({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 0, monthlySpending: 0, annualReturn: 4 }],
      annualReturn: 4,
      endAge: 40
    })

    expect(high[10].balance).toBeGreaterThan(low[10].balance)
  })

  it('throws on overlapping periods', () => {
    expect(() =>
      calculateGrowth({
        initialAmount: 0,
        periods: [
          { startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0 },
          { startAge: 35, endAge: 45, monthlyContribution: 1000, monthlySpending: 0 }
        ],
        annualReturn: 5,
        endAge: 45
      })
    ).toThrow('Periods cannot overlap')
  })

  it('keeps legacy function behavior and outputs yearly rows', () => {
    const result = calculateGrowthLegacy({
      initialAmount: 10000,
      monthlyContribution: 500,
      monthlySpending: 0,
      annualReturn: 7,
      startAge: 30,
      retirementAge: 31,
      endAge: 31
    })

    expect(result).toHaveLength(2)
    expect(result[1].contributions).toBeGreaterThan(result[0].contributions)
    expect(result[1].balance).toBeGreaterThan(result[0].balance)
  })
})

describe('tax model', () => {
  it('computes ISK tax from quarterly balances and yearly deposits', () => {
    const tax = computeISKTax(
      {
        country: 'SE',
        accountType: 'ISK',
        rulesYear: 2025,
        stateLoanRate: 2.5,
        surchargeRate: 1.0,
        floorRate: 1.25,
        taxRate: 30
      },
      {
        yearStartBalances: [1000000, 1000000, 1000000, 1000000],
        yearlyDeposits: 120000
      }
    )

    // taxableBase = (4,000,000 + 120,000) / 4 = 1,030,000
    // effective rate = (2.5 + 1.0)% * 30% = 1.05%
    expect(tax.taxableBase).toBeCloseTo(1030000, 0)
    expect(tax.effectiveTaxRate).toBeCloseTo(0.0105, 6)
    expect(tax.annualTax).toBeCloseTo(10815, 0)
  })
})

describe('calculateProjection Monte Carlo mode', () => {
  it('returns deterministic payload in deterministic mode', () => {
    const projection = calculateProjection({
      initialAmount: 100000,
      periods: [{ startAge: 30, endAge: 40, monthlyContribution: 1000, monthlySpending: 0 }],
      annualReturn: 6,
      endAge: 40,
      projectionMode: 'deterministic'
    })

    expect(projection.mode).toBe('deterministic')
    if (projection.mode === 'deterministic') {
      expect(projection.yearlyBalances).toHaveLength(11)
    }
  })

  it('returns percentile bands and success probability in monte carlo mode', () => {
    const projection = calculateProjection({
      initialAmount: 1000000,
      periods: [{ startAge: 65, endAge: 95, monthlyContribution: 0, monthlySpending: 3500 }],
      annualReturn: 5,
      annualVolatility: 15,
      simulationCount: 2000,
      seed: 11,
      endAge: 95,
      projectionMode: 'monteCarlo'
    })

    expect(projection.mode).toBe('monteCarlo')
    if (projection.mode === 'monteCarlo') {
      const finalYear = projection.years[projection.years.length - 1]
      expect(projection.sampleSize).toBe(2000)
      expect(finalYear.p10).toBeLessThan(finalYear.p50)
      expect(finalYear.p50).toBeLessThan(finalYear.p90)
      expect(projection.successProbability).toBeGreaterThanOrEqual(0)
      expect(projection.successProbability).toBeLessThanOrEqual(100)
    }
  })

  it('is reproducible with the same seed', () => {
    const baseInputs = {
      initialAmount: 500000,
      periods: [{ startAge: 40, endAge: 80, monthlyContribution: 1000, monthlySpending: 3000 }],
      annualReturn: 5,
      annualVolatility: 18,
      simulationCount: 1000,
      seed: 123,
      endAge: 80,
      projectionMode: 'monteCarlo' as const
    }

    const one = calculateProjection(baseInputs)
    const two = calculateProjection(baseInputs)

    expect(one.mode).toBe('monteCarlo')
    expect(two.mode).toBe('monteCarlo')

    if (one.mode === 'monteCarlo' && two.mode === 'monteCarlo') {
      expect(one.successProbability).toBeCloseTo(two.successProbability, 6)
      expect(one.years.map((year) => year.p50)).toEqual(two.years.map((year) => year.p50))
    }
  })

  it('shows lower success probability with higher volatility in a withdrawal-heavy plan', () => {
    const lowVol = calculateProjection({
      initialAmount: 1000000,
      periods: [{ startAge: 60, endAge: 95, monthlyContribution: 0, monthlySpending: 4500 }],
      annualReturn: 5,
      annualVolatility: 8,
      simulationCount: 2000,
      seed: 7,
      endAge: 95,
      projectionMode: 'monteCarlo'
    })

    const highVol = calculateProjection({
      initialAmount: 1000000,
      periods: [{ startAge: 60, endAge: 95, monthlyContribution: 0, monthlySpending: 4500 }],
      annualReturn: 5,
      annualVolatility: 24,
      simulationCount: 2000,
      seed: 7,
      endAge: 95,
      projectionMode: 'monteCarlo'
    })

    expect(lowVol.mode).toBe('monteCarlo')
    expect(highVol.mode).toBe('monteCarlo')

    if (lowVol.mode === 'monteCarlo' && highVol.mode === 'monteCarlo') {
      expect(highVol.successProbability).toBeLessThan(lowVol.successProbability)
    }
  })

  it('returns null depletionAgeP50 when median path does not deplete', () => {
    const projection = calculateProjection({
      initialAmount: 1000000,
      periods: [{ startAge: 40, endAge: 80, monthlyContribution: 0, monthlySpending: 0 }],
      annualReturn: 5,
      annualVolatility: 15,
      simulationCount: 1000,
      seed: 9,
      endAge: 80,
      projectionMode: 'monteCarlo'
    })

    expect(projection.mode).toBe('monteCarlo')
    if (projection.mode === 'monteCarlo') {
      expect(projection.depletionAgeP50).toBeNull()
      expect(projection.successProbability).toBe(100)
    }
  })
})

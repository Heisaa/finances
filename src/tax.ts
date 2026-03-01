export interface TaxInputs {
  yearStartBalances: [number, number, number, number]
  yearlyDeposits: number
}

export interface TaxComputationResult {
  annualTax: number
  taxableBase: number
  effectiveTaxRate: number
}

export interface ISKTaxProfile {
  country: 'SE'
  accountType: 'ISK'
  rulesYear: number
  stateLoanRate?: number
  surchargeRate?: number
  floorRate?: number
  taxRate?: number
}

export interface LegacyIskTaxInput {
  enabled: boolean
  governmentBorrowingRate: number
}

export type TaxProfile = ISKTaxProfile

const DEFAULT_SURCHARGE = 1.0
const DEFAULT_FLOOR_RATE = 1.25
const DEFAULT_TAX_RATE = 30

export function computeISKTax(profile: ISKTaxProfile, inputs: TaxInputs): TaxComputationResult {
  const stateLoanRate = profile.stateLoanRate ?? 2.5
  const surchargeRate = profile.surchargeRate ?? DEFAULT_SURCHARGE
  const floorRate = profile.floorRate ?? DEFAULT_FLOOR_RATE
  const taxRate = profile.taxRate ?? DEFAULT_TAX_RATE

  const quarterSum = inputs.yearStartBalances.reduce((sum, value) => sum + Math.max(0, value), 0)
  const taxableBase = (quarterSum + Math.max(0, inputs.yearlyDeposits)) / 4
  const taxBaseRate = Math.max(stateLoanRate + surchargeRate, floorRate)
  const effectiveTaxRate = (taxBaseRate / 100) * (taxRate / 100)
  const annualTax = Math.max(0, taxableBase * effectiveTaxRate)

  return {
    annualTax,
    taxableBase,
    effectiveTaxRate
  }
}

export function computeLegacyIskTax(balance: number, legacy: LegacyIskTaxInput): number {
  return Math.max(0, balance) * (legacy.governmentBorrowingRate / 100) * 0.30
}

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  calculateProjection,
  type CalculationInputs,
  type Period,
  type ProjectionMode,
  type TimingConvention
} from './calculator'

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group/help">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600"
        aria-label="More information"
      >
        ?
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed text-slate-100 opacity-0 shadow-lg transition-opacity group-hover/help:opacity-100 group-focus-within/help:opacity-100">
        {text}
      </span>
    </span>
  )
}

function LabelWithHelp({ label, helpText }: { label: string; helpText: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <InfoTooltip text={helpText} />
    </span>
  )
}

function App() {
  const [initialAmount, setInitialAmount] = useState<number>(900000)
  const [annualReturn, setAnnualReturn] = useState<number>(7)
  const [inflationRate, setInflationRate] = useState<number>(2)
  const [contributionIndexationRate, setContributionIndexationRate] = useState<number>(0)
  const [timingConvention, setTimingConvention] = useState<TimingConvention>('midMonth')

  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('deterministic')
  const [annualVolatility, setAnnualVolatility] = useState<number>(15)
  const [simulationCount, setSimulationCount] = useState<number>(2000)
  const [seed, setSeed] = useState<number>(42)

  const [iskEnabled, setIskEnabled] = useState<boolean>(true)
  const [govBorrowingRate, setGovBorrowingRate] = useState<number>(2.5)
  const [rulesYear, setRulesYear] = useState<number>(2026)

  const [currency, setCurrency] = useState<'USD' | 'SEK'>('SEK')
  const [lightDirection, setLightDirection] = useState<'top-left' | 'bottom-right'>('top-left')

  const [periods, setPeriods] = useState<Period[]>([
    { startAge: 35, endAge: 65, monthlyContribution: 10000, monthlySpending: 0 },
    { startAge: 65, endAge: 100, monthlyContribution: 0, monthlySpending: 30000 }
  ])

  const raisedShadow =
    lightDirection === 'top-left'
      ? 'shadow-[8px_8px_16px_#c8d0d8,-7px_-7px_16px_#f9fcff]'
      : 'shadow-[-8px_-8px_16px_#c8d0d8,7px_7px_16px_#f9fcff]'

  const insetShadow =
    lightDirection === 'top-left'
      ? 'shadow-[inset_5px_5px_10px_#cbd2da,inset_-5px_-5px_10px_#f8fbff]'
      : 'shadow-[inset_-5px_-5px_10px_#cbd2da,inset_5px_5px_10px_#f8fbff]'

  const raisedSoftShadow =
    lightDirection === 'top-left'
      ? 'shadow-[4px_4px_9px_#cad1d8,-4px_-4px_9px_#ffffff]'
      : 'shadow-[-4px_-4px_9px_#cad1d8,4px_4px_9px_#ffffff]'

  const panelClass = `rounded-3xl border border-white/60 bg-[#e6ebf2] p-5 ${raisedShadow}`
  const inputClass = `w-full rounded-xl border border-white/70 bg-[#e6ebf2] px-3 py-2 text-sm text-slate-800 ${insetShadow} focus:outline-none focus:ring-2 focus:ring-cyan-600/40`
  const statsTrayClass = `rounded-3xl border border-white/70 bg-[#dfe5ec] p-2 ${insetShadow}`
  const statCardClass = `relative min-w-0 rounded-2xl border border-white/70 bg-[#e6ebf2] p-4 ${raisedSoftShadow}`
  const statValueClass =
    'mt-2 min-w-0 break-words text-[clamp(1.35rem,1.8vw,2rem)] leading-tight font-extrabold tabular-nums text-slate-900'

  const periodsWithEndAges: Period[] = useMemo(
    () =>
      periods.map((period, index) => {
        if (index === periods.length - 1) {
          return { ...period, endAge: 100 }
        }

        return {
          ...period,
          endAge: periods[index + 1].startAge
        }
      }),
    [periods]
  )

  const projectionState = useMemo(() => {
    const inputPayload: CalculationInputs = {
      initialAmount,
      periods: periodsWithEndAges,
      annualReturn,
      endAge: 100,
      inflationRate,
      contributionIndexationRate,
      projectionMode,
      annualVolatility,
      simulationCount,
      seed,
      timingConvention,
      taxProfile: iskEnabled
        ? {
            country: 'SE',
            accountType: 'ISK',
            rulesYear,
            stateLoanRate: govBorrowingRate
          }
        : undefined
    }

    try {
      return {
        projection: calculateProjection(inputPayload),
        error: ''
      }
    } catch (error) {
      return {
        projection: null,
        error: error instanceof Error ? error.message : 'Calculation failed'
      }
    }
  }, [
    annualReturn,
    annualVolatility,
    contributionIndexationRate,
    govBorrowingRate,
    inflationRate,
    initialAmount,
    iskEnabled,
    periodsWithEndAges,
    projectionMode,
    rulesYear,
    seed,
    simulationCount,
    timingConvention
  ])

  const projection = projectionState.projection

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1]
    setPeriods([
      ...periods,
      {
        startAge: Math.min(lastPeriod.startAge + 10, 99),
        endAge: 100,
        monthlyContribution: 0,
        monthlySpending: 0
      }
    ])
  }

  const removePeriod = (index: number) => {
    if (periods.length > 1) {
      setPeriods(periods.filter((_, i) => i !== index))
    }
  }

  const updatePeriod = (index: number, field: keyof Period, value: number | undefined) => {
    const newPeriods = [...periods]
    newPeriods[index] = { ...newPeriods[index], [field]: value }
    setPeriods(newPeriods)
  }

  const formatCurrency = (value: number) => {
    const locale = currency === 'USD' ? 'en-US' : 'sv-SE'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatCurrencyCompact = (value: number) => {
    const locale = currency === 'USD' ? 'en-US' : 'sv-SE'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value)
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  const getCurrencySymbol = () => (currency === 'USD' ? '$' : 'kr')

  const deterministicRows = projection?.mode === 'deterministic' ? projection.yearlyBalances : []
  const monteCarloRows = projection?.mode === 'monteCarlo' ? projection.years : []

  const finalDeterministicRow = deterministicRows[deterministicRows.length - 1]
  const finalMonteCarloRow = monteCarloRows[monteCarloRows.length - 1]

  return (
    <div className="min-h-screen bg-[#e4e9ef] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <header className={`${panelClass} relative mb-6 overflow-hidden p-6 sm:p-7`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-500/60 via-emerald-500/55 to-amber-400/60" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-72 rotate-6 rounded-[2.5rem] bg-gradient-to-br from-cyan-300/55 via-teal-200/40 to-emerald-100/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-44 w-64 -rotate-6 rounded-[2.5rem] bg-gradient-to-tr from-amber-300/45 via-rose-200/30 to-orange-100/20 blur-2xl" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                FIRE Accuracy Calculator
              </h1>
              <p className="mt-2 text-slate-600">
                Deterministic planning and Monte Carlo survival analysis for Swedish FIRE scenarios.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`inline-flex rounded-full border border-white/70 bg-[#e6ebf2] p-1 ${insetShadow}`}>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    currency === 'USD'
                      ? `bg-[#e6ebf2] text-teal-700 ${raisedSoftShadow}`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('SEK')}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    currency === 'SEK'
                      ? `bg-[#e6ebf2] text-teal-700 ${raisedSoftShadow}`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SEK
                </button>
              </div>

              <button
                onClick={() =>
                  setLightDirection((prev) => (prev === 'top-left' ? 'bottom-right' : 'top-left'))
                }
                className={`rounded-full border border-white/70 bg-[#e6ebf2] px-4 py-2 text-xs font-semibold tracking-wide text-slate-700 uppercase ${raisedSoftShadow}`}
                title="Flip light source"
              >
                Light: {lightDirection === 'top-left' ? 'Top Left' : 'Bottom Right'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-6 xl:h-fit">
            <section className={panelClass}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  Projection Mode
                  <InfoTooltip text="Deterministic runs one fixed return path. Monte Carlo runs many randomized return paths to estimate range and survival odds." />
                </span>
              </h2>

              <div className={`grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-[#e6ebf2] p-1 ${insetShadow}`}>
                <button
                  onClick={() => setProjectionMode('deterministic')}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    projectionMode === 'deterministic'
                      ? `bg-[#e6ebf2] text-teal-700 ${raisedSoftShadow}`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Deterministic
                </button>
                <button
                  onClick={() => setProjectionMode('monteCarlo')}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    projectionMode === 'monteCarlo'
                      ? `bg-[#e6ebf2] text-teal-700 ${raisedSoftShadow}`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monte Carlo
                </button>
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Core Settings</h2>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Initial Investment</label>
                  <input
                    type="number"
                    value={initialAmount}
                    onChange={(event) => setInitialAmount(Number(event.target.value))}
                    min="0"
                    step="1000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Annual Return (%)</label>
                  <input
                    type="number"
                    value={annualReturn}
                    onChange={(event) => setAnnualReturn(Number(event.target.value))}
                    min="-99"
                    max="30"
                    step="0.1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Inflation (%)</label>
                  <input
                    type="number"
                    value={inflationRate}
                    onChange={(event) => setInflationRate(Number(event.target.value))}
                    min="-99"
                    max="20"
                    step="0.1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    <LabelWithHelp
                      label="Contribution Indexation (%)"
                      helpText="Annual increase applied to your monthly contributions. Use this to model salary growth or increasing savings rate."
                    />
                  </label>
                  <input
                    type="number"
                    value={contributionIndexationRate}
                    onChange={(event) => setContributionIndexationRate(Number(event.target.value))}
                    min="-99"
                    max="20"
                    step="0.1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    <LabelWithHelp
                      label="Cashflow Timing"
                      helpText="Mid-month assumes contributions and withdrawals happen halfway through the month. End-of-month applies them after monthly market return."
                    />
                  </label>
                  <select
                    value={timingConvention}
                    onChange={(event) => setTimingConvention(event.target.value as TimingConvention)}
                    className={inputClass}
                  >
                    <option value="midMonth">Mid-month</option>
                    <option value="endOfMonth">End-of-month</option>
                  </select>
                </div>
              </div>
            </section>

            {projectionMode === 'monteCarlo' && (
              <section className={panelClass}>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    Monte Carlo Settings
                    <InfoTooltip text="Monte Carlo simulates many possible market paths instead of assuming one smooth average return." />
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      <LabelWithHelp
                        label="Annual Volatility (%)"
                        helpText="How much returns swing around the average return. Higher volatility widens outcomes and can increase failure risk."
                      />
                    </label>
                    <input
                      type="number"
                      value={annualVolatility}
                      onChange={(event) => setAnnualVolatility(Number(event.target.value))}
                      min="0"
                      max="80"
                      step="0.1"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      <LabelWithHelp
                        label="Simulation Count"
                        helpText="Number of simulated market paths. More paths give smoother, more stable percentile estimates but take more compute."
                      />
                    </label>
                    <input
                      type="number"
                      value={simulationCount}
                      onChange={(event) => setSimulationCount(Number(event.target.value))}
                      min="100"
                      max="20000"
                      step="100"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      <LabelWithHelp
                        label="Random Seed"
                        helpText="Controls randomness so results can be reproduced. Same seed and settings produce the same Monte Carlo output."
                      />
                    </label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(event) => setSeed(Number(event.target.value))}
                      step="1"
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>
            )}

            <section className={panelClass}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  Swedish Tax
                  <InfoTooltip text="Applies ISK-style annual tax approximation using quarterly balances and yearly deposits." />
                </span>
              </h2>
              <label className={`mb-4 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-[#e6ebf2] px-3 py-2 text-sm font-semibold text-slate-700 ${insetShadow}`}>
                <input
                  type="checkbox"
                  checked={iskEnabled}
                  onChange={(event) => setIskEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
                Enable ISK tax profile
              </label>
              {iskEnabled && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      <LabelWithHelp
                        label="State Loan Rate (%)"
                        helpText="Base rate used in ISK tax calculation. A higher rate raises effective yearly tax drag."
                      />
                    </label>
                    <input
                      type="number"
                      value={govBorrowingRate}
                      onChange={(event) => setGovBorrowingRate(Number(event.target.value))}
                      min="0"
                      max="10"
                      step="0.1"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      <LabelWithHelp
                        label="Rules Year"
                        helpText="Year tag for tax assumptions. Useful when tax policy inputs are updated in future versions."
                      />
                    </label>
                    <input
                      type="number"
                      value={rulesYear}
                      onChange={(event) => setRulesYear(Number(event.target.value))}
                      min="2020"
                      max="2100"
                      step="1"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className={panelClass}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Life Periods</h2>
              <div className="space-y-3">
                {periods.map((period, index) => {
                  const endAge = index === periods.length - 1 ? 100 : periods[index + 1].startAge

                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border border-white/70 bg-[#e6ebf2] p-3 ${raisedSoftShadow}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Period {index + 1}: Age {period.startAge}-{endAge}</p>
                        {periods.length > 1 && (
                          <button
                            onClick={() => removePeriod(index)}
                            className={`rounded-lg border border-white/70 bg-[#e6ebf2] px-2.5 py-1 text-xs font-semibold text-rose-700 ${raisedSoftShadow}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Start Age</label>
                          <input
                            type="number"
                            value={period.startAge}
                            onChange={(event) => updatePeriod(index, 'startAge', Number(event.target.value))}
                            min="18"
                            max="100"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Monthly Save</label>
                          <input
                            type="number"
                            value={period.monthlyContribution}
                            onChange={(event) => updatePeriod(index, 'monthlyContribution', Number(event.target.value))}
                            min="0"
                            step="100"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Monthly Spend</label>
                          <input
                            type="number"
                            value={period.monthlySpending}
                            onChange={(event) => updatePeriod(index, 'monthlySpending', Number(event.target.value))}
                            min="0"
                            step="100"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Return % (opt)</label>
                          <input
                            type="number"
                            value={period.annualReturn ?? ''}
                            onChange={(event) =>
                              updatePeriod(
                                index,
                                'annualReturn',
                                event.target.value === '' ? undefined : Number(event.target.value)
                              )
                            }
                            min="-99"
                            max="30"
                            step="0.1"
                            placeholder={annualReturn.toString()}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={addPeriod}
                className={`mt-3 w-full rounded-xl border border-white/70 bg-[#e6ebf2] py-2 text-sm font-semibold text-slate-700 ${raisedSoftShadow}`}
              >
                + Add period
              </button>
            </section>
          </aside>

          <section className="space-y-6">
            {projectionState.error && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {projectionState.error}
              </section>
            )}

            {projection?.mode === 'deterministic' && finalDeterministicRow && (
              <section className={statsTrayClass}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`${statCardClass} bg-gradient-to-b from-teal-100/30 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-teal-600/80 before:to-cyan-500/70`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Final Balance</p>
                    <p className={`${statValueClass} text-teal-700`} title={formatCurrency(finalDeterministicRow.balance)}>
                      {formatCurrencyCompact(finalDeterministicRow.balance)}
                    </p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-amber-100/35 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-amber-600/80 before:to-orange-500/70`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Final Real Balance</p>
                    <p className={`${statValueClass} text-amber-700`} title={formatCurrency(finalDeterministicRow.realBalance)}>
                      {formatCurrencyCompact(finalDeterministicRow.realBalance)}
                    </p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-rose-100/35 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-rose-600/75 before:to-pink-500/65`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Cumulative Tax</p>
                    <p className={`${statValueClass} text-rose-700`} title={formatCurrency(finalDeterministicRow.taxPaid)}>
                      {formatCurrencyCompact(finalDeterministicRow.taxPaid)}
                    </p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-emerald-100/35 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-emerald-600/80 before:to-lime-500/70`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Withdrawal Rate</p>
                    <p className={`${statValueClass} text-emerald-700`}>{formatPercent(finalDeterministicRow.withdrawalRate)}</p>
                  </div>
                </div>
              </section>
            )}

            {projection?.mode === 'monteCarlo' && finalMonteCarloRow && (
              <section className={statsTrayClass}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className={`${statCardClass} bg-gradient-to-b from-emerald-100/35 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-emerald-600/80 before:to-lime-500/70`}>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Success Probability
                    <InfoTooltip text="Percent of simulations where your portfolio stays above zero through the full horizon." />
                  </p>
                    <p className={`${statValueClass} text-emerald-700`}>{formatPercent(projection.successProbability)}</p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-cyan-100/35 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-cyan-600/80 before:to-sky-500/70`}>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Median Depletion Age
                    <InfoTooltip text="Age when 50% of simulations have run out of money. Empty means at least half the paths never depleted." />
                  </p>
                    <p className={`${statValueClass} text-cyan-700`}>
                    {projection.depletionAgeP50 === null ? 'No median depletion' : projection.depletionAgeP50.toFixed(1)}
                  </p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-slate-100/45 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-slate-600/80 before:to-slate-500/70`}>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    P10 Final
                    <InfoTooltip text="Conservative outcome: only 10% of simulations finished below this balance." />
                  </p>
                    <p className={statValueClass} title={formatCurrency(finalMonteCarloRow.p10)}>
                      {formatCurrencyCompact(finalMonteCarloRow.p10)}
                    </p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-teal-100/30 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-teal-600/80 before:to-cyan-500/70`}>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    P50 Final
                    <InfoTooltip text="Median outcome: half of simulations end above this balance and half below." />
                  </p>
                    <p className={`${statValueClass} text-teal-700`} title={formatCurrency(finalMonteCarloRow.p50)}>
                      {formatCurrencyCompact(finalMonteCarloRow.p50)}
                    </p>
                  </div>
                  <div className={`${statCardClass} bg-gradient-to-b from-indigo-100/35 to-[#e6ebf2] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-indigo-600/80 before:to-violet-500/70`}>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    P90 Final
                    <InfoTooltip text="Optimistic outcome: only 10% of simulations finish above this balance." />
                  </p>
                    <p className={`${statValueClass} text-indigo-700`} title={formatCurrency(finalMonteCarloRow.p90)}>
                      {formatCurrencyCompact(finalMonteCarloRow.p90)}
                    </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{projection.sampleSize} paths</p>
                  </div>
                </div>
              </section>
            )}

            {projection?.mode === 'deterministic' && (
              <section className={panelClass}>
                <h3 className="mb-4 text-lg font-extrabold text-slate-900">Deterministic Path</h3>
                <ResponsiveContainer width="100%" height={390}>
                  <LineChart data={deterministicRows}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#d0d7de" />
                    <XAxis dataKey="age" stroke="#64748b" />
                    <YAxis tickFormatter={(value) => `${getCurrencySymbol()}${(value / 1000).toFixed(0)}k`} stroke="#64748b" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(age) => `Age ${age}`}
                      contentStyle={{ borderRadius: '12px', borderColor: '#d0d7de' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="balance" name="Balance" stroke="#0f766e" strokeWidth={3} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="realBalance"
                      name="Real Balance"
                      stroke="#b45309"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="6 6"
                    />
                    <Line
                      type="monotone"
                      dataKey="investmentReturn"
                      name="Cumulative Return"
                      stroke="#475569"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}

            {projection?.mode === 'monteCarlo' && (
              <section className={panelClass}>
                <h3 className="mb-4 text-lg font-extrabold text-slate-900">Monte Carlo Percentile Bands</h3>
                <ResponsiveContainer width="100%" height={390}>
                  <LineChart data={monteCarloRows}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#d0d7de" />
                    <XAxis dataKey="age" stroke="#64748b" />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(value) => `${getCurrencySymbol()}${(value / 1000).toFixed(0)}k`}
                      stroke="#64748b"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      domain={[0, 100]}
                      stroke="#64748b"
                    />
                    <Tooltip
                      formatter={(value: number, key: string) =>
                        key.includes('success') ? formatPercent(value) : formatCurrency(value)
                      }
                      labelFormatter={(age) => `Age ${age}`}
                      contentStyle={{ borderRadius: '12px', borderColor: '#d0d7de' }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="p10" name="P10" stroke="#64748b" strokeDasharray="5 5" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="p50" name="P50" stroke="#0f766e" strokeWidth={3} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="p90" name="P90" stroke="#4f46e5" strokeDasharray="5 5" dot={false} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="successProbability"
                      name="Success %"
                      stroke="#0f766e"
                      strokeWidth={2.2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}

            {projection?.mode === 'deterministic' && (
              <section className={`${panelClass} overflow-hidden p-0`}>
                <div className="border-b border-white/80 px-4 py-3">
                  <h3 className="text-lg font-extrabold text-slate-900">Age-by-Age Accounting</h3>
                </div>
                <div className="max-h-[580px] overflow-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="sticky top-0 bg-[#dee5ec]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Age</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Balance</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Contrib.</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Withdraw.</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Return</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Tax Paid</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">WR %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {deterministicRows.map((row) => (
                        <tr key={row.age} className="hover:bg-white/35">
                          <td className="px-3 py-2 text-sm text-slate-800 tabular-nums">{row.age}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.balance)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.contributions)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.withdrawals)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.investmentReturn)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.taxPaid)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatPercent(row.withdrawalRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {projection?.mode === 'monteCarlo' && (
              <section className={`${panelClass} overflow-hidden p-0`}>
                <div className="border-b border-white/80 px-4 py-3">
                  <h3 className="text-lg font-extrabold text-slate-900">Percentile Table</h3>
                </div>
                <div className="max-h-[580px] overflow-auto">
                  <table className="w-full min-w-[660px]">
                    <thead className="sticky top-0 bg-[#dee5ec]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Age</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">P10</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">P50</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">P90</th>
                        <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Success %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {monteCarloRows.map((row) => (
                        <tr key={row.age} className="hover:bg-white/35">
                          <td className="px-3 py-2 text-sm text-slate-800 tabular-nums">{row.age}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.p10)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.p50)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatCurrency(row.p90)}</td>
                          <td className="px-3 py-2 text-right text-sm text-slate-800 tabular-nums">{formatPercent(row.successProbability)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default App

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { calculateGrowth, type Period } from './calculator'

function App() {
  const [initialAmount, setInitialAmount] = useState<number>(900000)
  const [annualReturn, setAnnualReturn] = useState<number>(7)
  const [inflationRate, setInflationRate] = useState<number>(2)
  const [iskEnabled, setIskEnabled] = useState<boolean>(false)
  const [govBorrowingRate, setGovBorrowingRate] = useState<number>(2.5)
  const [currency, setCurrency] = useState<'USD' | 'SEK'>('SEK')
  const [periods, setPeriods] = useState<Period[]>([
    { startAge: 35, endAge: 65, monthlyContribution: 10000, monthlySpending: 0 },
    { startAge: 65, endAge: 100, monthlyContribution: 0, monthlySpending: 3000 }
  ])

  // Calculate end ages automatically - each period ends when the next one starts
  const periodsWithEndAges: Period[] = periods.map((period, index) => {
    if (index === periods.length - 1) {
      return { ...period, endAge: 100 }
    } else {
      return { ...period, endAge: periods[index + 1].startAge }
    }
  })

  const results = calculateGrowth({
    initialAmount,
    periods: periodsWithEndAges,
    annualReturn,
    endAge: 100,
    inflationRate,
    iskTax: iskEnabled ? { enabled: true, governmentBorrowingRate: govBorrowingRate } : undefined
  })

  const periodSummaries = periodsWithEndAges.map((period, index) => {
    const startResult = results.find(r => r.age === period.startAge)
    return {
      period,
      index,
      startResult
    }
  })

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1]
    setPeriods([...periods, {
      startAge: lastPeriod.startAge + 10,
      endAge: 100,
      monthlyContribution: 0,
      monthlySpending: 0
    }])
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
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getCurrencySymbol = () => currency === 'USD' ? '$' : 'kr'

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-900 py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              FIRE Calculator
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Plan your path to financial independence
            </p>
          </div>
          <div className="flex mt-4 sm:mt-0 bg-slate-200 dark:bg-slate-700 p-1 rounded-full">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
                currency === 'USD'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('SEK')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
                currency === 'SEK'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              SEK (kr)
            </button>
          </div>
        </div>

        {/* Settings */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <label htmlFor="initial" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Initial Investment
              </label>
              <input
                id="initial"
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                min="0"
                step="1000"
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="return" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Annual Return (%)
              </label>
              <input
                id="return"
                type="number"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                min="0"
                max="20"
                step="0.5"
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="inflation" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Inflation Rate (%)
              </label>
              <input
                id="inflation"
                type="number"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                min="0"
                max="15"
                step="0.5"
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>
        </section>

        {/* ISK Toggle */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={iskEnabled}
              onChange={(e) => setIskEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Swedish ISK Tax</span>
          </label>
          {iskEnabled && (
            <div className="flex items-center gap-2">
              <label htmlFor="govRate" className="text-sm text-slate-500 dark:text-slate-400">
                Gov. Borrowing Rate (%)
              </label>
              <input
                id="govRate"
                type="number"
                value={govBorrowingRate}
                onChange={(e) => setGovBorrowingRate(Number(e.target.value))}
                min="0"
                max="10"
                step="0.1"
                className="w-24 px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Period Editor */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Life Periods
          </h2>
          <div className="space-y-4">
            {periods.map((period, index) => {
              const endAge = index === periods.length - 1 ? 100 : periods[index + 1].startAge
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Period {index + 1}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Age {period.startAge} – {endAge}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Start Age
                      </label>
                      <input
                        type="number"
                        value={period.startAge}
                        onChange={(e) => updatePeriod(index, 'startAge', Number(e.target.value))}
                        min="18"
                        max="100"
                        className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        Monthly Save
                      </label>
                      <input
                        type="number"
                        value={period.monthlyContribution}
                        onChange={(e) => updatePeriod(index, 'monthlyContribution', Number(e.target.value))}
                        min="0"
                        step="100"
                        className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
                        Monthly Spend
                      </label>
                      <input
                        type="number"
                        value={period.monthlySpending}
                        onChange={(e) => updatePeriod(index, 'monthlySpending', Number(e.target.value))}
                        min="0"
                        step="100"
                        className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Return %
                      </label>
                      <input
                        type="number"
                        value={period.annualReturn ?? ''}
                        onChange={(e) => updatePeriod(index, 'annualReturn', e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder={`${annualReturn}`}
                        min="0"
                        max="20"
                        step="0.5"
                        className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  {periods.length > 1 && (
                    <button
                      onClick={() => removePeriod(index)}
                      className="mt-3 text-sm text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition"
                    >
                      Remove period
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button
            onClick={addPeriod}
            className="mt-4 w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition"
          >
            + Add Period
          </button>
        </section>

        {/* Divider */}
        <hr className="border-slate-200 dark:border-slate-700 mb-8" />

        {/* Period Summaries */}
        <div className="space-y-4 mb-8">
          {periodSummaries.map(({ period, index, startResult }) => {
            if (!startResult) return null

            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500"
              >
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Period {index + 1}
                  <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                    Age {period.startAge}–{period.endAge}
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Balance at Start
                    </div>
                    <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(startResult.balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Monthly Save
                    </div>
                    <div className="text-xl font-bold tabular-nums text-green-600 dark:text-green-400">
                      {formatCurrency(period.monthlyContribution)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Monthly Spend
                    </div>
                    <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatCurrency(period.monthlySpending)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Withdrawal Rate
                    </div>
                    <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {startResult.withdrawalRate > 0 ? `${startResult.withdrawalRate.toFixed(2)}%` : '–'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Period Length
                    </div>
                    <div className="text-xl font-bold tabular-nums text-slate-700 dark:text-slate-300">
                      {period.endAge - period.startAge} years
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Return Rate
                    </div>
                    <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {(period.annualReturn ?? annualReturn).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-slate-800 dark:text-slate-200">
            Growth Over Time
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={results}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="age"
                label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                className="text-slate-600 dark:text-slate-400"
              />
              <YAxis
                tickFormatter={(value) => `${getCurrencySymbol()}${(value / 1000).toFixed(0)}k`}
                label={{ value: `Amount (${getCurrencySymbol()})`, angle: -90, position: 'insideLeft' }}
                className="text-slate-600 dark:text-slate-400"
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(age) => `Age ${age}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#2563eb"
                strokeWidth={3}
                name="Total Balance"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="contributions"
                stroke="#94a3b8"
                strokeWidth={2}
                name="Total Contributions"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="growth"
                stroke="#16a34a"
                strokeWidth={2}
                name="Investment Growth"
                dot={false}
              />
              {inflationRate > 0 && (
                <Line
                  type="monotone"
                  dataKey="realBalance"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Real Balance (Today's Money)"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Age-by-Age Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Age
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Balance
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Contributions
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Growth
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Real Bal.
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    WR %
                  </th>
                  {iskEnabled && (
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Cum. Tax
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {results.map((result) => {
                  const isPeriodStart = periods.some(p => p.startAge === result.age)
                  return (
                    <tr
                      key={result.age}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
                        isPeriodStart ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-slate-800 dark:text-slate-300">
                        {result.age}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-right text-slate-800 dark:text-slate-300">
                        {formatCurrency(result.balance)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-right text-slate-800 dark:text-slate-300">
                        {formatCurrency(result.contributions)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-right text-slate-800 dark:text-slate-300">
                        {formatCurrency(result.growth)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-right text-slate-800 dark:text-slate-300">
                        {formatCurrency(result.realBalance)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-right text-slate-800 dark:text-slate-300">
                        {result.withdrawalRate > 0 ? `${result.withdrawalRate.toFixed(2)}%` : '–'}
                      </td>
                      {iskEnabled && (
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm tabular-nums text-right text-slate-800 dark:text-slate-300">
                          {result.taxPaid > 0 ? formatCurrency(result.taxPaid) : '–'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App

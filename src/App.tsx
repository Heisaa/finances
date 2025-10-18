import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { calculateGrowth, type Period } from './calculator'

function App() {
  const [initialAmount, setInitialAmount] = useState<number>(900000)
  const [annualReturn, setAnnualReturn] = useState<number>(7)
  const [currency, setCurrency] = useState<'USD' | 'SEK'>('SEK')
  const [periods, setPeriods] = useState<Period[]>([
    { startAge: 35, endAge: 65, monthlyContribution: 10000, monthlySpending: 0 },
    { startAge: 65, endAge: 100, monthlyContribution: 0, monthlySpending: 3000 }
  ])

  // Calculate end ages automatically - each period ends when the next one starts
  const periodsWithEndAges: Period[] = periods.map((period, index) => {
    if (index === periods.length - 1) {
      // Last period always ends at 100
      return { ...period, endAge: 100 }
    } else {
      // Other periods end when the next one starts
      return { ...period, endAge: periods[index + 1].startAge }
    }
  })

  const results = calculateGrowth({
    initialAmount,
    periods: periodsWithEndAges,
    annualReturn,
    endAge: 100
  })

  // Get withdrawal rate for each period's start age
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
      endAge: 100, // This will be recalculated automatically
      monthlyContribution: 0,
      monthlySpending: 0
    }])
  }

  const removePeriod = (index: number) => {
    if (periods.length > 1) {
      setPeriods(periods.filter((_, i) => i !== index))
    }
  }

  const updatePeriod = (index: number, field: keyof Period, value: number) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-indigo-600 dark:text-indigo-400">
          Index Fund Growth Calculator
        </h1>

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-end mb-4">
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    currency === 'USD'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => setCurrency('SEK')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    currency === 'SEK'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  SEK (kr)
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label htmlFor="initial" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Initial Investment
                  </label>
                  <input
                    id="initial"
                    type="number"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Number(e.target.value))}
                    min="0"
                    step="1000"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="return" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Life Periods</h3>
                  <button
                    onClick={addPeriod}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    + Add Period
                  </button>
                </div>

                <div className="space-y-4">
                  {periods.map((period, index) => {
                    const endAge = index === periods.length - 1 ? 100 : periods[index + 1].startAge
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Start Age {index === periods.length - 1 ? '(to 100)' : `(to ${endAge})`}
                          </label>
                          <input
                            type="number"
                            value={period.startAge}
                            onChange={(e) => updatePeriod(index, 'startAge', Number(e.target.value))}
                            min="18"
                            max="100"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Monthly Save
                          </label>
                          <input
                            type="number"
                            value={period.monthlyContribution}
                            onChange={(e) => updatePeriod(index, 'monthlyContribution', Number(e.target.value))}
                            min="0"
                            step="100"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Monthly Spend
                          </label>
                          <input
                            type="number"
                            value={period.monthlySpending}
                            onChange={(e) => updatePeriod(index, 'monthlySpending', Number(e.target.value))}
                            min="0"
                            step="100"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => removePeriod(index)}
                            disabled={periods.length === 1}
                            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {periodSummaries.map(({ period, index, startResult }) => {
              if (!startResult) return null

              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-lg p-8 border border-indigo-200 dark:border-indigo-800"
                >
                  <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">
                    Period {index + 1} (Age {period.startAge}-{period.endAge})
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Balance at Start
                      </div>
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(startResult.balance)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Monthly Save
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(period.monthlyContribution)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Monthly Spend
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(period.monthlySpending)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Withdrawal Rate
                      </div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {startResult.withdrawalRate > 0 ? `${startResult.withdrawalRate.toFixed(2)}%` : '-'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Period Length
                      </div>
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {period.endAge - period.startAge} years
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
              Growth Over Time
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={results}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis
                  dataKey="age"
                  label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                  className="text-gray-700 dark:text-gray-300"
                />
                <YAxis
                  tickFormatter={(value) => `${getCurrencySymbol()}${(value / 1000).toFixed(0)}k`}
                  label={{ value: `Amount (${getCurrencySymbol()})`, angle: -90, position: 'insideLeft' }}
                  className="text-gray-700 dark:text-gray-300"
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(age) => `Age ${age}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366f1"
                  strokeWidth={3}
                  name="Total Balance"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="contributions"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  name="Total Contributions"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Investment Growth"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Age-by-Age Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Contributions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Growth
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Withdrawal Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result) => {
                    const isPeriodStart = periods.some(p => p.startAge === result.age)
                    return (
                      <tr
                        key={result.age}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                          isPeriodStart ? 'bg-indigo-50 dark:bg-indigo-900/20 font-semibold' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {result.age}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {formatCurrency(result.balance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {formatCurrency(result.contributions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {formatCurrency(result.growth)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {result.withdrawalRate > 0 ? `${result.withdrawalRate.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

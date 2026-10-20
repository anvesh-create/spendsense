export type CategoryChartInput = {
  name?: string | null
  amount: string | number
}

export type CategoryBudgetStatus = 'over' | 'approaching' | 'within' | null

export type CategoryChartDatum = {
  name: string
  amount: number
  percentage: number
  budgetStatus: CategoryBudgetStatus
  budgetReason: string
}

export type MonthlyInput = {
  month: string
  income: string | number
  expenses: string | number
}

export type CashFlowDatum = {
  month: string
  income: number
  expenses: number
}

const amountValue = (amount: string | number): number => {
  const value = Number(amount)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function buildCategoryChartData(
  categories: CategoryChartInput[] | null | undefined,
  budgets: Record<string, string> = {},
): CategoryChartDatum[] {
  const totals = new Map<string, number>()
  for (const category of categories || []) {
    const name = category.name?.trim() || 'Uncategorized'
    const amount = amountValue(category.amount)
    if (amount > 0) totals.set(name, (totals.get(name) || 0) + amount)
  }
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0)
  if (!total) return []

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, amount]) => {
      const budget = amountValue(budgets[name] || 0)
      const ratio = budget ? amount / budget : 0
      const budgetStatus: CategoryBudgetStatus = !budget
        ? null
        : ratio > 1
          ? 'over'
          : ratio >= 0.8
            ? 'approaching'
            : 'within'
      const budgetReason = budgetStatus === 'over'
        ? `Over budget: ${Math.round(ratio * 100)}% of the configured budget.`
        : budgetStatus === 'approaching'
          ? `Approaching budget: ${Math.round(ratio * 100)}% of the configured budget.`
          : budgetStatus === 'within'
            ? `Within budget: ${Math.round(ratio * 100)}% of the configured budget.`
            : ''
      return {
        name,
        amount,
        percentage: Math.round(amount / total * 1000) / 10,
        budgetStatus,
        budgetReason,
      }
    })
}

export function buildCashFlowTimeline(monthly: MonthlyInput[] | null | undefined): CashFlowDatum[] {
  const buckets = new Map<string, CashFlowDatum>()
  for (const item of monthly || []) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)) continue
    const bucket = buckets.get(item.month) || { month: item.month, income: 0, expenses: 0 }
    bucket.income += amountValue(item.income)
    bucket.expenses += amountValue(item.expenses)
    buckets.set(item.month, bucket)
  }
  const months = [...buckets.keys()].sort()
  if (!months.length) return []

  const start = new Date(`${months[0]}-01T00:00:00Z`)
  const end = new Date(`${months[months.length - 1]}-01T00:00:00Z`)
  const result: CashFlowDatum[] = []
  for (const cursor = start; cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const month = cursor.toISOString().slice(0, 7)
    result.push(buckets.get(month) || { month, income: 0, expenses: 0 })
  }
  return result
}

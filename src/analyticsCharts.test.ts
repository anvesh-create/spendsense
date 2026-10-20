import { describe, expect, it } from 'vitest'
import { buildCashFlowTimeline, buildCategoryChartData } from './analyticsCharts'

describe('analytics chart data', () => {
  it('returns no category slices for empty or zero-value expenses', () => {
    expect(buildCategoryChartData([])).toEqual([])
    expect(buildCategoryChartData([{ name: 'Food', amount: '0' }, { name: 'Bills', amount: '-12' }])).toEqual([])
  })

  it('normalizes single, multiple, repeated, and missing category names', () => {
    expect(buildCategoryChartData([{ name: ' Food ', amount: '25.00' }])).toEqual([
      { name: 'Food', amount: 25, percentage: 100, budgetStatus: null, budgetReason: '' },
    ])
    const result = buildCategoryChartData([
      { name: 'Food', amount: '30.00' },
      { name: 'Food', amount: 10 },
      { name: '', amount: '50' },
      { name: null, amount: '10' },
    ])
    expect(result).toEqual([
      { name: 'Food', amount: 40, percentage: 40, budgetStatus: null, budgetReason: '' },
      { name: 'Uncategorized', amount: 60, percentage: 60, budgetStatus: null, budgetReason: '' },
    ])
  })

  it('classifies categories only against configured budgets', () => {
    const result = buildCategoryChartData([
      { name: 'Over', amount: '120' },
      { name: 'Near', amount: '80' },
      { name: 'Healthy', amount: '40' },
      { name: 'No budget', amount: '5000' },
    ], { Over: '100', Near: '100', Healthy: '100' })
    expect(result.find(item => item.name === 'Over')).toMatchObject({
      budgetStatus: 'over',
      budgetReason: 'Over budget: 120% of the configured budget.',
    })
    expect(result.find(item => item.name === 'Near')?.budgetStatus).toBe('approaching')
    expect(result.find(item => item.name === 'Healthy')?.budgetStatus).toBe('within')
    expect(result.find(item => item.name === 'No budget')?.budgetStatus).toBeNull()
  })

  it('aggregates monthly values, fills missing months, and ignores invalid months', () => {
    expect(buildCashFlowTimeline([
      { month: '2026-01', income: '1000.00', expenses: '250.00' },
      { month: '2026-03', income: 300, expenses: '0' },
      { month: '2026-03', income: '200', expenses: 50 },
      { month: 'not-a-month', income: 99999, expenses: 99999 },
    ])).toEqual([
      { month: '2026-01', income: 1000, expenses: 250 },
      { month: '2026-02', income: 0, expenses: 0 },
      { month: '2026-03', income: 500, expenses: 50 },
    ])
    expect(buildCashFlowTimeline([])).toEqual([])
  })
})

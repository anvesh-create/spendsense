import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowDownRight, ArrowLeftRight, ArrowRight, BarChart3, CalendarDays, Check,
  ChevronDown, Clock3, Download, FileSpreadsheet, FileText, Filter, Home, IndianRupee,
  Languages, LoaderCircle, LockKeyhole, Menu, MessageCircle, Moon, MoreVertical, Plus,
  Search, Send, Settings as SettingsIcon, Sun, TableProperties, Trash2, Upload, Wallet, X,
  CircleAlert, Paperclip, RotateCcw, Accessibility,
  Utensils, ShoppingBag, CarFront,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, ImportRecord, Merchant, Settings as UserSettings, Summary, Tx } from './api'
import { buildCashFlowTimeline, buildCategoryChartData, CategoryChartDatum } from './analyticsCharts'
import {
  DEFAULT_SETTINGS, getLanguageDirection, getLanguageLocale, readLocalPreferences,
  resolveTheme, saveLocalPreferences, settingsFromApi, validateSettingsPreferences,
} from './settingsPreferences'
import { LANGUAGE_OPTIONS, translateSettings } from './settingsTranslations'

const LOGO = '/assets/compass-logo.png'
const NAV = [
  { to: '/overview', label: 'Dashboard', icon: Home },
  { to: '/transactions', label: 'Transactions', icon: FileText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/spending', label: 'Individual Spending', icon: Activity },
  { to: '/compare', label: 'Compare Imports', icon: ArrowLeftRight },
  { to: '/reports', label: 'Download Overview Report', icon: Download },
]
const COLORS = ['#168565', '#279c79', '#4eb394', '#72c3a5', '#9ad6bd', '#b4daca', '#ef9e63', '#ef7184', '#9a7bd5', '#569ddd']
const CATEGORY_COLORS = ['#2563EB', '#7C3AED', '#0E7490', '#4F46E5', '#475569', '#0891B2', '#6D28D9', '#334155', '#0369A1', '#5B21B6']
const moneyFmt = (amount: string | number, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0)
const shortDate = (value: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'

function Brand({ small = false }: { small?: boolean }) {
  return <Link className={`brand ${small ? 'brand-small' : ''}`} to="/"><img src={LOGO} alt="SpendSense compass" /><span>spendsense</span></Link>
}

function ImportPage({ onImported, defaultCurrency, dark }: { onImported: (value: ImportRecord) => void; defaultCurrency: string; dark: boolean }) {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [currency, setCurrency] = useState(defaultCurrency)
  useEffect(() => setCurrency(defaultCurrency), [defaultCurrency])
  const choose = (candidate?: File) => {
    if (!candidate) return
    setFile(candidate)
    setError('')
  }
  const submit = async () => {
    if (!file) {
      document.getElementById('statement-file')?.click()
      return
    }
    setBusy(true)
    setError('')
    try {
      const imported = await api.upload(file, currency)
      onImported(imported)
      navigate('/overview')
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main className={`import-screen ${dark ? 'theme-dark' : ''}`}>
    <Brand />
    <p className="tagline">Your Personal Budget &amp; Spending Insight Agent</p>
    <input id="statement-file" className="sr-only" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])} />
    <div className="import-card">
      <button className={`dropzone ${dragging ? 'dropzone-active' : ''}`} onClick={() => !file && document.getElementById('statement-file')?.click()}
        onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]) }}>
        <Upload size={46} strokeWidth={2.2} />
        <strong>{file ? 'Statement selected' : 'Import'}</strong>
        <span>{file ? 'Review the file details below, then analyze it' : 'Upload your bank statement'}</span>
        <small>Supports CSV, Excel (XLSX), and text-based PDF files · Max 10 MB</small>
      </button>
      {file && <div className="file-row"><FileSpreadsheet size={35} className="file-icon" /><div className="file-meta"><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB · {file.type || 'File selected'}</span></div>
        <button className="icon-button" title="Replace file" onClick={() => document.getElementById('statement-file')?.click()}><Upload size={18} /></button>
        <button className="icon-button danger-text" title="Remove file" onClick={() => { setFile(null); setError('') }}><X size={19} /></button>
      </div>}
      <label className="upload-currency">Statement currency (amounts are not converted)
        <select value={currency} onChange={event=>setCurrency(event.target.value)}><option value="INR">Indian Rupee (INR)</option><option value="USD">US Dollar (USD)</option><option value="EUR">Euro (EUR)</option><option value="GBP">British Pound (GBP)</option></select>
      </label>
      {error && <div className="alert-error" role="alert"><CircleAlert size={19} />{error}</div>}
      {busy && <div className="processing"><LoaderCircle className="spin" size={20} /> Validating transactions and preparing your overview…</div>}
      {file && <button className="button button-primary import-submit" disabled={busy} onClick={submit}>{busy ? 'Analyzing statement…' : 'Analyze statement'} <ArrowRight size={18} /></button>}
    </div>
    <div className="import-actions">
      <button className="button button-primary" onClick={() => navigate('/overview')}><BarChart3 size={19} /> Overview</button>
      <button className="button button-outline" onClick={() => navigate('/history')}><Clock3 size={19} /> History</button>
    </div>
    <p className="privacy-note">Your statement is processed locally by this single-user app and is not publicly shared.</p>
  </main>
}

function AppShell({ children, imports, activeId, dark, onSearch, onSelectImport, search, mobileOpen, setMobileOpen }: {
  children: React.ReactNode; imports: ImportRecord[]; activeId: string
  dark: boolean
  onSearch: (value: string) => void; onSelectImport: (id: string) => void; search: string; mobileOpen: boolean; setMobileOpen: (value: boolean) => void
}) {
  const navigate = useNavigate()
  const [results, setResults] = useState<any>(null)
  useEffect(() => {
    if (!search.trim()) { setResults(null); return }
    const timer = window.setTimeout(() => api.search(search).then(setResults).catch(() => setResults(null)), 180)
    return () => window.clearTimeout(timer)
  }, [search])
  return <div className={`app-shell ${dark ? 'theme-dark' : ''}`}>
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}><Menu /></button>
      <Brand small />
      <div className="global-search"><Search size={20} /><input value={search} onChange={event => onSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && navigate(`/search?q=${encodeURIComponent(search)}`)} placeholder="Search overviews, transactions, categories…" aria-label="Search SpendSense" />
        {search && <button className="icon-button clear-search" aria-label="Clear search" onClick={() => onSearch('')}><X size={16} /></button>}
        {results && search && <div className="search-popover">
          {results.imports?.length === 0 && results.transactions?.length === 0 && <p>No matching results</p>}
          {results.imports?.map((item: any) => <button key={item.id} onClick={() => { onSelectImport(item.id); navigate('/overview'); onSearch('') }}><FileSpreadsheet size={17} /><span><b>{item.filename}</b><small>Statement overview · {shortDate(item.start_date)}</small></span></button>)}
          {results.transactions?.map((item: Tx) => <button key={item.id} onClick={() => { onSelectImport(item.import_id); navigate('/transactions'); onSearch('') }}><FileText size={17} /><span><b>{item.description}</b><small>{shortDate(item.tx_date)} · {item.category}</small></span></button>)}
        </div>}
      </div>
      <div className="top-actions">
        <NavLink className="top-icon" aria-label="Settings" to="/settings"><SettingsIcon size={22} /></NavLink>
        <NavLink className="avatar avatar-history" title="Past Overviews" to="/history">PO</NavLink>
        <NavLink className="avatar avatar-agent" title="Personal Agent" to="/agent">PA</NavLink>
      </div>
    </header>
    <div className="workspace">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <nav aria-label="Main navigation">{NAV.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}
          <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><SettingsIcon size={20} /><span>Settings</span></NavLink>
          <NavLink to="/agent" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><MessageCircle size={20} /><span>Personal Agent</span></NavLink>
        </nav>
        <div className="sidebar-bottom">
          <label htmlFor="active-import">Current statement</label>
          <select id="active-import" value={activeId} onChange={event => { localStorage.setItem('spendsense.activeImport', event.target.value); window.location.reload() }}>
            <option value="">Select a statement</option>
            {imports.map(item => <option value={item.id} key={item.id}>{item.filename}</option>)}
          </select>
          <Link to="/" className="button button-outline upload-another"><Upload size={17} /> Import statement</Link>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="content">{children}</main>
    </div>
  </div>
}

function PageHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}</div>
}
function EmptyState({ title = 'No statement selected', message = 'Import a bank statement to see your real financial insights.' }: { title?: string; message?: string }) {
  return <div className="empty-state"><div className="empty-icon"><FileSpreadsheet size={30} /></div><h2>{title}</h2><p>{message}</p><Link className="button button-primary" to="/"><Upload size={17} /> Import statement</Link></div>
}
function Metric({ label, value, icon: Icon, tone = 'green', hint }: { label: string; value: string; icon: any; tone?: string; hint?: string }) {
  return <article className="metric-card"><div className={`metric-icon tone-${tone}`}><Icon size={22} /></div><div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div></article>
}
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="panel"><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</section>
}
function useData(importId: string, period = 'all') {
  const [data, setData] = useState<Summary | null>(null)
  const [meta, setMeta] = useState<ImportRecord | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const reload = useCallback(async () => {
    if (!importId) { setData(null); setMeta(null); return }
    setLoading(true)
    try {
      const today = new Date()
      const start = period === 'month' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01` : ''
      const end = period === 'month' ? today.toISOString().slice(0, 10) : ''
      const result = await api.overview(importId, start, end)
      setData(result.summary); setMeta(result.import); setError('')
    } catch (err) { setError(errorText(err)); setData(null) } finally { setLoading(false) }
  }, [importId, period])
  useEffect(() => { void reload() }, [reload])
  return { data, meta, error, loading, reload }
}
function PeriodDate({ value, onChange, meta }: { value: string; onChange: (value: string) => void; meta: ImportRecord | null }) {
  const now = new Date()
  const current = value === 'month' ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` : ''
  return <label className="date-range"><CalendarDays size={17} /><select aria-label="Statement period" value={value} onChange={event => onChange(event.target.value)}>
    <option value="all">{meta ? `${shortDate(meta.start_date)} – ${shortDate(meta.end_date)}` : 'Choose period'}</option>
    <option value="month">This month {current ? `(${current})` : ''}</option>
  </select><ChevronDown size={15} /></label>
}
function HomePage({ id }: { id: string }) {
  const [period, setPeriod] = useState('all')
  const { data, meta, error, loading } = useData(id, period)
  const [categoryMode, setCategoryMode] = useState(false)
  const navigate = useNavigate()
  if (!id) return <><PageHeading title="Dashboard" subtitle="Your financial overview and spending insights" /><EmptyState /></>
  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel error={error} />
  if (!data || data.transaction_count === 0) return <><PageHeading title="Dashboard" /><EmptyState title="No transactions available" message="This statement has no transactions to summarize." /></>
  const recent = data.recent_transactions
  return <>
    <PageHeading title="Overview" subtitle="Your personal budget & spending insights"><PeriodDate value={period} onChange={setPeriod} meta={meta} /></PageHeading>
    <div className="metric-grid">
      <Metric label="Total Income" value={moneyFmt(data.income, meta?.currency)} icon={ArrowRight} hint="Recorded credits" />
      <Metric label="Total Expenses" value={moneyFmt(data.expenses, meta?.currency)} icon={ArrowDownRight} tone="red" hint="Recorded debits excluding transfers" />
      <Metric label="Net Cash Flow" value={moneyFmt(data.net_flow, meta?.currency)} icon={Wallet} tone="blue" hint="Income − expenses" />
      <Metric label="Transactions" value={String(data.transaction_count)} icon={TableProperties} tone="purple" hint="In selected statement" />
    </div>
    <div className="dashboard-grid">
      <Card title="Spending by Category" action={<button className="text-action" onClick={() => setCategoryMode(!categoryMode)}>{categoryMode ? 'Show share' : 'Show amounts'}</button>}>
        {data.category_totals.length ? <div className="chart-with-legend"><div className="pie-wrap"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data.category_totals} dataKey="amount" nameKey="name" innerRadius={0} outerRadius={98} paddingAngle={1}>{data.category_totals.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: any) => moneyFmt(value, meta?.currency)} /></PieChart></ResponsiveContainer></div><div className="legend-list">{data.category_totals.map((category, index) => <div key={category.name} className="legend-row"><i style={{ background: COLORS[index % COLORS.length] }} /><span>{category.name}</span><b>{categoryMode ? `${category.percentage}%` : moneyFmt(category.amount, meta?.currency)}</b></div>)}</div></div> : <p className="muted">No expense categories found.</p>}
        <div className="chart-total"><span>Total Expenses</span><strong>{moneyFmt(data.expenses, meta?.currency)}</strong></div>
      </Card>
      <Card title="Recent Transactions" action={<button className="text-action" onClick={() => navigate('/transactions')}>View all <ArrowRight size={14} /></button>}>
        <TransactionTable rows={recent} currency={meta?.currency || 'INR'} compact />
      </Card>
      <Card title="Monthly Income vs Expenses">
        {data.monthly.length ? <div className="chart-large"><ResponsiveContainer width="100%" height={260}><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value: any) => moneyFmt(value, meta?.currency)} /><Legend /><Bar dataKey="income" fill="#168565" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" fill="#76c8a8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="muted">Not enough dated transactions for a monthly trend.</p>}
      </Card>
      <Card title="Top Merchant Spending" action={<button className="text-action" onClick={() => navigate('/spending')}>View all <ArrowRight size={14} /></button>}>
        <MerchantBars merchants={data.merchant_totals.slice(0, 5)} currency={meta?.currency || 'INR'} />
      </Card>
    </div>
  </>
}
function Loading() { return <div className="loading-block"><LoaderCircle className="spin" size={32} /><strong>Loading statement data…</strong></div> }
function ErrorPanel({ error }: { error: string }) { return <div className="alert-error page-error"><CircleAlert />{error}<Link to="/">Import a statement</Link></div> }
function TransactionTable({ rows, currency, compact = false }: { rows: Tx[]; currency: string; compact?: boolean }) {
  return <div className="table-wrap"><table className={compact ? 'compact-table' : ''}><thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="numeric">Amount</th></tr></thead><tbody>
    {rows.map(row => <tr key={row.id}><td>{shortDate(row.tx_date)}</td><td><strong>{row.merchant}</strong><small className="cell-subtitle">{row.description}</small></td><td><span className={`category-pill ${row.category === 'Income' ? 'pill-income' : ''}`}>{row.category}</span></td><td className={`numeric ${Number(row.amount) >= 0 ? 'positive' : 'negative'}`}>{Number(row.amount) > 0 ? '+' : ''}{moneyFmt(row.amount, currency)}</td></tr>)}
    {!rows.length && <tr><td colSpan={4} className="table-empty">No transactions match the selected filters.</td></tr>}
  </tbody></table></div>
}
function TransactionsPage({ id, currency }: { id: string; currency: string }) {
  const [rows, setRows] = useState<Tx[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('date')
  const [direction, setDirection] = useState('desc')
  const [total, setTotal] = useState(0)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [offset, setOffset] = useState(0)
  const pageSize = 50
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id) { setRows([]); return }
    const params = `&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&sort=${sort}&direction=${direction}&limit=${pageSize}&offset=${offset}${start ? `&start=${start}` : ''}${end ? `&end=${end}` : ''}`
    api.transactions(id, params).then(result => { setRows(result.items); setTotal(result.total); setError('') }).catch(err => setError(errorText(err)))
  }, [id, search, category, sort, direction, start, end, offset])
  if (!id) return <><PageHeading title="Transactions" subtitle="View imported transactions with categories and details." /><EmptyState /></>
  const toggleSort = (key: string) => { if (key === sort) setDirection(direction === 'asc' ? 'desc' : 'asc'); else { setSort(key); setDirection('asc') } }
  return <><PageHeading title="Transactions" subtitle={`${total} transactions in the selected statement.`} />
    <section className="panel"><div className="filter-row"><label className="filter-search"><Search size={17} /><input placeholder="Search description or merchant" value={search} onChange={event => {setSearch(event.target.value);setOffset(0)}} /></label>
      <label className="select-control"><Filter size={17} /><select value={category} onChange={event => setCategory(event.target.value)}><option value="">All Categories</option>{['Food & Dining','Shopping','Transport','Bills & Utilities','Housing','Healthcare','Entertainment','Travel','Education','Income','Transfer','Other'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="date-filter"><span>From</span><input type="date" value={start} onChange={event=>{setStart(event.target.value);setOffset(0)}}/></label><label className="date-filter"><span>To</span><input type="date" value={end} onChange={event=>{setEnd(event.target.value);setOffset(0)}}/></label>
    </div>{error ? <ErrorPanel error={error} /> : <><div className="table-wrap"><table><thead><tr>{[['date','Date'],['description','Description'],['category','Category'],['amount','Amount']].map(([key,label]) => <th key={key} onClick={() => {toggleSort(key);setOffset(0)}} className="sortable">{label} <ChevronDown size={13} /></th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{shortDate(row.tx_date)}</td><td><strong>{row.description}</strong><small className="cell-subtitle">{row.merchant}</small></td><td><span className={`category-pill ${row.category==='Income'?'pill-income':''}`}>{row.category}</span></td><td className={`numeric ${Number(row.amount)>=0?'positive':'negative'}`}>{moneyFmt(row.amount,currency)}</td></tr>)}{!rows.length && <tr><td colSpan={4} className="table-empty">No transactions match.</td></tr>}</tbody></table></div><div className="pagination"><span>{total ? `Showing ${offset+1}–${Math.min(offset+rows.length,total)} of ${total}` : 'No transactions'}</span><div><button className="button button-outline button-sm" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-pageSize))}>Previous</button><button className="button button-outline button-sm" disabled={offset+pageSize>=total} onClick={()=>setOffset(offset+pageSize)}>Next</button></div></div></>}</section>
  </>
}
function MerchantBars({ merchants, currency }: { merchants: Merchant[]; currency: string }) {
  const max = Math.max(...merchants.map(item => Number(item.amount)), 1)
  return <div className="merchant-bars">{merchants.map((merchant, index) => <div className="merchant-bar-row" key={merchant.name}><span className="merchant-icon">{index === 0 ? <Utensils size={16} /> : index === 1 ? <ShoppingBag size={16} /> : <CarFront size={16} />}</span><span className="merchant-name">{merchant.name}</span><span className="bar-track"><i style={{ width: `${Number(merchant.amount) / max * 100}%` }} /></span><b>{moneyFmt(merchant.amount, currency)}</b></div>)}{!merchants.length && <p className="muted">Merchant spending will appear after transactions are imported.</p>}</div>
}
function AnalyticsPage({ id, currency, budgets, budgetCurrency, language }: {
  id: string
  currency: string
  budgets: Record<string, string>
  budgetCurrency: string
  language: UserSettings['language']
}) {
  const [period, setPeriod] = useState('all')
  const { data, meta, error, loading } = useData(id, period)
  if (!id) return <><PageHeading title="Analytics" subtitle="Detailed insights into spending and income patterns" /><EmptyState /></>
  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel error={error} />
  if (!data) return null
  const budgetCurrencyMatches = currency === budgetCurrency
  const categories = buildCategoryChartData(data.category_totals, budgetCurrencyMatches ? budgets : {})
  const timeline = buildCashFlowTimeline(data.monthly)
  const categoryColors = new Map(categories.map((item, index) => {
    const budgetColor = item.budgetStatus === 'over' ? '#DC2626'
      : item.budgetStatus === 'approaching' ? '#D97706'
        : item.budgetStatus === 'within' ? '#168565' : CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    return [item.name, budgetColor]
  }))
  const locale = getLanguageLocale(language)
  const formatAmount = (value: number | string) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(Number(value) || 0)
  const formatMonth = (month: string) => {
    const date = new Date(`${month}-01T00:00:00Z`)
    return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date)
  }
  const compactAmount = (value: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  }).format(value)
  const categoryTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: CategoryChartDatum }> }) => {
    const item = payload?.[0]?.payload
    if (!active || !item) return null
    return <div className="analytics-tooltip">
      <strong>{item.name}</strong>
      <span>{formatAmount(item.amount)} · {item.percentage}% of spending</span>
      {item.budgetReason && <small>{item.budgetReason}</small>}
    </div>
  }
  return <><PageHeading title="Analytics" subtitle="Detailed insights into your spending and income patterns">
      <PeriodDate value={period} onChange={setPeriod} meta={meta} />
    </PageHeading>
    <div className="dashboard-grid">
      <Card title="Spending by Category">
        {!budgetCurrencyMatches && Object.keys(budgets).length > 0 && <p className="muted analytics-empty">Category budget status is hidden because the budget currency ({budgetCurrency}) differs from this statement ({currency}).</p>}
        {categories.length ? <div className="chart-with-legend">
          <div className="pie-wrap"><ResponsiveContainer width="100%" height={265}>
            <PieChart><Pie data={categories} dataKey="amount" nameKey="name" outerRadius={105} paddingAngle={categories.length > 1 ? 1 : 0}>
              {categories.map(item => <Cell key={item.name} fill={categoryColors.get(item.name)} />)}
            </Pie><Tooltip content={categoryTooltip} /></PieChart>
          </ResponsiveContainer></div>
          <div className="legend-list">{categories.map(item => <div className="legend-row" key={item.name}>
            <i style={{ background: categoryColors.get(item.name) }} /><span>{item.name}</span>
            <b>{formatAmount(item.amount)} <small>({item.percentage}%)</small></b>
            {item.budgetReason && <small className="analytics-budget-reason">{item.budgetReason}</small>}
          </div>)}</div>
        </div> : <p className="muted analytics-empty">No expense data for this period.</p>}
      </Card>
      <Card title="Spending vs. Deposits">
        {timeline.length ? <div className="chart-large analytics-trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline} margin={{ top: 8, right: 14, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={18} />
              <YAxis width={72} tickFormatter={compactAmount} />
              <Tooltip labelFormatter={formatMonth} formatter={(value: number | string, name: string) => [formatAmount(value), name]} />
              <Legend />
              <Line type="monotone" dataKey="expenses" name="Spending" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="income" name="Deposits" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div> : <p className="muted analytics-empty">No dated spending or deposit data for this period.</p>}
      </Card>
      <Card title="Monthly Income vs Expenses">{data.monthly.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(value:any)=>moneyFmt(value,currency)}/><Legend/><Bar dataKey="income" fill="#168565" radius={[4,4,0,0]}/><Bar dataKey="expenses" fill="#78c9a8" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer> : <p className="muted analytics-empty">No dated transactions for a monthly comparison.</p>}</Card>
      <Card title="Top Spending Categories"><MerchantBars merchants={data.category_totals.map(item=>({name:item.name,amount:item.amount,count:0})).slice(0,6)} currency={currency}/></Card>
      <Card title="Category Breakdown"><div className="table-wrap"><table><thead><tr><th>Category</th><th className="numeric">Amount</th><th className="numeric">Share</th></tr></thead><tbody>{categories.map(item=><tr key={item.name}><td>{item.name}{item.budgetReason&&<small className="cell-subtitle">{item.budgetReason}</small>}</td><td className="numeric">{formatAmount(item.amount)}</td><td className="numeric">{item.percentage}%</td></tr>)}{!categories.length&&<tr><td colSpan={3} className="table-empty">No categorized expenses yet.</td></tr>}</tbody></table></div></Card>
    </div>
  </>
}
function SpendingPage({ id, currency }: { id: string; currency: string }) {
  const { data, error } = useData(id)
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => (data?.merchant_totals || []).filter(row => row.name.toLowerCase().includes(search.toLowerCase())), [data,search])
  if (!id) return <><PageHeading title="Individual Spending" subtitle="Spending across merchants and sources." /><EmptyState /></>
  if (error) return <ErrorPanel error={error} />
  return <><PageHeading title="Individual Spending" subtitle="Spending across merchants and sources." />
    <section className="panel"><label className="filter-search spending-search"><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Filter merchants"/></label>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Merchant / Source</th><th>Transactions</th><th className="numeric">Total Spending</th><th>Spending Share</th></tr></thead><tbody>{filtered.map((item,index)=><tr key={item.name}><td>{index+1}</td><td><Link className="merchant-link" to={`/spending/${encodeURIComponent(item.name)}`}>{item.name}</Link></td><td>{item.count}</td><td className="numeric">{moneyFmt(item.amount,currency)}</td><td><div className="share-cell"><span className="bar-track"><i style={{width:`${item.amount && data?.expenses ? Number(item.amount)/Number(data.expenses)*100 : 0}%`}}/></span>{item.amount&&data?.expenses?Math.round(Number(item.amount)/Number(data.expenses)*100):0}%</div></td></tr>)}{!filtered.length&&<tr><td colSpan={5} className="table-empty">No merchant expenses found.</td></tr>}</tbody></table></div>
    </section>
  </>
}
function MerchantDetailPage({ id, currency }: { id: string; currency: string }) {
  const { merchant = '' } = useParams()
  const name = merchant
  const [detail, setDetail] = useState<{ merchant: string; transactions: Tx[]; total_spending: string } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id || !name) return
    api.merchantDetail(id, name).then(setDetail).catch(err => setError(errorText(err)))
  }, [id, name])
  if (!id) return <EmptyState />
  if (error) return <ErrorPanel error={error} />
  if (!detail) return <Loading />
  return <><PageHeading title={detail.merchant} subtitle={`${detail.transactions.length} transactions for this merchant`}><Link to="/spending" className="button button-outline"><ArrowRight size={16}/> All merchants</Link></PageHeading>
    <div className="metric-grid merchant-metric"><Metric label="Total Spending" value={moneyFmt(detail.total_spending,currency)} icon={Wallet}/><Metric label="Transactions" value={String(detail.transactions.length)} icon={TableProperties} tone="blue"/></div>
    <Card title="Transaction History"><TransactionTable rows={detail.transactions} currency={currency}/></Card>
  </>
}
function HistoryPage({ imports, onDelete, onOpen }: { imports: ImportRecord[]; onDelete: (id:string)=>Promise<void>; onOpen:(id:string)=>void }) {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const remove = async () => { setBusy(true); try { await onDelete(confirm); setConfirm(''); } catch (err) { setError(errorText(err)) } finally { setBusy(false) } }
  return <><PageHeading title="Past Overviews" subtitle="Reopen saved statement analyses" />
    {error&&<div className="alert-error">{error}</div>}
    <section className="panel">{imports.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Statement Name</th><th>Analysis Date</th><th>Statement Period</th><th>Action</th></tr></thead><tbody>{imports.map((item,index)=><tr key={item.id}><td>{index+1}</td><td><span className="file-name-cell"><FileSpreadsheet size={21}/><strong>{item.filename}</strong></span><small className="cell-subtitle">{item.transaction_count} transactions</small></td><td>{shortDate(item.imported_at)}</td><td>{shortDate(item.start_date)} – {shortDate(item.end_date)}</td><td><div className="table-actions"><button className="button button-outline button-sm" onClick={()=>onOpen(item.id)}><FileText size={15}/> Open Overview</button><button className="icon-button danger-text" aria-label={`Delete ${item.filename}`} onClick={()=>setConfirm(item.id)}><MoreVertical/></button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No saved overviews yet" message="Completed statement imports appear here so you can reopen them later." />}</section>
    {confirm&&<div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-icon"><Trash2/></div><h2 id="delete-title">Delete this overview?</h2><p>This removes the saved analysis and its transactions from this local database. This cannot be undone.</p><div className="dialog-actions"><button className="button button-outline" disabled={busy} onClick={()=>setConfirm('')}>Cancel</button><button className="button button-danger" disabled={busy} onClick={remove}>{busy?'Deleting…':'Delete overview'}</button></div></section></div>}
  </>
}
function ComparePage({ imports }: { imports: ImportRecord[] }) {
  const [left,setLeft]=useState(imports[0]?.id||''); const [right,setRight]=useState(imports[1]?.id||'')
  const [result,setResult]=useState<any>(null); const [error,setError]=useState('')
  useEffect(()=>{if(!left&&imports[0])setLeft(imports[0].id);if(!right&&imports[1])setRight(imports[1].id)},[imports,left,right])
  const compare=async()=>{try{setResult(await api.compare(left,right));setError('')}catch(err){setError(errorText(err))}}
  const metricNames:Record<string,string>={income:'Total Income',expenses:'Total Expenses',net_flow:'Net Cash Flow',transaction_count:'Total Transactions'}
  return <><PageHeading title="Compare Imports" subtitle="Compare spending across saved statements" />
    {imports.length<2?<EmptyState title="Two saved statements are needed" message="Import another bank statement to compare periods."/>:<>
      <div className="compare-selectors"><label>Select first statement<select value={left} onChange={e=>setLeft(e.target.value)}>{imports.map(item=><option value={item.id} key={item.id}>{item.filename} · {shortDate(item.start_date)}–{shortDate(item.end_date)}</option>)}</select></label><ArrowLeftRight className="compare-arrow"/><label>Select second statement<select value={right} onChange={e=>setRight(e.target.value)}>{imports.map(item=><option value={item.id} key={item.id}>{item.filename} · {shortDate(item.start_date)}–{shortDate(item.end_date)}</option>)}</select></label><button className="button button-primary" disabled={!left||!right||left===right} onClick={compare}>Compare</button></div>
      {error&&<div className="alert-error">{error}</div>}
      {result&&<><section className="panel"><div className="panel-heading"><h2>Summary Comparison</h2></div><div className="table-wrap"><table><thead><tr><th>Metric</th><th>{result.left.import.filename}</th><th>{result.right.import.filename}</th><th>Change</th></tr></thead><tbody>{Object.entries(metricNames).map(([key,label])=>{const a=result.left.summary[key],b=result.right.summary[key],change=result.changes[key];return <tr key={key}><td>{label}</td><td>{key==='transaction_count'?a:moneyFmt(a,result.left.import.currency)}</td><td>{key==='transaction_count'?b:moneyFmt(b,result.right.import.currency)}</td><td>{change.absolute}{change.percentage===null?' (baseline is zero)':` (${change.percentage}%)`}</td></tr>})}</tbody></table></div></section>
        <section className="panel"><div className="panel-heading"><h2>Category-wise Spending Comparison</h2></div><div className="table-wrap"><table><thead><tr><th>Category</th><th>{result.left.import.filename}</th><th>{result.right.import.filename}</th><th>Change</th></tr></thead><tbody>{result.categories.map((row:any)=><tr key={row.name}><td>{row.name}</td><td>{moneyFmt(row.left,result.left.import.currency)}</td><td>{moneyFmt(row.right,result.right.import.currency)}</td><td>{moneyFmt(row.change.absolute,result.right.import.currency)}{row.change.percentage===null?' (baseline is zero)':` (${row.change.percentage}%)`}</td></tr>)}</tbody></table></div></section></>}
    </>}
  </>
}
function ReportsPage({ id, meta, data }: { id:string; meta:ImportRecord|null; data:Summary|null }) {
  const [error,setError]=useState('');const [busy,setBusy]=useState('')
  const download=async(format:'pdf'|'csv')=>{if(!id)return;setBusy(format);setError('');try{await api.download(id,format)}catch(err){setError(errorText(err))}finally{setBusy('')}}
  if(!id)return <><PageHeading title="Download Overview Report" subtitle="Generate and download a summary of your imported bank statement."/><EmptyState/></>
  return <><PageHeading title="Download Overview Report" subtitle="Generate and download a summary of your imported bank statement."/>
    {error&&<div className="alert-error">{error}</div>}
    <section className="panel report-preview"><div className="panel-heading"><div><h2>Report Preview</h2><p>Summary of your transactions ({meta?`${shortDate(meta.start_date)} – ${shortDate(meta.end_date)}`:''})</p></div><small>Generated {new Date().toLocaleString()}</small></div>
      <div className="metric-grid report-metrics"><Metric label="Income" value={moneyFmt(data?.income||0,meta?.currency)} icon={ArrowRight}/><Metric label="Expenses" value={moneyFmt(data?.expenses||0,meta?.currency)} icon={ArrowDownRight} tone="red"/><Metric label="Net Cash Flow" value={moneyFmt(data?.net_flow||0,meta?.currency)} icon={Wallet} tone="blue"/></div>
      <div className="report-layout"><Card title="Spending by Category">{data?.category_totals.length?<div className="chart-with-legend"><div className="pie-wrap"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={data.category_totals} dataKey="amount" nameKey="name" innerRadius={62} outerRadius={100}>{data.category_totals.map((item,index)=><Cell key={item.name} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip formatter={(value:any)=>moneyFmt(value,meta?.currency)}/></PieChart></ResponsiveContainer></div><div className="legend-list">{data.category_totals.map((item,index)=><div key={item.name} className="legend-row"><i style={{background:COLORS[index%COLORS.length]}}/><span>{item.name}</span><b>{moneyFmt(item.amount,meta?.currency)}</b></div>)}</div></div>:<p className="muted">No expense categories.</p>}</Card>
        <div className="export-card"><div className="report-icon"><FileText size={36}/></div><h3>SpendSense Report</h3><p>{meta?.filename}<br/>{meta?`${shortDate(meta.start_date)} – ${shortDate(meta.end_date)}`:''}</p><button className="button button-primary" disabled={!!busy} onClick={()=>download('pdf')}><Download size={17}/>{busy==='pdf'?'Preparing…':'Download PDF'}</button><button className="button button-outline" disabled={!!busy} onClick={()=>download('csv')}><FileSpreadsheet size={17}/>{busy==='csv'?'Preparing…':'Export transactions CSV'}</button></div></div>
    </section>
  </>
}
function SettingsPage({ settings, onSave, onPreview }: {
  settings: UserSettings
  onSave: (settings: UserSettings) => Promise<void>
  onPreview: (settings: UserSettings) => void
}) {
  const [draft, setDraft] = useState(settings)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [languageSearch, setLanguageSearch] = useState('')
  const [categoryToAdd, setCategoryToAdd] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const t = (key: Parameters<typeof translateSettings>[1]) => translateSettings(draft.language, key)
  useEffect(() => setDraft(settings), [settings])

  const update = (next: UserSettings) => {
    setDraft(next)
    setSaveStatus('idle')
    setErrors({})
    onPreview(next)
  }
  const updateField = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    update({ ...draft, [key]: value })
  const save = async () => {
    const validation = validateSettingsPreferences(draft)
    if (Object.keys(validation).length) {
      setErrors(validation)
      setSaveStatus('idle')
      return
    }
    setSaveStatus('saving')
    setErrors({})
    try {
      await onSave(draft)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }
  const reset = async () => {
    setSaveStatus('saving')
    try {
      const defaults = { ...DEFAULT_SETTINGS, ai_configured: settings.ai_configured }
      await onSave(defaults)
      onPreview(defaults)
      setDraft(defaults)
      setErrors({})
      setSaveStatus('saved')
      setResetOpen(false)
    } catch {
      setSaveStatus('error')
    }
  }
  const filteredLanguages = LANGUAGE_OPTIONS.filter(option =>
    `${option.nativeName} ${option.englishName}`.toLocaleLowerCase().includes(languageSearch.toLocaleLowerCase()),
  )
  const selectableLanguages = filteredLanguages.some(option => option.code === draft.language)
    ? filteredLanguages
    : [LANGUAGE_OPTIONS.find(option => option.code === draft.language)!, ...filteredLanguages]
  const locale = getLanguageLocale(draft.language)
  const sampleDate = new Date(2026, 9, 20)
  const datePreview = draft.date_format === 'iso' ? '2026-10-20'
    : draft.date_format === 'dmy' ? '20/10/2026'
      : draft.date_format === 'mdy' ? '10/20/2026'
        : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(sampleDate)
  const numberPreview = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(12345.67)
  const categories = ['Food & Dining', 'Shopping', 'Transport', 'Bills & Utilities', 'Housing', 'Healthcare', 'Entertainment', 'Travel', 'Education', 'Other']
  const availableCategories = categories.filter(category => !(category in draft.category_budgets))
  const setCategoryBudget = (category: string, amount: string) => {
    updateField('category_budgets', { ...draft.category_budgets, [category]: amount })
  }
  const alertsDescription = t('alertLimits')
  const toggle = (label: string, value: boolean, onChange: (value: boolean) => void, disabled = false) =>
    <label className={`toggle-control ${disabled ? 'toggle-disabled' : ''}`}>
      <input type="checkbox" aria-label={label} checked={value} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true" /><b>{value ? t('on') : t('off')}</b>
    </label>

  return <div className="settings-page" lang={draft.language} dir={getLanguageDirection(draft.language)}>
    <PageHeading title={t('title')} subtitle={t('subtitle')} />
    <p className="settings-locale-note">{t('settingsOnly')}</p>
    <h2 className="settings-group-title">{t('general')}</h2>
    <div className="settings-list">
      <section className="setting-card">
        <div className="setting-symbol"><Sun aria-hidden="true" /></div>
        <div className="setting-copy"><h2>{t('appearance')}</h2><p>{t('appearanceDesc')}</p></div>
        <div className="segmented" role="group" aria-label={t('appearance')}>
          {(['light', 'dark', 'system'] as const).map(theme =>
            <button type="button" key={theme} aria-pressed={draft.theme === theme} className={draft.theme === theme ? 'selected' : ''} onClick={() => updateField('theme', theme)}>
              {theme === 'light' ? <Sun size={17} aria-hidden="true" /> : theme === 'dark' ? <Moon size={17} aria-hidden="true" /> : <SettingsIcon size={17} aria-hidden="true" />}
              {t(theme)}
            </button>,
          )}
        </div>
      </section>

      <section className="setting-card">
        <div className="setting-symbol"><Languages aria-hidden="true" /></div>
        <div className="setting-copy"><h2>{t('language')}</h2><p>{t('languageDesc')}</p></div>
        <div className="language-picker">
          <label className="sr-only" htmlFor="settings-language-search">{t('language')}</label>
          <input id="settings-language-search" type="search" value={languageSearch} placeholder={t('language')} onChange={event => setLanguageSearch(event.target.value)} />
          <label className="sr-only" htmlFor="settings-language">{t('language')}</label>
          <select id="settings-language" value={draft.language} onChange={event => updateField('language', event.target.value as UserSettings['language'])}>
            {selectableLanguages.map(option => <option value={option.code} key={option.code}>{option.nativeName} — {option.englishName}</option>)}
          </select>
        </div>
        <p className="setting-note setting-wide">{t('languageScope')}</p>
      </section>
    </div>

    <h2 className="settings-group-title">{t('budget')}</h2>
    <div className="settings-list">
      <section className="setting-card setting-card-stack">
        <div className="setting-section-heading"><div className="setting-symbol"><IndianRupee aria-hidden="true" /></div><div className="setting-copy"><h2>{t('overallBudget')}</h2><p>{t('overallHelp')}</p></div></div>
        <label className="settings-field"><span>{t('overallBudget')} ({draft.currency})</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.monthly_budget} aria-invalid={Boolean(errors.monthly_budget)} aria-describedby={errors.monthly_budget ? 'overall-budget-error' : undefined} onChange={event => updateField('monthly_budget', event.target.value)} placeholder={t('amountPlaceholder')} />{errors.monthly_budget && <small id="overall-budget-error" className="field-error">{errors.monthly_budget === 'Add an overall or category budget before enabling alert preferences.' ? t('budgetRequired') : t('amountError')}</small>}</label>
        <div className="category-budget-heading"><h3>{t('categoryBudgets')}</h3><div className="category-add"><select aria-label={t('categoryPlaceholder')} value={categoryToAdd} onChange={event => setCategoryToAdd(event.target.value)}><option value="">{t('categoryPlaceholder')}</option>{availableCategories.map(category => <option key={category}>{category}</option>)}</select><button className="button button-outline button-sm" type="button" disabled={!categoryToAdd} onClick={() => { updateField('category_budgets', { ...draft.category_budgets, [categoryToAdd]: '' }); setCategoryToAdd('') }}><Plus size={15} />{t('addCategory')}</button></div></div>
        {Object.entries(draft.category_budgets).map(([category, amount]) =>
          <div className="category-budget-row" key={category}>
            <label className="settings-field"><span>{category} ({draft.currency})</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} aria-invalid={Boolean(errors[`category:${category}`])} onChange={event => setCategoryBudget(category, event.target.value)} placeholder={t('amountPlaceholder')} />{errors[`category:${category}`] && <small className="field-error">{t('amountError')}</small>}</label>
            <button className="button button-outline button-sm" type="button" onClick={() => setCategoryBudget(category, '')}>{t('remove')}</button>
          </div>,
        )}
        <div className="setting-divider" />
        <div className="setting-inline"><div><h3>{t('alertPreferences')}</h3><p>{alertsDescription}</p></div>{toggle(t('enableAlerts'), draft.alerts_enabled, value => updateField('alerts_enabled', value))}</div>
        {draft.alerts_enabled && <>
          <label className="settings-field threshold-field"><span>{t('threshold')}</span><input type="number" min="1" max="100" step="1" value={draft.alert_threshold} aria-invalid={Boolean(errors.alert_threshold)} aria-describedby={errors.alert_threshold ? 'threshold-error' : undefined} onChange={event => updateField('alert_threshold', Number(event.target.value))} />{errors.alert_threshold && <small id="threshold-error" className="field-error">{t('thresholdError')}</small>}</label>
          <div className="setting-inline"><span>{t('reached')}</span>{toggle(t('reached'), draft.alert_on_reached, value => updateField('alert_on_reached', value))}</div>
          <div className="setting-inline"><span>{t('exceeded')}</span>{toggle(t('exceeded'), draft.alert_on_exceeded, value => updateField('alert_on_exceeded', value))}</div>
        </>}
      </section>
    </div>

    <h2 className="settings-group-title">{t('privacy')}</h2>
    <div className="settings-list">
      <section className="setting-card setting-card-stack">
        <div className="setting-section-heading"><div className="setting-symbol"><LockKeyhole aria-hidden="true" /></div><div className="setting-copy"><h2>{t('privacy')}</h2><p>{t('localData')} {t('noAuth')}</p></div></div>
        <div className="setting-inline"><div><h3>{t('hostedAi')}</h3><p>{settings.ai_configured ? t('hostedAiDesc') : t('aiUnavailable')}</p></div>{toggle(t('hostedAi'), draft.hosted_ai_enabled, value => updateField('hosted_ai_enabled', value), !settings.ai_configured && !draft.hosted_ai_enabled)}</div>
        <p className="setting-note">{t('hostedAiDesc')}</p>
        <p className="setting-note">Preference reset does not delete imported statements. Use History to delete an individual saved import; bulk export is available on Reports.</p>
      </section>
    </div>

    <h2 className="settings-group-title">{t('accessibility')}</h2>
    <div className="settings-list">
      <section className="setting-card"><div className="setting-symbol"><Accessibility aria-hidden="true" /></div><div className="setting-copy"><h2>{t('reducedMotion')}</h2><p>{t('reducedMotionDesc')}</p></div>{toggle(t('reducedMotion'), draft.reduced_motion, value => updateField('reduced_motion', value))}</section>
    </div>

    <h2 className="settings-group-title">{t('data')}</h2>
    <div className="settings-list">
      <section className="setting-card setting-card-stack">
        <div className="setting-row"><div className="setting-symbol"><IndianRupee aria-hidden="true" /></div><div className="setting-copy"><h2>{t('currency')}</h2><p>{t('currencyDesc')}</p></div><label className="settings-field"><span>{t('currency')}</span><select className="setting-select" value={draft.currency} onChange={event => updateField('currency', event.target.value)}><option value="INR">Indian Rupee (INR ₹)</option><option value="USD">US Dollar (USD $)</option><option value="EUR">Euro (EUR €)</option><option value="GBP">British Pound (GBP £)</option></select></label></div>
        <div className="setting-row"><div className="setting-symbol"><CalendarDays aria-hidden="true" /></div><div className="setting-copy"><h2>{t('dateFormat')}</h2><p>{t('localeFormat')} — preview only; other screens retain their current formatting.</p></div><label className="settings-field"><span>{t('dateFormat')}</span><select className="setting-select" value={draft.date_format} onChange={event => updateField('date_format', event.target.value as UserSettings['date_format'])}><option value="locale">{t('localeFormat')}</option><option value="dmy">{t('dmy')}</option><option value="mdy">{t('mdy')}</option><option value="iso">{t('iso')}</option></select></label></div>
        <div className="format-preview" aria-live="polite"><span>{datePreview}</span><span>{numberPreview}</span><span>{new Intl.NumberFormat(locale, { style: 'currency', currency: draft.currency, maximumFractionDigits: 2 }).format(12345.67)}</span></div>
      </section>
    </div>

    <div className="settings-footer">
      <div className="settings-status" role="status" aria-live="polite">
        {saveStatus === 'saving' && <><LoaderCircle size={16} className="spin" />{t('saving')}</>}
        {saveStatus === 'saved' && <><Check size={16} />{t('saved')}</>}
        {saveStatus === 'error' && <span className="field-error">{t('saveError')}</span>}
        {Object.keys(errors).length > 0 && <span className="field-error">{t('validation')}</span>}
      </div>
      <div className="settings-footer-actions">
        <button className="button button-outline" type="button" onClick={() => setResetOpen(true)}><RotateCcw size={16} />{t('reset')}</button>
        <button className="button button-primary" type="button" disabled={saveStatus === 'saving'} onClick={() => void save()}>{saveStatus === 'saving' ? t('saving') : t('save')}</button>
      </div>
    </div>
    {resetOpen && <div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-preferences-title">
      <div className="confirm-icon"><RotateCcw aria-hidden="true" /></div><h2 id="reset-preferences-title">{t('resetTitle')}</h2><p>{t('resetDesc')}</p>
      <div className="dialog-actions"><button className="button button-outline" type="button" disabled={saveStatus==='saving'} onClick={() => setResetOpen(false)}>{t('cancel')}</button><button className="button button-danger" type="button" disabled={saveStatus==='saving'} onClick={() => void reset()}>{saveStatus==='saving'?t('saving'):t('confirmReset')}</button></div>
    </section></div>}
  </div>
}
type ChatMessage={role:'agent'|'user';text:string}
function AgentPage({ id, settings }: { id:string; settings:UserSettings }) {
  const [messages,setMessages]=useState<ChatMessage[]>([{role:'agent',text:"Hello! I'm your Personal Agent. I can help you understand your spending using the selected imported statement. What would you like to know?"}])
  const [input,setInput]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  const ask=async(text=input)=>{if(!text.trim()||busy)return;setMessages(value=>[...value,{role:'user',text:text.trim()}]);setInput('');setError('');setBusy(true);try{const result=await api.agent(text,id);setMessages(value=>[...value,{role:'agent',text:result.notice?`${result.answer}\n\n${result.notice}`:result.answer}])}catch(err){setError(errorText(err))}finally{setBusy(false)}}
  if(!settings.agent_enabled)return <><PageHeading title="Personal Agent" subtitle="Ask questions about your imported spending"/><div className="empty-state"><MessageCircle size={30}/><h2>Personal Agent is disabled</h2><p>Enable it in Settings to ask questions about statement data.</p><Link to="/settings" className="button button-primary">Open Settings</Link></div></>
  const prompts=['Where did my money go?','How can I save more?','Show my largest expenses','What is my total income?']
  return <><PageHeading title="Personal Agent" subtitle="Ask questions about your imported spending"/>
    {!id?<EmptyState title="Import a statement first" message="The agent only answers questions based on a statement you import."/>:
    <section className="panel chat-panel"><div className="chat-history">{messages.map((message,index)=><div key={index} className={`chat-message ${message.role==='user'?'chat-user':''}`}><div className="agent-avatar">{message.role==='agent'?'PA':'You'}</div><div className="message-body"><p>{message.text}</p></div></div>)}{busy&&<div className="chat-message"><div className="agent-avatar">PA</div><div className="message-body"><LoaderCircle className="spin" size={18}/><span>Checking statement data…</span></div></div>}</div>
      {error&&<div className="alert-error">{error}</div>}
      <div className="prompt-row"><b>Try asking:</b>{prompts.map(prompt=><button className="prompt-chip" key={prompt} onClick={()=>ask(prompt)}>{prompt}</button>)}</div>
      <form className="chat-composer" onSubmit={event=>{event.preventDefault();void ask()}}><Paperclip size={19}/><input value={input} onChange={event=>setInput(event.target.value)} placeholder="Ask about your statement…" aria-label="Ask Personal Agent"/><button className="send-button" disabled={busy||!input.trim()} aria-label="Send message"><Send size={19}/></button></form>
      <p className="agent-disclaimer">{settings.hosted_ai_enabled&&settings.ai_configured?'Hosted AI is enabled by your Settings choice. Your question and summarized data from this statement may be sent to the configured provider.':'Answers use deterministic calculations from the selected local statement; no data is sent to a hosted AI provider.'} No connected bank accounts.</p>
    </section>}
  </>;
}
function SearchPage({ onSelectImport }: { onSelectImport: (id:string)=>void }) {
  const location=useLocation();const query=new URLSearchParams(location.search).get('q')||''
  const [result,setResult]=useState<any>(null);const [error,setError]=useState('')
  useEffect(()=>{if(query)api.search(query).then(setResult).catch(err=>setError(errorText(err)))},[query])
  return <><PageHeading title="Search Results" subtitle={query?`Results for “${query}”`:'Search your statements and transactions'}/>{error&&<div className="alert-error">{error}</div>}
    <section className="panel"><h2>Saved statements</h2>{result?.imports?.map((item:any)=><Link className="search-result-row" to="/overview" key={item.id} onClick={()=>onSelectImport(item.id)}><FileSpreadsheet/><span><b>{item.filename}</b><small>{shortDate(item.start_date)} – {shortDate(item.end_date)}</small></span></Link>)}{result&&result.imports.length===0&&<p className="muted">No matching statements.</p>}</section>
    <section className="panel"><h2>Transactions</h2>{result?.transactions?.map((item:Tx)=><Link className="search-result-row" to="/transactions" key={item.id} onClick={()=>onSelectImport(item.import_id)}><FileText/><span><b>{item.description}</b><small>{shortDate(item.tx_date)} · {item.merchant} · {item.category}</small></span><strong>{moneyFmt(item.amount)}</strong></Link>)}{result&&result.transactions.length===0&&<p className="muted">No matching transactions.</p>}</section>
  </>
}
export default function App() {
  const location=useLocation()
  const [imports,setImports]=useState<ImportRecord[]>([])
  const [activeId,setActiveId]=useState(localStorage.getItem('spendsense.activeImport')||'')
  const [settings,setSettings]=useState<UserSettings>(()=>({...DEFAULT_SETTINGS,...readLocalPreferences(window.localStorage)}))
  const [dark,setDark]=useState(()=>resolveTheme(settings.theme,window.matchMedia('(prefers-color-scheme: dark)').matches)==='dark')
  const [search,setSearch]=useState('');const [mobileOpen,setMobileOpen]=useState(false)
  const selected=imports.some(item=>item.id===activeId)?activeId:(imports[0]?.id||'')
  const current=imports.find(item=>item.id===selected)||null
  useEffect(()=>{api.imports().then(items=>{setImports(items);if(!localStorage.getItem('spendsense.activeImport')&&items[0]){localStorage.setItem('spendsense.activeImport',items[0].id);setActiveId(items[0].id)}}).catch(()=>setImports([]));api.settings().then(value=>{const merged={...DEFAULT_SETTINGS,...settingsFromApi(value),...readLocalPreferences(window.localStorage),ai_configured:value.ai_configured};setSettings(merged);saveLocalPreferences(window.localStorage,merged)}).catch(()=>undefined)},[])
  useEffect(()=>{if(selected&&selected!==activeId){setActiveId(selected);localStorage.setItem('spendsense.activeImport',selected)}},[selected,activeId])
  useEffect(()=>{
    const root=document.documentElement
    const media=window.matchMedia('(prefers-color-scheme: dark)')
    const apply=()=>{const resolved=resolveTheme(settings.theme,media.matches);root.dataset.theme=resolved;root.dataset.reducedMotion=String(settings.reduced_motion);setDark(resolved==='dark')}
    apply()
    media.addEventListener('change',apply)
    return()=>media.removeEventListener('change',apply)
  },[settings.theme,settings.reduced_motion])
  const onImported=(item:ImportRecord)=>{setImports(value=>[item,...value]);setActiveId(item.id);localStorage.setItem('spendsense.activeImport',item.id)}
  const onSelectImport=(id:string)=>{setActiveId(id);localStorage.setItem('spendsense.activeImport',id)}
  const onDelete=async(id:string)=>{await api.removeImport(id);const rest=imports.filter(item=>item.id!==id);setImports(rest);if(activeId===id){const next=rest[0]?.id||'';setActiveId(next);if(next)localStorage.setItem('spendsense.activeImport',next);else localStorage.removeItem('spendsense.activeImport')}}
  const onOpen=(id:string)=>{setActiveId(id);localStorage.setItem('spendsense.activeImport',id);window.location.assign('/overview')}
  const onPreview=(next:UserSettings)=>{setSettings(next)}
  const onSave=async(next:UserSettings)=>{const payload={...next,monthly_budget:next.monthly_budget.trim()||null,category_budgets:Object.fromEntries(Object.entries(next.category_budgets).filter(([,amount])=>amount.trim()))};const saved=await api.saveSettings(payload);setSettings(saved);saveLocalPreferences(window.localStorage,saved)}
  const [data,setData]=useState<Summary|null>(null)
  useEffect(()=>{if(selected)api.analytics(selected).then(setData).catch(()=>setData(null));else setData(null)},[selected,location.pathname])
  const isImport=location.pathname==='/'
  if(isImport)return <ImportPage onImported={onImported} defaultCurrency={settings.currency} dark={dark}/>
  return <AppShell imports={imports} activeId={selected} dark={dark} onSearch={setSearch} onSelectImport={onSelectImport} search={search} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
    <Routes>
      <Route path="/overview" element={<HomePage id={selected}/>}/>
      <Route path="/transactions" element={<TransactionsPage id={selected} currency={current?.currency||settings.currency}/>}/>
      <Route path="/analytics" element={<AnalyticsPage id={selected} currency={current?.currency||settings.currency} budgets={settings.category_budgets} budgetCurrency={settings.currency} language={settings.language}/>}/>
      <Route path="/spending" element={<SpendingPage id={selected} currency={current?.currency||settings.currency}/>}/>
      <Route path="/spending/:merchant" element={<MerchantDetailPage id={selected} currency={current?.currency||settings.currency}/>}/>
      <Route path="/compare" element={<ComparePage imports={imports}/>}/>
      <Route path="/reports" element={<ReportsPage id={selected} meta={current} data={data}/>}/>
      <Route path="/history" element={<HistoryPage imports={imports} onDelete={onDelete} onOpen={onOpen}/>}/>
      <Route path="/settings" element={<SettingsPage settings={settings} onSave={onSave} onPreview={onPreview}/>}/>
      <Route path="/agent" element={<AgentPage id={selected} settings={settings}/>}/>
      <Route path="/search" element={<SearchPage onSelectImport={onSelectImport}/>}/>
      <Route path="*" element={<HomePage id={selected}/>}/>
    </Routes>
  </AppShell>
}

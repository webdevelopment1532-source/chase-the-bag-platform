// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const TABS = ['Dashboard', 'Leaderboard', 'Games', 'Affiliates', 'Codes', 'Audit Log']
const API_TOKEN = import.meta.env.VITE_API_AUTH_TOKEN || ''
const API_ADMIN_ID = import.meta.env.VITE_API_ADMIN_ID || 'dashboard-admin'

function useFetchJson(url, refreshToken) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    async function run() {
      try {
        const headers = {
          ...(API_TOKEN ? { 'x-api-key': API_TOKEN } : {}),
          'x-admin-user': API_ADMIN_ID,
        }
        const response = await fetch(url, { headers })
        if (!response.ok) throw new Error(`Request failed (${response.status})`)
        const json = await response.json()
        if (active) setData(json)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [url, refreshToken])

  return { data, loading, error }
}

function useAutoRefresh(intervalSeconds, manualBump) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!intervalSeconds) return undefined
    const interval = setInterval(() => {
      setTick((prev) => prev + 1)
    }, intervalSeconds * 1000)
    return () => clearInterval(interval)
  }, [intervalSeconds])

  useEffect(() => {
    setTick((prev) => prev + 1)
  }, [manualBump])

  return tick
}

function Badge({ value }) {
  const normalized = String(value ?? '').toLowerCase()
  return <span className={`badge badge-${normalized}`}>{String(value ?? '-')}</span>
}

function StatCard({ label, value, hint }) {
  return (
    <article className="stat-card">
      <h3>{label}</h3>
      <p>{value ?? '-'}</p>
      <small>{hint}</small>
    </article>
  )
}

function DataTable({ columns, rows, keyField, loading, error, searchValue = '', searchKeys = [] }) {
  const [sortBy, setSortBy] = useState(columns[0]?.key ?? '')
  const [sortOrder, setSortOrder] = useState('desc')

  const filteredRows = useMemo(() => {
    if (!rows) return []
    const q = searchValue.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    )
  }, [rows, searchValue, searchKeys])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const left = a[sortBy]
      const right = b[sortBy]
      if (left === right) return 0
      const result = left > right ? 1 : -1
      return sortOrder === 'asc' ? result : -result
    })
  }, [filteredRows, sortBy, sortOrder])

  function toggleSort(key) {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(key)
    setSortOrder('desc')
  }

  if (loading) return <p className="state">Loading data...</p>
  if (error) return <p className="state state-error">{error}</p>
  if (!rows || rows.length === 0) return <p className="state">No records yet.</p>
  if (sortedRows.length === 0) return <p className="state">No rows match your filter.</p>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <button type="button" className="head-btn" onClick={() => toggleSort(column.key)}>
                  {column.label}
                  {sortBy === column.key ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={row[keyField] ?? index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row[column.key], row, index) : (row[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Bars({ title, rows, labelKey, valueKey }) {
  const max = Math.max(1, ...(rows ?? []).map((row) => Number(row[valueKey]) || 0))
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
      </header>
      <div className="bars">
        {(rows ?? []).map((row) => {
          const value = Number(row[valueKey]) || 0
          const width = Math.max(8, Math.round((value / max) * 100))
          return (
            <div className="bar-row" key={`${row[labelKey]}-${value}`}>
              <span className="bar-label">{String(row[labelKey])}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${width}%` }} />
              </div>
              <span className="bar-value">{value}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DashboardView({ refreshToken }) {
  const overview = useFetchJson('/api/overview', refreshToken)

  return (
    <section className="view-stack">
      <div className="stats-grid">
        <StatCard label="Players" value={overview.data?.stats?.players} hint="Unique leaderboard entries" />
        <StatCard label="Games" value={overview.data?.stats?.games} hint="Total recorded rounds" />
        <StatCard label="Affiliates" value={overview.data?.stats?.affiliates} hint="Currently active partners" />
        <StatCard label="Codes" value={overview.data?.stats?.codes} hint="Tracked promo code entries" />
      </div>

      {overview.loading && <p className="state">Loading analytics...</p>}
      {overview.error && <p className="state state-error">{overview.error}</p>}

      {!overview.loading && !overview.error && (
        <div className="panel-grid">
          <Bars title="Game Mix" rows={overview.data?.gameMix ?? []} labelKey="game" valueKey="total" />
          <Bars title="Result Mix" rows={overview.data?.resultMix ?? []} labelKey="result" valueKey="total" />
        </div>
      )}

      <section className="panel">
        <header className="panel-head">
          <h2>Daily Activity (Last 7 Days)</h2>
          <p className="muted">Last updated: {overview.data?.lastUpdated ? new Date(overview.data.lastUpdated).toLocaleString() : '-'}</p>
        </header>
        <DataTable
          columns={[
            { key: 'day', label: 'Day' },
            { key: 'total', label: 'Rounds' },
          ]}
          rows={overview.data?.dailyGames ?? []}
          keyField="day"
          loading={overview.loading}
          error={overview.error}
          searchKeys={['day']}
        />
      </section>
    </section>
  )
}

function LeaderboardView({ refreshToken, search }) {
  const data = useFetchJson('/api/leaderboard?limit=200', refreshToken)
  return (
    <section className="panel">
      <header className="panel-head"><h2>Leaderboard</h2></header>
      <DataTable
        columns={[
          { key: 'rank', label: '#' },
          { key: 'user', label: 'Player' },
          { key: 'score', label: 'Score' },
        ]}
        rows={(data.data ?? []).map((row, index) => ({ ...row, rank: index + 1 }))}
        keyField="rank"
        loading={data.loading}
        error={data.error}
        searchValue={search}
        searchKeys={['user']}
      />
    </section>
  )
}

function GamesView({ refreshToken, search, gameFilter }) {
  const query = gameFilter ? `?limit=300&game=${encodeURIComponent(gameFilter)}` : '?limit=300'
  const data = useFetchJson(`/api/game-results${query}`, refreshToken)
  return (
    <section className="panel">
      <header className="panel-head"><h2>Game Results</h2></header>
      <DataTable
        columns={[
          { key: 'user', label: 'Player' },
          { key: 'game', label: 'Game' },
          { key: 'result', label: 'Result', render: (value) => <Badge value={value} /> },
          { key: 'score', label: 'Score' },
          { key: 'created_at', label: 'Time', render: (value) => (value ? new Date(value).toLocaleString() : '-') },
        ]}
        rows={data.data ?? []}
        keyField="id"
        loading={data.loading}
        error={data.error}
        searchValue={search}
        searchKeys={['user', 'game', 'result']}
      />
    </section>
  )
}

function AffiliatesView({ refreshToken, search, statusFilter }) {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
  const data = useFetchJson(`/api/affiliates${query}`, refreshToken)
  return (
    <section className="panel">
      <header className="panel-head"><h2>Affiliates</h2></header>
      <DataTable
        columns={[
          { key: 'user_id', label: 'Discord User' },
          { key: 'status', label: 'Status', render: (value) => <Badge value={value} /> },
          { key: 'requested_at', label: 'Requested', render: (value) => (value ? new Date(value).toLocaleString() : '-') },
          { key: 'approved_at', label: 'Approved', render: (value) => (value ? new Date(value).toLocaleString() : '-') },
          { key: 'approved_by', label: 'Approved By' },
        ]}
        rows={data.data ?? []}
        keyField="user_id"
        loading={data.loading}
        error={data.error}
        searchValue={search}
        searchKeys={['user_id', 'status', 'approved_by']}
      />
    </section>
  )
}

function CodesView({ refreshToken, search }) {
  const data = useFetchJson('/api/codes?limit=300', refreshToken)
  return (
    <section className="panel">
      <header className="panel-head"><h2>Promo Codes</h2></header>
      <DataTable
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'source', label: 'Source' },
          { key: 'created_at', label: 'Added At', render: (value) => (value ? new Date(value).toLocaleString() : '-') },
        ]}
        rows={data.data ?? []}
        keyField="code"
        loading={data.loading}
        error={data.error}
        searchValue={search}
        searchKeys={['code', 'source']}
      />
    </section>
  )
}

function AuditView({ refreshToken, search }) {
  const data = useFetchJson('/api/audit-log?limit=300', refreshToken)
  return (
    <section className="panel">
      <header className="panel-head"><h2>Audit Log</h2></header>
      <DataTable
        columns={[
          { key: 'created_at', label: 'Time', render: (value) => (value ? new Date(value).toLocaleString() : '-') },
          { key: 'user_id', label: 'User' },
          { key: 'server_id', label: 'Server' },
          { key: 'action', label: 'Action' },
          { key: 'details', label: 'Details' },
        ]}
        rows={data.data ?? []}
        keyField="id"
        loading={data.loading}
        error={data.error}
        searchValue={search}
        searchKeys={['user_id', 'server_id', 'action', 'details']}
      />
    </section>
  )
}

function App() {
  const [tab, setTab] = useState('Dashboard')
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(0)
  const [manualRefresh, setManualRefresh] = useState(0)
  const [gameFilter, setGameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const refreshToken = useAutoRefresh(autoRefresh, manualRefresh)

  const views = {
    Dashboard: <DashboardView refreshToken={refreshToken} />,
    Leaderboard: <LeaderboardView refreshToken={refreshToken} search={search} />,
    Games: <GamesView refreshToken={refreshToken} search={search} gameFilter={gameFilter} />,
    Affiliates: <AffiliatesView refreshToken={refreshToken} search={search} statusFilter={statusFilter} />,
    Codes: <CodesView refreshToken={refreshToken} search={search} />,
    'Audit Log': <AuditView refreshToken={refreshToken} search={search} />,
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="kicker">Advanced Operations Console</p>
          <h1>Game Server Competition Dashboard</h1>
        </div>
        <p className="topbar-note">Live API at /api</p>
      </header>

      <section className="toolbar panel">
        <div className="toolbar-grid">
          <label className="field">
            <span>Search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="user, code, action..." />
          </label>

          <label className="field">
            <span>Auto refresh</span>
            <select value={autoRefresh} onChange={(e) => setAutoRefresh(Number(e.target.value))}>
              <option value={0}>Off</option>
              <option value={10}>Every 10s</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
            </select>
          </label>

          <label className="field">
            <span>Game filter</span>
            <input value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} placeholder="coinflip, roulette..." />
          </label>

          <label className="field">
            <span>Affiliate status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="removed">Removed</option>
            </select>
          </label>

          <button type="button" className="refresh-btn" onClick={() => setManualRefresh((v) => v + 1)}>
            Refresh now
          </button>
        </div>
      </section>

      <nav className="tabs" aria-label="Dashboard navigation">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={item === tab ? 'tab active' : 'tab'}
          >
            {item}
          </button>
        ))}
      </nav>

      {views[tab]}
    </main>
  )
}

export default App

import { Suspense } from 'react'
import { getDashboardStats, getLogs, getFaturas, getChartData, getEmpresasSimple } from './actions'
import { DashboardClient, DashboardSkeleton } from './dashboard-client'

async function DashboardData() {
  const [stats, logsResult, faturasResult, chartData, empresas] = await Promise.all([
    getDashboardStats(),
    getLogs(1, 'todos', 'todos'),
    getFaturas('todos', 'todos'),
    getChartData(),
    getEmpresasSimple(),
  ])

  return (
    <DashboardClient
      stats={stats}
      initialLogs={logsResult.logs}
      totalLogs={logsResult.total}
      initialFaturas={faturasResult.faturas}
      chartData={chartData}
      empresas={empresas}
    />
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  )
}

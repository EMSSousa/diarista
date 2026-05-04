'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Building2, CheckCircle, Users, TrendingUp, CalendarPlus,
  Loader2, X, ChevronLeft, ChevronRight, RefreshCw,
  BarChart3, FileText, Filter, ChevronDown, Download,
  CreditCard, AlertCircle, PackageOpen,
} from 'lucide-react'
import {
  getLogs, getFaturas, marcarFaturaPagaAction, gerarFaturaManualAction,
  type DashboardStats, type LogComContexto, type FaturaComEmpresa,
  type ReceitaMes, type EmpresasPorPlano, type GerarFaturaInput,
} from './actions'

const LOGS_PER_PAGE = 20

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso))
}
function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

const TIPO_LOG_LABEL: Record<string, string> = {
  login: 'Login', criacao_diarista: 'Criação diarista',
  agendamento: 'Agendamento', pagamento: 'Pagamento', faturamento: 'Faturamento',
}
const TIPO_LOG_COLOR: Record<string, string> = {
  login: 'bg-gray-100 text-gray-600',
  criacao_diarista: 'bg-blue-50 text-blue-700',
  agendamento: 'bg-violet-50 text-violet-700',
  pagamento: 'bg-emerald-50 text-emerald-700',
  faturamento: 'bg-amber-50 text-amber-700',
}
const PLAN_COLORS: Record<string, string> = { basic: '#6b7280', pro: '#3b82f6', enterprise: '#8b5cf6' }
const PLAN_LABELS: Record<string, string>  = { basic: 'Basic',  pro: 'Pro',    enterprise: 'Enterprise' }

// ── Toast ──────────────────────────────────────────────────────────────────

type ToastState = { message: string; type: 'success' | 'error' } | null

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-xl ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {toast.message}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-8 w-16 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-lg bg-gray-200 animate-pulse" />
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
            <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-40 rounded bg-gray-100 animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats Cards ────────────────────────────────────────────────────────────

function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: 'Total de empresas',     value: stats.totalEmpresas,                      icon: Building2,    color: 'bg-blue-600',    sub: 'cadastradas' },
    { label: 'Empresas ativas',       value: stats.ativasEmpresas,                     icon: CheckCircle,  color: 'bg-emerald-600', sub: 'com status ativo' },
    { label: 'Receita mensal',        value: fmtBRL(stats.receitaMensal),              icon: TrendingUp,   color: 'bg-violet-600',  sub: 'faturas pagas no mês' },
    { label: 'Novos cadastros',       value: stats.novosCadastros,                     icon: CalendarPlus, color: 'bg-amber-500',   sub: 'este mês' },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500">{c.label}</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{c.sub}</p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.color}`}>
              <c.icon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────

type Tab = 'logs' | 'faturamento' | 'relatorios'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'logs',        label: 'Logs',        icon: FileText   },
  { id: 'faturamento', label: 'Faturamento', icon: CreditCard },
  { id: 'relatorios',  label: 'Relatórios',  icon: BarChart3  },
]

// ── Seção LOGS ─────────────────────────────────────────────────────────────

function LogsSection({
  initialLogs, totalLogs, empresas,
}: {
  initialLogs: LogComContexto[]
  totalLogs: number
  empresas: { id: string; nome: string }[]
}) {
  const [logs,           setLogs]           = useState(initialLogs)
  const [total,          setTotal]          = useState(totalLogs)
  const [page,           setPage]           = useState(1)
  const [filtroTipo,     setFiltroTipo]     = useState('todos')
  const [filtroEmpresa,  setFiltroEmpresa]  = useState('todos')
  const [loading,        setLoading]        = useState(false)
  const [lastRefresh,    setLastRefresh]    = useState(new Date())

  const totalPages = Math.ceil(total / LOGS_PER_PAGE)

  const fetchLogs = useCallback(async (p: number, tipo: string, empresa: string) => {
    setLoading(true)
    const { logs: l, total: t } = await getLogs(p, tipo, empresa)
    setLogs(l)
    setTotal(t)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  // Auto-refresh a cada 30s
  useEffect(() => {
    const id = setInterval(() => fetchLogs(page, filtroTipo, filtroEmpresa), 30000)
    return () => clearInterval(id)
  }, [page, filtroTipo, filtroEmpresa, fetchLogs])

  const handleFilter = (tipo: string, empresa: string) => {
    setPage(1)
    fetchLogs(1, tipo, empresa)
  }

  const selClass = 'h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none'

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <select
            value={filtroTipo}
            onChange={e => { setFiltroTipo(e.target.value); handleFilter(e.target.value, filtroEmpresa) }}
            className={`${selClass} pl-9`}
          >
            <option value="todos">Todos os tipos</option>
            {Object.entries(TIPO_LOG_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select
            value={filtroEmpresa}
            onChange={e => { setFiltroEmpresa(e.target.value); handleFilter(filtroTipo, e.target.value) }}
            className={selClass}
          >
            <option value="todos">Todas as empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={() => fetchLogs(page, filtroTipo, filtroEmpresa)}
          disabled={loading}
          className="flex items-center gap-1.5 h-10 rounded-lg px-3 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors border border-gray-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
        <span className="ml-auto text-xs text-gray-400">
          Atualizado às {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Auto-atualiza em 30s
        </span>
      </div>

      {/* Tabela */}
      {logs.length === 0 ? (
        <EmptyState icon={FileText} text="Nenhum log encontrado" />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Data/Hora','Tipo','Empresa','Usuário','Descrição','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(l.criado_em)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIPO_LOG_COLOR[l.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_LOG_LABEL[l.tipo] ?? l.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{l.empresa_nome ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{l.usuario_email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{l.descricao ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.status === 'sucesso' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {logs.map(l => (
              <div key={l.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-2">
                <div className="flex items-center gap-2 justify-between">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIPO_LOG_COLOR[l.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TIPO_LOG_LABEL[l.tipo] ?? l.tipo}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.status === 'sucesso' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {l.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{l.empresa_nome ?? '—'} · {l.usuario_email ?? '—'}</p>
                {l.descricao && <p className="text-xs text-gray-500">{l.descricao}</p>}
                <p className="text-[10px] text-gray-400">{fmtDateTime(l.criado_em)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Mostrando {((page - 1) * LOGS_PER_PAGE) + 1}–{Math.min(page * LOGS_PER_PAGE, total)} de {total} logs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setPage(p => p - 1); fetchLogs(page - 1, filtroTipo, filtroEmpresa) }}
              disabled={page <= 1 || loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-9 items-center px-3 text-sm text-gray-700 font-medium">{page}/{totalPages}</span>
            <button
              onClick={() => { setPage(p => p + 1); fetchLogs(page + 1, filtroTipo, filtroEmpresa) }}
              disabled={page >= totalPages || loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal Gerar Fatura ─────────────────────────────────────────────────────

function GerarFaturaModal({
  empresas,
  onClose,
  onCreated,
}: {
  empresas: { id: string; nome: string }[]
  onClose: () => void
  onCreated: (f: FaturaComEmpresa) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const mesAtual = today.slice(0, 7) + '-01'

  const [empresaId,     setEmpresaId]     = useState(empresas[0]?.id ?? '')
  const [mes,           setMes]           = useState(mesAtual)
  const [valor,         setValor]         = useState('')
  const [tipoCobranca,  setTipoCobranca]  = useState<'manual' | 'automatica'>('manual')
  const [vencimento,    setVencimento]    = useState(today)
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [saving,        setSaving]        = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!empresaId) e.empresa = 'Empresa é obrigatória'
    if (!mes)       e.mes     = 'Mês é obrigatório'
    const v = Number(valor)
    if (!valor || isNaN(v) || v <= 0) e.valor = 'Valor deve ser maior que 0'
    if (!vencimento) e.vencimento = 'Data de vencimento é obrigatória'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    const input: GerarFaturaInput = {
      empresa_id: empresaId, mes, valor: v, tipo_cobranca: tipoCobranca, data_vencimento: vencimento,
    }
    const { fatura, error } = await gerarFaturaManualAction(input)
    setSaving(false)
    if (error || !fatura) { setErrors({ empresa: 'Erro: ' + (error ?? 'desconhecido') }); return }
    onCreated(fatura)
  }

  const inputClass = (err?: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-11 ${err ? 'border-red-400' : 'border-gray-200'}`
  const selClass   = (err?: string) => `${inputClass(err)} appearance-none`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">Gerar fatura manual</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Empresa <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={empresaId} onChange={e => setEmpresaId(e.target.value)} className={selClass(errors.empresa)}>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {errors.empresa && <p className="mt-1 text-xs text-red-500">{errors.empresa}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mês de referência <span className="text-red-500">*</span></label>
              <input type="month" value={mes.slice(0, 7)} onChange={e => setMes(e.target.value + '-01')} className={inputClass(errors.mes)} />
              {errors.mes && <p className="mt-1 text-xs text-red-500">{errors.mes}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Valor (R$) <span className="text-red-500">*</span></label>
              <input type="number" min="0.01" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={inputClass(errors.valor)} />
              {errors.valor && <p className="mt-1 text-xs text-red-500">{errors.valor}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Vencimento <span className="text-red-500">*</span></label>
            <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className={inputClass(errors.vencimento)} />
            {errors.vencimento && <p className="mt-1 text-xs text-red-500">{errors.vencimento}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de cobrança</label>
            <div className="flex gap-3">
              {(['manual', 'automatica'] as const).map(t => (
                <label key={t} className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border p-2.5 text-sm font-medium transition-colors ${tipoCobranca === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" className="sr-only" checked={tipoCobranca === t} onChange={() => setTipoCobranca(t)} />
                  {t === 'manual' ? 'Manual' : 'Automática'}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar fatura
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Seção FATURAMENTO ──────────────────────────────────────────────────────

function FaturamentoSection({
  initialFaturas, empresas, onToast,
}: {
  initialFaturas: FaturaComEmpresa[]
  empresas: { id: string; nome: string }[]
  onToast: (t: ToastState) => void
}) {
  const [faturas,       setFaturas]       = useState(initialFaturas)
  const [filtroStatus,  setFiltroStatus]  = useState('todos')
  const [filtroEmpresa, setFiltroEmpresa] = useState('todos')
  const [loadingId,     setLoadingId]     = useState<string | null>(null)
  const [showModal,     setShowModal]     = useState(false)

  const filtered = useMemo(() => faturas.filter(f => {
    if (filtroStatus  !== 'todos' && f.status     !== filtroStatus)  return false
    if (filtroEmpresa !== 'todos' && f.empresa_id !== filtroEmpresa) return false
    return true
  }), [faturas, filtroStatus, filtroEmpresa])

  const handlePago = async (id: string) => {
    setLoadingId(id)
    const { error } = await marcarFaturaPagaAction(id)
    setLoadingId(null)
    if (error) { onToast({ message: 'Erro: ' + error, type: 'error' }); return }
    setFaturas(prev => prev.map(f => f.id === id ? { ...f, status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] } : f))
    onToast({ message: 'Fatura marcada como paga', type: 'success' })
  }

  const selClass = 'h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={selClass}>
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={selClass}>
            <option value="todos">Todas as empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-2 h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Gerar fatura
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CreditCard} text="Nenhuma fatura encontrada" />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Empresa','Tipo cobrança','Valor','Status','Vencimento','Pagamento','Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{f.empresa_nome}</p>
                      <p className="text-[10px] text-gray-400">{f.mes.slice(0, 7)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{f.tipo_cobranca === 'manual' ? 'Manual' : 'Automática'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmtBRL(f.valor)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {f.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(f.data_vencimento)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(f.data_pagamento)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {f.status === 'pendente' && (
                          <button
                            onClick={() => handlePago(f.id)}
                            disabled={loadingId === f.id}
                            className="flex items-center gap-1 h-7 rounded-md bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                          >
                            {loadingId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Pago
                          </button>
                        )}
                        <button
                          onClick={() => onToast({ message: 'Reenvio disponível com integração Safe2Pay', type: 'error' })}
                          className="flex items-center gap-1 h-7 rounded-md bg-gray-100 px-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          Reenviar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="grid gap-3 md:hidden">
            {filtered.map(f => (
              <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{f.empresa_nome}</p>
                    <p className="text-xs text-gray-400">{f.mes.slice(0, 7)} · {f.tipo_cobranca === 'manual' ? 'Manual' : 'Automática'}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {f.status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmtBRL(f.valor)}</p>
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  {f.status === 'pendente' && (
                    <button onClick={() => handlePago(f.id)} disabled={loadingId === f.id} className="flex-1 h-9 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
                      {loadingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      Marcar como pago
                    </button>
                  )}
                  <button onClick={() => onToast({ message: 'Reenvio disponível com integração Safe2Pay', type: 'error' })} className="h-9 rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                    Reenviar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <GerarFaturaModal
          empresas={empresas}
          onClose={() => setShowModal(false)}
          onCreated={f => {
            setFaturas(prev => [f, ...prev])
            setShowModal(false)
            onToast({ message: 'Fatura gerada com sucesso', type: 'success' })
          }}
        />
      )}
    </div>
  )
}

// ── Seção RELATÓRIOS ───────────────────────────────────────────────────────

function BarChart({ data }: { data: ReceitaMes[] }) {
  const max = Math.max(...data.map(d => d.valor), 1)
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div
              title={`${d.mes}: ${fmtBRL(d.valor)}`}
              className={`w-full rounded-t-sm transition-all ${d.valor > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-100'}`}
              style={{ height: `${d.valor > 0 ? Math.max((d.valor / max) * 100, 4) : 2}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-gray-400">{d.mes}</div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: EmpresasPorPlano[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>

  let angle = 0
  const parts = data.map(d => {
    const deg = (d.count / total) * 360
    const from = angle; angle += deg
    return { ...d, from, to: angle }
  })
  const gradient = parts
    .filter(p => p.count > 0)
    .map(p => `${PLAN_COLORS[p.plano] ?? '#ccc'} ${p.from}deg ${p.to}deg`)
    .join(', ')

  return (
    <div className="flex items-center gap-6">
      <div
        className="w-24 h-24 rounded-full shrink-0"
        style={{
          background: gradient ? `conic-gradient(${gradient})` : '#f3f4f6',
          WebkitMask: 'radial-gradient(circle at center, transparent 38%, black 39%)',
          mask:       'radial-gradient(circle at center, transparent 38%, black 39%)',
        }}
      />
      <div className="space-y-2">
        {parts.map(p => (
          <div key={p.plano} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PLAN_COLORS[p.plano] ?? '#ccc' }} />
            <span className="text-xs text-gray-600">{PLAN_LABELS[p.plano] ?? p.plano}</span>
            <span className="text-xs font-bold text-gray-800">{p.count}</span>
            <span className="text-xs text-gray-400">({total > 0 ? Math.round((p.count / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelatoriosSection({
  chartData, onToast,
}: {
  chartData: { receitaPorMes: ReceitaMes[]; empresasPorPlano: EmpresasPorPlano[]; taxaAtivacao: number; totalEmpresas: number; ativasEmpresas: number }
  onToast: (t: ToastState) => void
}) {
  const handleExportCSV = () => {
    const rows = chartData.receitaPorMes.map(d => `${d.mes},${d.valor}`)
    const csv = ['Mês,Receita', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'relatorio-receita.csv'; a.click()
    URL.revokeObjectURL(url)
    onToast({ message: 'Relatório exportado com sucesso', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Receita por mês */}
        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-800">Receita por mês</h3>
            <span className="ml-auto text-xs text-gray-400">Últimos 12 meses</span>
          </div>
          <BarChart data={chartData.receitaPorMes} />
          <p className="mt-3 text-xs text-gray-400 text-right">
            Total: {fmtBRL(chartData.receitaPorMes.reduce((s, d) => s + d.valor, 0))}
          </p>
        </div>

        {/* Empresas por plano */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-gray-800">Empresas por plano</h3>
          </div>
          <DonutChart data={chartData.empresasPorPlano} />
        </div>
      </div>

      {/* Taxa de ativação */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-800">Taxa de ativação</h3>
        </div>
        <div className="space-y-3 max-w-md">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-emerald-600">
              {chartData.taxaAtivacao.toFixed(1)}<span className="text-2xl font-semibold">%</span>
            </span>
            <span className="text-sm text-gray-500 pb-1">das empresas ativas</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${chartData.taxaAtivacao}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {chartData.ativasEmpresas} de {chartData.totalEmpresas} empresa{chartData.totalEmpresas !== 1 ? 's' : ''} com status ativo
          </p>
        </div>
      </div>
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3 py-14">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

interface DashboardClientProps {
  stats: DashboardStats
  initialLogs: LogComContexto[]
  totalLogs: number
  initialFaturas: FaturaComEmpresa[]
  chartData: { receitaPorMes: ReceitaMes[]; empresasPorPlano: EmpresasPorPlano[]; taxaAtivacao: number; totalEmpresas: number; ativasEmpresas: number }
  empresas: { id: string; nome: string }[]
}

export function DashboardClient({ stats, initialLogs, totalLogs, initialFaturas, chartData, empresas }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('logs')
  const [toast,     setToast]     = useState<ToastState>(null)

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Visão geral do SaaS</p>
        </div>

        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'logs' && (
          <LogsSection
            initialLogs={initialLogs}
            totalLogs={totalLogs}
            empresas={empresas}
          />
        )}
        {activeTab === 'faturamento' && (
          <FaturamentoSection
            initialFaturas={initialFaturas}
            empresas={empresas}
            onToast={setToast}
          />
        )}
        {activeTab === 'relatorios' && (
          <RelatoriosSection
            chartData={chartData}
            onToast={setToast}
          />
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

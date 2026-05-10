'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, TrendingUp, CheckCircle2, XCircle,
  Users, RefreshCw, Trophy, Clock, Search,
} from 'lucide-react'
import { getRelatoriosData, type Periodo, type RelatorioData } from './actions'
import { periodoRange } from './utils'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function mesLabel(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '')
}

function hoje() { return new Date().toISOString().split('T')[0] }

function inicioMes() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Period presets ─────────────────────────────────────────────────────────

const PRESETS: { id: Exclude<Periodo, 'custom'>; label: string }[] = [
  { id: 'mes',       label: 'Este mês'  },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'semestre',  label: 'Semestre'  },
  { id: 'ano',       label: 'Este ano'  },
]

// ── Bar chart ──────────────────────────────────────────────────────────────

function BarChart({ data }: { data: RelatorioData['tendencia'] }) {
  const maxAg  = Math.max(...data.map(d => d.agendamentos), 1)
  const maxRec = Math.max(...data.map(d => d.receita), 1)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tendência — 6 meses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Agendamentos e receita por mês</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/70" /> Agendamentos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /> Receita
          </span>
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="flex items-end gap-3 h-36">
          {data.map(({ mes, agendamentos, receita }) => (
            <div key={mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full flex items-end gap-0.5 h-28 justify-center">
                <div
                  className="w-3 rounded-t-sm bg-primary/70 transition-all duration-500"
                  style={{ height: `${Math.round((agendamentos / maxAg) * 100)}%` }}
                  title={`${agendamentos} agendamentos`}
                />
                <div
                  className="w-3 rounded-t-sm bg-emerald-500/70 transition-all duration-500"
                  style={{ height: `${Math.round((receita / maxRec) * 100)}%` }}
                  title={formatBRL(receita)}
                />
              </div>
              <span className="text-[10px] text-muted-foreground capitalize">{mesLabel(mes)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tipo pagamento ─────────────────────────────────────────────────────────

function TipoPagamentoCard({ porTipo, total }: { porTipo: RelatorioData['porTipo']; total: number }) {
  const items = [
    { key: 'diaria',   label: 'Diária',   color: 'bg-violet-500', count: porTipo.diaria   },
    { key: 'hora',     label: 'Por hora', color: 'bg-sky-500',    count: porTipo.hora     },
    { key: 'empreita', label: 'Empreita', color: 'bg-amber-500',  count: porTipo.empreita },
  ]
  const base = total || 1

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h2 className="text-sm font-semibold text-foreground">Tipo de serviço</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Distribuição por modalidade</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        {items.map(({ key, label, color, count }) => {
          const pct = Math.round((count / base) * 100)
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-foreground font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
        {total === 0 && <p className="text-sm text-center text-muted-foreground py-2">Sem dados no período.</p>}
      </div>
    </div>
  )
}

// ── Top diaristas ──────────────────────────────────────────────────────────

function TopDiaristaCard({ topDiaristas }: { topDiaristas: RelatorioData['topDiaristas'] }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Top diaristas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Por serviços concluídos no período</p>
        </div>
      </div>
      {topDiaristas.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Nenhum serviço concluído no período.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {topDiaristas.map((d, i) => (
            <div key={d.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/10">
              <span className="text-lg w-6 shrink-0 text-center">{medals[i] ?? `#${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.servicos} {d.servicos === 1 ? 'serviço' : 'serviços'}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-600 shrink-0">{formatBRL(d.receita)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="h-56 rounded-xl bg-muted" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function RelatoriosClient() {
  const [periodo,  setPeriodo]  = useState<Periodo>('mes')
  const [inicio,   setInicio]   = useState(inicioMes)
  const [fim,      setFim]      = useState(hoje)
  const [data,     setData]     = useState<RelatorioData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async (ini: string, fim: string) => {
    setLoading(true)
    setError(null)
    const { data: d, error: e } = await getRelatoriosData(ini, fim)
    if (e) setError(e)
    else setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load(inicio, fim) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (id: Exclude<Periodo, 'custom'>) => {
    const range = periodoRange(id)
    setPeriodo(id)
    setInicio(range.inicio)
    setFim(range.fim)
    load(range.inicio, range.fim)
  }

  const handleCustomInicio = (v: string) => {
    setInicio(v)
    setPeriodo('custom')
  }

  const handleCustomFim = (v: string) => {
    setFim(v)
    setPeriodo('custom')
  }

  const handleFiltrar = () => load(inicio, fim)

  const kpis = data ? [
    {
      label: 'Total agendamentos',
      value: String(data.total),
      sub:   'no período',
      icon:  BarChart3,
      cor:   'text-blue-600',
      bg:    'bg-blue-50',
    },
    {
      label: 'Concluídos',
      value: `${data.concluidos} (${data.taxaConclusao}%)`,
      sub:   'taxa de conclusão',
      icon:  CheckCircle2,
      cor:   'text-emerald-600',
      bg:    'bg-emerald-50',
    },
    {
      label: 'Em andamento / futuros',
      value: String(data.andamento),
      sub:   `${data.cancelados} cancelado${data.cancelados !== 1 ? 's' : ''}`,
      icon:  Clock,
      cor:   'text-amber-600',
      bg:    'bg-amber-50',
    },
    {
      label: 'Receita do período',
      value: formatBRL(data.receita),
      sub:   'serviços concluídos',
      icon:  TrendingUp,
      cor:   'text-emerald-600',
      bg:    'bg-emerald-50',
    },
  ] : []

  const inputCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Análises e indicadores do seu negócio.</p>
        </div>
        {!loading && (
          <button
            onClick={() => load(inicio, fim)}
            className="inline-flex items-center gap-2 self-start rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
        {/* Atalhos de período */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => applyPreset(id)}
              disabled={loading}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                periodo === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Inputs de data + botão filtrar */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Data início</label>
            <input
              type="date"
              value={inicio}
              max={fim}
              onChange={e => handleCustomInicio(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Data fim</label>
            <input
              type="date"
              value={fim}
              min={inicio}
              max={hoje()}
              onChange={e => handleCustomFim(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            onClick={handleFiltrar}
            disabled={loading || !inicio || !fim || inicio > fim}
            className="inline-flex items-center gap-2 h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Search className="h-3.5 w-3.5" />
            }
            Filtrar
          </button>

          {/* Label do intervalo aplicado */}
          {data && (
            <span className="text-xs text-muted-foreground self-center">
              {new Date(data.inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
              {' — '}
              {new Date(data.fim + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {loading && <Skeleton />}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <button
            onClick={() => load(inicio, fim)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map(({ label, value, sub, icon: Icon, cor, bg }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${cor}`} />
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold text-foreground md:text-xl leading-tight">{value}</p>
                <p className={`mt-1 text-[11px] font-medium ${cor}`}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <BarChart data={data.tendencia} />

          {/* Bottom grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TopDiaristaCard topDiaristas={data.topDiaristas} />
            <TipoPagamentoCard porTipo={data.porTipo} total={data.total} />
          </div>

          {/* Empty state */}
          {data.total === 0 && (
            <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Sem agendamentos no período</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Selecione outro intervalo ou aguarde novos agendamentos.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

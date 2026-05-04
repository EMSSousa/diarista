'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar, Clock, DollarSign, X, AlertCircle,
  CalendarX2, MapPin,
} from 'lucide-react'
import { getHistoricoPresenca, type HistoricoRow, type DiaristaOption } from './actions'

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  concluido:   { label: 'Completo',   dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  cancelado:   { label: 'Cancelado',  dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-500' },
  trabalhando: { label: 'Incompleto', dot: 'bg-yellow-400',  badge: 'bg-yellow-100 text-yellow-800' },
  agendado:    { label: 'Agendado',   dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700' },
}

const TIPO_CONFIG = {
  diaria: { label: 'Diária',   badge: 'bg-violet-100 text-violet-800' },
  hora:   { label: 'Por Hora', badge: 'bg-sky-100 text-sky-700' },
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function currentMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function generateMonths(count = 13) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const raw = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return { value, label: raw.charAt(0).toUpperCase() + raw.slice(1) }
  })
}

const MONTHS = generateMonths()

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function fmtWeekday(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function diffMs(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime()
}

function fmtHorasMs(ms: number) {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function fmtHoras(entrada: string, saida: string) {
  return fmtHorasMs(diffMs(entrada, saida))
}

function fmtTotalHoras(h: number) {
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HistoricoRow['status'] }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.agendado
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: HistoricoRow['tipo_pagamento'] }) {
  const c = TIPO_CONFIG[tipo]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.badge}`}>
      {c.label}
    </span>
  )
}

function SummaryCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight truncate ${accent ? 'text-emerald-600' : 'text-foreground'}`}>
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent ? 'bg-emerald-100' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card h-[88px]" />
        ))}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-10 bg-muted/50 border-b border-border" />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-border last:border-0 bg-card">
            <div className="h-3.5 w-24 rounded-full bg-muted" />
            <div className="h-3.5 w-16 rounded-full bg-muted" />
            <div className="h-3.5 w-16 rounded-full bg-muted" />
            <div className="h-6 w-20 rounded-full bg-muted ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ row, onClose }: { row: HistoricoRow; onClose: () => void }) {
  const horasStr = row.entrada && row.saida ? fmtHoras(row.entrada, row.saida) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">{fmtWeekday(row.data)}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(row.data)}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Local</p>
              <p className="text-sm font-medium text-foreground">{row.local}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Entrada</p>
              <p className="text-base font-semibold text-foreground">
                {row.entrada ? fmtTime(row.entrada) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Saída</p>
              <p className="text-base font-semibold text-foreground">
                {row.saida ? fmtTime(row.saida) : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Horas trabalhadas</p>
              <p className="text-base font-semibold text-foreground">{horasStr ?? '—'}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Tipo</p>
              <TipoBadge tipo={row.tipo_pagamento} />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">
                {row.tipo_pagamento === 'hora'
                  ? `${fmtMoney(row.valor_hora ?? 0)}/h${horasStr ? ` × ${horasStr}` : ''}`
                  : 'Valor fixo por diária'}
              </p>
              <p className="text-xl font-bold text-foreground">{fmtMoney(row.valor)}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ row, onClick }: { row: HistoricoRow; onClick: () => void }) {
  const horasStr = row.entrada && row.saida ? fmtHoras(row.entrada, row.saida) : null
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-4 space-y-2.5 hover:bg-accent/30 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{fmtDate(row.data)}</p>
          <p className="text-xs text-muted-foreground capitalize">{fmtWeekday(row.data)}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <p className="text-xs text-muted-foreground truncate">{row.local}</p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {row.entrada ? (
          <>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {fmtTime(row.entrada)}
              {row.saida && <> → {fmtTime(row.saida)}</>}
            </span>
            {horasStr && <span className="font-medium text-foreground">{horasStr}</span>}
          </>
        ) : (
          <span className="italic">Sem ponto registrado</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <TipoBadge tipo={row.tipo_pagamento} />
        <span className="text-sm font-semibold text-emerald-600">{fmtMoney(row.valor)}</span>
      </div>
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function HistoricoClient({ diaristas }: { diaristas: DiaristaOption[] }) {
  const [selectedId, setSelectedId] = useState(diaristas[0]?.id ?? '')
  const [selectedMes, setSelectedMes] = useState(currentMes)
  const [rows, setRows] = useState<HistoricoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<HistoricoRow | null>(null)

  const fetchData = useCallback(async (id: string, mes: string) => {
    if (!id) return
    setLoading(true)
    setErrorMsg(null)
    const { rows: r, error } = await getHistoricoPresenca(id, mes)
    setLoading(false)
    if (error) { setErrorMsg(error); return }
    setRows(r)
  }, [])

  useEffect(() => {
    fetchData(selectedId, selectedMes)
  }, [selectedId, selectedMes, fetchData])

  const summary = useMemo(() => {
    const concluidos = rows.filter(r => r.status === 'concluido')
    let totalMs = 0
    for (const r of concluidos) {
      if (r.entrada && r.saida) totalMs += diffMs(r.entrada, r.saida)
    }
    const totalHoras = totalMs / 3_600_000
    return {
      dias: concluidos.length,
      totalHoras: Math.round(totalHoras * 10) / 10,
      totalReceber: concluidos.reduce((s, r) => s + r.valor, 0),
    }
  }, [rows])

  const SELECT_CLS = 'h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  if (diaristas.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Histórico de Presença</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarX2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma diarista cadastrada</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Cadastre diaristas para visualizar o histórico</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Histórico de Presença</h1>
        <p className="text-sm text-muted-foreground">Visualize os pontos e totais de cada diarista por mês</p>
      </div>

      {/* filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className={`${SELECT_CLS} flex-1`}
        >
          {diaristas.map(d => (
            <option key={d.id} value={d.id}>{d.nome}</option>
          ))}
        </select>

        <select
          value={selectedMes}
          onChange={e => setSelectedMes(e.target.value)}
          className={`${SELECT_CLS} sm:w-52`}
        >
          {MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* loading */}
      {loading && <Skeleton />}

      {/* error */}
      {!loading && errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/70" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro ao carregar histórico</p>
            <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => fetchData(selectedId, selectedMes)}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* content */}
      {!loading && !errorMsg && (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Dias trabalhados"
              value={String(summary.dias)}
              sub={summary.dias === 1 ? '1 diária concluída' : `${summary.dias} diárias concluídas`}
              icon={Calendar}
            />
            <SummaryCard
              label="Total de horas"
              value={fmtTotalHoras(summary.totalHoras)}
              sub="Horas registradas no mês"
              icon={Clock}
            />
            <SummaryCard
              label="Total a receber"
              value={fmtMoney(summary.totalReceber)}
              sub="Diárias + horas concluídas"
              icon={DollarSign}
              accent
            />
          </div>

          {/* empty */}
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
              <CalendarX2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum ponto marcado este mês</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Os agendamentos aparecerão aqui após marcação de ponto</p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              {/* desktop table */}
              <div className="hidden md:block rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Entrada</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Saída</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Horas</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Valor</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => {
                      const horasStr = row.entrada && row.saida ? fmtHoras(row.entrada, row.saida) : '—'
                      return (
                        <tr
                          key={row.agendamento_id}
                          onClick={() => setDetailRow(row)}
                          className="bg-card hover:bg-accent/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{fmtDate(row.data)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{fmtWeekday(row.data)}</p>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {row.entrada ? fmtTime(row.entrada) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {row.saida ? fmtTime(row.saida) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{horasStr}</td>
                          <td className="px-4 py-3">
                            <TipoBadge tipo={row.tipo_pagamento} />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {fmtMoney(row.valor)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t border-border">
                      <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                        {rows.length} registro{rows.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                        {fmtTotalHoras(summary.totalHoras)}
                      </td>
                      <td />
                      <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-600">
                        {fmtMoney(summary.totalReceber)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* mobile cards */}
              <div className="md:hidden space-y-3">
                {rows.map(row => (
                  <MobileCard key={row.agendamento_id} row={row} onClick={() => setDetailRow(row)} />
                ))}
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {rows.length} registro{rows.length !== 1 ? 's' : ''} · {fmtTotalHoras(summary.totalHoras)}
                  </span>
                  <span className="text-sm font-bold text-emerald-600">{fmtMoney(summary.totalReceber)}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* detail modal */}
      {detailRow && (
        <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </div>
  )
}

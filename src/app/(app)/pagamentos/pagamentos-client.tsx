'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users, Calendar, Clock, DollarSign, FileText,
  Download, CheckCircle2, AlertCircle, X, Banknote,
} from 'lucide-react'
import {
  getRelatorioPagamento,
  marcarComoPagoAction,
  type DiaristaPagamento,
  type PagamentoMes,
} from './actions'

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

function getMesLabel(mes: string) {
  const raw = new Date(mes + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtHoras(h: number) {
  if (h === 0) return '—'
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

function fmtTotalHoras(h: number) {
  if (h === 0) return '0h'
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

// ─── export functions ─────────────────────────────────────────────────────────

function exportCSV(
  diaristas: DiaristaPagamento[],
  pagamento: PagamentoMes,
  viewMode: 'detalhado' | 'resumido',
  mes: string,
) {
  const headers = viewMode === 'detalhado'
    ? ['Diarista', 'Dias (diária)', 'Horas', 'Valor/dia', 'Valor/hora', 'Total Diárias', 'Total Horas', 'Total Geral']
    : ['Diarista', 'Total a pagar']

  const rows = diaristas.map(d => viewMode === 'detalhado'
    ? [d.nome, d.dias_diaria, fmtHoras(d.horas_hora), d.valor_dia.toFixed(2), (d.valor_hora ?? 0).toFixed(2), d.total_diarias.toFixed(2), d.total_horas.toFixed(2), d.total_geral.toFixed(2)]
    : [d.nome, d.total_geral.toFixed(2)]
  )

  const footer = viewMode === 'detalhado'
    ? ['Total', '', '', '', '', '', '', pagamento.total.toFixed(2)]
    : ['Total', pagamento.total.toFixed(2)]

  const csv = [headers, ...rows, footer]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-pagamento-${mes}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function printReport(
  diaristas: DiaristaPagamento[],
  pagamento: PagamentoMes,
  viewMode: 'detalhado' | 'resumido',
  mes: string,
) {
  const label = getMesLabel(mes)
  const hoje = new Date().toLocaleDateString('pt-BR')

  const tableRows = diaristas.map(d => viewMode === 'detalhado'
    ? `<tr>
        <td>${d.nome}</td>
        <td>${d.dias_diaria || '—'}</td>
        <td>${fmtHoras(d.horas_hora)}</td>
        <td>${d.valor_dia > 0 ? fmtMoney(d.valor_dia) : '—'}</td>
        <td>${d.valor_hora ? fmtMoney(d.valor_hora) : '—'}</td>
        <td>${d.total_diarias > 0 ? fmtMoney(d.total_diarias) : '—'}</td>
        <td>${d.total_horas > 0 ? fmtMoney(d.total_horas) : '—'}</td>
        <td><strong>${fmtMoney(d.total_geral)}</strong></td>
      </tr>`
    : `<tr><td>${d.nome}</td><td><strong>${fmtMoney(d.total_geral)}</strong></td></tr>`
  ).join('')

  const thead = viewMode === 'detalhado'
    ? '<tr><th>Diarista</th><th>Dias</th><th>Horas</th><th>Valor/dia</th><th>Valor/hora</th><th>Tot. Diárias</th><th>Tot. Horas</th><th>Total Geral</th></tr>'
    : '<tr><th>Diarista</th><th>Total a pagar</th></tr>'

  const tfoot = viewMode === 'detalhado'
    ? `<tr><td colspan="7"><strong>Total (${diaristas.length} diaristas)</strong></td><td><strong>${fmtMoney(pagamento.total)}</strong></td></tr>`
    : `<tr><td><strong>Total</strong></td><td><strong>${fmtMoney(pagamento.total)}</strong></td></tr>`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Pagamento — ${label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 32px; color: #111; }
    h1 { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
    .sub { color: #555; font-size: 11px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f4f4f4; }
    th { text-align: left; padding: 8px 10px; border: 1px solid #ddd; font-size: 11px; white-space: nowrap; }
    td { padding: 7px 10px; border: 1px solid #e8e8e8; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tfoot tr { background: #f4f4f4; font-weight: bold; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Relatório de Pagamento</h1>
  <p class="sub">Período: ${label} &nbsp;·&nbsp; Status: ${pagamento.status === 'pago' ? 'Pago' : 'Pendente'} &nbsp;·&nbsp; Gerado em: ${hoje}</p>
  <table>
    <thead>${thead}</thead>
    <tbody>${tableRows}</tbody>
    <tfoot>${tfoot}</tfoot>
  </table>
</body>
</html>`

  const win = window.open('', '_blank', 'width=960,height=700')
  if (!win) { alert('Permita pop-ups para gerar o PDF.'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

// ─── sub-components ───────────────────────────────────────────────────────────

type ToastData = { message: string; variant: 'success' | 'error' }

function Toast({ data, onDismiss }: { data: ToastData; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className={`fixed bottom-6 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg
      ${data.variant === 'success' ? 'bg-card border-emerald-200 text-emerald-800' : 'bg-card border-destructive/30 text-destructive'}`}>
      {data.variant === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      <p className="text-sm font-medium">{data.message}</p>
      <button onClick={onDismiss} className="ml-1 flex h-5 w-5 items-center justify-center rounded opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function SummaryCard({ label, value, sub, icon: Icon, accent, large }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent?: boolean; large?: boolean
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${accent ? 'ring-1 ring-emerald-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`mt-1 font-bold tracking-tight truncate ${large ? 'text-2xl sm:text-3xl' : 'text-2xl'} ${accent ? 'text-emerald-600' : 'text-foreground'}`}>
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

function StatusBadge({ status }: { status: 'pendente' | 'pago' }) {
  return status === 'pago' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Pago
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> Pendente
    </span>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl border border-border bg-card" />)}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-10 bg-muted/50 border-b border-border" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-border last:border-0 bg-card">
            <div className="h-3.5 w-36 rounded-full bg-muted" />
            <div className="h-3.5 w-16 rounded-full bg-muted ml-auto" />
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ d, pagamento, onClose }: {
  d: DiaristaPagamento; pagamento: PagamentoMes; onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">{d.nome}</p>
            {d.especialidade && <p className="text-xs text-muted-foreground">{d.especialidade}</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {d.dias_diaria > 0 && (
            <div className="rounded-lg bg-violet-50 p-3">
              <p className="text-xs font-semibold text-violet-700 mb-1.5">Diárias</p>
              <p className="text-sm text-foreground">
                {d.dias_diaria} dia{d.dias_diaria !== 1 ? 's' : ''} × {fmtMoney(d.valor_dia)}/dia
              </p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtMoney(d.total_diarias)}</p>
            </div>
          )}
          {d.horas_hora > 0 && (
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs font-semibold text-sky-700 mb-1.5">Por Hora</p>
              <p className="text-sm text-foreground">
                {fmtHoras(d.horas_hora)} × {fmtMoney(d.valor_hora ?? 0)}/h
              </p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtMoney(d.total_horas)}</p>
            </div>
          )}
          {d.dias_diaria === 0 && d.horas_hora === 0 && (
            <p className="text-sm text-center text-muted-foreground py-3">Nenhum trabalho registrado</p>
          )}
          <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {d.dias_diaria > 0 && d.horas_hora > 0
                  ? `${fmtMoney(d.total_diarias)} + ${fmtMoney(d.total_horas)}`
                  : 'Total Geral'}
              </p>
              <p className="text-xl font-bold text-foreground">{fmtMoney(d.total_geral)}</p>
            </div>
            <StatusBadge status={pagamento.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ total, loading, onConfirm, onCancel }: {
  total: number; loading: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-3">
            <Banknote className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-foreground">Confirmar pagamento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Registrar <strong>{fmtMoney(total)}</strong> como pago para este mês?
          </p>
        </div>
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ d, pagamento, viewMode, onClick }: {
  d: DiaristaPagamento; pagamento: PagamentoMes
  viewMode: 'detalhado' | 'resumido'; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-4 space-y-2 hover:bg-accent/30 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{d.nome}</p>
          {d.especialidade && <p className="text-xs text-muted-foreground">{d.especialidade}</p>}
        </div>
        <StatusBadge status={pagamento.status} />
      </div>

      {viewMode === 'detalhado' && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {d.dias_diaria > 0 && (
            <p>
              {d.dias_diaria} diária{d.dias_diaria !== 1 ? 's' : ''} →{' '}
              <span className="font-medium text-foreground">{fmtMoney(d.total_diarias)}</span>
            </p>
          )}
          {d.horas_hora > 0 && (
            <p>
              {fmtHoras(d.horas_hora)} por hora →{' '}
              <span className="font-medium text-foreground">{fmtMoney(d.total_horas)}</span>
            </p>
          )}
        </div>
      )}

      <p className="text-sm font-bold text-emerald-600">{fmtMoney(d.total_geral)}</p>
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function PagamentosClient() {
  const [mes, setMes] = useState(currentMes)
  const [viewMode, setViewMode] = useState<'detalhado' | 'resumido'>('detalhado')
  const [relatorio, setRelatorio] = useState<{ diaristas: DiaristaPagamento[]; pagamento: PagamentoMes } | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [detailDiarista, setDetailDiarista] = useState<DiaristaPagamento | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [confirmPago, setConfirmPago] = useState(false)

  const fetchData = useCallback(async (m: string) => {
    setLoading(true)
    setErrorMsg(null)
    const result = await getRelatorioPagamento(m)
    setLoading(false)
    if (result.error) { setErrorMsg(result.error); return }
    setRelatorio({ diaristas: result.diaristas, pagamento: result.pagamento })
  }, [])

  useEffect(() => { fetchData(mes) }, [mes, fetchData])

  const summary = useMemo(() => {
    if (!relatorio) return null
    const { diaristas, pagamento } = relatorio
    return {
      qtd: diaristas.length,
      totalDias: diaristas.reduce((s, d) => s + d.dias_diaria, 0),
      totalHoras: diaristas.reduce((s, d) => s + d.horas_hora, 0),
      totalPagar: pagamento.total,
    }
  }, [relatorio])

  async function handleMarcarPago() {
    if (!relatorio) return
    setMarkingPaid(true)
    const result = await marcarComoPagoAction(mes, relatorio.pagamento.total, relatorio.pagamento.id)
    setMarkingPaid(false)
    setConfirmPago(false)
    if (result.error) { setToast({ message: result.error, variant: 'error' }); return }
    setRelatorio(prev => prev
      ? { ...prev, pagamento: { ...prev.pagamento, status: 'pago' } }
      : prev
    )
    setToast({ message: `Pagamento de ${fmtMoney(relatorio.pagamento.total)} registrado com sucesso`, variant: 'success' })
  }

  const isPago = relatorio?.pagamento.status === 'pago'
  const hasData = relatorio && relatorio.diaristas.length > 0

  const SELECT_CLS = 'h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Relatório de Pagamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Calcule e registre pagamentos de diárias e horas trabalhadas</p>
      </div>

      {/* filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          className={`${SELECT_CLS} sm:w-52`}
        >
          {MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(['detalhado', 'resumido'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'detalhado' ? 'Detalhado' : 'Resumido'}
            </button>
          ))}
        </div>
      </div>

      {/* loading */}
      {loading && <Skeleton />}

      {/* error */}
      {!loading && errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/70" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro ao calcular pagamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => fetchData(mes)}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* content */}
      {!loading && !errorMsg && relatorio && (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Diaristas" value={String(summary?.qtd ?? 0)} sub="com trabalho concluído" icon={Users} />
            <SummaryCard label="Total de dias" value={String(summary?.totalDias ?? 0)} sub="agendamentos diária" icon={Calendar} />
            <SummaryCard label="Total de horas" value={fmtTotalHoras(summary?.totalHoras ?? 0)} sub="agendamentos por hora" icon={Clock} />
            <SummaryCard label="Total a pagar" value={fmtMoney(summary?.totalPagar ?? 0)} sub="diárias + horas" icon={DollarSign} accent large />
          </div>

          {/* action buttons */}
          {hasData && (
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <button
                onClick={() => printReport(relatorio.diaristas, relatorio.pagamento, viewMode, mes)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <FileText className="h-4 w-4" /> Gerar PDF
              </button>
              <button
                onClick={() => exportCSV(relatorio.diaristas, relatorio.pagamento, viewMode, mes)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </button>
              {!isPago && (
                <button
                  onClick={() => setConfirmPago(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" /> Marcar como pago
                </button>
              )}
              {isPago && (
                <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Pago
                </div>
              )}
            </div>
          )}

          {/* empty */}
          {relatorio.diaristas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
              <Banknote className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum pagamento a processar este mês</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Agendamentos concluídos aparecerão aqui para cálculo</p>
            </div>
          )}

          {hasData && (
            <>
              {/* desktop table */}
              <div className="hidden md:block rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: viewMode === 'detalhado' ? '860px' : '400px' }}>
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Diarista</th>
                        {viewMode === 'detalhado' && (
                          <>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Dias</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Horas</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Valor/dia</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Valor/hora</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tot. Diárias</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tot. Horas</th>
                          </>
                        )}
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total Geral</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {relatorio.diaristas.map(d => (
                        <tr
                          key={d.diarista_id}
                          onClick={() => setDetailDiarista(d)}
                          className="bg-card hover:bg-accent/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{d.nome}</p>
                            {d.especialidade && <p className="text-xs text-muted-foreground">{d.especialidade}</p>}
                          </td>
                          {viewMode === 'detalhado' && (
                            <>
                              <td className="px-4 py-3 text-right">
                                {d.dias_diaria > 0 ? <span className="font-medium text-foreground">{d.dias_diaria}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {d.horas_hora > 0 ? <span className="font-medium text-foreground">{fmtHoras(d.horas_hora)}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {d.valor_dia > 0 ? fmtMoney(d.valor_dia) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {d.valor_hora ? fmtMoney(d.valor_hora) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {d.total_diarias > 0 ? <span className="text-foreground">{fmtMoney(d.total_diarias)}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {d.total_horas > 0 ? <span className="text-foreground">{fmtMoney(d.total_horas)}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 text-right font-bold text-foreground">{fmtMoney(d.total_geral)}</td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={relatorio.pagamento.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {viewMode === 'detalhado' ? (
                        <tr className="bg-muted/30 border-t border-border">
                          <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                            {relatorio.diaristas.length} diarista{relatorio.diaristas.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-foreground">{summary?.totalDias ?? 0}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-foreground">{fmtTotalHoras(summary?.totalHoras ?? 0)}</td>
                          <td colSpan={4} />
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-600">{fmtMoney(relatorio.pagamento.total)}</td>
                          <td />
                        </tr>
                      ) : (
                        <tr className="bg-muted/30 border-t border-border">
                          <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                            {relatorio.diaristas.length} diarista{relatorio.diaristas.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-600">{fmtMoney(relatorio.pagamento.total)}</td>
                          <td />
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* mobile cards */}
              <div className="md:hidden space-y-3">
                {relatorio.diaristas.map(d => (
                  <MobileCard
                    key={d.diarista_id}
                    d={d}
                    pagamento={relatorio.pagamento}
                    viewMode={viewMode}
                    onClick={() => setDetailDiarista(d)}
                  />
                ))}
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {relatorio.diaristas.length} diarista{relatorio.diaristas.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-bold text-emerald-600">{fmtMoney(relatorio.pagamento.total)}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* modals */}
      {detailDiarista && relatorio && (
        <DetailModal
          d={detailDiarista}
          pagamento={relatorio.pagamento}
          onClose={() => setDetailDiarista(null)}
        />
      )}
      {confirmPago && relatorio && (
        <ConfirmModal
          total={relatorio.pagamento.total}
          loading={markingPaid}
          onConfirm={handleMarcarPago}
          onCancel={() => setConfirmPago(false)}
        />
      )}
      {toast && <Toast data={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

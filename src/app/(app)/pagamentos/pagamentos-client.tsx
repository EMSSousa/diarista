'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users, Calendar, Clock, DollarSign, FileText,
  Download, CheckCircle2, AlertCircle, X, Banknote,
  HelpCircle, Square, CheckSquare, MinusSquare, Receipt,
} from 'lucide-react'
import {
  getRelatorioPagamento,
  marcarComoPagoAction,
  getHistoricoPagamentos,
  type DiaristaPagamento,
  type PagamentoMes,
  type MesPagamento,
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

// ─── recibo ───────────────────────────────────────────────────────────────────

function buildReciboHTML(
  lista: DiaristaPagamento[],
  mes: string,
  empresaNome: string,
): string {
  const mesLabel = getMesLabel(mes)
  const hoje     = new Date().toLocaleDateString('pt-BR')

  const blocos = lista.map(d => {
    const linhas: string[] = []

    if (d.dias_diaria > 0)
      linhas.push(`
        <tr>
          <td>Diárias</td>
          <td>${d.dias_diaria} dia${d.dias_diaria !== 1 ? 's' : ''} × ${fmtMoney(d.valor_dia)}/dia</td>
          <td class="val">${fmtMoney(d.total_diarias)}</td>
        </tr>`)

    if (d.horas_hora > 0)
      linhas.push(`
        <tr>
          <td>Por hora</td>
          <td>${fmtTotalHoras(d.horas_hora)} × ${fmtMoney(d.valor_hora ?? 0)}/h</td>
          <td class="val">${fmtMoney(d.total_horas)}</td>
        </tr>`)

    if (d.qtd_empreitas > 0)
      linhas.push(`
        <tr>
          <td>Empreita${d.qtd_empreitas !== 1 ? 's' : ''}</td>
          <td>${d.qtd_empreitas} serviço${d.qtd_empreitas !== 1 ? 's' : ''} combinado${d.qtd_empreitas !== 1 ? 's' : ''}</td>
          <td class="val">${fmtMoney(d.total_empreitas)}</td>
        </tr>`)

    if (linhas.length === 0)
      linhas.push(`<tr><td colspan="3" style="color:#999;text-align:center">Nenhum serviço registrado</td></tr>`)

    return `
      <div class="recibo">
        <div class="rec-header">
          <div>
            <div class="rec-empresa">${empresaNome}</div>
            <div class="rec-title">RECIBO DE PAGAMENTO</div>
          </div>
          <div class="rec-meta">
            <div>Período: <strong>${mesLabel}</strong></div>
            <div>Emitido em: ${hoje}</div>
          </div>
        </div>

        <div class="beneficiario">
          <span class="label">Beneficiário</span>
          <span class="nome">${d.nome}</span>
          ${d.especialidade ? `<span class="esp">${d.especialidade}</span>` : ''}
        </div>

        <table class="servicos">
          <thead>
            <tr><th>Tipo</th><th>Descrição</th><th>Valor</th></tr>
          </thead>
          <tbody>${linhas.join('')}</tbody>
        </table>

        <div class="total-row">
          <span>TOTAL A RECEBER</span>
          <span class="total-val">${fmtMoney(d.total_geral)}</span>
        </div>

        <div class="assinatura">
          <div class="ass-box">
            <div class="ass-line"></div>
            <div class="ass-label">${d.nome}<br><small>Assinatura / Data</small></div>
          </div>
          <div class="ass-box">
            <div class="ass-line"></div>
            <div class="ass-label">${empresaNome}<br><small>Responsável / Data</small></div>
          </div>
        </div>

        <div class="rec-footer">
          Declaro ter recebido a quantia de <strong>${fmtMoney(d.total_geral)}</strong> referente aos serviços prestados no período de <strong>${mesLabel}</strong>.
        </div>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Pagamento — ${mesLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #f5f5f5; }
    .recibo {
      background: #fff; border: 1px solid #ddd; border-radius: 8px;
      padding: 28px 32px; margin: 24px auto; max-width: 700px;
      page-break-after: always;
    }
    .recibo:last-child { page-break-after: avoid; }
    .rec-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 14px; }
    .rec-empresa { font-size: 16px; font-weight: bold; }
    .rec-title { font-size: 13px; color: #555; margin-top: 2px; letter-spacing: 0.5px; }
    .rec-meta { text-align: right; font-size: 11px; color: #444; line-height: 1.6; }
    .beneficiario { background: #f9f9f9; border-left: 3px solid #333; padding: 10px 14px; margin-bottom: 16px; border-radius: 0 4px 4px 0; }
    .beneficiario .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #777; display: block; }
    .beneficiario .nome { font-size: 15px; font-weight: bold; display: block; margin-top: 2px; }
    .beneficiario .esp { font-size: 11px; color: #666; display: block; }
    .servicos { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .servicos th { background: #f0f0f0; text-align: left; padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #ddd; }
    .servicos td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
    .servicos .val { text-align: right; font-weight: 600; white-space: nowrap; }
    .total-row { display: flex; justify-content: space-between; align-items: center; background: #111; color: #fff; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; }
    .total-val { font-size: 18px; font-weight: bold; }
    .assinatura { display: flex; gap: 24px; margin-bottom: 20px; }
    .ass-box { flex: 1; }
    .ass-line { border-bottom: 1px solid #999; height: 40px; margin-bottom: 6px; }
    .ass-label { font-size: 10px; color: #555; text-align: center; line-height: 1.5; }
    .rec-footer { font-size: 10px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { background: #fff; } .recibo { border: none; box-shadow: none; margin: 0; border-radius: 0; } }
  </style>
</head>
<body>${blocos}</body>
</html>`
}

function generateRecibo(lista: DiaristaPagamento[], mes: string, empresaNome: string) {
  const html = buildReciboHTML(lista, mes, empresaNome)
  const win = window.open('', '_blank', 'width=780,height=900')
  if (!win) { alert('Permita pop-ups para gerar o recibo.'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

// ─── exportCSV ────────────────────────────────────────────────────────────────

function exportCSV(diaristas: DiaristaPagamento[], pagamento: PagamentoMes, viewMode: 'detalhado' | 'resumido', mes: string) {
  const headers = viewMode === 'detalhado'
    ? ['Diarista', 'Dias (diária)', 'Empreitas', 'Horas', 'Valor/dia', 'Valor/hora', 'Total Diárias', 'Total Empreitas', 'Total Horas', 'Total Geral']
    : ['Diarista', 'Total a pagar']

  const rows = diaristas.map(d => viewMode === 'detalhado'
    ? [d.nome, d.dias_diaria, d.qtd_empreitas, fmtHoras(d.horas_hora), d.valor_dia.toFixed(2), (d.valor_hora ?? 0).toFixed(2), d.total_diarias.toFixed(2), d.total_empreitas.toFixed(2), d.total_horas.toFixed(2), d.total_geral.toFixed(2)]
    : [d.nome, d.total_geral.toFixed(2)]
  )

  const footer = viewMode === 'detalhado'
    ? ['Total', '', '', '', '', '', '', '', '', pagamento.total.toFixed(2)]
    : ['Total', pagamento.total.toFixed(2)]

  const csv = [headers, ...rows, footer]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `pagamento-${mes}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function printReport(diaristas: DiaristaPagamento[], pagamento: PagamentoMes, viewMode: 'detalhado' | 'resumido', mes: string) {
  const label = getMesLabel(mes)
  const hoje  = new Date().toLocaleDateString('pt-BR')

  const tableRows = diaristas.map(d => viewMode === 'detalhado'
    ? `<tr><td>${d.nome}</td><td>${d.dias_diaria || '—'}</td><td>${d.qtd_empreitas || '—'}</td><td>${fmtHoras(d.horas_hora)}</td><td>${d.valor_dia > 0 ? fmtMoney(d.valor_dia) : '—'}</td><td>${d.valor_hora ? fmtMoney(d.valor_hora) : '—'}</td><td>${d.total_diarias > 0 ? fmtMoney(d.total_diarias) : '—'}</td><td>${d.total_empreitas > 0 ? fmtMoney(d.total_empreitas) : '—'}</td><td>${d.total_horas > 0 ? fmtMoney(d.total_horas) : '—'}</td><td><strong>${fmtMoney(d.total_geral)}</strong></td></tr>`
    : `<tr><td>${d.nome}</td><td><strong>${fmtMoney(d.total_geral)}</strong></td></tr>`
  ).join('')

  const thead = viewMode === 'detalhado'
    ? '<tr><th>Diarista</th><th>Dias</th><th>Empr.</th><th>Horas</th><th>Valor/dia</th><th>Valor/hora</th><th>Tot. Diárias</th><th>Tot. Empr.</th><th>Tot. Horas</th><th>Total Geral</th></tr>'
    : '<tr><th>Diarista</th><th>Total a pagar</th></tr>'

  const tfoot = viewMode === 'detalhado'
    ? `<tr><td colspan="9"><strong>Total (${diaristas.length} diaristas)</strong></td><td><strong>${fmtMoney(pagamento.total)}</strong></td></tr>`
    : `<tr><td><strong>Total</strong></td><td><strong>${fmtMoney(pagamento.total)}</strong></td></tr>`

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Pagamento — ${label}</title>
  <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: Arial, sans-serif; font-size: 12px; padding: 32px; color: #111; } h1 { font-size: 20px; font-weight: bold; margin-bottom: 6px; } .sub { color: #555; font-size: 11px; margin-bottom: 24px; } table { width: 100%; border-collapse: collapse; } thead tr { background: #f4f4f4; } th { text-align: left; padding: 8px 10px; border: 1px solid #ddd; font-size: 11px; white-space: nowrap; } td { padding: 7px 10px; border: 1px solid #e8e8e8; } tbody tr:nth-child(even) { background: #fafafa; } tfoot tr { background: #f4f4f4; font-weight: bold; } @media print { body { padding: 16px; } }</style>
  </head><body><h1>Relatório de Pagamento</h1><p class="sub">Período: ${label} · Status: ${pagamento.status === 'pago' ? 'Pago' : 'Pendente'} · Gerado em: ${hoje}</p><table><thead>${thead}</thead><tbody>${tableRows}</tbody><tfoot>${tfoot}</tfoot></table></body></html>`

  const win = window.open('', '_blank', 'width=960,height=700')
  if (!win) { alert('Permita pop-ups para gerar o PDF.'); return }
  win.document.write(html); win.document.close()
  setTimeout(() => win.print(), 400)
}

// ─── HelpModal ────────────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      num: '1',
      title: 'Selecione o mês',
      desc: 'Use o seletor de mês no topo para visualizar os agendamentos concluídos do período desejado.',
    },
    {
      num: '2',
      title: 'Revise os valores',
      desc: 'A tabela mostra cada diarista com suas diárias, horas por hora e empreitas. Clique em uma linha para ver o detalhamento completo.',
    },
    {
      num: '3',
      title: 'Selecione quem pagar',
      desc: 'Marque as caixas de seleção ao lado das diaristas que deseja pagar. Use "Selecionar todas" para marcar todas de uma vez. Ou clique em "Pagar todos" para pagar o mês inteiro.',
    },
    {
      num: '4',
      title: 'Gere os recibos',
      desc: 'Com as diaristas selecionadas, clique em "Gerar recibo" para abrir um recibo individual detalhado para cada uma — com discriminação de diárias, horas e empreitas, e espaço para assinatura.',
    },
    {
      num: '5',
      title: 'Confirme o pagamento',
      desc: 'Após pagar, clique em "Pagar selecionadas" (ou "Marcar mês como pago"). O sistema registra o pagamento e o status passa para Pago.',
    },
    {
      num: '6',
      title: 'Exporte se precisar',
      desc: 'Use "Gerar PDF" para imprimir o relatório consolidado, ou "Exportar CSV" para abrir no Excel.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Como usar Pagamentos</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground mt-0.5">
                {num}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 mt-2">
            <strong>Dica:</strong> O valor total é calculado automaticamente com base nos agendamentos com status <em>Concluído</em> no mês selecionado.
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border">
          <button onClick={onClose} className="w-full h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

type ToastData = { message: string; variant: 'success' | 'error' }

function Toast({ data, onDismiss }: { data: ToastData; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t) }, [onDismiss])
  return (
    <div className={`fixed bottom-6 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${data.variant === 'success' ? 'bg-card border-emerald-200 text-emerald-800' : 'bg-card border-destructive/30 text-destructive'}`}>
      {data.variant === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      <p className="text-sm font-medium">{data.message}</p>
      <button onClick={onDismiss} className="ml-1 flex h-5 w-5 items-center justify-center rounded opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  )
}

function SummaryCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${accent ? 'ring-1 ring-emerald-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight truncate ${accent ? 'text-emerald-600' : 'text-foreground'}`}>{value}</p>
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
        {[0, 1, 2, 3].map(i => <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-border last:border-0 bg-card"><div className="h-3.5 w-36 rounded-full bg-muted" /><div className="h-3.5 w-16 rounded-full bg-muted ml-auto" /><div className="h-6 w-20 rounded-full bg-muted" /></div>)}
      </div>
    </div>
  )
}

// ─── detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ d, pagamento, onClose }: { d: DiaristaPagamento; pagamento: PagamentoMes; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">{d.nome}</p>
            {d.especialidade && <p className="text-xs text-muted-foreground">{d.especialidade}</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {d.dias_diaria > 0 && (
            <div className="rounded-lg bg-violet-50 p-3">
              <p className="text-xs font-semibold text-violet-700 mb-1.5">Diárias</p>
              <p className="text-sm text-foreground">{d.dias_diaria} dia{d.dias_diaria !== 1 ? 's' : ''} × {fmtMoney(d.valor_dia)}/dia</p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtMoney(d.total_diarias)}</p>
            </div>
          )}
          {d.qtd_empreitas > 0 && (
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">Empreitas</p>
              <p className="text-sm text-foreground">{d.qtd_empreitas} serviço{d.qtd_empreitas !== 1 ? 's' : ''} combinado{d.qtd_empreitas !== 1 ? 's' : ''}</p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtMoney(d.total_empreitas)}</p>
            </div>
          )}
          {d.horas_hora > 0 && (
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs font-semibold text-sky-700 mb-1.5">Por Hora</p>
              <p className="text-sm text-foreground">{fmtHoras(d.horas_hora)} × {fmtMoney(d.valor_hora ?? 0)}/h</p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtMoney(d.total_horas)}</p>
            </div>
          )}
          {d.dias_diaria === 0 && d.qtd_empreitas === 0 && d.horas_hora === 0 && (
            <p className="text-sm text-center text-muted-foreground py-3">Nenhum trabalho registrado</p>
          )}
          <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {[d.dias_diaria > 0 && fmtMoney(d.total_diarias), d.qtd_empreitas > 0 && fmtMoney(d.total_empreitas), d.horas_hora > 0 && fmtMoney(d.total_horas)].filter(Boolean).join(' + ') || 'Total Geral'}
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

// ─── confirm pagar modal ──────────────────────────────────────────────────────

function ConfirmPagarModal({
  diaristas, total, loading, onConfirm, onCancel, onRecibo,
}: {
  diaristas: DiaristaPagamento[]
  total: number
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
  onRecibo: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && !loading && onCancel()}>
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-semibold text-foreground">Confirmar pagamento</p>
          </div>
          <button onClick={onCancel} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {diaristas.length === 1
              ? `Você está pagando ${diaristas[0].nome}.`
              : `Você está pagando ${diaristas.length} diaristas.`}
          </p>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {diaristas.map(d => (
              <div key={d.diarista_id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      d.dias_diaria > 0 && `${d.dias_diaria} diária${d.dias_diaria !== 1 ? 's' : ''}`,
                      d.horas_hora > 0 && `${fmtTotalHoras(d.horas_hora)} hora`,
                      d.qtd_empreitas > 0 && `${d.qtd_empreitas} empreita${d.qtd_empreitas !== 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">{fmtMoney(d.total_geral)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <span className="text-sm font-semibold text-emerald-800">Total</span>
            <span className="text-lg font-bold text-emerald-700">{fmtMoney(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 pb-5">
          <button
            onClick={onRecibo}
            className="w-full h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
          >
            <Receipt className="h-4 w-4" /> Gerar recibo antes de confirmar
          </button>
          <div className="flex gap-2">
            <button onClick={onCancel} disabled={loading} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 h-10 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {loading ? 'Salvando…' : 'Confirmar pagamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  if (indeterminate) return (
    <button type="button" onClick={onChange} className="text-primary">
      <MinusSquare className="h-4 w-4" />
    </button>
  )
  return (
    <button type="button" onClick={onChange} className={checked ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}>
      {checked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
    </button>
  )
}

// ─── mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ d, pagamento, viewMode, selected, onSelect, onDetail }: {
  d: DiaristaPagamento; pagamento: PagamentoMes; viewMode: 'detalhado' | 'resumido'
  selected: boolean; onSelect: () => void; onDetail: () => void
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-2 transition-colors ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox checked={selected} onChange={onSelect} />
        </div>
        <button onClick={onDetail} className="flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{d.nome}</p>
              {d.especialidade && <p className="text-xs text-muted-foreground">{d.especialidade}</p>}
            </div>
            <StatusBadge status={pagamento.status} />
          </div>
          {viewMode === 'detalhado' && (
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              {d.dias_diaria > 0 && <p>{d.dias_diaria} diária{d.dias_diaria !== 1 ? 's' : ''} → <span className="font-medium text-foreground">{fmtMoney(d.total_diarias)}</span></p>}
              {d.qtd_empreitas > 0 && <p>{d.qtd_empreitas} empreita{d.qtd_empreitas !== 1 ? 's' : ''} → <span className="font-medium text-foreground">{fmtMoney(d.total_empreitas)}</span></p>}
              {d.horas_hora > 0 && <p>{fmtHoras(d.horas_hora)} por hora → <span className="font-medium text-foreground">{fmtMoney(d.total_horas)}</span></p>}
            </div>
          )}
          <p className="text-sm font-bold text-emerald-600 mt-1">{fmtMoney(d.total_geral)}</p>
        </button>
      </div>
    </div>
  )
}

// ─── AbaHistorico ─────────────────────────────────────────────────────────────

type StatusFiltro = 'todos' | 'pago' | 'pendente'

function mesInicioAno() {
  return `${new Date().getFullYear()}-01`
}
function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function AbaHistorico({ onVerDetalhe }: { onVerDetalhe: (mes: string) => void }) {
  const [inicio,    setInicio]    = useState(mesInicioAno)
  const [fim,       setFim]       = useState(mesAtual)
  const [status,    setStatus]    = useState<StatusFiltro>('todos')
  const [meses,     setMeses]     = useState<MesPagamento[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const load = useCallback(async (ini: string, f: string) => {
    setLoading(true); setError(null)
    const { meses: data, error: e } = await getHistoricoPagamentos(ini, f)
    if (e) setError(e)
    else setMeses(data)
    setLoading(false)
  }, [])

  useEffect(() => { load(inicio, fim) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = meses.filter(m => status === 'todos' || m.status === status)

  const totalPago     = meses.filter(m => m.status === 'pago').reduce((s, m) => s + m.total, 0)
  const totalPendente = meses.filter(m => m.status === 'pendente').reduce((s, m) => s + m.total, 0)

  const inputCls = 'h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Mês início</label>
            <input type="month" value={inicio} max={fim} onChange={e => setInicio(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Mês fim</label>
            <input type="month" value={fim} min={inicio} onChange={e => setFim(e.target.value)} className={inputCls} />
          </div>
          <button
            onClick={() => load(inicio, fim)}
            disabled={loading}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Buscando…' : 'Filtrar'}
          </button>
        </div>

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {([
            { id: 'todos',    label: 'Todos'    },
            { id: 'pago',     label: 'Pagos'    },
            { id: 'pendente', label: 'Pendentes' },
          ] as { id: StatusFiltro; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setStatus(id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors border ${
                status === id
                  ? id === 'pago'     ? 'bg-emerald-600 text-white border-emerald-600'
                  : id === 'pendente' ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo rápido */}
      {!loading && meses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total de meses</p>
            <p className="text-2xl font-bold text-foreground mt-1">{meses.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-700">Total pago</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(totalPago)}</p>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-yellow-700">Total pendente</p>
            <p className="text-xl font-bold text-yellow-700 mt-1">{fmtMoney(totalPendente)}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted" />)}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && filtrados.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-center">
          <Banknote className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {meses.length === 0
              ? 'Nenhum pagamento encontrado no período'
              : 'Nenhum resultado para o filtro selecionado'}
          </p>
        </div>
      )}

      {!loading && !error && filtrados.length > 0 && (
        <div className="space-y-2">
          {filtrados.map(m => {
            const label = getMesLabel(m.mes)
            const isPago = m.status === 'pago'
            return (
              <div key={m.mes} className={`rounded-xl border bg-card p-4 flex items-center gap-4 transition-colors ${isPago ? 'border-emerald-200' : 'border-border'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    {isPago ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.qtd_diaristas} diarista{m.qtd_diaristas !== 1 ? 's' : ''} com serviços concluídos
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base font-bold ${isPago ? 'text-emerald-700' : 'text-foreground'}`}>
                    {fmtMoney(m.total)}
                  </p>
                  <button
                    onClick={() => onVerDetalhe(m.mes)}
                    className="text-xs text-primary hover:underline mt-0.5"
                  >
                    Ver detalhes →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function PagamentosClient({ empresaNome }: { empresaNome: string }) {
  const [aba,           setAba]           = useState<'calcular' | 'historico'>('calcular')
  const [mes,           setMes]           = useState(currentMes)
  const [viewMode,      setViewMode]      = useState<'detalhado' | 'resumido'>('detalhado')
  const [relatorio,     setRelatorio]     = useState<{ diaristas: DiaristaPagamento[]; pagamento: PagamentoMes } | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)
  const [detailDiarista,setDetailDiarista]= useState<DiaristaPagamento | null>(null)
  const [toast,         setToast]         = useState<ToastData | null>(null)
  const [markingPaid,   setMarkingPaid]   = useState(false)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [showHelp,      setShowHelp]      = useState(false)
  const [selecionados,  setSelecionados]  = useState<Set<string>>(new Set())

  const fetchData = useCallback(async (m: string) => {
    setLoading(true); setErrorMsg(null); setSelecionados(new Set())
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
      qtdEmpreitas: diaristas.reduce((s, d) => s + d.qtd_empreitas, 0),
      totalEmpreitas: diaristas.reduce((s, d) => s + d.total_empreitas, 0),
      totalPagar: pagamento.total,
    }
  }, [relatorio])

  // Seleção
  const allIds    = relatorio?.diaristas.map(d => d.diarista_id) ?? []
  const allCount  = allIds.length
  const selCount  = selecionados.size
  const allSel    = allCount > 0 && selCount === allCount
  const someSel   = selCount > 0 && selCount < allCount

  const toggleAll = () => {
    if (allSel) setSelecionados(new Set())
    else setSelecionados(new Set(allIds))
  }

  const toggleOne = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const diaristasParaPagar = relatorio?.diaristas.filter(d => selecionados.has(d.diarista_id)) ?? []
  const totalSelecionados  = diaristasParaPagar.reduce((s, d) => s + d.total_geral, 0)

  async function handlePagar() {
    if (!relatorio) return
    setMarkingPaid(true)
    const target  = diaristasParaPagar.length > 0 ? diaristasParaPagar : relatorio.diaristas
    const total   = Math.round(target.reduce((s, d) => s + d.total_geral, 0) * 100) / 100
    const result  = await marcarComoPagoAction(mes, total, relatorio.pagamento.id)
    setMarkingPaid(false)
    setShowConfirm(false)
    if (result.error) { setToast({ message: result.error, variant: 'error' }); return }
    setRelatorio(prev => prev ? { ...prev, pagamento: { ...prev.pagamento, status: 'pago' } } : prev)
    setToast({ message: `Pagamento de ${fmtMoney(total)} registrado com sucesso`, variant: 'success' })
    setSelecionados(new Set())
  }

  const isPago  = relatorio?.pagamento.status === 'pago'
  const hasData = relatorio && relatorio.diaristas.length > 0

  const SELECT_CLS = 'h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">

      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Calcule, registre e acompanhe pagamentos de diárias e horas trabalhadas</p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Ajuda</span>
        </button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'calcular',  label: 'Calcular pagamento' },
          { id: 'historico', label: 'Histórico'          },
        ] as { id: 'calcular' | 'historico'; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Aba Histórico */}
      {aba === 'historico' && (
        <AbaHistorico
          onVerDetalhe={mes => { setMes(mes); setAba('calcular') }}
        />
      )}

      {/* Aba Calcular */}
      {aba === 'calcular' && (<>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <select value={mes} onChange={e => setMes(e.target.value)} className={`${SELECT_CLS} sm:w-52`}>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(['detalhado', 'resumido'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {mode === 'detalhado' ? 'Detalhado' : 'Resumido'}
            </button>
          ))}
        </div>
      </div>

      {loading && <Skeleton />}

      {!loading && errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/70" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro ao calcular pagamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => fetchData(mes)} className="text-xs font-medium text-primary underline-offset-2 hover:underline">Tentar novamente</button>
        </div>
      )}

      {!loading && !errorMsg && relatorio && (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard label="Diaristas" value={String(summary?.qtd ?? 0)} sub="com trabalho concluído" icon={Users} />
            <SummaryCard label="Total de dias" value={String(summary?.totalDias ?? 0)} sub="agendamentos diária" icon={Calendar} />
            <SummaryCard label="Total de horas" value={fmtTotalHoras(summary?.totalHoras ?? 0)} sub="agendamentos por hora" icon={Clock} />
            <SummaryCard label="Empreitas" value={String(summary?.qtdEmpreitas ?? 0)} sub={summary?.totalEmpreitas ? fmtMoney(summary.totalEmpreitas) : 'nenhuma'} icon={Banknote} />
            <SummaryCard label="Total a pagar" value={fmtMoney(summary?.totalPagar ?? 0)} sub="diárias + empreitas + horas" icon={DollarSign} accent />
          </div>

          {/* action buttons */}
          {hasData && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {/* selection bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox checked={allSel} indeterminate={someSel} onChange={toggleAll} />
                  <span className="text-sm text-muted-foreground">
                    {selCount === 0 ? 'Selecionar todas' : selCount === allCount ? `Todas selecionadas (${selCount})` : `${selCount} de ${allCount} selecionada${selCount !== 1 ? 's' : ''}`}
                  </span>
                  {selCount > 0 && (
                    <span className="text-sm font-semibold text-emerald-600">{fmtMoney(totalSelecionados)}</span>
                  )}
                </div>
                {selCount > 0 && (
                  <button onClick={() => setSelecionados(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline">
                    Limpar seleção
                  </button>
                )}
              </div>

              {/* action buttons row */}
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <button onClick={() => printReport(relatorio.diaristas, relatorio.pagamento, viewMode, mes)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                  <FileText className="h-4 w-4" /> Gerar PDF
                </button>
                <button onClick={() => exportCSV(relatorio.diaristas, relatorio.pagamento, viewMode, mes)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  <Download className="h-4 w-4" /> Exportar CSV
                </button>

                {/* recibo individual/combo */}
                {selCount > 0 && (
                  <button
                    onClick={() => generateRecibo(diaristasParaPagar, mes, empresaNome)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/5 px-4 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Receipt className="h-4 w-4" />
                    Gerar recibo {selCount === 1 ? 'individual' : `(${selCount})`}
                  </button>
                )}

                {!isPago && (
                  selCount > 0 ? (
                    <button onClick={() => setShowConfirm(true)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                      <CheckCircle2 className="h-4 w-4" /> Pagar selecionadas ({selCount})
                    </button>
                  ) : (
                    <button onClick={() => { setSelecionados(new Set(allIds)); setShowConfirm(true) }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                      <CheckCircle2 className="h-4 w-4" /> Marcar mês como pago
                    </button>
                  )
                )}
                {isPago && (
                  <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Pago
                  </div>
                )}
              </div>
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
                  <table className="w-full text-sm" style={{ minWidth: viewMode === 'detalhado' ? '1060px' : '440px' }}>
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-2.5 w-10">
                          <Checkbox checked={allSel} indeterminate={someSel} onChange={toggleAll} />
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Diarista</th>
                        {viewMode === 'detalhado' && (<>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Dias</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Empr.</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Horas</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Valor/dia</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Valor/hora</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tot. Diárias</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tot. Empr.</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tot. Horas</th>
                        </>)}
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total Geral</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {relatorio.diaristas.map(d => {
                        const sel = selecionados.has(d.diarista_id)
                        return (
                          <tr key={d.diarista_id} className={`transition-colors ${sel ? 'bg-primary/5' : 'bg-card hover:bg-accent/40'}`}>
                            <td className="px-4 py-3">
                              <Checkbox checked={sel} onChange={() => toggleOne(d.diarista_id)} />
                            </td>
                            <td className="px-4 py-3 cursor-pointer" onClick={() => setDetailDiarista(d)}>
                              <p className="font-medium text-foreground">{d.nome}</p>
                              {d.especialidade && <p className="text-xs text-muted-foreground">{d.especialidade}</p>}
                            </td>
                            {viewMode === 'detalhado' && (<>
                              <td className="px-4 py-3 text-right">{d.dias_diaria > 0 ? <span className="font-medium text-foreground">{d.dias_diaria}</span> : <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-4 py-3 text-right">{d.qtd_empreitas > 0 ? <span className="font-medium text-foreground">{d.qtd_empreitas}</span> : <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-4 py-3 text-right">{d.horas_hora > 0 ? <span className="font-medium text-foreground">{fmtHoras(d.horas_hora)}</span> : <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{d.valor_dia > 0 ? fmtMoney(d.valor_dia) : '—'}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{d.valor_hora ? fmtMoney(d.valor_hora) : '—'}</td>
                              <td className="px-4 py-3 text-right">{d.total_diarias > 0 ? <span className="text-foreground">{fmtMoney(d.total_diarias)}</span> : <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-4 py-3 text-right">{d.total_empreitas > 0 ? <span className="text-foreground">{fmtMoney(d.total_empreitas)}</span> : <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-4 py-3 text-right">{d.total_horas > 0 ? <span className="text-foreground">{fmtMoney(d.total_horas)}</span> : <span className="text-muted-foreground">—</span>}</td>
                            </>)}
                            <td className="px-4 py-3 text-right font-bold text-foreground">{fmtMoney(d.total_geral)}</td>
                            <td className="px-4 py-3 text-right"><StatusBadge status={relatorio.pagamento.status} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      {viewMode === 'detalhado' ? (
                        <tr className="bg-muted/30 border-t border-border">
                          <td />
                          <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">{relatorio.diaristas.length} diarista{relatorio.diaristas.length !== 1 ? 's' : ''}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-foreground">{summary?.totalDias ?? 0}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-foreground">{summary?.qtdEmpreitas ?? 0}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-foreground">{fmtTotalHoras(summary?.totalHoras ?? 0)}</td>
                          <td colSpan={5} />
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-600">{fmtMoney(relatorio.pagamento.total)}</td>
                          <td />
                        </tr>
                      ) : (
                        <tr className="bg-muted/30 border-t border-border">
                          <td /><td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">{relatorio.diaristas.length} diarista{relatorio.diaristas.length !== 1 ? 's' : ''}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-600">{fmtMoney(relatorio.pagamento.total)}</td><td />
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
                    selected={selecionados.has(d.diarista_id)}
                    onSelect={() => toggleOne(d.diarista_id)}
                    onDetail={() => setDetailDiarista(d)}
                  />
                ))}
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{relatorio.diaristas.length} diarista{relatorio.diaristas.length !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-bold text-emerald-600">{fmtMoney(relatorio.pagamento.total)}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}
      </>)}

      {/* modals */}
      {detailDiarista && relatorio && (
        <DetailModal d={detailDiarista} pagamento={relatorio.pagamento} onClose={() => setDetailDiarista(null)} />
      )}
      {showConfirm && relatorio && (
        <ConfirmPagarModal
          diaristas={diaristasParaPagar.length > 0 ? diaristasParaPagar : relatorio.diaristas}
          total={diaristasParaPagar.length > 0 ? totalSelecionados : relatorio.pagamento.total}
          loading={markingPaid}
          onConfirm={handlePagar}
          onCancel={() => setShowConfirm(false)}
          onRecibo={() => generateRecibo(
            diaristasParaPagar.length > 0 ? diaristasParaPagar : relatorio.diaristas,
            mes,
            empresaNome,
          )}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {toast && <Toast data={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

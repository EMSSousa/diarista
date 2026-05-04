'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock, RefreshCw, CheckCircle2, AlertTriangle, Loader2,
  CalendarOff, UserCheck, History, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getTodayData, marcarEntradaAction, marcarSaidaAction,
  type DiaristaPonto, type HistoricoItem,
} from './actions'

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtHoras(entrada: string, saida: string): string {
  const totalMin = Math.round((new Date(saida).getTime() - new Date(entrada).getTime()) / 60_000)
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return min > 0 ? `${h}h ${min}min` : `${h}h`
}

function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function hojeLabel() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

type PontoStatus = 'nao_iniciado' | 'trabalhando' | 'concluido'

function getPontoStatus(d: DiaristaPonto): PontoStatus {
  if (!d.ponto) return 'nao_iniciado'
  if (!d.ponto.saida) return 'trabalhando'
  return 'concluido'
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastData = { message: string; variant: 'success' | 'error' }

function Toast({ data, onDone }: { data: ToastData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5',
      'rounded-2xl px-4 py-3 text-sm font-medium shadow-xl',
      'sm:left-auto sm:right-6 sm:translate-x-0',
      data.variant === 'success' ? 'bg-emerald-600 text-white' : 'bg-destructive text-white',
    )}>
      {data.variant === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertTriangle className="h-4 w-4 shrink-0" />
      }
      {data.message}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full rounded-t-2xl sm:rounded-2xl sm:max-w-md bg-card shadow-2xl max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex min-h-[80px] items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-3 w-24 rounded-md bg-muted" />
      </div>
      <div className="h-6 w-20 rounded-full bg-muted" />
    </div>
  )
}

// ─── Diarista Card ────────────────────────────────────────────────────────────

const STATUS_CARD = {
  nao_iniciado: {
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600',
    label: 'Não iniciado',
    ring: 'border-border',
    avatar: 'bg-gray-100 text-gray-500',
  },
  trabalhando: {
    dot: 'bg-blue-500 animate-pulse',
    badge: 'bg-blue-50 text-blue-700',
    label: 'Trabalhando',
    ring: 'border-blue-200 bg-blue-50/30',
    avatar: 'bg-blue-100 text-blue-600',
  },
  concluido: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700',
    label: 'Concluído',
    ring: 'border-emerald-200 bg-emerald-50/20',
    avatar: 'bg-emerald-100 text-emerald-600',
  },
}

function DiaristaPontoCard({ item }: { item: DiaristaPonto }) {
  const status = getPontoStatus(item)
  const cfg    = STATUS_CARD[status]

  return (
    <div className={cn(
      'flex min-h-[80px] items-start gap-4 rounded-2xl border p-4 shadow-sm transition-colors',
      cfg.ring,
    )}>
      {/* Avatar */}
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', cfg.avatar)}>
        {item.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{item.nome}</p>
          <span className={cn('shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          {item.especialidade && `${item.especialidade} · `}
          {item.tipo_pagamento === 'hora' ? 'Por hora' : 'Diária'}
          {item.tipo_pagamento === 'hora' && item.valor_hora
            ? ` · R$ ${item.valor_hora}/h`
            : item.tipo_pagamento === 'diaria' && item.valor > 0
              ? ` · R$ ${item.valor}`
              : ''
          }
        </p>

        {/* Times */}
        {item.ponto && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {fmtTime(item.ponto.entrada)}
            </span>
            {item.ponto.saida ? (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium text-foreground">{fmtTime(item.ponto.saida)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-emerald-600">
                  {fmtHoras(item.ponto.entrada, item.ponto.saida)}
                </span>
                {item.tipo_pagamento === 'hora' && item.valor > 0 && (
                  <span className="text-muted-foreground">
                    · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground animate-pulse">em andamento...</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Historico row ────────────────────────────────────────────────────────────

function HistoricoRow({ item }: { item: HistoricoItem }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
        {item.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
        <p className="text-xs text-muted-foreground">
          {item.data ? fmtDate(item.data) : '—'}
          {' · '}{fmtTime(item.entrada)} → {fmtTime(item.saida)}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
        {fmtHoras(item.entrada, item.saida)}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type ModalState = 'none' | 'saida_individual' | 'encerrar_todos'

export function PontosClient() {
  const [diaristas, setDiaristas]   = useState<DiaristaPonto[]>([])
  const [historico, setHistorico]   = useState<HistoricoItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal]           = useState<ModalState>('none')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [toast, setToast]           = useState<ToastData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    const res = await getTodayData()
    if (res.error) setError(res.error)
    else { setDiaristas(res.diaristas); setHistorico(res.historico) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showToast(message: string, variant: ToastData['variant'] = 'success') {
    setToast({ message, variant })
  }

  // ── Derived lists ──
  const naoIniciados = diaristas.filter(d => getPontoStatus(d) === 'nao_iniciado')
  const trabalhando  = diaristas.filter(d => getPontoStatus(d) === 'trabalhando')
  const concluidos   = diaristas.filter(d => getPontoStatus(d) === 'concluido')

  // ── Actions ──
  async function handleMarcarEntrada() {
    const ids = naoIniciados.map(d => d.agendamento_id)
    setSubmitting(true)
    const res = await marcarEntradaAction(ids)
    setSubmitting(false)
    if (res?.error) { showToast(res.error, 'error'); return }
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    showToast(`Entrada marcada às ${hora} para ${ids.length} diarista${ids.length > 1 ? 's' : ''}`)
    fetchData()
  }

  function openSaidaIndividual() {
    setSelected(new Set(trabalhando.map(d => d.agendamento_id)))
    setModal('saida_individual')
  }

  async function handleSaidaIndividual() {
    const ids = Array.from(selected)
    if (!ids.length) return
    setSubmitting(true)
    const res = await marcarSaidaAction(ids)
    setSubmitting(false)
    if (res.error) { showToast(res.error, 'error'); return }
    const h = res.totalHoras
    const hLabel = Number.isInteger(h) ? `${h}h` : `${h}h`
    showToast(`Saída marcada para ${ids.length} diarista${ids.length > 1 ? 's' : ''}. Total: ${hLabel}`)
    setModal('none'); setSelected(new Set())
    fetchData()
  }

  async function handleEncerrarTodos() {
    const ids = trabalhando.map(d => d.agendamento_id)
    setSubmitting(true)
    const res = await marcarSaidaAction(ids)
    setSubmitting(false)
    if (res.error) { showToast(res.error, 'error'); return }
    showToast(`Todos encerrados. Total registrado: ${res.totalHoras}h`)
    setModal('none')
    fetchData()
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Marcar Ponto</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{hojeLabel()}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* ─── Stats bar ─── */}
      {!loading && !error && diaristas.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Não iniciado', count: naoIniciados.length, color: 'text-gray-600',    bg: 'bg-gray-50' },
            { label: 'Trabalhando',  count: trabalhando.length,  color: 'text-blue-700',    bg: 'bg-blue-50' },
            { label: 'Concluído',    count: concluidos.length,   color: 'text-emerald-700', bg: 'bg-emerald-50' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={cn('rounded-xl p-3 text-center', bg)}>
              <p className={cn('text-2xl font-bold', color)}>{count}</p>
              <p className={cn('text-xs font-medium', color)}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Diaristas list ─── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Erro ao carregar pontos</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      ) : diaristas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="rounded-full bg-accent p-4">
            <CalendarOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Você não tem agendamento hoje</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um agendamento para marcar ponto.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {diaristas.map(d => <DiaristaPontoCard key={d.agendamento_id} item={d} />)}
        </div>
      )}

      {/* ─── Action buttons ─── */}
      {!loading && !error && diaristas.length > 0 && (
        <div className="space-y-3">
          {naoIniciados.length > 0 && (
            <button
              onClick={handleMarcarEntrada}
              disabled={submitting}
              className="flex h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 transition-all shadow-sm"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando...</>
                : <><UserCheck className="h-4 w-4" />Marcar Entrada · {naoIniciados.length} diarista{naoIniciados.length > 1 ? 's' : ''}</>
              }
            </button>
          )}

          {trabalhando.length > 0 && (
            <>
              <button
                onClick={openSaidaIndividual}
                disabled={submitting}
                className="flex h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 transition-all shadow-sm"
              >
                <Clock className="h-4 w-4" />
                Marcar Saída Individual
              </button>

              <button
                onClick={() => setModal('encerrar_todos')}
                disabled={submitting}
                className="flex h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 active:scale-[0.98] disabled:opacity-60 transition-all shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Encerrar Todos · {trabalhando.length} trabalhando
              </button>
            </>
          )}
        </div>
      )}

      {/* ─── Histórico ─── */}
      {historico.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Últimas marcações</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 shadow-sm">
            {historico.map(h => <HistoricoRow key={h.id} item={h} />)}
          </div>
        </div>
      )}

      {/* ─── Modal: Saída Individual ─── */}
      {modal === 'saida_individual' && (
        <Modal title="Marcar Saída Individual" onClose={() => setModal('none')}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os diaristas que estão encerrando agora:
            </p>

            <div className="space-y-2">
              {trabalhando.map(d => (
                <button
                  key={d.agendamento_id}
                  onClick={() => toggleSelected(d.agendamento_id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                    selected.has(d.agendamento_id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {/* Checkbox visual */}
                  <div className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                    selected.has(d.agendamento_id)
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground',
                  )}>
                    {selected.has(d.agendamento_id) && (
                      <svg viewBox="0 0 12 10" className="h-3 w-3 text-white fill-none stroke-current stroke-2">
                        <polyline points="1 5 4.5 8.5 11 1" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{d.nome}</p>
                    {d.ponto && (
                      <p className="text-xs text-muted-foreground">
                        Trabalhando desde {fmtTime(d.ponto.entrada)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal('none')}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaidaIndividual}
                disabled={selected.size === 0 || submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-all"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando...</>
                  : `Confirmar saída · ${selected.size}`
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Encerrar Todos ─── */}
      {modal === 'encerrar_todos' && (
        <Modal title="Encerrar todos" onClose={() => setModal('none')}>
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-sm">
              <p className="font-semibold text-red-700">Registrar saída agora para:</p>
              <ul className="mt-2 space-y-1">
                {trabalhando.map(d => (
                  <li key={d.agendamento_id} className="flex items-center gap-2 text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {d.nome}
                    {d.ponto && (
                      <span className="text-red-400 text-xs">desde {fmtTime(d.ponto.entrada)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              O horário de saída será registrado como agora para todos os diaristas listados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal('none')}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEncerrarTodos}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-all"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Encerrando...</>
                  : 'Encerrar todos'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Toast ─── */}
      {toast && <Toast data={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

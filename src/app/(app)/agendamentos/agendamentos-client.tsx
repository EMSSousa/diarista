'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Plus, Pencil, X, Loader2, RotateCcw,
  ChevronLeft, ChevronRight, Eye, Ban, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAgendamentos, createAgendamentoAction, updateAgendamentoAction, cancelAgendamentoAction,
  type AgRow,
} from './actions'
import type { Diarista, StatusAgendamento, TipoPagamento } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type DiaristaMini = Pick<Diarista, 'id' | 'nome' | 'especialidade' | 'valor_dia' | 'valor_hora'>

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; ag: AgRow }
  | { type: 'cancel'; ag: AgRow }
  | { type: 'details'; ag: AgRow }

type FormValues = {
  diarista_id: string
  data: string
  local: string
  tipo_pagamento: TipoPagamento
  valor: string
  status: StatusAgendamento
}

type FieldErrors = Partial<Record<keyof FormValues, string>>

function validate(form: FormValues, editMode: boolean): FieldErrors {
  const errs: FieldErrors = {}

  if (!editMode && !form.diarista_id)
    errs.diarista_id = 'Selecione um diarista.'

  if (!form.data) {
    errs.data = 'Data é obrigatória.'
  } else if (!editMode) {
    const sel  = new Date(form.data + 'T00:00:00')
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    if (sel < hoje) errs.data = 'A data não pode ser no passado.'
  }

  if (!form.local.trim())
    errs.local = 'Local é obrigatório.'

  if (form.tipo_pagamento === 'diaria' && (parseFloat(form.valor) || 0) <= 0)
    errs.valor = 'O valor deve ser maior que zero.'

  return errs
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusAgendamento, { label: string; dot: string; badge: string }> = {
  agendado:    { label: 'Agendado',    dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-600' },
  trabalhando: { label: 'Trabalhando', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-600' },
  concluido:   { label: 'Concluído',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600' },
  cancelado:   { label: 'Cancelado',   dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-500' },
}

const TIPO_CFG: Record<TipoPagamento, { label: string; badge: string }> = {
  diaria: { label: 'Diária',   badge: 'bg-violet-50 text-violet-600' },
  hora:   { label: 'Por hora', badge: 'bg-sky-50 text-sky-600' },
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmtBRL  = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const toMes    = (d: Date)   => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const mesLabel = (d: Date)  => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
const today    = ()         => new Date().toISOString().split('T')[0]

function mesRange(d: Date): { inicio: string; fim: string } {
  const mes = toMes(d)
  const [ano, m] = mes.split('-').map(Number)
  return { inicio: `${mes}-01`, fim: new Date(ano, m, 0).toISOString().split('T')[0] }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="h-3 w-24 rounded-md bg-muted" />
      <div className="h-3 w-48 rounded-md bg-muted" />
      <div className="flex justify-between">
        <div className="h-4 w-16 rounded-md bg-muted" />
        <div className="h-4 w-20 rounded-md bg-muted" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[90, 110, 180, 70, 80, 90, 70].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded-md bg-muted" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusAgendamento }) {
  const c = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', c.badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: TipoPagamento }) {
  const c = TIPO_CFG[tipo]
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', c.badge)}>{c.label}</span>
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, wide = false, children }: {
  title: string
  onClose: () => void
  wide?: boolean
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
      <div className={cn(
        'relative z-10 w-full bg-card shadow-2xl',
        'rounded-t-2xl sm:rounded-2xl',
        'max-h-[92dvh] overflow-y-auto',
        wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
      )}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Agendamento form ─────────────────────────────────────────────────────────

const INPUT_BASE = 'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors'
const INPUT_OK   = 'border-input'
const INPUT_ERR  = 'border-destructive ring-1 ring-destructive/30'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

function AgendamentoForm({ diaristas, initial, editMode, onSubmit, onCancel, submitting, serverError }: {
  diaristas: DiaristaMini[]
  initial: FormValues
  editMode: boolean
  onSubmit: (v: FormValues) => void
  onCancel: () => void
  submitting: boolean
  serverError: string | null
}) {
  const [form, setForm]     = useState<FormValues>(initial)
  const [errs, setErrs]     = useState<FieldErrors>({})
  const [touched, setTouched] = useState(false)

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setForm(p => ({ ...p, [k]: v }))
    if (touched) setErrs(validate({ ...form, [k]: v }, editMode))
  }

  function onDiaristaChange(id: string) {
    const d = diaristas.find(x => x.id === id)
    if (!d) { set('diarista_id', id); return }
    const tipo  = d.valor_dia > 0 ? form.tipo_pagamento : 'hora'
    const valor = tipo === 'diaria' ? String(d.valor_dia) : String(d.valor_hora ?? 0)
    const next  = { ...form, diarista_id: id, tipo_pagamento: tipo, valor }
    setForm(next)
    if (touched) setErrs(validate(next, editMode))
  }

  function onTipoChange(tipo: TipoPagamento) {
    const d     = diaristas.find(x => x.id === form.diarista_id)
    const valor = d ? (tipo === 'diaria' ? String(d.valor_dia) : String(d.valor_hora ?? 0)) : form.valor
    const next  = { ...form, tipo_pagamento: tipo, valor }
    setForm(next)
    if (touched) setErrs(validate(next, editMode))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    const e2 = validate(form, editMode)
    setErrs(e2)
    if (Object.keys(e2).length > 0) return
    onSubmit(form)
  }

  const selD    = diaristas.find(d => d.id === form.diarista_id)
  const canHora = editMode ? true : (selD?.valor_hora != null)
  const canAct  = editMode || form.diarista_id !== ''

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* Diarista (create only) */}
      {!editMode && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Diarista <span className="text-destructive">*</span>
          </label>
          <select
            value={form.diarista_id}
            onChange={e => onDiaristaChange(e.target.value)}
            className={cn(INPUT_BASE, errs.diarista_id ? INPUT_ERR : INPUT_OK)}
          >
            <option value="">Selecione um diarista...</option>
            {diaristas.map(d => (
              <option key={d.id} value={d.id}>
                {d.nome}{d.especialidade ? ` — ${d.especialidade}` : ''}
              </option>
            ))}
          </select>
          <FieldError msg={errs.diarista_id} />
        </div>
      )}

      {/* Tipo de pagamento */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Tipo de pagamento</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!canAct}
            onClick={() => onTipoChange('diaria')}
            className={cn(
              'rounded-xl border-2 p-3 text-left transition-all',
              form.tipo_pagamento === 'diaria'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent',
              !canAct && 'opacity-40 cursor-not-allowed',
            )}
          >
            <p className="text-sm font-semibold text-foreground">📅 Diária</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selD ? fmtBRL(selD.valor_dia) + '/dia' : 'Valor fixo por dia'}
            </p>
          </button>
          <button
            type="button"
            disabled={!canAct || !canHora}
            onClick={() => canHora && onTipoChange('hora')}
            className={cn(
              'rounded-xl border-2 p-3 text-left transition-all',
              form.tipo_pagamento === 'hora'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent',
              (!canAct || !canHora) && 'opacity-40 cursor-not-allowed',
            )}
          >
            <p className="text-sm font-semibold text-foreground">⏱ Por hora</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selD?.valor_hora ? fmtBRL(selD.valor_hora) + '/h' : !canHora ? 'Sem valor/hora' : 'Calculado por hora'}
            </p>
          </button>
        </div>
      </div>

      {/* Data + Valor */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Data <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            value={form.data}
            min={!editMode ? today() : undefined}
            onChange={e => set('data', e.target.value)}
            className={cn(INPUT_BASE, errs.data ? INPUT_ERR : INPUT_OK)}
          />
          <FieldError msg={errs.data} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {form.tipo_pagamento === 'hora' ? 'Valor/hora (R$)' : 'Valor (R$)'}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.valor}
            onChange={e => set('valor', e.target.value)}
            disabled={form.tipo_pagamento === 'hora' && !editMode}
            placeholder={form.tipo_pagamento === 'hora' && !editMode ? 'Auto' : '0,00'}
            className={cn(INPUT_BASE, errs.valor ? INPUT_ERR : INPUT_OK, 'disabled:opacity-50')}
          />
          <FieldError msg={errs.valor} />
        </div>
      </div>

      {/* Local */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Local <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={form.local}
          onChange={e => set('local', e.target.value)}
          placeholder="Ex: Rua das Flores, 123 — Obra A"
          className={cn(INPUT_BASE, errs.local ? INPUT_ERR : INPUT_OK)}
        />
        <FieldError msg={errs.local} />
      </div>

      {/* Status (edit only) */}
      {editMode && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Status</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value as StatusAgendamento)}
            className={cn(INPUT_BASE, INPUT_OK)}
          >
            {(Object.keys(STATUS_CFG) as StatusAgendamento[]).map(s => (
              <option key={s} value={s}>{STATUS_CFG[s].label}</option>
            ))}
          </select>
        </div>
      )}

      {form.tipo_pagamento === 'hora' && !editMode && (
        <p className="rounded-lg bg-sky-50 px-3 py-2.5 text-xs text-sky-700">
          O valor será calculado ao registrar a saída do ponto (horas × valor/hora).
        </p>
      )}

      {serverError && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{serverError}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-opacity"
        >
          {submitting
            ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
            : editMode ? 'Salvar alterações' : 'Criar agendamento'
          }
        </button>
      </div>
    </form>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastData = { message: string; variant: 'success' | 'error' }

function Toast({ data, onDone }: { data: ToastData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl',
        'sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        data.variant === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-destructive text-white',
      )}
    >
      {data.variant === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertTriangle className="h-4 w-4 shrink-0" />
      }
      {data.message}
    </div>
  )
}

// ─── Details view ─────────────────────────────────────────────────────────────

function DetailsView({ ag, onEdit, onCancelAg }: {
  ag: AgRow
  onEdit: () => void
  onCancelAg: () => void
}) {
  const active = ag.status !== 'cancelado' && ag.status !== 'concluido'
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={ag.status} />
        <TipoBadge tipo={ag.tipo_pagamento} />
      </div>

      <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Diarista</dt>
          <dd className="font-semibold text-foreground">{ag.diaristas?.nome ?? '—'}</dd>
          {ag.diaristas?.especialidade && (
            <dd className="text-xs text-muted-foreground">{ag.diaristas.especialidade}</dd>
          )}
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Data</dt>
          <dd className="font-semibold text-foreground">{fmtDate(ag.data)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Local</dt>
          <dd className="font-medium text-foreground">{ag.local}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {ag.tipo_pagamento === 'hora' ? 'Valor calculado' : 'Valor'}
          </dt>
          <dd className="text-2xl font-bold text-foreground">{fmtBRL(Number(ag.valor))}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Criado em</dt>
          <dd className="text-muted-foreground">{new Date(ag.criado_em).toLocaleDateString('pt-BR')}</dd>
        </div>
      </dl>

      {active && (
        <div className="flex gap-3 border-t border-border pt-4">
          <button
            onClick={onEdit}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onCancelAg}
            className="flex-1 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors"
          >
            Cancelar serviço
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgendamentosClient({ diaristas }: { diaristas: DiaristaMini[] }) {
  const [mes, setMes]                     = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [filterMode, setFilterMode]       = useState<'mes' | 'periodo'>('mes')
  const [periodoInicio, setPeriodoIn]     = useState(() => toMes(new Date()) + '-01')
  const [periodoFim, setPeriodoFim]       = useState(today)
  const [lista, setLista]                 = useState<AgRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [filterDiarista, setFD]           = useState('')
  const [filterStatus, setFS]             = useState('')
  const [modal, setModal]                 = useState<ModalState>({ type: 'none' })
  const [formError, setFormError]         = useState<string | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [toast, setToast]                 = useState<ToastData | null>(null)

  function showToast(message: string, variant: ToastData['variant'] = 'success') {
    setToast({ message, variant })
  }

  const fetchData = useCallback(async (inicio: string, fim: string) => {
    setLoading(true)
    setError(null)
    const res = await getAgendamentos(inicio, fim)
    if (res.error) setError(res.error)
    else setLista(res.data ?? [])
    setLoading(false)
  }, [])

  function currentRange() {
    if (filterMode === 'mes') return mesRange(mes)
    return { inicio: periodoInicio, fim: periodoFim }
  }

  const periodoValido = periodoInicio && periodoFim && periodoInicio <= periodoFim

  useEffect(() => {
    if (filterMode === 'mes') {
      const { inicio, fim } = mesRange(mes)
      fetchData(inicio, fim)
    } else if (periodoValido) {
      fetchData(periodoInicio, periodoFim)
    }
  }, [mes, filterMode, periodoInicio, periodoFim, fetchData]) // eslint-disable-line

  const filtered = lista.filter(ag =>
    (!filterDiarista || ag.diarista_id === filterDiarista) &&
    (!filterStatus   || ag.status      === filterStatus),
  )

  const totalValor   = filtered.reduce((s, a) => s + Number(a.valor), 0)
  const qtdConc      = filtered.filter(a => a.status === 'concluido').length
  const hasFilters   = filterDiarista || filterStatus

  function closeModal() { setModal({ type: 'none' }); setFormError(null) }

  const defaultForm = (): FormValues => ({
    diarista_id: '', data: new Date().toISOString().split('T')[0],
    local: '', tipo_pagamento: 'diaria', valor: '', status: 'agendado',
  })

  const editForm = (ag: AgRow): FormValues => ({
    diarista_id: ag.diarista_id, data: ag.data, local: ag.local,
    tipo_pagamento: ag.tipo_pagamento, valor: String(ag.valor), status: ag.status,
  })

  async function handleCreate(v: FormValues) {
    setSubmitting(true); setFormError(null)
    const res = await createAgendamentoAction({
      diarista_id: v.diarista_id, data: v.data, local: v.local,
      tipo_pagamento: v.tipo_pagamento,
      valor: v.tipo_pagamento === 'hora' ? 0 : parseFloat(v.valor) || 0,
    })
    setSubmitting(false)
    if (res?.error) { setFormError(res.error); return }
    closeModal()
    showToast('Diária criada com sucesso')
    const r = currentRange(); fetchData(r.inicio, r.fim)
  }

  async function handleEdit(ag: AgRow, v: FormValues) {
    setSubmitting(true); setFormError(null)
    const res = await updateAgendamentoAction(ag.id, {
      data: v.data, local: v.local, tipo_pagamento: v.tipo_pagamento,
      valor: parseFloat(v.valor) || 0, status: v.status,
    })
    setSubmitting(false)
    if (res?.error) { setFormError(res.error); return }
    closeModal()
    showToast('Agendamento atualizado')
    const r = currentRange(); fetchData(r.inicio, r.fim)
  }

  async function handleCancel(id: string) {
    setSubmitting(true)
    const res = await cancelAgendamentoAction(id)
    setSubmitting(false)
    if (res?.error) { setFormError(res.error); return }
    closeModal()
    showToast('Agendamento cancelado', 'error')
    const r = currentRange(); fetchData(r.inicio, r.fim)
  }

  return (
    <div className="relative space-y-4 pb-24 sm:pb-0 md:space-y-6">

      {/* ─── Page header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Agendamentos</h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-muted-foreground">
              {filterMode === 'mes'
                ? <span className="capitalize">{mesLabel(mes)}</span>
                : periodoValido
                  ? <>{fmtDate(periodoInicio)} — {fmtDate(periodoFim)}</>
                  : null
              }
              {' · '}{filtered.length} registro{filtered.length !== 1 ? 's' : ''}
              {' · '}{fmtBRL(totalValor)} total
              {qtdConc > 0 && ` · ${qtdConc} concluído${qtdConc > 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border bg-muted p-0.5 text-xs font-medium">
            {(['mes', 'periodo'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={cn(
                  'rounded-lg px-3 py-1.5 transition-all',
                  filterMode === mode
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode === 'mes' ? 'Mês' : 'Período'}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          {filterMode === 'mes' ? (
            <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1">
              <button
                onClick={() => setMes(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[126px] px-2 text-center text-sm font-medium capitalize text-foreground">
                {mesLabel(mes)}
              </span>
              <button
                onClick={() => setMes(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Period date inputs */
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={periodoInicio}
                onChange={e => setPeriodoIn(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">até</span>
              <input
                type="date"
                value={periodoFim}
                min={periodoInicio || undefined}
                onChange={e => setPeriodoFim(e.target.value)}
                className={cn(
                  'h-9 rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  periodoFim && periodoInicio && periodoFim < periodoInicio
                    ? 'border-destructive text-destructive'
                    : 'border-input',
                )}
              />
              {periodoFim && periodoInicio && periodoFim < periodoInicio && (
                <span className="text-xs text-destructive">Data final anterior à inicial</span>
              )}
            </div>
          )}

          {/* Desktop "Nova Diária" */}
          <button
            onClick={() => setModal({ type: 'create' })}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Diária
          </button>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterDiarista}
          onChange={e => setFD(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos os diaristas</option>
          {diaristas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFS(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_CFG) as StatusAgendamento[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setFD(''); setFS('') }}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* ─── Content ─── */}
      {loading ? (
        <>
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Data', 'Diarista', 'Local', 'Tipo', 'Valor', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        </>

      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Erro ao carregar agendamentos</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => { const r = currentRange(); fetchData(r.inicio, r.fim) }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="rounded-full bg-accent p-4">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {hasFilters ? 'Nenhum resultado para os filtros selecionados' : 'Nenhum agendamento este mês'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters ? 'Tente outros filtros ou limpe a seleção.' : 'Crie o primeiro agendamento do mês.'}
            </p>
          </div>
          {!hasFilters && (
            <button
              onClick={() => setModal({ type: 'create' })}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Criar primeira diária
            </button>
          )}
        </div>

      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map(ag => (
              <div key={ag.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{ag.diaristas?.nome ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(ag.data)}</p>
                  </div>
                  <StatusBadge status={ag.status} />
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{ag.local}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{fmtBRL(Number(ag.valor))}</span>
                    <TipoBadge tipo={ag.tipo_pagamento} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setModal({ type: 'details', ag })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                      <>
                        <button
                          onClick={() => { setFormError(null); setModal({ type: 'edit', ag }) }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setFormError(null); setModal({ type: 'cancel', ag }) }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Data', 'Diarista', 'Local', 'Tipo', 'Valor', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ag, i) => (
                  <tr key={ag.id} className={cn(
                    'border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                    i % 2 ? 'bg-muted/10' : '',
                  )}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(ag.data)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{ag.diaristas?.nome ?? '—'}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">{ag.local}</td>
                    <td className="px-4 py-3"><TipoBadge tipo={ag.tipo_pagamento} /></td>
                    <td className="px-4 py-3 font-semibold text-foreground">{fmtBRL(Number(ag.valor))}</td>
                    <td className="px-4 py-3"><StatusBadge status={ag.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal({ type: 'details', ag })}
                          title="Ver detalhes"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                          <>
                            <button
                              onClick={() => { setFormError(null); setModal({ type: 'edit', ag }) }}
                              title="Editar"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setFormError(null); setModal({ type: 'cancel', ag }) }}
                              title="Cancelar agendamento"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Floating button (mobile) ─── */}
      <button
        onClick={() => setModal({ type: 'create' })}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg active:scale-95 hover:bg-primary/90 transition-all sm:hidden"
      >
        <Plus className="h-5 w-5" />
        Nova Diária
      </button>

      {/* ─── Modals ─── */}
      {modal.type === 'create' && (
        <Modal title="Nova Diária" onClose={closeModal}>
          <AgendamentoForm
            diaristas={diaristas}
            initial={defaultForm()}
            editMode={false}
            onSubmit={handleCreate}
            onCancel={closeModal}
            submitting={submitting}
            serverError={formError}
          />
        </Modal>
      )}

      {modal.type === 'edit' && (
        <Modal title={`Editar — ${modal.ag.diaristas?.nome ?? 'Agendamento'}`} onClose={closeModal}>
          <AgendamentoForm
            diaristas={diaristas}
            initial={editForm(modal.ag)}
            editMode={true}
            onSubmit={v => handleEdit(modal.ag, v)}
            onCancel={closeModal}
            submitting={submitting}
            serverError={formError}
          />
        </Modal>
      )}

      {modal.type === 'details' && (
        <Modal title="Detalhes do agendamento" onClose={closeModal}>
          <DetailsView
            ag={modal.ag}
            onEdit={() => { setFormError(null); setModal({ type: 'edit', ag: modal.ag }) }}
            onCancelAg={() => { setFormError(null); setModal({ type: 'cancel', ag: modal.ag }) }}
          />
        </Modal>
      )}

      {modal.type === 'cancel' && (
        <Modal title="Cancelar agendamento" onClose={closeModal}>
          <div className="space-y-4">
            <div className="rounded-xl bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">Tem certeza que deseja cancelar?</p>
              <p className="mt-2 text-destructive/80">
                <strong>{modal.ag.diaristas?.nome}</strong>{' · '}{fmtDate(modal.ag.data)}<br />
                {modal.ag.local}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>

            {formError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{formError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Manter agendamento
              </button>
              <button
                onClick={() => handleCancel(modal.ag.id)}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60 transition-opacity"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Cancelando...</>
                  : 'Sim, cancelar'
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

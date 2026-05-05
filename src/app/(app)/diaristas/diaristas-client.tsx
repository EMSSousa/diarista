'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, Plus, Pencil, Trash2, RefreshCw, Search,
  X, Loader2, PowerOff, Power, Landmark, QrCode, DollarSign,
} from 'lucide-react'
import type { Diarista } from '@/types/database'
import {
  getDiaristas,
  createDiaristaAction,
  updateDiaristaAction,
  deleteDiaristaAction,
  toggleAtivoAction,
  type DiaristaSalvarInput,
} from './actions'

// ── Helpers ────────────────────────────────────────────────────────────────

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal', 'Itaú',
  'Nubank', 'Santander', 'Sicoob', 'Sicredi', 'Inter', 'C6 Bank', 'Outros',
]

const PIX_LABELS: Record<string, string> = {
  cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória',
}

function applyCpfMask(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function applyPhoneMask(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return d
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return v
}

function applyPixMask(tipo: string, v: string) {
  if (tipo === 'cpf')      return applyCpfMask(v)
  if (tipo === 'telefone') return applyPhoneMask(v)
  return v
}

function validateCpf(cpf: string) {
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i)
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== parseInt(n[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i)
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === parseInt(n[10])
}

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
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {toast.message}
    </div>
  )
}

// ── Modal base ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Formulário ─────────────────────────────────────────────────────────────

type FormState = {
  nome: string
  cpf: string
  especialidade: string
  valor_dia: string
  valor_hora: string
  banco: string
  agencia: string
  conta: string
  tipo_conta: 'corrente' | 'poupanca' | ''
  pix_tipo: 'cpf' | 'email' | 'telefone' | 'aleatoria' | ''
  pix_chave: string
  ativo: boolean
}

function makeEmptyForm(valorDiaPadrao = 0, valorHoraPadrao = 0): FormState {
  return {
    nome: '', cpf: '', especialidade: '',
    valor_dia: valorDiaPadrao > 0 ? String(valorDiaPadrao) : '',
    valor_hora: valorHoraPadrao > 0 ? String(valorHoraPadrao) : '',
    banco: '', agencia: '', conta: '', tipo_conta: '',
    pix_tipo: '', pix_chave: '',
    ativo: true,
  }
}

type FormErrors = Partial<Record<keyof FormState, string>>

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

function DiaristaForm({ initial, onSave, onCancel }: {
  initial: FormState
  onSave: (data: DiaristaSalvarInput) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const nomeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nomeRef.current?.focus() }, [])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.nome.trim() || form.nome.trim().length < 3)
      e.nome = 'Nome deve ter pelo menos 3 caracteres'
    if (!form.cpf || form.cpf.replace(/\D/g, '').length !== 11)
      e.cpf = 'CPF inválido'
    else if (!validateCpf(form.cpf))
      e.cpf = 'CPF inválido'
    const vDia  = parseFloat(form.valor_dia.replace(',', '.'))
    const vHora = parseFloat(form.valor_hora.replace(',', '.'))
    if (!form.valor_dia || isNaN(vDia) || vDia < 0)
      e.valor_dia = 'Informe um valor válido (≥ 0)'
    if (form.valor_hora && (isNaN(vHora) || vHora < 0))
      e.valor_hora = 'Informe um valor válido (≥ 0)'
    if (form.pix_tipo && !form.pix_chave.trim())
      e.pix_chave = 'Informe a chave PIX'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const vDia  = parseFloat(form.valor_dia.replace(',', '.'))
    const vHora = form.valor_hora ? parseFloat(form.valor_hora.replace(',', '.')) : null
    await onSave({
      nome: form.nome.trim(),
      cpf: form.cpf,
      especialidade: form.especialidade.trim() || null,
      valor_dia: isNaN(vDia) ? 0 : vDia,
      valor_hora: vHora !== null && !isNaN(vHora) ? vHora : null,
      banco: form.banco || null,
      agencia: form.agencia.trim() || null,
      conta: form.conta.trim() || null,
      tipo_conta: (form.tipo_conta as 'corrente' | 'poupanca') || null,
      pix_tipo: (form.pix_tipo as 'cpf' | 'email' | 'telefone' | 'aleatoria') || null,
      pix_chave: form.pix_chave.trim() || null,
      ativo: form.ativo,
    })
    setSaving(false)
  }

  const fc = (err?: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-11 ${err ? 'border-red-400 focus:ring-red-400/40' : 'border-input'}`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
      <div className="overflow-y-auto px-6 py-5 space-y-4">

        {/* ── Dados pessoais ── */}
        <SectionTitle icon={Users} label="Dados pessoais" />

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nome <span className="text-red-500">*</span></label>
            <input ref={nomeRef} value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Nome completo" className={fc(errors.nome)} />
            {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">CPF <span className="text-red-500">*</span></label>
            <input value={form.cpf} onChange={e => set('cpf', applyCpfMask(e.target.value))}
              placeholder="000.000.000-00" inputMode="numeric" className={fc(errors.cpf)} />
            {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Especialidade</label>
            <input value={form.especialidade} onChange={e => set('especialidade', e.target.value)}
              placeholder="Ex: Limpeza, Pedreiro..." className={fc()} />
          </div>
        </div>

        {/* ── Valores ── */}
        <SectionTitle icon={DollarSign} label="Valores" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Valor/dia (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <input
                value={form.valor_dia}
                onChange={e => set('valor_dia', e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className={`${fc(errors.valor_dia)} pl-9`}
              />
            </div>
            {errors.valor_dia && <p className="mt-1 text-xs text-red-500">{errors.valor_dia}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Valor/hora (R$)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <input
                value={form.valor_hora}
                onChange={e => set('valor_hora', e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className={`${fc(errors.valor_hora)} pl-9`}
              />
            </div>
            {errors.valor_hora && <p className="mt-1 text-xs text-red-500">{errors.valor_hora}</p>}
          </div>
        </div>

        {/* ── Dados bancários ── */}
        <SectionTitle icon={Landmark} label="Dados bancários" />

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Banco</label>
            <select value={form.banco} onChange={e => set('banco', e.target.value)} className={fc()}>
              <option value="">Selecionar banco</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Agência</label>
            <input value={form.agencia} onChange={e => set('agencia', e.target.value)}
              placeholder="0000" inputMode="numeric" className={fc()} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Conta</label>
            <input value={form.conta} onChange={e => set('conta', e.target.value)}
              placeholder="00000-0" className={fc()} />
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo de conta</label>
            <select value={form.tipo_conta} onChange={e => set('tipo_conta', e.target.value as FormState['tipo_conta'])} className={fc()}>
              <option value="">Selecionar tipo</option>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
            </select>
          </div>
        </div>

        {/* ── PIX ── */}
        <SectionTitle icon={QrCode} label="PIX" />

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo de chave</label>
            <select
              value={form.pix_tipo}
              onChange={e => {
                set('pix_tipo', e.target.value as FormState['pix_tipo'])
                set('pix_chave', '')
              }}
              className={fc()}
            >
              <option value="">Sem PIX</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Chave aleatória</option>
            </select>
          </div>

          {form.pix_tipo && (
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Chave — {PIX_LABELS[form.pix_tipo]}
              </label>
              <input
                value={form.pix_chave}
                onChange={e => set('pix_chave', applyPixMask(form.pix_tipo, e.target.value))}
                placeholder={
                  form.pix_tipo === 'cpf'       ? '000.000.000-00'    :
                  form.pix_tipo === 'email'     ? 'email@exemplo.com' :
                  form.pix_tipo === 'telefone'  ? '(00) 00000-0000'   :
                  'Chave aleatória'
                }
                inputMode={form.pix_tipo === 'cpf' || form.pix_tipo === 'telefone' ? 'numeric' : 'text'}
                className={fc(errors.pix_chave)}
              />
              {errors.pix_chave && <p className="mt-1 text-xs text-red-500">{errors.pix_chave}</p>}
            </div>
          )}
        </div>

        {/* ── Status ── */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 mt-2">
          <div>
            <p className="text-sm font-medium text-foreground">Status</p>
            <p className="text-xs text-muted-foreground">{form.ativo ? 'Diarista ativa' : 'Diarista inativa'}</p>
          </div>
          <button type="button" onClick={() => set('ativo', !form.ativo)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.ativo ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Valores de diária e hora são definidos em Configurações.
        </p>
      </div>

      <div className="shrink-0 flex justify-end gap-3 border-t border-border px-6 py-4">
        <button type="button" onClick={onCancel} disabled={saving}
          className="h-11 rounded-md border border-border px-5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </button>
      </div>
    </form>
  )
}

// ── Modal de confirmação de exclusão ───────────────────────────────────────

function ConfirmDeleteModal({ nome, onConfirm, onCancel, deleting }: {
  nome: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  return (
    <Modal title="Excluir diarista" onClose={onCancel}>
      <div className="px-6 py-5 overflow-y-auto">
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir <span className="font-semibold text-foreground">{nome}</span>?
          Esta ação não pode ser desfeita.
        </p>
      </div>
      <div className="shrink-0 flex justify-end gap-3 border-t border-border px-6 py-4">
        <button onClick={onCancel} disabled={deleting}
          className="h-11 rounded-md border border-border px-5 text-sm font-medium hover:bg-accent disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={onConfirm} disabled={deleting}
          className="h-11 rounded-md bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
          Excluir
        </button>
      </div>
    </Modal>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-11 w-40 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-3 flex gap-4">
          {[140, 100, 120, 100, 80, 80, 60].map((w, i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
            {[140, 100, 120, 100, 80, 80, 60].map((w, j) => (
              <div key={j} className="h-4 rounded bg-muted/60 animate-pulse" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers de exibição ────────────────────────────────────────────────────

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function PixBadge({ tipo, chave }: { tipo: string | null; chave: string | null }) {
  if (!tipo || !chave) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs text-violet-700 font-medium">
      <QrCode className="h-3 w-3" />
      {PIX_LABELS[tipo] ?? tipo}
    </span>
  )
}

function RowActions({ diarista, onEdit, onToggle, onDelete }: {
  diarista: Diarista; onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} title="Editar"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onToggle} title={diarista.ativo ? 'Desativar' : 'Ativar'}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        {diarista.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onDelete} title="Excluir"
        className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function MobileCard({ diarista, onEdit, onToggle, onDelete }: {
  diarista: Diarista; onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground text-sm">{diarista.nome}</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{diarista.cpf}</p>
        </div>
        <StatusBadge ativo={diarista.ativo} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-[11px] text-muted-foreground">Especialidade</p>
          <p className="text-xs font-medium text-foreground">{diarista.especialidade ?? '—'}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Banco</p>
          <p className="text-xs font-medium text-foreground">{diarista.banco ?? '—'}</p>
        </div>
        {(diarista.agencia || diarista.conta) && (
          <div>
            <p className="text-[11px] text-muted-foreground">Ag / Conta</p>
            <p className="text-xs font-medium text-foreground">
              {[diarista.agencia, diarista.conta].filter(Boolean).join(' / ')}
              {diarista.tipo_conta && <span className="ml-1 text-muted-foreground">({diarista.tipo_conta})</span>}
            </p>
          </div>
        )}
        <div>
          <p className="text-[11px] text-muted-foreground">PIX</p>
          <p className="text-xs font-medium text-foreground">
            {diarista.pix_tipo
              ? `${PIX_LABELS[diarista.pix_tipo]}: ${diarista.pix_chave}`
              : '—'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-border pt-3">
        <RowActions diarista={diarista} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

type ModalMode = 'criar' | 'editar' | 'deletar' | null

interface Props {
  initialDiaristas: Diarista[]
  limiteDiaristas: number
  valorDiaPadrao?: number
  valorHoraPadrao?: number
}

function diaristaToForm(d: Diarista): FormState {
  return {
    nome: d.nome,
    cpf: d.cpf,
    especialidade: d.especialidade ?? '',
    valor_dia: String(Number(d.valor_dia) || ''),
    valor_hora: d.valor_hora != null ? String(Number(d.valor_hora)) : '',
    banco: d.banco ?? '',
    agencia: d.agencia ?? '',
    conta: d.conta ?? '',
    tipo_conta: (d.tipo_conta as FormState['tipo_conta']) ?? '',
    pix_tipo: (d.pix_tipo as FormState['pix_tipo']) ?? '',
    pix_chave: d.pix_chave ?? '',
    ativo: d.ativo,
  }
}

export function DiaristasCRUD({ initialDiaristas, limiteDiaristas, valorDiaPadrao = 0, valorHoraPadrao = 0 }: Props) {
  const [diaristas, setDiaristas]     = useState<Diarista[]>(initialDiaristas)
  const [loading, setLoading]         = useState(false)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [modal, setModal]             = useState<ModalMode>(null)
  const [selected, setSelected]       = useState<Diarista | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [toast, setToast]             = useState<ToastState>(null)
  const [search, setSearch]           = useState('')
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { diaristas: data, error } = await getDiaristas()
    if (error) setLoadError(error)
    else setDiaristas(data)
    setLoading(false)
  }, [])

  const filtered = diaristas.filter(d => {
    const matchSearch = !search ||
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.cpf.includes(search)
    const matchAtivo =
      filterAtivo === 'todos' ||
      (filterAtivo === 'ativo' && d.ativo) ||
      (filterAtivo === 'inativo' && !d.ativo)
    return matchSearch && matchAtivo
  })

  const totalAtivos = diaristas.filter(d => d.ativo).length
  const atLimite    = limiteDiaristas > 0 && totalAtivos >= limiteDiaristas

  const openCriar   = () => { setSelected(null); setModal('criar');  }
  const openEditar  = (d: Diarista) => { setSelected(d); setModal('editar') }
  const openDeletar = (d: Diarista) => { setSelected(d); setModal('deletar') }
  const closeModal  = () => { setModal(null); setSelected(null) }

  const handleSalvar = async (input: DiaristaSalvarInput) => {
    if (modal === 'criar') {
      const { error } = await createDiaristaAction(input)
      if (error) { showToast('Erro ao criar diarista: ' + error, 'error'); return }
      showToast('Diarista criada com sucesso!', 'success')
    } else {
      const { error } = await updateDiaristaAction(selected!.id, input)
      if (error) { showToast('Erro ao editar diarista: ' + error, 'error'); return }
      showToast('Diarista atualizada com sucesso!', 'success')
    }
    closeModal()
    await reload()
  }

  const handleDeletar = async () => {
    if (!selected) return
    setDeleting(true)
    const { error } = await deleteDiaristaAction(selected.id)
    setDeleting(false)
    if (error) { showToast('Erro ao excluir: ' + error, 'error'); return }
    showToast('Diarista excluída com sucesso!', 'success')
    closeModal()
    setDiaristas(prev => prev.filter(d => d.id !== selected.id))
  }

  const handleToggleAtivo = async (d: Diarista) => {
    setDiaristas(prev => prev.map(x => x.id === d.id ? { ...x, ativo: !x.ativo } : x))
    const { error } = await toggleAtivoAction(d.id, !d.ativo)
    if (error) {
      setDiaristas(prev => prev.map(x => x.id === d.id ? { ...x, ativo: d.ativo } : x))
      showToast('Erro ao alterar status: ' + error, 'error')
    } else {
      showToast(d.ativo ? 'Diarista desativada.' : 'Diarista ativada.', 'success')
    }
  }

  if (loading && diaristas.length === 0) return <Skeleton />

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl">Diaristas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalAtivos} ativa{totalAtivos !== 1 ? 's' : ''}
              {limiteDiaristas > 0 && ` · limite ${limiteDiaristas}`}
            </p>
          </div>
          {atLimite ? (
            <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
              Limite de diaristas atingido
            </div>
          ) : (
            <button onClick={openCriar}
              className="inline-flex items-center gap-2 h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-start">
              <Plus className="h-4 w-4" />
              Adicionar Diarista
            </button>
          )}
        </div>

        {/* Busca + filtro */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex rounded-md border border-input overflow-hidden text-sm">
            {(['todos', 'ativo', 'inativo'] as const).map(v => (
              <button key={v} onClick={() => setFilterAtivo(v)}
                className={`px-4 py-2.5 font-medium transition-colors ${filterAtivo === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                {v === 'todos' ? 'Todos' : v === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {loadError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-destructive font-medium">Erro ao carregar diaristas. Tente novamente.</p>
            <button onClick={reload} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Empty */}
        {!loadError && !loading && filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
            <div className="rounded-full bg-accent p-4"><Users className="h-8 w-8 text-primary" /></div>
            <div>
              {diaristas.length === 0 ? (
                <>
                  <p className="font-semibold text-foreground">Nenhuma diarista cadastrada</p>
                  <p className="text-sm text-muted-foreground mt-1">Adicione diaristas para começar.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-foreground">Nenhum resultado encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente ajustar o filtro ou a busca.</p>
                </>
              )}
            </div>
            {diaristas.length === 0 && !atLimite && (
              <button onClick={openCriar}
                className="inline-flex items-center gap-2 h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Adicionar primeiro diarista
              </button>
            )}
          </div>
        )}

        {/* Mobile cards */}
        {!loadError && filtered.length > 0 && (
          <div className="space-y-3 md:hidden">
            {filtered.map(d => (
              <MobileCard key={d.id} diarista={d}
                onEdit={() => openEditar(d)}
                onToggle={() => handleToggleAtivo(d)}
                onDelete={() => openDeletar(d)}
              />
            ))}
          </div>
        )}

        {/* Desktop table */}
        {!loadError && filtered.length > 0 && (
          <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 720 }}>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidade</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Banco</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">PIX</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => (
                    <tr key={d.id} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{d.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{d.cpf}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.especialidade ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span>{d.banco ?? '—'}</span>
                        {(d.agencia || d.conta) && (
                          <span className="block text-[11px] text-muted-foreground/70">
                            {[d.agencia, d.conta].filter(Boolean).join(' / ')}
                            {d.tipo_conta && ` (${d.tipo_conta})`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><PixBadge tipo={d.pix_tipo} chave={d.pix_chave} /></td>
                      <td className="px-4 py-3"><StatusBadge ativo={d.ativo} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <RowActions diarista={d}
                            onEdit={() => openEditar(d)}
                            onToggle={() => handleToggleAtivo(d)}
                            onDelete={() => openDeletar(d)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {modal === 'criar' && (
        <Modal title="Adicionar Diarista" onClose={closeModal}>
          <DiaristaForm initial={makeEmptyForm(valorDiaPadrao, valorHoraPadrao)} onSave={handleSalvar} onCancel={closeModal} />
        </Modal>
      )}

      {modal === 'editar' && selected && (
        <Modal title="Editar Diarista" onClose={closeModal}>
          <DiaristaForm initial={diaristaToForm(selected)} onSave={handleSalvar} onCancel={closeModal} />
        </Modal>
      )}

      {modal === 'deletar' && selected && (
        <ConfirmDeleteModal
          nome={selected.nome}
          onConfirm={handleDeletar}
          onCancel={closeModal}
          deleting={deleting}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

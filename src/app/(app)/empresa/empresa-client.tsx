'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Mail, Phone, MapPin, BadgeCheck, Users,
  CreditCard, Calendar, Pencil, X, Loader2, ShieldCheck,
} from 'lucide-react'
import { updateEmpresaAction, type EmpresaEditInput } from './actions'
import type { Empresa, Role } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
}
const PLAN_COLOR: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-50 text-blue-700',
  enterprise: 'bg-violet-50 text-violet-700',
}
const STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa', pendente: 'Pendente', inativa: 'Inativa',
}
const STATUS_COLOR: Record<string, string> = {
  ativa:    'bg-emerald-50 text-emerald-700',
  pendente: 'bg-yellow-50 text-yellow-700',
  inativa:  'bg-gray-100 text-gray-500',
}
const COBRANCA_LABEL: Record<string, string> = {
  manual: 'Manual', automatica: 'Automática',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
}

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return d.replace(/(\d{0,2})/, '($1')
  if (d.length <= 6)  return d.replace(/(\d{2})(\d{0,4})/, '($1) $2')
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
function isValidPhone(v: string) {
  const d = v.replace(/\D/g, '')
  return d.length === 10 || d.length === 11
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
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {toast.message}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function EmpresaSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      {[4, 3].map((n, si) => (
        <div key={si} className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-4">
          <div className="h-5 w-36 rounded bg-muted animate-pulse" />
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-11 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── InfoRow (modo leitura) ─────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground text-right max-w-[55%] truncate">{children}</div>
    </div>
  )
}

// ── Campo de texto editável ────────────────────────────────────────────────

function Field({ id, label, value, onChange, error, placeholder, type = 'text', required = true }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; error?: string
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border px-3 py-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-11 ${
          error ? 'border-red-400 focus:ring-red-400/40' : 'border-input'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

type FormState = {
  nome: string
  email_contato: string
  telefone: string
  endereco: string
}
type FormErrors = Partial<Record<keyof FormState, string>>

function empresaToForm(e: Empresa): FormState {
  return {
    nome:          e.nome ?? '',
    email_contato: e.email_contato ?? '',
    telefone:      e.telefone ?? '',
    endereco:      e.endereco ?? '',
  }
}

interface Props { empresa: Empresa; role: Role }

export function EmpresaClient({ empresa: initialEmpresa, role }: Props) {
  const [empresa,  setEmpresa]  = useState<Empresa>(initialEmpresa)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState<FormState>(empresaToForm(initialEmpresa))
  const [original, setOriginal] = useState<FormState>(empresaToForm(initialEmpresa))
  const [errors,   setErrors]   = useState<FormErrors>({})
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<ToastState>(null)

  const isAdmin = role === 'admin'

  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }, [])

  const handleEdit = () => {
    setOriginal(empresaToForm(empresa))
    setForm(empresaToForm(empresa))
    setErrors({})
    setEditing(true)
  }

  const handleCancel = () => {
    setForm(original)
    setErrors({})
    setEditing(false)
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.nome.trim())                        e.nome          = 'Nome da empresa é obrigatório'
    if (!form.email_contato.trim())               e.email_contato = 'E-mail é obrigatório'
    else if (!isValidEmail(form.email_contato))   e.email_contato = 'E-mail inválido'
    if (!form.telefone.trim())                    e.telefone      = 'Telefone é obrigatório'
    else if (!isValidPhone(form.telefone))         e.telefone      = 'Telefone inválido (mínimo 10 dígitos)'
    if (!form.endereco.trim())                    e.endereco      = 'Endereço é obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const input: EmpresaEditInput = {
      nome:          form.nome.trim(),
      email_contato: form.email_contato.trim(),
      telefone:      form.telefone.trim(),
      endereco:      form.endereco.trim(),
    }

    const { error } = await updateEmpresaAction(input)
    setSaving(false)

    if (error) {
      setToast({ message: 'Erro: ' + error, type: 'error' })
      return
    }

    setEmpresa(emp => ({ ...emp, ...input }))
    setEditing(false)
    setToast({ message: 'Empresa atualizada com sucesso', type: 'success' })
  }

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl">Perfil da Empresa</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? 'Visualize e edite os dados da sua empresa.' : 'Visualize os dados da sua empresa.'}
            </p>
          </div>
          {isAdmin && !editing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shrink-0 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          )}
        </div>

        {/* ── Dados da Empresa ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-6 py-4">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Dados da empresa</h2>
            {editing && (
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                Modo edição
              </span>
            )}
          </div>

          {editing ? (
            <div className="px-6 py-6 space-y-4">
              <Field
                id="nome"
                label="Nome da empresa"
                value={form.nome}
                onChange={v => setField('nome', v)}
                error={errors.nome}
                placeholder="Ex: Construtora Silva"
              />
              <Field
                id="email_contato"
                label="E-mail de contato"
                type="email"
                value={form.email_contato}
                onChange={v => setField('email_contato', v)}
                error={errors.email_contato}
                placeholder="contato@empresa.com.br"
              />
              <Field
                id="telefone"
                label="Telefone"
                value={form.telefone}
                onChange={v => setField('telefone', maskPhone(v))}
                error={errors.telefone}
                placeholder="(11) 99999-9999"
              />
              <Field
                id="endereco"
                label="Endereço"
                value={form.endereco}
                onChange={v => setField('endereco', v)}
                error={errors.endereco}
                placeholder="Rua, número, bairro, cidade — UF"
              />
            </div>
          ) : (
            <div className="px-6 py-1">
              <InfoRow icon={Building2} label="Nome">
                {empresa.nome}
              </InfoRow>
              <InfoRow icon={Mail} label="E-mail de contato">
                {empresa.email_contato
                  ? <span className="font-mono text-xs">{empresa.email_contato}</span>
                  : <span className="text-muted-foreground/60">Não informado</span>
                }
              </InfoRow>
              <InfoRow icon={Phone} label="Telefone">
                {empresa.telefone || <span className="text-muted-foreground/60">Não informado</span>}
              </InfoRow>
              <InfoRow icon={MapPin} label="Endereço">
                {empresa.endereco || <span className="text-muted-foreground/60">Não informado</span>}
              </InfoRow>
            </div>
          )}
        </div>

        {/* ── Plano & Status ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-6 py-4">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Plano & Status</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">Somente leitura</span>
          </div>
          <div className="px-6 py-1">
            <InfoRow icon={BadgeCheck} label="Plano">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOR[empresa.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                {PLAN_LABEL[empresa.plano] ?? empresa.plano}
              </span>
            </InfoRow>
            <InfoRow icon={Users} label="Limite de diaristas">
              {empresa.limite_diaristas} diaristas
            </InfoRow>
            <InfoRow icon={ShieldCheck} label="Status">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[empresa.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABEL[empresa.status] ?? empresa.status}
              </span>
            </InfoRow>
            <InfoRow icon={CreditCard} label="Tipo de cobrança">
              {COBRANCA_LABEL[empresa.tipo_cobranca] ?? empresa.tipo_cobranca}
            </InfoRow>
            <InfoRow icon={Calendar} label="Data de cadastro">
              {formatDate(empresa.criado_em)}
            </InfoRow>
          </div>
        </div>

        {/* ── Botões de ação (modo edição) ── */}
        {editing && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center justify-center gap-2 h-11 rounded-md border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 h-11 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </button>
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

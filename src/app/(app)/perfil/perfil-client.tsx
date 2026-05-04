'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Lock, Eye, EyeOff, Loader2, ShieldCheck, Calendar, Building2, BadgeCheck } from 'lucide-react'
import { changePasswordAction, type PerfilData } from './actions'

// ── Helpers ────────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
}
const PLAN_COLOR: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-50 text-blue-700',
  enterprise: 'bg-violet-50 text-violet-700',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
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

// ── Skeleton ───────────────────────────────────────────────────────────────

export function PerfilSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
      <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-4">
        <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-border last:border-0">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
            <div className="h-11 rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
        <div className="h-11 w-40 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// ── Info row ───────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground text-right shrink-0">{children}</div>
    </div>
  )
}

// ── Campo senha com toggle ─────────────────────────────────────────────────

function PasswordField({ id, label, value, onChange, error, placeholder, autoComplete }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; error?: string
  placeholder?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const fc = `w-full rounded-md border px-3 py-2.5 pr-10 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-11 ${error ? 'border-red-400 focus:ring-red-400/40' : 'border-input'}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          autoComplete={autoComplete}
          className={fc}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

type SenhaErrors = { atual?: string; nova?: string; confirmar?: string }

interface Props { perfil: PerfilData }

export function PerfilClient({ perfil }: Props) {
  const [atual,     setAtual]     = useState('')
  const [nova,      setNova]      = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [errors,    setErrors]    = useState<SenhaErrors>({})
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<ToastState>(null)
  const atualRef = useRef<HTMLInputElement>(null)

  const clearField = (k: keyof SenhaErrors) =>
    setErrors(e => ({ ...e, [k]: undefined }))

  const validate = (): boolean => {
    const e: SenhaErrors = {}
    if (!atual)                              e.atual     = 'Informe a senha atual'
    if (!nova || nova.length < 8)            e.nova      = 'A nova senha deve ter no mínimo 8 caracteres'
    else if (nova === atual)                 e.nova      = 'A nova senha não pode ser igual à senha atual'
    if (!confirmar)                          e.confirmar = 'Confirme a nova senha'
    else if (nova && confirmar !== nova)     e.confirmar = 'As senhas não coincidem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const { error } = await changePasswordAction(atual, nova)

    setSaving(false)
    if (error) {
      if (error === 'Senha atual incorreta.') {
        setErrors({ atual: 'Senha atual incorreta' })
      } else {
        setToast({ message: 'Erro: ' + error, type: 'error' })
      }
      return
    }

    // changePasswordAction redireciona para /login após sign out
    // Este código só é atingido se o redirect não aconteceu (improvável)
    setToast({ message: 'Senha alterada com sucesso! Redirecionando...', type: 'success' })
  }

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Visualize seus dados e gerencie sua senha.</p>
        </div>

        {/* ── Seção: Dados Pessoais ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-6 py-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Dados pessoais</h2>
          </div>
          <div className="px-6 py-1">
            <InfoRow icon={User} label="E-mail">
              <span className="font-mono text-xs">{perfil.email}</span>
            </InfoRow>
            <InfoRow icon={Building2} label="Empresa">
              {perfil.nomeEmpresa ?? '—'}
            </InfoRow>
            <InfoRow icon={BadgeCheck} label="Plano">
              {perfil.plano ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOR[perfil.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                  {PLAN_LABEL[perfil.plano] ?? perfil.plano}
                </span>
              ) : '—'}
            </InfoRow>
            <InfoRow icon={Calendar} label="Membro desde">
              {formatDate(perfil.criadoEm)}
            </InfoRow>
          </div>
        </div>

        {/* ── Seção: Alterar Senha ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-6 py-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Alterar senha</h2>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            <PasswordField
              id="atual"
              label="Senha atual"
              value={atual}
              onChange={v => { setAtual(v); clearField('atual') }}
              error={errors.atual}
              autoComplete="current-password"
            />

            <PasswordField
              id="nova"
              label="Nova senha"
              value={nova}
              onChange={v => { setNova(v); clearField('nova') }}
              error={errors.nova}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />

            <PasswordField
              id="confirmar"
              label="Confirmar nova senha"
              value={confirmar}
              onChange={v => { setConfirmar(v); clearField('confirmar') }}
              error={errors.confirmar}
              autoComplete="new-password"
            />

            {/* Requisitos visuais */}
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Requisitos da nova senha:</p>
              <ul className="space-y-1">
                {[
                  ['Mínimo 8 caracteres', nova.length >= 8],
                  ['Diferente da senha atual', nova.length > 0 && nova !== atual],
                  ['Confirmação idêntica',    nova.length > 0 && confirmar === nova && confirmar.length > 0],
                ].map(([txt, ok]) => (
                  <li key={txt as string} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${ok ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                    {txt as string}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Após alterar, você será desconectado automaticamente.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 shrink-0"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Alterar senha
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

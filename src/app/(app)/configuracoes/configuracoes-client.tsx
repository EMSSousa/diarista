'use client'

import { useState, useEffect } from 'react'
import {
  Building2, DollarSign, ShieldCheck,
  Loader2, RefreshCw, Lock,
} from 'lucide-react'
import type { Empresa } from '@/types/database'
import { getEmpresa, saveValoresPadrao } from './actions'

// ── Helpers ────────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
}
const STATUS_STYLE: Record<string, string> = {
  ativa:    'bg-emerald-50 text-emerald-700',
  pendente: 'bg-yellow-50 text-yellow-700',
  inativa:  'bg-gray-100 text-gray-500',
}
const COBRANCA_LABEL: Record<string, string> = {
  manual: 'Manual', automatica: 'Automática',
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
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

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="flex gap-1">
        {[80, 120, 80].map((w, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
            <div className="h-11 rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── InfoRow ────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground min-w-[160px]">{label}</span>
      <div className="text-sm font-medium text-foreground text-left sm:text-right">{children}</div>
    </div>
  )
}

// ── Aba: Empresa ───────────────────────────────────────────────────────────

function AbaEmpresa({ empresa }: { empresa: Empresa }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h2 className="text-sm font-semibold text-foreground">Dados da empresa</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Informações da sua conta. Para alterar, contate o suporte.</p>
      </div>
      <div className="px-6 py-2">
        <InfoRow label="Nome">
          {empresa.nome}
        </InfoRow>
        <InfoRow label="Plano">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
            {PLAN_LABEL[empresa.plano] ?? empresa.plano}
          </span>
        </InfoRow>
        <InfoRow label="Limite de diaristas">
          {empresa.limite_diaristas === 999999 ? 'Ilimitado' : empresa.limite_diaristas}
        </InfoRow>
        <InfoRow label="Status">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[empresa.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {empresa.status}
          </span>
        </InfoRow>
        <InfoRow label="Tipo de cobrança">
          {COBRANCA_LABEL[empresa.tipo_cobranca] ?? empresa.tipo_cobranca}
        </InfoRow>
        <InfoRow label="Valor padrão/dia">
          {formatBRL(Number(empresa.valor_dia_padrao))}
        </InfoRow>
        <InfoRow label="Valor padrão/hora">
          {formatBRL(Number(empresa.valor_hora_padrao))}
        </InfoRow>
      </div>
    </div>
  )
}

// ── Aba: Valores Padrão ────────────────────────────────────────────────────

function AbaValores({ empresa, onSaved }: { empresa: Empresa; onSaved: (e: Empresa) => void }) {
  const [dia,   setDia]   = useState(String(Number(empresa.valor_dia_padrao)  || ''))
  const [hora,  setHora]  = useState(String(Number(empresa.valor_hora_padrao) || ''))
  const [erros, setErros] = useState<{ dia?: string; hora?: string }>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<ToastState>(null)

  const fc = (err?: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-11 ${err ? 'border-red-400 focus:ring-red-400/40' : 'border-input'}`

  const validate = () => {
    const e: typeof erros = {}
    const vDia  = parseFloat(dia.replace(',', '.'))
    const vHora = parseFloat(hora.replace(',', '.'))
    if (!dia || isNaN(vDia) || vDia <= 0)   e.dia  = 'Informe um valor maior que zero'
    if (!hora || isNaN(vHora) || vHora <= 0) e.hora = 'Informe um valor maior que zero'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const vDia  = parseFloat(dia.replace(',', '.'))
    const vHora = parseFloat(hora.replace(',', '.'))
    const { error } = await saveValoresPadrao(vDia, vHora)
    setSaving(false)
    if (error) {
      setToast({ message: 'Erro ao salvar: ' + error, type: 'error' })
      return
    }
    setToast({ message: 'Configurações salvas com sucesso!', type: 'success' })
    onSaved({ ...empresa, valor_dia_padrao: vDia, valor_hora_padrao: vHora })
  }

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Valores padrão</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estes valores serão pré-preenchidos ao criar um novo diarista.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            {/* Valor/dia */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Valor padrão por dia (R$) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <input
                  value={dia}
                  onChange={e => { setDia(e.target.value); setErros(v => ({ ...v, dia: undefined })) }}
                  placeholder="0,00"
                  inputMode="decimal"
                  className={`${fc(erros.dia)} pl-9`}
                />
              </div>
              {erros.dia && <p className="mt-1 text-xs text-red-500">{erros.dia}</p>}
            </div>

            {/* Valor/hora */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Valor padrão por hora (R$) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <input
                  value={hora}
                  onChange={e => { setHora(e.target.value); setErros(v => ({ ...v, hora: undefined })) }}
                  placeholder="0,00"
                  inputMode="decimal"
                  className={`${fc(erros.hora)} pl-9`}
                />
              </div>
              {erros.hora && <p className="mt-1 text-xs text-red-500">{erros.hora}</p>}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              Ao adicionar um diarista, o formulário virá pré-preenchido com estes valores.
              Você pode alterar individualmente em cada cadastro.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="h-11 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar configurações
          </button>
        </div>
      </form>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

// ── Aba: Segurança ─────────────────────────────────────────────────────────

function AbaSeguranca() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Segurança da conta</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie as configurações de segurança.</p>
        </div>
        <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Em breve</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Autenticação de dois fatores, histórico de acessos e outras configurações de segurança estarão disponíveis em breve.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Disponível na versão Pro
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'empresa',  label: 'Empresa',        icon: Building2    },
  { id: 'valores',  label: 'Valores Padrão', icon: DollarSign   },
  { id: 'seguranca',label: 'Segurança',      icon: ShieldCheck  },
] as const
type TabId = typeof TABS[number]['id']

// ── Componente principal ───────────────────────────────────────────────────

interface Props { initialEmpresa: Empresa | null }

export function ConfiguracoesClient({ initialEmpresa }: Props) {
  const [empresa,    setEmpresa]    = useState<Empresa | null>(initialEmpresa)
  const [tab,        setTab]        = useState<TabId>('empresa')
  const [loading,    setLoading]    = useState(false)
  const [loadError,  setLoadError]  = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    setLoadError(null)
    const { empresa: data, error } = await getEmpresa()
    if (error) setLoadError(error)
    else setEmpresa(data)
    setLoading(false)
  }

  if (loading) return <Skeleton />

  if (loadError || !empresa) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-destructive font-medium">
          {loadError ?? 'Erro ao carregar configurações.'}
        </p>
        <button onClick={reload}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as preferências da sua empresa.</p>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
              tab === id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === 'empresa'   && <AbaEmpresa empresa={empresa} />}
      {tab === 'valores'   && <AbaValores empresa={empresa} onSaved={setEmpresa} />}
      {tab === 'seguranca' && <AbaSeguranca />}
    </div>
  )
}

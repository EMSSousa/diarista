'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  PackageOpen, Loader2, X, AlertTriangle,
  LayoutDashboard, Users, CalendarDays, Clock, History,
  CreditCard, BarChart3, Building2, Settings,
} from 'lucide-react'
import {
  createPlanoAction, updatePlanoAction,
  togglePlanoAtivoAction, deletePlanoAction, saveModulosAction,
  type PlanoInput,
} from './actions'
import type { Permissao, Permissoes, PlanoInfo, PlanoModulosMap, PlanoTier } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatLimite(n: number) {
  return n >= 999999 ? 'Ilimitado' : n.toString()
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
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-xl ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {toast.message}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function PlanosSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-11 w-36 rounded-lg bg-gray-200 animate-pulse" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
            <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse ml-auto" />
            <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Módulos por Plano ─────────────────────────────────────────────────────

const MODULOS_CFG: { key: Permissao; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { key: 'diaristas',   label: 'Diaristas',     icon: Users },
  { key: 'agendamentos',label: 'Agendamentos',  icon: CalendarDays },
  { key: 'pontos',      label: 'Marcar Ponto',  icon: Clock },
  { key: 'historico',   label: 'Histórico',     icon: History },
  { key: 'pagamentos',  label: 'Pagamentos',    icon: CreditCard },
  { key: 'relatorios',  label: 'Relatórios',    icon: BarChart3 },
  { key: 'empresa',     label: 'Empresa',       icon: Building2 },
  { key: 'configuracoes',label: 'Configurações',icon: Settings },
]

const PLANO_LABEL: Record<PlanoTier, { label: string; color: string; desc: string }> = {
  basic:      { label: 'Basic',      color: 'text-gray-700 bg-gray-100',     desc: 'Acesso básico' },
  pro:        { label: 'Pro',        color: 'text-blue-700 bg-blue-50',      desc: 'Acesso avançado' },
  enterprise: { label: 'Enterprise', color: 'text-violet-700 bg-violet-50',  desc: 'Acesso completo' },
}

function PlanoModulosCard({
  tier, modulos, onSaved,
}: {
  tier: PlanoTier
  modulos: Permissoes
  onSaved: (tier: PlanoTier, modulos: Permissoes) => void
}) {
  const [current, setCurrent] = useState<Permissoes>(modulos)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<ToastState>(null)
  const cfg = PLANO_LABEL[tier]

  useEffect(() => { setCurrent(modulos) }, [modulos])

  const toggle = (key: Permissao) =>
    setCurrent(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await saveModulosAction(tier, current)
    setSaving(false)
    if (error) { setToast({ message: 'Erro: ' + error, type: 'error' }); return }
    setToast({ message: 'Módulos salvos!', type: 'success' })
    onSaved(tier, current)
  }

  const enabledCount = Object.values(current).filter(Boolean).length

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 flex items-center justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>
              {cfg.label}
            </span>
            <p className="text-xs text-gray-500 mt-1">{enabledCount} de {MODULOS_CFG.length} módulos ativos</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {MODULOS_CFG.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer"
              onClick={() => toggle(key)}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${current[key] ? 'text-blue-600' : 'text-gray-300'}`} />
                <span className={`text-sm ${current[key] ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={current[key]}
                onClick={e => { e.stopPropagation(); toggle(key) }}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${current[key] ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${current[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

// ── Modal de criação / edição ──────────────────────────────────────────────

type ModalMode = { type: 'create' } | { type: 'edit'; plano: PlanoInfo }

type FormState = { nome: string; limite: string; preco: string; ativo: boolean }
type FormErrors = Partial<Record<'nome' | 'limite' | 'preco', string>>

function makeEmpty(): FormState { return { nome: '', limite: '', preco: '', ativo: true } }
function planoToForm(p: PlanoInfo): FormState {
  return {
    nome:   p.nome,
    limite: p.limite_diaristas >= 999999 ? '999999' : String(p.limite_diaristas),
    preco:  String(p.preco_mensal),
    ativo:  p.ativo,
  }
}

function PlanoModal({
  mode, onClose, onSaved,
}: {
  mode: ModalMode
  onClose: () => void
  onSaved: (plano: PlanoInfo, isNew: boolean) => void
}) {
  const isEdit = mode.type === 'edit'
  const [form,   setForm]   = useState<FormState>(isEdit ? planoToForm(mode.plano) : makeEmpty())
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k !== 'ativo') setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = (): PlanoInput | null => {
    const e: FormErrors = {}
    if (!form.nome.trim())                      e.nome   = 'Nome é obrigatório'
    const limite = Number(form.limite)
    if (!form.limite || isNaN(limite) || limite <= 0) e.limite = 'Limite deve ser maior que 0'
    const preco = Number(form.preco)
    if (!form.preco || isNaN(preco) || preco <= 0)    e.preco  = 'Preço deve ser maior que 0'
    setErrors(e)
    if (Object.keys(e).length > 0) return null
    return { nome: form.nome.trim(), limite_diaristas: limite, preco_mensal: preco, ativo: form.ativo }
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const input = validate()
    if (!input) return
    setSaving(true)

    if (isEdit) {
      const { error } = await updatePlanoAction(mode.plano.id, input)
      setSaving(false)
      if (error) { setErrors({ nome: 'Erro: ' + error }); return }
      onSaved({ ...mode.plano, ...input }, false)
    } else {
      const { plano, error } = await createPlanoAction(input)
      setSaving(false)
      if (error || !plano) { setErrors({ nome: 'Erro: ' + (error ?? 'desconhecido') }); return }
      onSaved(plano, true)
    }
  }

  const fieldClass = (err?: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-11 ${err ? 'border-red-400' : 'border-gray-200'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Editar plano' : 'Novo plano'}
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Profissional"
              className={fieldClass(errors.nome)}
            />
            {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome}</p>}
          </div>

          {/* Limite + Preço */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Limite diaristas <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.limite}
                onChange={e => set('limite', e.target.value)}
                placeholder="Ex: 10"
                className={fieldClass(errors.limite)}
              />
              {errors.limite && <p className="mt-1 text-xs text-red-500">{errors.limite}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Preço / mês (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.preco}
                onChange={e => set('preco', e.target.value)}
                placeholder="Ex: 99.00"
                className={fieldClass(errors.preco)}
              />
              {errors.preco && <p className="mt-1 text-xs text-red-500">{errors.preco}</p>}
            </div>
          </div>

          {/* Ativo toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">Status do plano</span>
            <button
              type="button"
              onClick={() => set('ativo', !form.ativo)}
              className="flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              {form.ativo ? (
                <>
                  <ToggleRight className="h-6 w-6 text-emerald-500" />
                  <span className="text-emerald-700">Ativo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                  <span className="text-gray-500">Inativo</span>
                </>
              )}
            </button>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal de confirmação de exclusão ──────────────────────────────────────

function DeleteModal({
  plano, onClose, onDeleted,
}: {
  plano: PlanoInfo
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await deletePlanoAction(plano.id)
    setDeleting(false)
    if (error) { setError('Erro ao deletar: ' + error); return }
    onDeleted(plano.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        <div className="p-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold text-gray-900">Deletar plano</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tem certeza que deseja deletar o plano <span className="font-semibold text-gray-800">"{plano.nome}"</span>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-600 text-center">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-11 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Deletar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

interface Props { initialPlanos: PlanoInfo[]; initialModulos: PlanoModulosMap }

export function PlanosClient({ initialPlanos, initialModulos }: Props) {
  const [planos,      setPlanos]      = useState<PlanoInfo[]>(initialPlanos)
  const [modulos,     setModulos]     = useState<PlanoModulosMap>(initialModulos)
  const [modal,       setModal]       = useState<ModalMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlanoInfo | null>(null)
  const [toast,       setToast]       = useState<ToastState>(null)
  const [toggling,    setToggling]    = useState<string | null>(null)

  const handleSaved = useCallback((plano: PlanoInfo, isNew: boolean) => {
    setPlanos(prev =>
      isNew ? [...prev, plano] : prev.map(p => p.id === plano.id ? plano : p)
    )
    setModal(null)
    setToast({ message: isNew ? 'Plano criado com sucesso' : 'Plano atualizado com sucesso', type: 'success' })
  }, [])

  const handleDeleted = useCallback((id: string) => {
    setPlanos(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
    setToast({ message: 'Plano deletado com sucesso', type: 'success' })
  }, [])

  const handleToggle = useCallback(async (plano: PlanoInfo) => {
    const next = !plano.ativo
    setToggling(plano.id)
    setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, ativo: next } : p))
    const { error } = await togglePlanoAtivoAction(plano.id, next)
    setToggling(null)
    if (error) {
      setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, ativo: plano.ativo } : p))
      setToast({ message: 'Erro ao atualizar status: ' + error, type: 'error' })
    } else {
      setToast({ message: next ? 'Plano ativado' : 'Plano desativado', type: 'success' })
    }
  }, [])

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
            <p className="mt-1 text-sm text-gray-500">Gerencie os planos disponíveis no SaaS</p>
          </div>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Novo plano
          </button>
        </div>

        {planos.length === 0 ? (
          /* ── Estado vazio ── */
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <PackageOpen className="h-7 w-7 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Nenhum plano criado</p>
                <p className="mt-1 text-xs text-gray-400">Crie o primeiro plano para oferecer às empresas</p>
              </div>
              <button
                onClick={() => setModal({ type: 'create' })}
                className="flex items-center gap-2 h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Criar primeiro plano
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Tabela desktop ── */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Limite</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Preço / mês</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {planos.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-800">{p.nome}</td>
                      <td className="px-6 py-4 text-gray-600">{formatLimite(p.limite_diaristas)} diaristas</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{formatBRL(p.preco_mensal)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle ativo */}
                          <button
                            onClick={() => handleToggle(p)}
                            disabled={toggling === p.id}
                            title={p.ativo ? 'Desativar' : 'Ativar'}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 transition-colors"
                          >
                            {toggling === p.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : p.ativo
                                ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                                : <ToggleLeft className="h-4 w-4" />
                            }
                          </button>
                          {/* Editar */}
                          <button
                            onClick={() => setModal({ type: 'edit', plano: p })}
                            title="Editar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {/* Deletar */}
                          <button
                            onClick={() => setDeleteTarget(p)}
                            title="Deletar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Cards mobile ── */}
            <div className="grid gap-3 md:hidden">
              {planos.map(p => (
                <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{p.nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatLimite(p.limite_diaristas)} diaristas</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatBRL(p.preco_mensal)}<span className="text-sm font-normal text-gray-400">/mês</span></p>
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={toggling === p.id}
                      className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {toggling === p.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : p.ativo ? <ToggleRight className="h-3.5 w-3.5 text-emerald-500" /> : <ToggleLeft className="h-3.5 w-3.5" />
                      }
                      {p.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'edit', plano: p })}
                      className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

        {/* ── Módulos por Plano ── */}
        <div className="mt-10 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Módulos por plano</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure quais páginas e funcionalidades cada plano oferece aos usuários.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(['basic', 'pro', 'enterprise'] as PlanoTier[]).map(tier => (
              <PlanoModulosCard
                key={tier}
                tier={tier}
                modulos={modulos[tier]}
                onSaved={(t, m) => setModulos(prev => ({ ...prev, [t]: m }))}
              />
            ))}
          </div>
        </div>

      {/* Modais */}
      {modal && (
        <PlanoModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          plano={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

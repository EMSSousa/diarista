'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2, CheckCircle, XCircle, Pencil, Trash2,
  Eye, EyeOff, Loader2, X, AlertTriangle, PackageOpen, Filter,
  Calendar, Mail, CreditCard, ShieldCheck, ChevronDown, Plus,
} from 'lucide-react'
import {
  aprovarEmpresaAction, ativarEmpresaAction, desativarEmpresaAction,
  updateEmpresaAdminAction, deleteEmpresaAdminAction, criarEmpresaAdminAction,
  type EmpresaComAdmin, type EmpresaAdminEditInput, type CriarEmpresaAdminInput,
} from './actions'
import type { Plano, StatusEmpresa, TipoCobranca } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string>   = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' }
const PLAN_COLOR: Record<string, string>   = {
  basic: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-50 text-blue-700',
  enterprise: 'bg-violet-50 text-violet-700',
}
const STATUS_LABEL: Record<string, string> = { ativa: 'Ativa', pendente: 'Pendente', inativa: 'Inativa' }
const STATUS_COLOR: Record<string, string> = {
  ativa:    'bg-emerald-50 text-emerald-700',
  pendente: 'bg-yellow-50 text-yellow-700',
  inativa:  'bg-gray-100 text-gray-500',
}
const COBRANCA_LABEL: Record<string, string> = { manual: 'Manual', automatica: 'Automática' }

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
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

export function EmpresasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 rounded-lg bg-gray-200 animate-pulse" />
      <div className="flex gap-3">
        <div className="h-10 w-36 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-10 w-36 rounded-lg bg-gray-200 animate-pulse" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
            <div className="h-4 w-36 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse ml-auto" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Modal detalhes ─────────────────────────────────────────────────────────

function DetailsModal({
  empresa,
  onClose,
  onEdit,
}: {
  empresa: EmpresaComAdmin
  onClose: () => void
  onEdit: () => void
}) {
  function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">{label}</span>
        </div>
        <div className="text-sm font-medium text-gray-800 text-right">{children}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">Detalhes da empresa</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-2">
          <Row icon={Building2}   label="Nome">{empresa.nome}</Row>
          <Row icon={Mail}        label="Admin">
            {empresa.admin_email
              ? <span className="font-mono text-xs">{empresa.admin_email}</span>
              : <span className="text-gray-400">Não disponível</span>}
          </Row>
          <Row icon={CreditCard}  label="Plano">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOR[empresa.plano] ?? 'bg-gray-100 text-gray-600'}`}>
              {PLAN_LABEL[empresa.plano] ?? empresa.plano}
            </span>
          </Row>
          <Row icon={ShieldCheck} label="Status">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[empresa.status]}`}>
              {STATUS_LABEL[empresa.status]}
            </span>
          </Row>
          <Row icon={CreditCard}  label="Cobrança">{COBRANCA_LABEL[empresa.tipo_cobranca]}</Row>
          <Row icon={Calendar}    label="Cadastro">{formatDate(empresa.criado_em)}</Row>
          <Row icon={Calendar}    label="Aprovação">{formatDate(empresa.data_aprovacao)}</Row>
          <Row icon={Calendar}    label="Ativação">{formatDate(empresa.data_ativacao)}</Row>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Fechar
          </button>
          <button onClick={onEdit} className="flex-1 h-11 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar ───────────────────────────────────────────────────────────

function EditModal({
  empresa,
  onClose,
  onSaved,
}: {
  empresa: EmpresaComAdmin
  onClose: () => void
  onSaved: (updated: EmpresaComAdmin) => void
}) {
  const [nome,        setNome]        = useState(empresa.nome)
  const [plano,       setPlano]       = useState<Plano>(empresa.plano)
  const [status,      setStatus]      = useState<StatusEmpresa>(empresa.status)
  const [tipoCobranca, setTipoCobranca] = useState<TipoCobranca>(empresa.tipo_cobranca)
  const [nomeError,   setNomeError]   = useState('')
  const [saving,      setSaving]      = useState(false)

  const LIMITES: Record<string, number> = { basic: 10, pro: 50, enterprise: 999999 }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!nome.trim()) { setNomeError('Nome é obrigatório'); return }
    setSaving(true)
    const input: EmpresaAdminEditInput = { nome, plano, status, tipo_cobranca: tipoCobranca }
    const { error } = await updateEmpresaAdminAction(empresa.id, input)
    setSaving(false)
    if (error) { setNomeError('Erro: ' + error); return }
    onSaved({ ...empresa, ...input, limite_diaristas: LIMITES[plano] ?? 10 })
  }

  const selectClass = 'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-11 appearance-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">Editar empresa</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => { setNome(e.target.value); setNomeError('') }}
              className={`w-full rounded-md border px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-11 ${nomeError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {nomeError && <p className="mt-1 text-xs text-red-500">{nomeError}</p>}
          </div>

          {/* Plano */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Plano</label>
            <div className="relative">
              <select value={plano} onChange={e => setPlano(e.target.value as Plano)} className={selectClass}>
                <option value="basic">Basic (10 diaristas)</option>
                <option value="pro">Pro (50 diaristas)</option>
                <option value="enterprise">Enterprise (ilimitado)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <div className="relative">
              <select value={status} onChange={e => setStatus(e.target.value as StatusEmpresa)} className={selectClass}>
                <option value="pendente">Pendente</option>
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Tipo cobrança */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de cobrança</label>
            <div className="flex gap-3">
              {(['manual', 'automatica'] as TipoCobranca[]).map(tipo => (
                <label
                  key={tipo}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    tipoCobranca === tipo
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={tipoCobranca === tipo}
                    onChange={() => setTipoCobranca(tipo)}
                  />
                  {COBRANCA_LABEL[tipo]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal criar empresa ────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (empresa: EmpresaComAdmin) => void
}) {
  const [nome,         setNome]         = useState('')
  const [email,        setEmail]        = useState('')
  const [senha,        setSenha]        = useState('')
  const [showSenha,    setShowSenha]    = useState(false)
  const [plano,        setPlano]        = useState<Plano>('basic')
  const [tipoCobranca, setTipoCobranca] = useState<TipoCobranca>('manual')
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [saving,       setSaving]       = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!nome.trim())  e.nome  = 'Nome é obrigatório'
    if (!email.trim()) e.email = 'E-mail é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido'
    if (!senha)        e.senha = 'Senha é obrigatória'
    else if (senha.length < 6) e.senha = 'Mínimo 6 caracteres'
    return e
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const input: CriarEmpresaAdminInput = { nome, email, senha, plano, tipo_cobranca: tipoCobranca }
    const { empresa, error } = await criarEmpresaAdminAction(input)
    setSaving(false)
    if (error) { setErrors({ form: error }); return }
    onCreated(empresa!)
  }

  const fieldClass = (key: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-11 ${errors[key] ? 'border-red-400' : 'border-gray-200'}`
  const selectClass = 'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-11 appearance-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">Nova empresa</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {errors.form && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-600">{errors.form}</div>
          )}

          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nome da empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => { setNome(e.target.value); setErrors(p => ({ ...p, nome: '' })) }}
              placeholder="Ex: Construtora Silva"
              className={fieldClass('nome')}
            />
            {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome}</p>}
          </div>

          {/* E-mail admin */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              E-mail do admin <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
              placeholder="admin@empresa.com"
              className={fieldClass('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Senha */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Senha inicial <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => { setSenha(e.target.value); setErrors(p => ({ ...p, senha: '' })) }}
                placeholder="Mín. 6 caracteres"
                className={fieldClass('senha')}
              />
              <button
                type="button"
                onClick={() => setShowSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.senha && <p className="mt-1 text-xs text-red-500">{errors.senha}</p>}
          </div>

          {/* Plano */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Plano</label>
            <div className="relative">
              <select value={plano} onChange={e => setPlano(e.target.value as Plano)} className={selectClass}>
                <option value="basic">Basic (10 diaristas)</option>
                <option value="pro">Pro (50 diaristas)</option>
                <option value="enterprise">Enterprise (ilimitado)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Tipo cobrança */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de cobrança</label>
            <div className="flex gap-3">
              {(['manual', 'automatica'] as TipoCobranca[]).map(tipo => (
                <label
                  key={tipo}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    tipoCobranca === tipo
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input type="radio" className="sr-only" checked={tipoCobranca === tipo} onChange={() => setTipoCobranca(tipo)} />
                  {COBRANCA_LABEL[tipo]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal confirmar exclusão ───────────────────────────────────────────────

function DeleteModal({
  empresa,
  onClose,
  onDeleted,
}: {
  empresa: EmpresaComAdmin
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await deleteEmpresaAdminAction(empresa.id)
    setDeleting(false)
    if (error) { setError('Erro ao deletar: ' + error); return }
    onDeleted(empresa.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100 p-6 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-bold text-gray-900">Deletar empresa</h2>
          <p className="mt-1 text-sm text-gray-500">
            Deseja deletar <span className="font-semibold text-gray-800">"{empresa.nome}"</span>? Todos os dados serão perdidos.
          </p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-600 text-center">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 h-11 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Deletar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ação inline com loading ────────────────────────────────────────────────

type ActionModal =
  | { type: 'create' }
  | { type: 'details'; empresa: EmpresaComAdmin }
  | { type: 'edit';    empresa: EmpresaComAdmin }
  | { type: 'delete';  empresa: EmpresaComAdmin }
  | null

// ── Componente principal ───────────────────────────────────────────────────

interface Props { initialEmpresas: EmpresaComAdmin[] }

export function EmpresasClient({ initialEmpresas }: Props) {
  const [empresas,     setEmpresas]     = useState<EmpresaComAdmin[]>(initialEmpresas)
  const [modal,        setModal]        = useState<ActionModal>(null)
  const [toast,        setToast]        = useState<ToastState>(null)
  const [loadingId,    setLoadingId]    = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterPlano,  setFilterPlano]  = useState<string>('todos')

  const filtered = useMemo(() => empresas.filter(e => {
    if (filterStatus !== 'todos' && e.status !== filterStatus) return false
    if (filterPlano  !== 'todos' && e.plano  !== filterPlano)  return false
    return true
  }), [empresas, filterStatus, filterPlano])

  const updateEmpresa = useCallback((updated: EmpresaComAdmin) => {
    setEmpresas(prev => prev.map(e => e.id === updated.id ? updated : e))
  }, [])

  const runAction = useCallback(async (
    id: string,
    fn: () => Promise<{ error: string | null }>,
    optimistic: (e: EmpresaComAdmin) => EmpresaComAdmin,
    successMsg: string,
  ) => {
    setLoadingId(id)
    const prev = empresas.find(e => e.id === id)!
    setEmpresas(es => es.map(e => e.id === id ? optimistic(e) : e))
    const { error } = await fn()
    setLoadingId(null)
    if (error) {
      setEmpresas(es => es.map(e => e.id === id ? prev : e))
      setToast({ message: 'Erro: ' + error, type: 'error' })
    } else {
      setToast({ message: successMsg, type: 'success' })
    }
  }, [empresas])

  const handleAprovar = (id: string) => runAction(
    id,
    () => aprovarEmpresaAction(id),
    e => ({ ...e, status: 'ativa', data_aprovacao: new Date().toISOString() }),
    'Empresa aprovada com sucesso',
  )

  const handleAtivar = (id: string) => runAction(
    id,
    () => ativarEmpresaAction(id),
    e => ({ ...e, status: 'ativa', data_ativacao: new Date().toISOString() }),
    'Empresa ativada com sucesso',
  )

  const handleDesativar = (id: string) => runAction(
    id,
    () => desativarEmpresaAction(id),
    e => ({ ...e, status: 'inativa' }),
    'Empresa desativada com sucesso',
  )

  const handleSaved = useCallback((updated: EmpresaComAdmin) => {
    updateEmpresa(updated)
    setModal(null)
    setToast({ message: 'Empresa atualizada com sucesso', type: 'success' })
  }, [updateEmpresa])

  const handleDeleted = useCallback((id: string) => {
    setEmpresas(prev => prev.filter(e => e.id !== id))
    setModal(null)
    setToast({ message: 'Empresa deletada com sucesso', type: 'success' })
  }, [])

  const handleCreated = useCallback((empresa: EmpresaComAdmin) => {
    setEmpresas(prev => [empresa, ...prev])
    setModal(null)
    setToast({ message: `Empresa "${empresa.nome}" criada com sucesso`, type: 'success' })
  }, [])

  const ActionButton = ({ empresa }: { empresa: EmpresaComAdmin }) => {
    const loading = loadingId === empresa.id
    return (
      <div className="flex items-center gap-1">
        {/* Aprovar */}
        {empresa.status === 'pendente' && (
          <button
            onClick={() => handleAprovar(empresa.id)}
            disabled={loading}
            title="Aprovar"
            className="flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Aprovar
          </button>
        )}
        {/* Ativar */}
        {empresa.status === 'inativa' && (
          <button
            onClick={() => handleAtivar(empresa.id)}
            disabled={loading}
            title="Ativar"
            className="flex h-8 items-center gap-1 rounded-lg bg-blue-50 px-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Ativar
          </button>
        )}
        {/* Desativar */}
        {empresa.status === 'ativa' && (
          <button
            onClick={() => handleDesativar(empresa.id)}
            disabled={loading}
            title="Desativar"
            className="flex h-8 items-center gap-1 rounded-lg bg-gray-100 px-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Desativar
          </button>
        )}
        {/* Ver detalhes */}
        <button
          onClick={() => setModal({ type: 'details', empresa })}
          title="Detalhes"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {/* Editar */}
        <button
          onClick={() => setModal({ type: 'edit', empresa })}
          title="Editar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {/* Deletar */}
        <button
          onClick={() => setModal({ type: 'delete', empresa })}
          title="Deletar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="mt-1 text-sm text-gray-500">
              {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nova Empresa
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none"
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={filterPlano}
              onChange={e => setFilterPlano(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none"
            >
              <option value="todos">Todos os planos</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
          {(filterStatus !== 'todos' || filterPlano !== 'todos') && (
            <button
              onClick={() => { setFilterStatus('todos'); setFilterPlano('todos') }}
              className="flex items-center gap-1.5 h-10 rounded-lg px-3 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <PackageOpen className="h-7 w-7 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {empresas.length === 0 ? 'Nenhuma empresa cadastrada' : 'Nenhuma empresa corresponde aos filtros'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {empresas.length === 0 ? 'As empresas aparecerão aqui após o cadastro' : 'Tente ajustar os filtros acima'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Tabela desktop ── */}
            <div className="hidden lg:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Plano</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cobrança</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cadastro</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{e.nome}</p>
                        {e.admin_email && <p className="text-xs text-gray-400 mt-0.5">{e.admin_email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOR[e.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PLAN_LABEL[e.plano] ?? e.plano}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[e.status]}`}>
                          {STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{COBRANCA_LABEL[e.tipo_cobranca]}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(e.criado_em)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <ActionButton empresa={e} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Cards mobile/tablet ── */}
            <div className="grid gap-3 lg:hidden">
              {filtered.map(e => (
                <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{e.nome}</p>
                      {e.admin_email && <p className="text-xs text-gray-400 mt-0.5">{e.admin_email}</p>}
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLOR[e.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                      {PLAN_LABEL[e.plano] ?? e.plano}
                    </span>
                    <span className="text-xs text-gray-400">{COBRANCA_LABEL[e.tipo_cobranca]}</span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(e.criado_em)}</span>
                  </div>
                  <div className="pt-1 border-t border-gray-100">
                    <ActionButton empresa={e} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modais */}
      {modal?.type === 'create' && (
        <CreateModal
          onClose={() => setModal(null)}
          onCreated={handleCreated}
        />
      )}
      {modal?.type === 'details' && (
        <DetailsModal
          empresa={modal.empresa}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', empresa: modal.empresa })}
        />
      )}
      {modal?.type === 'edit' && (
        <EditModal
          empresa={modal.empresa}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          empresa={modal.empresa}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

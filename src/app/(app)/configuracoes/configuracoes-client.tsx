'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2, DollarSign, ShieldCheck, Users,
  Loader2, RefreshCw, Lock, UserPlus, Pencil, Trash2, X,
  ChevronLeft, LayoutDashboard, CalendarDays, Clock, History,
  CreditCard, BarChart3, Settings, KeyRound,
} from 'lucide-react'
import type { Empresa, Permissao, Permissoes, Role, Usuario } from '@/types/database'
import {
  getEmpresa, saveValoresPadrao,
  getUsuarios, criarUsuarioAction, atualizarRoleAction, deletarUsuarioAction,
  salvarPermissoesAction, alterarSenhaAction,
} from './actions'

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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
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

// ── Aba: Usuários ─────────────────────────────────────────────────────────

const ROLE_CFG: Record<Role, { label: string; badge: string }> = {
  admin:    { label: 'Administrador', badge: 'bg-blue-50 text-blue-700' },
  diarista: { label: 'Diarista',      badge: 'bg-gray-100 text-gray-600' },
}

const DEFAULT_PERMISSOES: Permissoes = {
  dashboard: true, diaristas: false, agendamentos: true,
  pontos: true, historico: true, pagamentos: false,
  relatorios: false, empresa: false, configuracoes: false,
}

const MODULES: { key: Permissao; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'dashboard',    label: 'Dashboard',     desc: 'Visão geral e resumo',              icon: LayoutDashboard },
  { key: 'diaristas',   label: 'Diaristas',     desc: 'Cadastro e gestão de diaristas',    icon: Users },
  { key: 'agendamentos',label: 'Agendamentos',  desc: 'Criar e gerenciar agendamentos',    icon: CalendarDays },
  { key: 'pontos',      label: 'Marcar Ponto',  desc: 'Registrar entrada e saída',         icon: Clock },
  { key: 'historico',   label: 'Histórico',     desc: 'Ver histórico de trabalhos',        icon: History },
  { key: 'pagamentos',  label: 'Pagamentos',    desc: 'Gestão financeira e pagamentos',    icon: CreditCard },
  { key: 'relatorios',  label: 'Relatórios',    desc: 'Relatórios e exportações',          icon: BarChart3 },
  { key: 'empresa',     label: 'Empresa',       desc: 'Dados da empresa',                  icon: Building2 },
  { key: 'configuracoes',label: 'Configurações',desc: 'Preferências do sistema',           icon: Settings },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ── Permissões View ────────────────────────────────────────────────────────

function PermissoesView({
  usuario, planModulos, onBack, onSaved,
}: {
  usuario: Usuario
  planModulos: Permissoes
  onBack: () => void
  onSaved: (updated: Usuario) => void
}) {
  const perms = usuario.permissoes ?? DEFAULT_PERMISSOES
  const [permissoes, setPermissoes] = useState<Permissoes>(perms)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState<ToastState>(null)

  const toggle = (key: Permissao) =>
    setPermissoes(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await salvarPermissoesAction(usuario.id, permissoes)
    setSaving(false)
    if (error) { setToast({ message: error, type: 'error' }); return }
    setToast({ message: 'Permissões salvas com sucesso!', type: 'success' })
    onSaved({ ...usuario, permissoes })
    onBack()
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{usuario.email}</h2>
            <p className="text-xs text-muted-foreground">Permissões de acesso</p>
          </div>
        </div>

        {/* Admin notice */}
        {usuario.role === 'admin' ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-5 flex items-start gap-4">
            <KeyRound className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Acesso total</p>
              <p className="text-xs text-blue-700 mt-1">
                Administradores têm acesso a todas as páginas do sistema.
                Para configurar permissões individuais, altere o perfil para <strong>Diarista</strong>.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 py-4">
                <h3 className="text-sm font-semibold text-foreground">Módulos do sistema</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ative ou desative o acesso a cada página para este usuário.
                </p>
              </div>
              <div className="divide-y divide-border">
                {MODULES.map(({ key, label, desc, icon: Icon }) => {
                  const inPlan    = planModulos[key]
                  const isEnabled = inPlan && permissoes[key]
                  return (
                    <div key={key} className={`flex items-center justify-between px-6 py-4 transition-colors ${inPlan ? 'hover:bg-muted/10' : 'opacity-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Icon className={`h-4 w-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {inPlan ? desc : 'Não disponível neste plano'}
                          </p>
                        </div>
                      </div>
                      {inPlan ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          onClick={() => toggle(key)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">Bloqueado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar permissões
              </button>
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

type ModalUsuario = 'criar' | 'editar' | 'deletar' | null

function validateCriar(form: { email: string; senha: string; role: Role | '' }) {
  const errs: { email?: string; senha?: string; role?: string } = {}
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errs.email = 'Informe um e-mail válido.'
  if (!form.senha || form.senha.length < 6)
    errs.senha = 'A senha deve ter no mínimo 6 caracteres.'
  if (!form.role)
    errs.role = 'Selecione um perfil.'
  return errs
}

function AbaUsuarios({ currentUserId, planModulos }: { currentUserId: string; planModulos: Permissoes }) {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [modal, setModal]         = useState<ModalUsuario>(null)
  const [selected, setSelected]   = useState<Usuario | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [toast, setToast]         = useState<ToastState>(null)
  const [form, setForm]           = useState<{ email: string; senha: string; role: Role | '' }>({ email: '', senha: '', role: '' })
  const [editRole, setEditRole]   = useState<Role>('diarista')
  const [errs, setErrs]           = useState<ReturnType<typeof validateCriar>>({})
  const [touched, setTouched]     = useState(false)
  const [permView, setPermView]   = useState<Usuario | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { usuarios: data, error } = await getUsuarios()
    if (error) setToast({ message: 'Erro ao carregar usuários: ' + error, type: 'error' })
    else setUsuarios(data)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const openCriar = () => {
    setForm({ email: '', senha: '', role: '' })
    setErrs({})
    setTouched(false)
    setModal('criar')
  }

  const openEditar = (u: Usuario) => {
    setSelected(u)
    setEditRole(u.role)
    setModal('editar')
  }

  const openDeletar = (u: Usuario) => {
    setSelected(u)
    setModal('deletar')
  }

  const closeModal = () => { setModal(null); setSelected(null) }

  const handleCriar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched(true)
    const e2 = validateCriar(form)
    setErrs(e2)
    if (Object.keys(e2).length > 0) return
    setSaving(true)
    const { error } = await criarUsuarioAction(form.email, form.senha, form.role as Role)
    setSaving(false)
    if (error) { setToast({ message: error, type: 'error' }); return }
    setToast({ message: 'Usuário criado com sucesso!', type: 'success' })
    closeModal()
    reload()
  }

  const handleEditarRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const { error } = await atualizarRoleAction(selected.id, editRole)
    setSaving(false)
    if (error) { setToast({ message: error, type: 'error' }); return }
    setToast({ message: 'Perfil atualizado com sucesso!', type: 'success' })
    closeModal()
    reload()
  }

  const handleDeletar = async () => {
    if (!selected) return
    setDeleting(true)
    const { error } = await deletarUsuarioAction(selected.id)
    setDeleting(false)
    if (error) { setToast({ message: error, type: 'error' }); return }
    setToast({ message: 'Usuário excluído com sucesso!', type: 'success' })
    closeModal()
    reload()
  }

  const fc = (err?: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-11 ${err ? 'border-red-400 focus:ring-red-400/40' : 'border-input'}`

  if (permView) {
    return (
      <PermissoesView
        usuario={permView}
        planModulos={planModulos}
        onBack={() => setPermView(null)}
        onSaved={updated => {
          setUsuarios(us => us.map(u => u.id === updated.id ? updated : u))
          setPermView(null)
        }}
      />
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Usuários da empresa</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie quem tem acesso ao sistema.</p>
          </div>
          <button
            onClick={openCriar}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo usuário</span>
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Perfil</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Criado em</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => {
                    const isMe = u.id === currentUserId
                    const cfg = ROLE_CFG[u.role]
                    return (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="px-6 py-3 text-foreground">
                          {u.email}
                          {isMe && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Você
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{formatDate(u.criado_em)}</td>
                        <td className="px-6 py-3 text-right">
                          {!isMe && (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => setPermView(u)}
                                className="rounded-md border border-border p-1.5 hover:bg-accent transition-colors"
                                title="Permissões"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => openEditar(u)}
                                className="rounded-md border border-border p-1.5 hover:bg-accent transition-colors"
                                title="Editar perfil"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => openDeletar(u)}
                                className="rounded-md border border-red-200 p-1.5 hover:bg-red-50 transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {usuarios.map(u => {
                const isMe = u.id === currentUserId
                const cfg = ROLE_CFG[u.role]
                return (
                  <div key={u.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground break-all">{u.email}</p>
                        {isMe && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1">
                            Você
                          </span>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Criado em {formatDate(u.criado_em)}</p>
                    {!isMe && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => setPermView(u)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          <KeyRound className="h-3 w-3" /> Permissões
                        </button>
                        <button
                          onClick={() => openEditar(u)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Editar perfil
                        </button>
                        <button
                          onClick={() => openDeletar(u)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Criar */}
      {modal === 'criar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Novo usuário</h3>
              <button onClick={closeModal} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCriar} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); if (touched) setErrs(validateCriar({ ...form, email: e.target.value })) }}
                  placeholder="email@exemplo.com"
                  className={fc(errs.email)}
                />
                {errs.email && <p className="mt-1 text-xs text-red-500">{errs.email}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Senha temporária <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={e => { setForm(f => ({ ...f, senha: e.target.value })); if (touched) setErrs(validateCriar({ ...form, senha: e.target.value })) }}
                  placeholder="Mínimo 6 caracteres"
                  className={fc(errs.senha)}
                />
                {errs.senha && <p className="mt-1 text-xs text-red-500">{errs.senha}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Perfil <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {(['admin', 'diarista'] as Role[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, role: r })); if (touched) setErrs(validateCriar({ ...form, role: r })) }}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        form.role === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{ROLE_CFG[r].label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r === 'admin' ? 'Acesso total ao sistema' : 'Acesso limitado'}
                      </p>
                    </button>
                  ))}
                </div>
                {errs.role && <p className="mt-1 text-xs text-red-500">{errs.role}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar perfil */}
      {modal === 'editar' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Editar perfil</h3>
              <button onClick={closeModal} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleEditarRole} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</label>
                <p className="text-sm font-medium text-foreground">{selected.email}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Perfil</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['admin', 'diarista'] as Role[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        editRole === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{ROLE_CFG[r].label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r === 'admin' ? 'Acesso total' : 'Acesso limitado'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar exclusão */}
      {modal === 'deletar' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Excluir usuário</h3>
              <button onClick={closeModal} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <span className="font-semibold text-foreground">{selected.email}</span>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                  Cancelar
                </button>
                <button onClick={handleDeletar} disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

// ── Aba: Segurança ─────────────────────────────────────────────────────────

function AbaSeguranca() {
  const [nova,    setNova]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [erros,   setErros]   = useState<{ nova?: string; confirma?: string }>({})
  const [touched, setTouched] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState<ToastState>(null)

  const fc = (err?: string) =>
    `w-full rounded-md border px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-11 ${err ? 'border-red-400 focus:ring-red-400/40' : 'border-input'}`

  function validate(n: string, c: string) {
    const e: typeof erros = {}
    if (!n || n.length < 6) e.nova = 'A senha deve ter no mínimo 6 caracteres.'
    if (!c) e.confirma = 'Confirme a nova senha.'
    else if (n !== c) e.confirma = 'As senhas não coincidem.'
    return e
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched(true)
    const e2 = validate(nova, confirma)
    setErros(e2)
    if (Object.keys(e2).length > 0) return
    setSaving(true)
    const { error } = await alterarSenhaAction(nova)
    setSaving(false)
    if (error) { setToast({ message: 'Erro ao alterar senha: ' + error, type: 'error' }); return }
    setToast({ message: 'Senha alterada com sucesso!', type: 'success' })
    setNova(''); setConfirma(''); setTouched(false)
  }

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Alterar senha</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escolha uma nova senha para sua conta.
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nova senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={nova}
                  onChange={e => { setNova(e.target.value); if (touched) setErros(validate(e.target.value, confirma)) }}
                  placeholder="Mínimo 6 caracteres"
                  className={`${fc(erros.nova)} pl-9`}
                />
              </div>
              {erros.nova && <p className="mt-1 text-xs text-red-500">{erros.nova}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Confirmar nova senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={confirma}
                  onChange={e => { setConfirma(e.target.value); if (touched) setErros(validate(nova, e.target.value)) }}
                  placeholder="Repita a nova senha"
                  className={`${fc(erros.confirma)} pl-9`}
                />
              </div>
              {erros.confirma && <p className="mt-1 text-xs text-red-500">{erros.confirma}</p>}
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              Após salvar, você continuará logado com a nova senha.
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="h-11 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar nova senha
          </button>
        </div>
      </form>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'empresa',  label: 'Empresa',        icon: Building2   },
  { id: 'valores',  label: 'Valores Padrão', icon: DollarSign  },
  { id: 'usuarios', label: 'Usuários',       icon: Users       },
  { id: 'seguranca',label: 'Segurança',      icon: ShieldCheck },
] as const
type TabId = typeof TABS[number]['id']

// ── Componente principal ───────────────────────────────────────────────────

interface Props {
  initialEmpresa: Empresa | null
  currentUserId: string
  currentUserRole: Role
  planModulos: Permissoes
}

export function ConfiguracoesClient({ initialEmpresa, currentUserId, currentUserRole, planModulos }: Props) {
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

  const visibleTabs = TABS.filter(t => t.id !== 'usuarios' || currentUserRole === 'admin')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as preferências da sua empresa.</p>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
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
      {tab === 'usuarios'  && currentUserRole === 'admin' && <AbaUsuarios currentUserId={currentUserId} planModulos={planModulos} />}
      {tab === 'seguranca' && <AbaSeguranca />}
    </div>
  )
}

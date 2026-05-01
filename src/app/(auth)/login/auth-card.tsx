'use client'

import { useState, useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, signupAction, type AuthState } from './actions'
import { Eye, EyeOff, Check, Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Planos ──────────────────────────────────────────────────────────────────

const PLANOS = [
  {
    id: 'basic',
    nome: 'Básico',
    preco: 99,
    limite: 'até 10 diaristas',
    destaque: false,
    features: [
      'Agendamento de serviços',
      'Controle de Presença',
      'Cálculo de Pagamento',
    ],
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 299,
    limite: 'até 50 diaristas',
    destaque: true,
    features: [
      'Agendamento de serviços',
      'Controle de Presença',
      'Cálculo de Pagamento',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 999,
    limite: 'Ilimitado',
    destaque: false,
    features: [
      'Agendamento de serviços',
      'Controle de Presença',
      'Cálculo de Pagamento',
      'Relatórios avançados',
      'Suporte dedicado 24h',
      'API personalizada',
    ],
  },
]

const PLANO_LABELS: Record<string, string> = {
  basic: 'Básico', pro: 'Pro', enterprise: 'Enterprise',
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

function SkeletonForm() {
  return (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="mt-2 h-10 w-full" />
    </div>
  )
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-destructive/10 px-3 py-2.5">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 font-medium"
        >
          <RotateCcw className="h-3 w-3" />
          Tentar novamente
        </button>
      )}
    </div>
  )
}

function PasswordInput({
  id, name, placeholder,
}: { id: string; name: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder ?? '••••••••'}
        autoComplete={name === 'senha' ? 'new-password' : 'current-password'}
        required
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Aguarde...
        </>
      ) : children}
    </button>
  )
}

// ─── Aba Login ───────────────────────────────────────────────────────────────

function LoginTab({ onSwitch }: { onSwitch: () => void }) {
  const [state, action, isPending] = useActionState(loginAction, null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <SkeletonForm />

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-senha">Senha</Label>
        <PasswordInput id="login-senha" name="password" placeholder="••••••••" />
      </div>

      {state?.error && <ErrorBox message={state.error} />}

      <SubmitButton>Entrar</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-primary hover:underline"
        >
          Cadastre-se gratuitamente
        </button>
      </p>

      <p className="text-center text-xs text-muted-foreground/60 pt-1">
        Teste: <span className="font-medium">admin@silva.com</span> / <span className="font-medium">123456</span>
      </p>
    </form>
  )
}

// ─── Aba Cadastro ────────────────────────────────────────────────────────────

function CadastroTab({
  planoInicial,
}: { planoInicial: string }) {
  const [state, action] = useActionState(signupAction, null)
  const [plano, setPlano] = useState(planoInicial)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setPlano(planoInicial) }, [planoInicial])

  if (!mounted) return <SkeletonForm />

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cad-nome">Nome da empresa <span className="text-destructive">*</span></Label>
        <Input id="cad-nome" name="nome" placeholder="Construtora Silva" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cad-email">E-mail <span className="text-destructive">*</span></Label>
        <Input id="cad-email" name="email" type="email" placeholder="admin@empresa.com" autoComplete="email" required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cad-senha">Senha <span className="text-destructive">*</span></Label>
          <PasswordInput id="cad-senha" name="senha" placeholder="mín. 6 caracteres" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cad-confirmar">Confirmar senha <span className="text-destructive">*</span></Label>
          <PasswordInput id="cad-confirmar" name="confirmar" placeholder="repita a senha" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cad-plano">Plano</Label>
        <select
          id="cad-plano"
          name="plano"
          value={plano}
          onChange={e => setPlano(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="basic">Básico — R$ 99/mês · até 10 diaristas</option>
          <option value="pro">Pro — R$ 299/mês · até 50 diaristas</option>
          <option value="enterprise">Enterprise — R$ 999/mês · ilimitado</option>
        </select>
      </div>

      {state?.error && <ErrorBox message={state.error} />}

      <SubmitButton>Criar conta</SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        Ao criar conta você concorda com os{' '}
        <span className="text-primary cursor-pointer hover:underline">termos de uso</span>.
      </p>
    </form>
  )
}

// ─── Card de plano ───────────────────────────────────────────────────────────

function PlanCard({
  plano,
  onSelect,
}: {
  plano: typeof PLANOS[0]
  onSelect: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200',
        'hover:-translate-y-1 hover:shadow-lg',
        plano.destaque
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      )}
    >
      {plano.destaque && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow">
            Mais popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">{plano.nome}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{plano.limite}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-extrabold text-foreground">
          R$ {plano.preco.toLocaleString('pt-BR')}
        </span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {plano.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
              plano.destaque ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <Check className="h-2.5 w-2.5" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plano.id)}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
          plano.destaque
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-border bg-background text-foreground hover:bg-accent'
        )}
      >
        Escolher {plano.nome}
      </button>
    </div>
  )
}

// ─── Aba Planos ──────────────────────────────────────────────────────────────

function PlanosTab({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-muted-foreground text-sm">
          Escolha o plano ideal para o tamanho do seu negócio
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {PLANOS.map(p => (
          <PlanCard key={p.id} plano={p} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

// ─── AuthCard principal ───────────────────────────────────────────────────────

type Tab = 'login' | 'cadastro' | 'planos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'login',    label: 'Login' },
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'planos',   label: 'Planos' },
]

export function AuthCard({ defaultTab = 'login' }: { defaultTab?: Tab }) {
  const [tab, setTab]               = useState<Tab>(defaultTab)
  const [planoSelecionado, setPlano] = useState('basic')

  function handleSelectPlan(id: string) {
    setPlano(id)
    setTab('cadastro')
  }

  return (
    <div
      className={cn(
        'w-full transition-[max-width] duration-300',
        tab === 'planos' ? 'max-w-4xl' : 'max-w-sm'
      )}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <span className="text-xl font-extrabold text-primary-foreground">D</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Diarista</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sistema de gestão de diaristas</p>
      </div>

      {/* Tabs — empilhados no mobile, horizontal no desktop */}
      <div className="mb-6 flex flex-col gap-2 rounded-xl bg-muted p-1 sm:flex-row">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150',
              tab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Card de conteúdo */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        {tab === 'login' && (
          <LoginTab onSwitch={() => setTab('cadastro')} />
        )}
        {tab === 'cadastro' && (
          <CadastroTab planoInicial={planoSelecionado} />
        )}
        {tab === 'planos' && (
          <PlanosTab onSelect={handleSelectPlan} />
        )}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { PermissionGuard } from '@/components/permission-guard'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider } from '@/components/sidebar-provider'
import type { Empresa, Permissao, Permissoes, Role } from '@/types/database'

// Módulos padrão por plano — fallback quando plano_modulos não está configurado no banco
const DEFAULT_PLAN_MODULES: Record<string, Permissoes> = {
  basic: {
    dashboard: true,  diaristas: false, agendamentos: true,
    pontos: true,     historico: true,  pagamentos: false,
    relatorios: false, empresa: false,  configuracoes: false,
  },
  pro: {
    dashboard: true,  diaristas: true,  agendamentos: true,
    pontos: true,     historico: true,  pagamentos: true,
    relatorios: true, empresa: false,   configuracoes: false,
  },
  enterprise: {
    dashboard: true, diaristas: true, agendamentos: true,
    pontos: true,    historico: true, pagamentos: true,
    relatorios: true, empresa: true,  configuracoes: true,
  },
}

// Padrão restritivo para diaristas sem permissões configuradas
const DEFAULT_DIARISTA: Permissoes = {
  dashboard: true, diaristas: false, agendamentos: true,
  pontos: true, historico: true, pagamentos: false,
  relatorios: false, empresa: false, configuracoes: false,
}

function intersect(a: Permissoes, b: Permissoes): Permissoes {
  return Object.fromEntries(
    (Object.keys(a) as Permissao[]).map(k => [k, a[k] && b[k]])
  ) as Permissoes
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let empresa: Empresa | null = null
  let totalDiaristas = 0
  let userRole: Role = 'diarista'
  let permissoes: Permissoes = DEFAULT_PLAN_MODULES.basic

  if (user) {
    // Admin do SaaS não deve acessar o app das empresas
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (admin) redirect('/admin/dashboard')

    // Busca role e empresa sem permissoes (coluna pode não existir antes da migração)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('role, empresas(id, nome, plano, limite_diaristas, status, tipo_cobranca, data_aprovacao, data_ativacao, criado_em)')
      .eq('id', user.id)
      .single()

    empresa = (usuario?.empresas as unknown as Empresa) ?? null
    userRole = (usuario?.role as Role) ?? 'diarista'

    if (empresa?.status === 'pendente') redirect('/aguardando')

    // Busca módulos do plano (tabela pode não existir antes da migração)
    const { data: planoMod } = await supabase
      .from('plano_modulos')
      .select('modulos')
      .eq('plano', empresa?.plano ?? 'basic')
      .maybeSingle()

    const planModulos = (planoMod?.modulos as Permissoes)
      ?? DEFAULT_PLAN_MODULES[empresa?.plano ?? 'basic']
      ?? DEFAULT_PLAN_MODULES.basic

    if (userRole === 'admin') {
      permissoes = planModulos
    } else {
      // Diarista: busca permissões individuais (coluna pode não existir antes da migração)
      const { data: userPerms } = await supabase
        .from('usuarios')
        .select('permissoes')
        .eq('id', user.id)
        .maybeSingle()

      const userPermissoes = (userPerms?.permissoes as Permissoes) ?? DEFAULT_DIARISTA
      permissoes = intersect(planModulos, userPermissoes)
    }

    const { count } = await supabase
      .from('diaristas')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    totalDiaristas = count ?? 0
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar
            companyName={empresa?.nome}
            plan={empresa?.plano}
            userRole={userRole}
            permissoes={permissoes}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header
              empresa={empresa}
              totalDiaristas={totalDiaristas}
              userEmail={user?.email ?? null}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
              <PermissionGuard userRole={userRole} permissoes={permissoes} />
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}

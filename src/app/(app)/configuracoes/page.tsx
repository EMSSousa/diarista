import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from './configuracoes-client'
import type { Empresa, Permissoes, Role } from '@/types/database'

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

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioAtual } = await supabase
    .from('usuarios')
    .select('empresa_id, role')
    .eq('id', user.id)
    .single()

  let empresa: Empresa | null = null
  let planModulos: Permissoes = DEFAULT_PLAN_MODULES.basic

  if (usuarioAtual?.empresa_id) {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', usuarioAtual.empresa_id)
      .single()
    empresa = data as Empresa ?? null

    planModulos = DEFAULT_PLAN_MODULES[empresa?.plano ?? 'basic'] ?? DEFAULT_PLAN_MODULES.basic

    if (empresa?.plano) {
      const { data: pm } = await supabase
        .from('plano_modulos')
        .select('modulos')
        .eq('plano', empresa.plano)
        .maybeSingle()
      if (pm?.modulos) planModulos = pm.modulos as Permissoes
    }
  }

  return (
    <ConfiguracoesClient
      initialEmpresa={empresa}
      currentUserId={user.id}
      currentUserRole={(usuarioAtual?.role as Role) ?? 'diarista'}
      planModulos={planModulos}
    />
  )
}

'use server'

import { createClient } from '@/lib/supabase/server'
import type { Empresa, Plano, StatusEmpresa, TipoCobranca } from '@/types/database'

const LIMITES: Record<string, number> = { basic: 10, pro: 50, enterprise: 999999 }

export type EmpresaComAdmin = Empresa & { admin_email: string | null }

export async function getEmpresasAdmin(): Promise<{ empresas: EmpresaComAdmin[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('empresas')
    .select('*, usuarios(email, role)')
    .order('criado_em', { ascending: false })

  if (error) return { empresas: [], error: error.message }

  const empresas = (data ?? []).map((e: any) => {
    const { usuarios, ...rest } = e
    const admin_email = (usuarios as { email: string; role: string }[] ?? [])
      .find(u => u.role === 'admin')?.email ?? null
    return { ...rest, admin_email } as EmpresaComAdmin
  })

  return { empresas, error: null }
}

export async function aprovarEmpresaAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ status: 'ativa', data_aprovacao: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function ativarEmpresaAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ status: 'ativa', data_ativacao: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function desativarEmpresaAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ status: 'inativa' })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export type EmpresaAdminEditInput = {
  nome: string
  plano: Plano
  status: StatusEmpresa
  tipo_cobranca: TipoCobranca
}

export async function updateEmpresaAdminAction(
  id: string,
  input: EmpresaAdminEditInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({
      nome:             input.nome.trim(),
      plano:            input.plano,
      limite_diaristas: LIMITES[input.plano] ?? 10,
      status:           input.status,
      tipo_cobranca:    input.tipo_cobranca,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteEmpresaAdminAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('empresas').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

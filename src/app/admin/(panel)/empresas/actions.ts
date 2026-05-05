'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export type CriarEmpresaAdminInput = {
  nome: string
  email: string
  senha: string
  plano: Plano
  tipo_cobranca: TipoCobranca
}

export async function criarEmpresaAdminAction(
  input: CriarEmpresaAdminInput,
): Promise<{ empresa: EmpresaComAdmin | null; error: string | null }> {
  const adminClient = createAdminClient()

  // 1. Criar auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('exists'))
      return { empresa: null, error: 'Este e-mail já está cadastrado.' }
    return { empresa: null, error: authError.message }
  }

  if (!authData.user) return { empresa: null, error: 'Erro ao criar usuário.' }

  const now = new Date().toISOString()

  // 2. Criar empresa (já ativa — admin criando diretamente)
  const { data: empresa, error: empresaError } = await adminClient
    .from('empresas')
    .insert({
      nome:             input.nome.trim(),
      plano:            input.plano,
      limite_diaristas: LIMITES[input.plano],
      status:           'ativa',
      tipo_cobranca:    input.tipo_cobranca,
      data_aprovacao:   now,
      data_ativacao:    now,
    })
    .select()
    .single()

  if (empresaError || !empresa) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { empresa: null, error: empresaError?.message ?? 'Erro ao criar empresa.' }
  }

  // 3. Criar usuário admin da empresa
  const { error: usuarioError } = await adminClient
    .from('usuarios')
    .insert({ id: authData.user.id, empresa_id: empresa.id, email: input.email, role: 'admin' })

  if (usuarioError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    await adminClient.from('empresas').delete().eq('id', empresa.id)
    return { empresa: null, error: usuarioError.message }
  }

  return {
    empresa: { ...(empresa as any), admin_email: input.email } as EmpresaComAdmin,
    error: null,
  }
}

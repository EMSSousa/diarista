'use server'

import { createClient } from '@/lib/supabase/server'
import type { Empresa, Role } from '@/types/database'

export type EmpresaViewData = {
  empresa: Empresa
  role: Role
}

export async function getEmpresaViewData(): Promise<{ data: EmpresaViewData | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role, empresas(*)')
    .eq('id', user.id)
    .single()

  if (!usuario?.empresas) return { data: null, error: 'Empresa não encontrada.' }

  return {
    data: {
      empresa: (usuario.empresas as unknown) as Empresa,
      role: usuario.role as Role,
    },
    error: null,
  }
}

export type EmpresaEditInput = {
  nome: string
  email_contato: string
  telefone: string
  endereco: string
}

export async function updateEmpresaAction(input: EmpresaEditInput): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id, role')
    .eq('id', user.id)
    .single()

  if (!usuario) return { error: 'Usuário não encontrado.' }
  if (usuario.role !== 'admin') return { error: 'Sem permissão para editar.' }

  const { error } = await supabase
    .from('empresas')
    .update({
      nome: input.nome.trim(),
      email_contato: input.email_contato.trim(),
      telefone: input.telefone.trim(),
      endereco: input.endereco.trim(),
    })
    .eq('id', usuario.empresa_id)

  if (error) return { error: error.message }
  return { error: null }
}

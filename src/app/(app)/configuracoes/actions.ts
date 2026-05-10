'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Empresa, Permissoes, Role, Usuario } from '@/types/database'

export async function getEmpresa(): Promise<{ empresa: Empresa | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { empresa: null, error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.empresa_id) return { empresa: null, error: 'Empresa não encontrada.' }

  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', usuario.empresa_id)
    .single()
  if (error) return { empresa: null, error: error.message }
  return { empresa: data as Empresa, error: null }
}

export async function saveValoresPadrao(
  valor_dia_padrao: number,
  valor_hora_padrao: number,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.empresa_id) return { error: 'Empresa não encontrada.' }

  const { error } = await supabase
    .from('empresas')
    .update({ valor_dia_padrao, valor_hora_padrao })
    .eq('id', usuario.empresa_id)
  if (error) return { error: error.message }
  return { error: null }
}

// ── Usuários ───────────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<{ usuarios: Usuario[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { usuarios: [], error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, email, role, criado_em')
    .order('criado_em', { ascending: true })
  if (error) return { usuarios: [], error: error.message }
  return { usuarios: data as Usuario[], error: null }
}

export async function salvarPermissoesAction(
  usuarioId: string,
  permissoes: Permissoes,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  if (usuarioId === user.id) return { error: 'Você não pode editar suas próprias permissões.' }

  const { data: caller } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return { error: 'Apenas administradores podem editar permissões.' }

  const { error } = await supabase
    .from('usuarios')
    .update({ permissoes })
    .eq('id', usuarioId)
  if (error) return { error: error.message }
  return { error: null }
}

export async function criarUsuarioAction(
  email: string,
  senha: string,
  role: Role,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: caller } = await supabase
    .from('usuarios')
    .select('empresa_id, role')
    .eq('id', user.id)
    .single()
  if (!caller) return { error: 'Usuário não encontrado.' }
  if (caller.role !== 'admin') return { error: 'Apenas administradores podem criar usuários.' }

  const adminClient = createAdminClient()
  const emailNorm = email.trim().toLowerCase()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: emailNorm,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('exists'))
      return { error: 'Este e-mail já está cadastrado.' }
    return { error: authError.message }
  }
  if (!authData.user) return { error: 'Erro ao criar usuário.' }

  const { error: usuarioError } = await adminClient
    .from('usuarios')
    .insert({ id: authData.user.id, empresa_id: caller.empresa_id, email: emailNorm, role })

  if (usuarioError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: usuarioError.message }
  }

  return { error: null }
}

export async function atualizarRoleAction(
  usuarioId: string,
  role: Role,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  if (usuarioId === user.id) return { error: 'Você não pode alterar seu próprio perfil.' }

  const { data: caller } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return { error: 'Apenas administradores podem alterar perfis.' }

  const { error } = await supabase
    .from('usuarios')
    .update({ role })
    .eq('id', usuarioId)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deletarUsuarioAction(
  usuarioId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  if (usuarioId === user.id) return { error: 'Você não pode excluir sua própria conta.' }

  const { data: caller } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return { error: 'Apenas administradores podem excluir usuários.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(usuarioId)
  if (error) return { error: error.message }
  return { error: null }
}

// ── Segurança ──────────────────────────────────────────────────────────────

export async function alterarSenhaAction(
  novaSenha: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { error: error.message }
  return { error: null }
}

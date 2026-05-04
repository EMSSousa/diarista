'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type PerfilData = {
  email: string
  nomeEmpresa: string | null
  plano: string | null
  criadoEm: string | null
}

export async function getPerfilData(): Promise<{ perfil: PerfilData | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { perfil: null, error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('criado_em, empresas(nome, plano)')
    .eq('id', user.id)
    .single()

  const empresa = (usuario?.empresas as unknown) as { nome: string; plano: string } | null

  return {
    perfil: {
      email: user.email ?? '',
      nomeEmpresa: empresa?.nome ?? null,
      plano: empresa?.plano ?? null,
      criadoEm: usuario?.criado_em ?? user.created_at ?? null,
    },
    error: null,
  }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Não autenticado.' }

  // Re-autentica para verificar senha atual
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (authError) return { error: 'Senha atual incorreta.' }

  // Atualiza a senha
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return { error: updateError.message }

  // Encerra sessão para re-autenticação com nova senha
  await supabase.auth.signOut()
  redirect('/login')
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AuthState = { error: string } | null

const LIMITES: Record<string, number> = {
  basic: 10, pro: 50, enterprise: 999999,
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email    = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Preencha e-mail e senha.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'E-mail ou senha incorretos.' }

  redirect('/dashboard')
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nome      = (formData.get('nome') as string)?.trim()
  const email     = (formData.get('email') as string)?.trim()
  const senha     = formData.get('senha') as string
  const confirmar = formData.get('confirmar') as string
  const plano     = (formData.get('plano') as string) || 'basic'

  if (!nome || !email || !senha || !confirmar)
    return { error: 'Preencha todos os campos obrigatórios.' }

  if (senha.length < 6)
    return { error: 'A senha deve ter pelo menos 6 caracteres.' }

  if (senha !== confirmar)
    return { error: 'As senhas não coincidem.' }

  if (!['basic', 'pro', 'enterprise'].includes(plano))
    return { error: 'Plano inválido selecionado.' }

  const supabase = await createClient()

  // 1. Criar usuário no Supabase Auth
  const { data, error: authError } = await supabase.auth.signUp({ email, password: senha })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already been registered'))
      return { error: 'Este e-mail já está cadastrado.' }
    if (msg.includes('invalid email'))
      return { error: 'E-mail inválido.' }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  if (!data.user) return { error: 'Confirme seu e-mail para ativar a conta.' }

  // 2. Criar empresa
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert({ nome, plano, limite_diaristas: LIMITES[plano] })
    .select()
    .single()

  if (empresaError || !empresa)
    return { error: 'Erro ao criar empresa. Tente novamente.' }

  // 3. Criar registro de usuário
  const { error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ id: data.user.id, empresa_id: empresa.id, email, role: 'admin' })

  if (usuarioError)
    return { error: 'Erro ao finalizar cadastro. Tente novamente.' }

  redirect('/dashboard')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

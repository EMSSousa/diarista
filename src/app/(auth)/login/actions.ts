'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !user) return { error: 'E-mail ou senha incorretos.' }

  // Redireciona admins do SaaS para o painel administrativo
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (admin) redirect('/admin/dashboard')

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

  const adminClient = createAdminClient()

  // 1. Criar usuário via admin API — confirma imediatamente sem enviar e-mail
  //    (aprovação é feita pelo admin do SaaS, não por e-mail)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists'))
      return { error: 'Este e-mail já está cadastrado.' }
    if (msg.includes('invalid email'))
      return { error: 'E-mail inválido.' }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  if (!authData.user) return { error: 'Erro ao criar conta. Tente novamente.' }

  // 2. Criar empresa e usuário (admin client bypassa RLS)
  const { data: empresa, error: empresaError } = await adminClient
    .from('empresas')
    .insert({ nome, plano, limite_diaristas: LIMITES[plano] })
    .select()
    .single()

  if (empresaError || !empresa)
    return { error: 'Erro ao criar empresa. Tente novamente.' }

  const { error: usuarioError } = await adminClient
    .from('usuarios')
    .insert({ id: authData.user.id, empresa_id: empresa.id, email, role: 'admin' })

  if (usuarioError)
    return { error: 'Erro ao finalizar cadastro. Tente novamente.' }

  // 3. Fazer login para criar sessão (admin createUser não cria sessão)
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password: senha })

  redirect('/aguardando')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

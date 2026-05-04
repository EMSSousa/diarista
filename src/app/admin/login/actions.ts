'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function adminLoginAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  const password = formData.get('password') as string ?? ''

  if (!email || !password) {
    return { error: 'Preencha todos os campos' }
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !user) {
    return { error: 'Email ou senha inválidos' }
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id, role, ativo')
    .eq('id', user.id)
    .single()

  if (!admin) {
    await supabase.auth.signOut()
    return { error: 'Email ou senha inválidos' }
  }

  if (!admin.ativo) {
    await supabase.auth.signOut()
    return { error: 'Acesso negado' }
  }

  redirect('/admin/dashboard')
}

export async function adminLogoutAction(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

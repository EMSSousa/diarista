import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export default async function AdminLoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: admin } = await supabase
      .from('admins')
      .select('id, ativo')
      .eq('id', user.id)
      .single()
    if (admin?.ativo) redirect('/admin/dashboard')
  }

  return <LoginForm />
}

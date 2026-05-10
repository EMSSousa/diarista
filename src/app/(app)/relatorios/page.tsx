import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RelatoriosClient } from './relatorios-client'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <RelatoriosClient />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PagamentosClient } from './pagamentos-client'

export default async function PagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PagamentosClient />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PontosClient } from './pontos-client'

export default async function PontosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PontosClient />
}

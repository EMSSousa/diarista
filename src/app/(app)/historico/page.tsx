import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoricoClient } from './historico-client'

export default async function HistoricoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('diaristas')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  return <HistoricoClient diaristas={data ?? []} />
}

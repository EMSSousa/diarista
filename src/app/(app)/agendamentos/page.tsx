import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgendamentosClient } from './agendamentos-client'
import type { Diarista } from '@/types/database'

export default async function AgendamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('diaristas')
    .select('id, nome, especialidade, valor_dia, valor_hora')
    .eq('ativo', true)
    .order('nome')

  return (
    <AgendamentosClient
      diaristas={(data ?? []) as Array<Pick<Diarista, 'id' | 'nome' | 'especialidade' | 'valor_dia' | 'valor_hora'>>}
    />
  )
}

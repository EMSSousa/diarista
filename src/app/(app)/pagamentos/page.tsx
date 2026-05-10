import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PagamentosClient } from './pagamentos-client'

export default async function PagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresas(nome)')
    .eq('id', user.id)
    .single()

  const empresaNome = (usuario?.empresas as { nome?: string } | null)?.nome ?? 'Empresa'

  return <PagamentosClient empresaNome={empresaNome} />
}

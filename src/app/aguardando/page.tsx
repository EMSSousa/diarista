import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AguardandoClient } from './aguardando-client'

export default async function AguardandoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresas(nome, status)')
    .eq('id', user.id)
    .single()

  const empresa = (usuario?.empresas as unknown) as { nome: string; status: string } | null

  if (empresa?.status === 'ativa') redirect('/dashboard')

  return <AguardandoClient nomeEmpresa={empresa?.nome ?? 'sua empresa'} />
}

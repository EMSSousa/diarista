import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from './configuracoes-client'
import type { Empresa } from '@/types/database'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  let empresa: Empresa | null = null
  if (usuario?.empresa_id) {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', usuario.empresa_id)
      .single()
    empresa = data as Empresa ?? null
  }

  return <ConfiguracoesClient initialEmpresa={empresa} />
}

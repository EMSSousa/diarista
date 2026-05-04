import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DiaristasCRUD } from './diaristas-client'
import type { Diarista, Empresa } from '@/types/database'

export default async function DiaristaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: diaristas }, { data: usuario }] = await Promise.all([
    supabase.from('diaristas').select('*').order('nome'),
    supabase.from('usuarios').select('empresas(limite_diaristas, valor_dia_padrao, valor_hora_padrao)').eq('id', user.id).single(),
  ])

  const empresa         = (usuario?.empresas as unknown) as Pick<Empresa, 'limite_diaristas' | 'valor_dia_padrao' | 'valor_hora_padrao'> | null
  const limiteDiaristas = empresa?.limite_diaristas ?? 0
  const valorDiaPadrao  = Number(empresa?.valor_dia_padrao)  ?? 0
  const valorHoraPadrao = Number(empresa?.valor_hora_padrao) ?? 0

  return (
    <DiaristasCRUD
      initialDiaristas={(diaristas ?? []) as Diarista[]}
      limiteDiaristas={limiteDiaristas}
      valorDiaPadrao={valorDiaPadrao}
      valorHoraPadrao={valorHoraPadrao}
    />
  )
}

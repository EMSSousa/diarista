'use server'

import { createClient } from '@/lib/supabase/server'
import type { Empresa } from '@/types/database'

export async function getEmpresa(): Promise<{ empresa: Empresa | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { empresa: null, error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.empresa_id) return { empresa: null, error: 'Empresa não encontrada.' }

  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', usuario.empresa_id)
    .single()
  if (error) return { empresa: null, error: error.message }
  return { empresa: data as Empresa, error: null }
}

export async function saveValoresPadrao(
  valor_dia_padrao: number,
  valor_hora_padrao: number,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.empresa_id) return { error: 'Empresa não encontrada.' }

  const { error } = await supabase
    .from('empresas')
    .update({ valor_dia_padrao, valor_hora_padrao })
    .eq('id', usuario.empresa_id)
  if (error) return { error: error.message }
  return { error: null }
}

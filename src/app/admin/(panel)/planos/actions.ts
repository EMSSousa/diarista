'use server'

import { createClient } from '@/lib/supabase/server'
import type { PlanoInfo } from '@/types/database'

export type PlanoInput = {
  nome: string
  limite_diaristas: number
  preco_mensal: number
  ativo: boolean
}

export async function getPlanos(): Promise<{ planos: PlanoInfo[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('planos')
    .select('*')
    .order('preco_mensal', { ascending: true })

  if (error) return { planos: [], error: error.message }
  return { planos: (data ?? []) as PlanoInfo[], error: null }
}

export async function createPlanoAction(input: PlanoInput): Promise<{ plano: PlanoInfo | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('planos')
    .insert({
      nome:             input.nome.trim(),
      limite_diaristas: input.limite_diaristas,
      preco_mensal:     input.preco_mensal,
      ativo:            input.ativo,
    })
    .select()
    .single()

  if (error) return { plano: null, error: error.message }
  return { plano: data as PlanoInfo, error: null }
}

export async function updatePlanoAction(id: string, input: PlanoInput): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('planos')
    .update({
      nome:             input.nome.trim(),
      limite_diaristas: input.limite_diaristas,
      preco_mensal:     input.preco_mensal,
      ativo:            input.ativo,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function togglePlanoAtivoAction(id: string, ativo: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('planos')
    .update({ ativo })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function deletePlanoAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('planos')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

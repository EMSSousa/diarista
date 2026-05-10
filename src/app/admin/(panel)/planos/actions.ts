'use server'

import { createClient } from '@/lib/supabase/server'
import type { Permissoes, PlanoInfo, PlanoModulosMap, PlanoTier } from '@/types/database'

const DEFAULT_MODULOS_MAP: PlanoModulosMap = {
  basic: {
    dashboard: true, diaristas: false, agendamentos: true,
    pontos: true, historico: true, pagamentos: false,
    relatorios: false, empresa: false, configuracoes: false,
  },
  pro: {
    dashboard: true, diaristas: true, agendamentos: true,
    pontos: true, historico: true, pagamentos: true,
    relatorios: true, empresa: false, configuracoes: false,
  },
  enterprise: {
    dashboard: true, diaristas: true, agendamentos: true,
    pontos: true, historico: true, pagamentos: true,
    relatorios: true, empresa: true, configuracoes: true,
  },
}

export async function getPlanoModulos(): Promise<{ modulos: PlanoModulosMap; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plano_modulos')
    .select('plano, modulos')

  if (error) return { modulos: DEFAULT_MODULOS_MAP, error: error.message }

  const map: PlanoModulosMap = { ...DEFAULT_MODULOS_MAP }
  for (const row of data ?? []) {
    if (row.plano in map) map[row.plano as PlanoTier] = row.modulos as Permissoes
  }
  return { modulos: map, error: null }
}

export async function saveModulosAction(
  plano: PlanoTier,
  modulos: Permissoes,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('plano_modulos')
    .upsert({ plano, modulos }, { onConflict: 'plano' })
  if (error) return { error: error.message }
  return { error: null }
}

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

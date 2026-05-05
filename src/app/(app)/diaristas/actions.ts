'use server'

import { createClient } from '@/lib/supabase/server'
import type { Diarista } from '@/types/database'

export type DiaristaSalvarInput = {
  nome: string
  cpf: string
  especialidade: string | null
  valor_dia: number
  valor_hora: number | null
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo_conta: 'corrente' | 'poupanca' | null
  pix_tipo: 'cpf' | 'email' | 'telefone' | 'aleatoria' | null
  pix_chave: string | null
  ativo: boolean
}

export async function getDiaristas(): Promise<{ diaristas: Diarista[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('diaristas')
    .select('*')
    .order('nome')
  if (error) return { diaristas: [], error: error.message }
  return { diaristas: data as Diarista[], error: null }
}

export async function createDiaristaAction(
  input: DiaristaSalvarInput,
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

  const { error } = await supabase.from('diaristas').insert({
    empresa_id: usuario.empresa_id,
    nome: input.nome.trim(),
    cpf: input.cpf,
    especialidade: input.especialidade?.trim() || null,
    valor_dia: input.valor_dia,
    valor_hora: input.valor_hora ?? null,
    banco: input.banco || null,
    agencia: input.agencia?.trim() || null,
    conta: input.conta?.trim() || null,
    tipo_conta: input.tipo_conta || null,
    pix_tipo: input.pix_tipo || null,
    pix_chave: input.pix_chave?.trim() || null,
    ativo: input.ativo,
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateDiaristaAction(
  id: string,
  input: DiaristaSalvarInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('diaristas')
    .update({
      nome: input.nome.trim(),
      cpf: input.cpf,
      especialidade: input.especialidade?.trim() || null,
      valor_dia: input.valor_dia,
      valor_hora: input.valor_hora ?? null,
      banco: input.banco || null,
      agencia: input.agencia?.trim() || null,
      conta: input.conta?.trim() || null,
      tipo_conta: input.tipo_conta || null,
      pix_tipo: input.pix_tipo || null,
      pix_chave: input.pix_chave?.trim() || null,
      ativo: input.ativo,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteDiaristaAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('diaristas').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function toggleAtivoAction(
  id: string,
  ativo: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('diaristas').update({ ativo }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

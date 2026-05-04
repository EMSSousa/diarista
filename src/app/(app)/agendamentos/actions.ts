'use server'

import { createClient } from '@/lib/supabase/server'
import type { StatusAgendamento, TipoPagamento } from '@/types/database'

export type AgRow = {
  id: string
  empresa_id: string
  diarista_id: string
  data: string
  local: string
  tipo_pagamento: TipoPagamento
  valor: number
  status: StatusAgendamento
  criado_em: string
  diaristas: { nome: string; especialidade: string | null } | null
}

type ActionResult = { error: string } | null

export async function getAgendamentos(
  inicio: string,
  fim: string,
): Promise<{ data: AgRow[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, diaristas(nome, especialidade)')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false })

  if (error) return { error: error.message, data: null }
  return { data: data as AgRow[], error: null }
}

export async function createAgendamentoAction(input: {
  diarista_id: string
  data: string
  local: string
  tipo_pagamento: TipoPagamento
  valor: number
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.empresa_id) return { error: 'Empresa não encontrada.' }

  if (!input.diarista_id || !input.data || !input.local.trim())
    return { error: 'Preencha todos os campos obrigatórios.' }

  const { error } = await supabase
    .from('agendamentos')
    .insert({ ...input, empresa_id: usuario.empresa_id })

  if (error) return { error: error.message }
  return null
}

export async function updateAgendamentoAction(
  id: string,
  input: {
    data: string
    local: string
    tipo_pagamento: TipoPagamento
    valor: number
    status: StatusAgendamento
  },
): Promise<ActionResult> {
  const supabase = await createClient()

  if (!input.data || !input.local.trim())
    return { error: 'Preencha todos os campos obrigatórios.' }

  const { error } = await supabase
    .from('agendamentos')
    .update(input)
    .eq('id', id)

  if (error) return { error: error.message }
  return null
}

export async function cancelAgendamentoAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', id)
  if (error) return { error: error.message }
  return null
}

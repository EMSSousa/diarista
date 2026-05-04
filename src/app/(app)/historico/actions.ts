'use server'

import { createClient } from '@/lib/supabase/server'
import type { StatusAgendamento, TipoPagamento } from '@/types/database'

export type DiaristaOption = {
  id: string
  nome: string
}

export type HistoricoRow = {
  agendamento_id: string
  data: string
  local: string
  tipo_pagamento: TipoPagamento
  valor: number
  valor_hora: number | null
  status: StatusAgendamento
  ponto_id: string | null
  entrada: string | null
  saida: string | null
}

export async function getHistoricoPresenca(
  diarista_id: string,
  mes: string,
): Promise<{ rows: HistoricoRow[]; error: string | null }> {
  if (!diarista_id) return { rows: [], error: null }

  const supabase = await createClient()
  const [ano, m] = mes.split('-').map(Number)
  const inicio = `${mes}-01`
  const fim = new Date(ano, m, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      id, data, local, tipo_pagamento, valor, status,
      diaristas(valor_hora),
      pontos(id, entrada, saida)
    `)
    .eq('diarista_id', diarista_id)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false })

  if (error) return { rows: [], error: error.message }

  const rows: HistoricoRow[] = (data ?? []).map((ag: any) => {
    const arr: any[] = Array.isArray(ag.pontos) ? ag.pontos : ag.pontos ? [ag.pontos] : []
    const ponto = arr[0] ?? null
    return {
      agendamento_id: ag.id,
      data: ag.data,
      local: ag.local,
      tipo_pagamento: ag.tipo_pagamento,
      valor: Number(ag.valor),
      valor_hora: ag.diaristas?.valor_hora ?? null,
      status: ag.status,
      ponto_id: ponto?.id ?? null,
      entrada: ponto?.entrada ?? null,
      saida: ponto?.saida ?? null,
    }
  })

  return { rows, error: null }
}

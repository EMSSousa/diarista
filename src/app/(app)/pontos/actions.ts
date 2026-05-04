'use server'

import { createClient } from '@/lib/supabase/server'

export type DiaristaPonto = {
  agendamento_id: string
  diarista_id: string
  nome: string
  especialidade: string | null
  tipo_pagamento: 'diaria' | 'hora'
  valor: number
  valor_hora: number | null
  status: 'agendado' | 'trabalhando' | 'concluido' | 'cancelado'
  local: string
  ponto: { id: string; entrada: string; saida: string | null } | null
}

export type HistoricoItem = {
  id: string
  entrada: string
  saida: string
  nome: string
  data: string
}

type ActionResult = { error: string } | null

export async function getTodayData(): Promise<{
  diaristas: DiaristaPonto[]
  historico: HistoricoItem[]
  error: string | null
}> {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]

  const [agsRes, histRes] = await Promise.all([
    supabase
      .from('agendamentos')
      .select(`
        id, diarista_id, tipo_pagamento, valor, status, local,
        diaristas(nome, especialidade, valor_hora),
        pontos(id, entrada, saida)
      `)
      .eq('data', hoje)
      .neq('status', 'cancelado')
      .order('criado_em'),

    supabase
      .from('pontos')
      .select('id, entrada, saida, agendamentos(data, diaristas(nome))')
      .not('saida', 'is', null)
      .order('saida', { ascending: false })
      .limit(5),
  ])

  if (agsRes.error) return { diaristas: [], historico: [], error: agsRes.error.message }

  const diaristas: DiaristaPonto[] = (agsRes.data ?? []).map((ag: any) => {
    const pontos: any[] = Array.isArray(ag.pontos) ? ag.pontos : ag.pontos ? [ag.pontos] : []
    const activePonto = pontos.find(p => !p.saida) ?? pontos[pontos.length - 1] ?? null
    return {
      agendamento_id: ag.id,
      diarista_id: ag.diarista_id,
      nome: ag.diaristas?.nome ?? '—',
      especialidade: ag.diaristas?.especialidade ?? null,
      tipo_pagamento: ag.tipo_pagamento,
      valor: Number(ag.valor),
      valor_hora: ag.diaristas?.valor_hora ?? null,
      status: ag.status,
      local: ag.local,
      ponto: activePonto ?? null,
    }
  })

  const historico: HistoricoItem[] = (histRes.data ?? [])
    .filter((p: any) => p.saida)
    .map((p: any) => ({
      id: p.id,
      entrada: p.entrada,
      saida: p.saida as string,
      nome: (p.agendamentos as any)?.diaristas?.nome ?? '—',
      data: (p.agendamentos as any)?.data ?? '',
    }))

  return { diaristas, historico, error: null }
}

export async function marcarEntradaAction(
  agendamento_ids: string[],
): Promise<ActionResult> {
  if (!agendamento_ids.length) return null
  const supabase = await createClient()
  const agora = new Date().toISOString()

  const { error: pe } = await supabase.from('pontos').insert(
    agendamento_ids.map(id => ({ agendamento_id: id, entrada: agora })),
  )
  if (pe) return { error: pe.message }

  const { error: ae } = await supabase
    .from('agendamentos')
    .update({ status: 'trabalhando' })
    .in('id', agendamento_ids)
  if (ae) return { error: ae.message }

  return null
}

export async function marcarSaidaAction(
  agendamento_ids: string[],
): Promise<{ error?: string; totalHoras: number }> {
  if (!agendamento_ids.length) return { totalHoras: 0 }

  const supabase = await createClient()
  const agora = new Date()
  let totalHoras = 0

  for (const ag_id of agendamento_ids) {
    const { data: ponto } = await supabase
      .from('pontos')
      .select('id, entrada')
      .eq('agendamento_id', ag_id)
      .is('saida', null)
      .maybeSingle()

    if (!ponto) continue

    await supabase
      .from('pontos')
      .update({ saida: agora.toISOString() })
      .eq('id', ponto.id)

    const horas = (agora.getTime() - new Date(ponto.entrada).getTime()) / 3_600_000
    totalHoras += horas

    const { data: ag } = await supabase
      .from('agendamentos')
      .select('tipo_pagamento, diaristas(valor_hora)')
      .eq('id', ag_id)
      .single()

    const updates: Record<string, unknown> = { status: 'concluido' }
    if (ag?.tipo_pagamento === 'hora') {
      const vh = Number((ag.diaristas as any)?.valor_hora ?? 0)
      if (vh > 0) updates.valor = Math.round(horas * vh * 100) / 100
    }
    await supabase.from('agendamentos').update(updates).eq('id', ag_id)
  }

  return { totalHoras: Math.round(totalHoras * 10) / 10 }
}

'use server'

import { createClient } from '@/lib/supabase/server'

export type DiaristaPagamento = {
  diarista_id: string
  nome: string
  especialidade: string | null
  valor_dia: number
  valor_hora: number | null
  dias_diaria: number
  horas_hora: number
  qtd_empreitas: number
  total_diarias: number
  total_horas: number
  total_empreitas: number
  total_geral: number
}

export type PagamentoMes = {
  id: string | null
  mes: string
  total: number
  status: 'pendente' | 'pago'
}

export async function getRelatorioPagamento(mes: string): Promise<{
  diaristas: DiaristaPagamento[]
  pagamento: PagamentoMes
  error: string | null
}> {
  const supabase = await createClient()
  const [ano, m] = mes.split('-').map(Number)
  const inicio = `${mes}-01`
  const fim = new Date(ano, m, 0).toISOString().split('T')[0]
  const mesDate = `${mes}-01`

  const [agRes, pagRes] = await Promise.all([
    supabase
      .from('agendamentos')
      .select(`
        id, diarista_id, tipo_pagamento, valor,
        diaristas(nome, especialidade, valor_dia, valor_hora),
        pontos(entrada, saida)
      `)
      .eq('status', 'concluido')
      .gte('data', inicio)
      .lte('data', fim),
    supabase
      .from('pagamentos')
      .select('id, total, status')
      .eq('mes', mesDate)
      .order('criado_em', { ascending: false })
      .limit(1),
  ])

  if (agRes.error) {
    return {
      diaristas: [],
      pagamento: { id: null, mes, total: 0, status: 'pendente' },
      error: agRes.error.message,
    }
  }

  const map = new Map<string, DiaristaPagamento>()

  for (const ag of agRes.data ?? []) {
    const d = ag.diaristas as any
    if (!d) continue

    if (!map.has(ag.diarista_id)) {
      map.set(ag.diarista_id, {
        diarista_id: ag.diarista_id,
        nome: d.nome,
        especialidade: d.especialidade ?? null,
        valor_dia: Number(d.valor_dia),
        valor_hora: d.valor_hora != null ? Number(d.valor_hora) : null,
        dias_diaria: 0,
        horas_hora: 0,
        qtd_empreitas: 0,
        total_diarias: 0,
        total_horas: 0,
        total_empreitas: 0,
        total_geral: 0,
      })
    }

    const entry = map.get(ag.diarista_id)!

    if (ag.tipo_pagamento === 'diaria') {
      entry.dias_diaria += 1
      entry.total_diarias += Number(ag.valor)
    } else if (ag.tipo_pagamento === 'empreita') {
      entry.qtd_empreitas   += 1
      entry.total_empreitas += Number(ag.valor)
    } else {
      const pontos: any[] = Array.isArray(ag.pontos) ? ag.pontos : ag.pontos ? [ag.pontos] : []
      for (const p of pontos) {
        if (p.entrada && p.saida) {
          entry.horas_hora += (new Date(p.saida).getTime() - new Date(p.entrada).getTime()) / 3_600_000
        }
      }
      entry.total_horas += Number(ag.valor)
    }
  }

  for (const e of map.values()) {
    e.horas_hora = Math.round(e.horas_hora * 100) / 100
    e.total_geral = Math.round((e.total_diarias + e.total_horas + e.total_empreitas) * 100) / 100
  }

  const diaristas = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  const totalGeral = Math.round(diaristas.reduce((s, d) => s + d.total_geral, 0) * 100) / 100
  const pagData = pagRes.data?.[0] ?? null

  return {
    diaristas,
    pagamento: {
      id: pagData?.id ?? null,
      mes,
      total: totalGeral,
      status: (pagData?.status as 'pendente' | 'pago') ?? 'pendente',
    },
    error: null,
  }
}

export type MesPagamento = {
  mes: string
  total: number
  status: 'pago' | 'pendente'
  pagamento_id: string | null
  qtd_diaristas: number
}

export async function getHistoricoPagamentos(
  inicio: string,
  fim: string,
): Promise<{ meses: MesPagamento[]; error: string | null }> {
  const supabase = await createClient()

  const [agRes, pagRes] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('data, valor, diarista_id')
      .eq('status', 'concluido')
      .gte('data', inicio + '-01')
      .lte('data', fim + '-31'),
    supabase
      .from('pagamentos')
      .select('id, mes, total, status')
      .gte('mes', inicio + '-01')
      .lte('mes', fim + '-31')
      .order('mes', { ascending: false }),
  ])

  if (agRes.error) return { meses: [], error: agRes.error.message }

  // Aggregate agendamentos by month
  const byMes = new Map<string, { total: number; diaristas: Set<string> }>()
  for (const ag of agRes.data ?? []) {
    const m = ag.data.substring(0, 7) // YYYY-MM
    const cur = byMes.get(m) ?? { total: 0, diaristas: new Set() }
    cur.total += Number(ag.valor)
    cur.diaristas.add(ag.diarista_id)
    byMes.set(m, cur)
  }

  // Map pagamentos by mes key
  const pagMap = new Map<string, { id: string; status: 'pago' | 'pendente' }>()
  for (const p of pagRes.data ?? []) {
    const m = p.mes.substring(0, 7)
    pagMap.set(m, { id: p.id, status: p.status as 'pago' | 'pendente' })
  }

  const meses: MesPagamento[] = [...byMes.entries()]
    .map(([mes, { total, diaristas }]) => {
      const pag = pagMap.get(mes)
      return {
        mes,
        total: Math.round(total * 100) / 100,
        status: pag?.status ?? 'pendente',
        pagamento_id: pag?.id ?? null,
        qtd_diaristas: diaristas.size,
      }
    })
    .sort((a, b) => b.mes.localeCompare(a.mes))

  return { meses, error: null }
}

export async function marcarComoPagoAction(
  mes: string,
  total: number,
  pagamento_id: string | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const mesDate = `${mes}-01`

  if (pagamento_id) {
    const { error } = await supabase
      .from('pagamentos')
      .update({ status: 'pago', total })
      .eq('id', pagamento_id)
    if (error) return { error: error.message }
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single()
    if (!usuario?.empresa_id) return { error: 'Empresa não encontrada.' }
    const { error } = await supabase
      .from('pagamentos')
      .insert({ empresa_id: usuario.empresa_id, mes: mesDate, total, status: 'pago' })
    if (error) return { error: error.message }
  }

  return {}
}

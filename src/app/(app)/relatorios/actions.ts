'use server'

import { createClient } from '@/lib/supabase/server'

export type Periodo = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'custom'

export interface TopDiarista {
  id: string
  nome: string
  servicos: number
  receita: number
}

export interface MesTrend {
  mes: string
  agendamentos: number
  receita: number
}

export interface RelatorioData {
  total: number
  concluidos: number
  cancelados: number
  andamento: number
  receita: number
  taxaConclusao: number
  porTipo: { diaria: number; hora: number; empreita: number }
  topDiaristas: TopDiarista[]
  tendencia: MesTrend[]
  inicio: string
  fim: string
}

export async function getRelatoriosData(
  inicio: string,
  fim: string,
): Promise<{ data: RelatorioData | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado.' }

  if (!inicio || !fim || inicio > fim)
    return { data: null, error: 'Período inválido.' }

  // Trend window: always the 6 months ending at `fim`
  const fimDate = new Date(fim + 'T12:00:00')
  const trendInicio = new Date(fimDate.getFullYear(), fimDate.getMonth() - 5, 1)
    .toISOString().split('T')[0]

  const [{ data: ags, error }, { data: todosMeses }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('id, data, tipo_pagamento, valor, status, diaristas(id, nome)')
      .gte('data', inicio)
      .lte('data', fim),
    supabase
      .from('agendamentos')
      .select('data, valor, status')
      .gte('data', trendInicio)
      .lte('data', fim),
  ])

  if (error) return { data: null, error: error.message }

  const list = ags ?? []
  const total      = list.length
  const concluidos = list.filter(a => a.status === 'concluido').length
  const cancelados = list.filter(a => a.status === 'cancelado').length
  const andamento  = list.filter(a => a.status === 'trabalhando' || a.status === 'agendado').length
  const receita    = list.filter(a => a.status === 'concluido').reduce((s, a) => s + Number(a.valor), 0)
  const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 100) : 0

  const porTipo = {
    diaria:   list.filter(a => a.tipo_pagamento === 'diaria').length,
    hora:     list.filter(a => a.tipo_pagamento === 'hora').length,
    empreita: list.filter(a => a.tipo_pagamento === 'empreita').length,
  }

  const dMap = new Map<string, { nome: string; servicos: number; receita: number }>()
  for (const ag of list) {
    const raw = ag.diaristas
    const d = (Array.isArray(raw) ? raw[0] : raw) as { id: string; nome: string } | null
    if (!d) continue
    const cur = dMap.get(d.id) ?? { nome: d.nome, servicos: 0, receita: 0 }
    if (ag.status === 'concluido') {
      cur.servicos++
      cur.receita += Number(ag.valor)
    }
    dMap.set(d.id, cur)
  }
  const topDiaristas = [...dMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .filter(d => d.servicos > 0)
    .sort((a, b) => b.servicos - a.servicos || b.receita - a.receita)
    .slice(0, 5)

  // Monthly trend: 6 months ending at fim
  const mesesMap = new Map<string, { agendamentos: number; receita: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(fimDate.getFullYear(), fimDate.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mesesMap.set(key, { agendamentos: 0, receita: 0 })
  }
  for (const ag of todosMeses ?? []) {
    const key = ag.data.substring(0, 7)
    const cur = mesesMap.get(key)
    if (!cur) continue
    cur.agendamentos++
    if (ag.status === 'concluido') cur.receita += Number(ag.valor)
    mesesMap.set(key, cur)
  }
  const tendencia = [...mesesMap.entries()].map(([mes, v]) => ({ mes, ...v }))

  return {
    data: { total, concluidos, cancelados, andamento, receita, taxaConclusao, porTipo, topDiaristas, tendencia, inicio, fim },
    error: null,
  }
}

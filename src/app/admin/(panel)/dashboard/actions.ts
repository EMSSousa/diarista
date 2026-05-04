'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type DashboardStats = {
  totalEmpresas: number
  ativasEmpresas: number
  receitaMensal: number
  novosCadastros: number
}

export type LogComContexto = {
  id: string
  tipo: string
  descricao: string | null
  status: string
  criado_em: string
  empresa_nome: string | null
  usuario_email: string | null
}

export type FaturaComEmpresa = {
  id: string
  empresa_id: string
  empresa_nome: string
  mes: string
  valor: number
  status: 'pendente' | 'pago'
  tipo_cobranca: 'automatica' | 'manual'
  data_vencimento: string
  data_pagamento: string | null
  criado_em: string
}

export type ReceitaMes       = { mes: string; valor: number }
export type EmpresasPorPlano = { plano: string; count: number }

export type GerarFaturaInput = {
  empresa_id: string
  mes: string
  valor: number
  tipo_cobranca: 'automatica' | 'manual'
  data_vencimento: string
}

const LOGS_PER_PAGE = 20

// ── getDashboardStats ──────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [total, ativas, receita, novos] = await Promise.all([
    supabase.from('empresas').select('*', { count: 'exact', head: true }),
    supabase.from('empresas').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('faturas').select('valor').eq('status', 'pago').gte('mes', startOfMonth),
    supabase.from('empresas').select('*', { count: 'exact', head: true }).gte('criado_em', startOfMonth),
  ])

  return {
    totalEmpresas:   total.count    ?? 0,
    ativasEmpresas:  ativas.count   ?? 0,
    receitaMensal:   (receita.data ?? []).reduce((s, f) => s + Number(f.valor), 0),
    novosCadastros:  novos.count    ?? 0,
  }
}

// ── getLogs ────────────────────────────────────────────────────────────────

export async function getLogs(
  page: number,
  filtroTipo: string,
  filtroEmpresaId: string,
): Promise<{ logs: LogComContexto[]; total: number; error: string | null }> {
  const supabase = await createClient()

  let q = supabase
    .from('logs')
    .select('id, tipo, descricao, status, criado_em, empresas(nome), usuarios(email)', { count: 'exact' })
    .order('criado_em', { ascending: false })

  if (filtroTipo       !== 'todos') q = q.eq('tipo',       filtroTipo)
  if (filtroEmpresaId  !== 'todos') q = q.eq('empresa_id', filtroEmpresaId)

  const from = (page - 1) * LOGS_PER_PAGE
  q = q.range(from, from + LOGS_PER_PAGE - 1)

  const { data, count, error } = await q
  if (error) return { logs: [], total: 0, error: error.message }

  const logs = (data ?? []).map((l: any) => ({
    id: l.id, tipo: l.tipo, descricao: l.descricao, status: l.status, criado_em: l.criado_em,
    empresa_nome:  l.empresas?.nome  ?? null,
    usuario_email: l.usuarios?.email ?? null,
  }))

  return { logs, total: count ?? 0, error: null }
}

// ── getFaturas ─────────────────────────────────────────────────────────────

export async function getFaturas(
  filtroStatus: string,
  filtroEmpresaId: string,
): Promise<{ faturas: FaturaComEmpresa[]; error: string | null }> {
  const supabase = await createClient()

  let q = supabase
    .from('faturas')
    .select('*, empresas(nome)')
    .order('criado_em', { ascending: false })

  if (filtroStatus    !== 'todos') q = q.eq('status',     filtroStatus)
  if (filtroEmpresaId !== 'todos') q = q.eq('empresa_id', filtroEmpresaId)

  const { data, error } = await q
  if (error) return { faturas: [], error: error.message }

  return {
    faturas: (data ?? []).map((f: any) => ({
      ...f, empresa_nome: f.empresas?.nome ?? 'Desconhecida', valor: Number(f.valor),
    })) as FaturaComEmpresa[],
    error: null,
  }
}

// ── marcarFaturaPagaAction ─────────────────────────────────────────────────

export async function marcarFaturaPagaAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('faturas')
    .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
    .eq('id', id)
  return { error: error?.message ?? null }
}

// ── gerarFaturaManualAction ────────────────────────────────────────────────

export async function gerarFaturaManualAction(
  input: GerarFaturaInput,
): Promise<{ fatura: FaturaComEmpresa | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('faturas')
    .insert({
      empresa_id: input.empresa_id, mes: input.mes, valor: input.valor,
      status: 'pendente', tipo_cobranca: input.tipo_cobranca, data_vencimento: input.data_vencimento,
    })
    .select('*, empresas(nome)')
    .single()

  if (error) return { fatura: null, error: error.message }

  return {
    fatura: {
      ...(data as any),
      empresa_nome: (data as any).empresas?.nome ?? 'Desconhecida',
      valor: Number((data as any).valor),
    } as FaturaComEmpresa,
    error: null,
  }
}

// ── getChartData ───────────────────────────────────────────────────────────

export async function getChartData(): Promise<{
  receitaPorMes: ReceitaMes[]
  empresasPorPlano: EmpresasPorPlano[]
  taxaAtivacao: number
  totalEmpresas: number
  ativasEmpresas: number
}> {
  const supabase = await createClient()
  const now = new Date()
  const inicio12m = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0]

  const [faturasRes, empresasRes] = await Promise.all([
    supabase.from('faturas').select('mes, valor').eq('status', 'pago').gte('mes', inicio12m),
    supabase.from('empresas').select('plano, status'),
  ])

  // Receita por mês
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const receitaMap: Record<string, number> = {}
  const mesLabels: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    receitaMap[key] = 0
    mesLabels.push(MESES[d.getMonth()])
  }
  ;(faturasRes.data ?? []).forEach((f: any) => {
    const k = f.mes.slice(0, 7)
    if (k in receitaMap) receitaMap[k] += Number(f.valor)
  })
  const receitaPorMes = Object.entries(receitaMap).map(([, valor], i) => ({ mes: mesLabels[i], valor }))

  // Empresas por plano
  const planos: Record<string, number> = { basic: 0, pro: 0, enterprise: 0 }
  ;(empresasRes.data ?? []).forEach((e: any) => { if (e.plano in planos) planos[e.plano]++ })
  const empresasPorPlano = Object.entries(planos).map(([plano, count]) => ({ plano, count }))

  // Taxa de ativação
  const total  = empresasRes.data?.length ?? 0
  const ativas = (empresasRes.data ?? []).filter((e: any) => e.status === 'ativa').length

  return {
    receitaPorMes,
    empresasPorPlano,
    taxaAtivacao:   total > 0 ? (ativas / total) * 100 : 0,
    totalEmpresas:  total,
    ativasEmpresas: ativas,
  }
}

// ── getEmpresasSimple ──────────────────────────────────────────────────────

export async function getEmpresasSimple(): Promise<{ id: string; nome: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('empresas').select('id, nome').order('nome')
  return (data ?? []) as { id: string; nome: string }[]
}

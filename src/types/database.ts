export type Plano = 'basic' | 'pro' | 'enterprise'
export type Role = 'admin' | 'diarista'
export type StatusAgendamento = 'agendado' | 'trabalhando' | 'concluido' | 'cancelado'
export type StatusPagamento = 'pendente' | 'pago'

export interface Empresa {
  id: string
  nome: string
  plano: Plano
  limite_diaristas: number
  ativo: boolean
  criado_em: string
}

export interface Usuario {
  id: string
  empresa_id: string
  email: string
  role: Role
  criado_em: string
  empresas?: Empresa
}

export interface Diarista {
  id: string
  empresa_id: string
  nome: string
  cpf: string
  especialidade: string | null
  valor_dia: number
  banco: string | null
  ativo: boolean
  criado_em: string
}

export interface Agendamento {
  id: string
  empresa_id: string
  diarista_id: string
  data: string
  local: string
  valor: number
  status: StatusAgendamento
  criado_em: string
  diaristas?: Pick<Diarista, 'nome' | 'especialidade'>
}

export interface Ponto {
  id: string
  agendamento_id: string
  entrada: string
  saida: string | null
  criado_em: string
}

export interface Pagamento {
  id: string
  empresa_id: string
  mes: string
  total: number
  status: StatusPagamento
  criado_em: string
}

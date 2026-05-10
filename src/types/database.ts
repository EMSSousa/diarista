export type Plano           = 'basic' | 'pro' | 'enterprise'
export type Role            = 'admin' | 'diarista'
export type Permissao       = 'dashboard' | 'diaristas' | 'agendamentos' | 'pontos' | 'historico' | 'pagamentos' | 'relatorios' | 'empresa' | 'configuracoes'
export type Permissoes      = Record<Permissao, boolean>
export type StatusAgendamento = 'agendado' | 'trabalhando' | 'concluido' | 'cancelado'
export type StatusPagamento = 'pendente' | 'pago'
export type StatusEmpresa   = 'pendente' | 'ativa' | 'inativa'
export type TipoCobranca    = 'automatica' | 'manual'
export type TipoPagamento   = 'diaria' | 'hora' | 'empreita'
export type TipoLog         = 'login' | 'criacao_diarista' | 'agendamento' | 'pagamento' | 'faturamento'

export interface PlanoInfo {
  id: string
  nome: string
  limite_diaristas: number
  preco_mensal: number
  ativo: boolean
  criado_em: string
}

export type PlanoTier = 'basic' | 'pro' | 'enterprise'
export type PlanoModulosMap = Record<PlanoTier, Permissoes>

export interface PlanoModulos {
  plano: PlanoTier
  modulos: Permissoes
  criado_em: string
}

export interface Empresa {
  id: string
  nome: string
  email_contato: string | null
  telefone: string | null
  endereco: string | null
  plano: Plano
  limite_diaristas: number
  status: StatusEmpresa
  tipo_cobranca: TipoCobranca
  data_aprovacao: string | null
  data_ativacao: string | null
  valor_dia_padrao: number
  valor_hora_padrao: number
  criado_em: string
}

export interface Usuario {
  id: string
  empresa_id: string
  email: string
  role: Role
  permissoes?: Permissoes
  criado_em: string
  empresas?: Empresa
}

export interface Admin {
  id: string
  email: string
  role: 'super_admin'
  ativo: boolean
  criado_em: string
}

export type TipoConta = 'corrente' | 'poupanca'
export type PixTipo   = 'cpf' | 'email' | 'telefone' | 'aleatoria'

export interface Diarista {
  id: string
  empresa_id: string
  nome: string
  cpf: string
  especialidade: string | null
  valor_dia: number
  valor_hora: number | null
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo_conta: TipoConta | null
  pix_tipo: PixTipo | null
  pix_chave: string | null
  ativo: boolean
  criado_em: string
}

export interface Agendamento {
  id: string
  empresa_id: string
  diarista_id: string
  data: string
  local: string
  tipo_pagamento: TipoPagamento
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

export interface Fatura {
  id: string
  empresa_id: string
  mes: string
  valor: number
  status: StatusPagamento
  tipo_cobranca: TipoCobranca
  data_vencimento: string
  data_pagamento: string | null
  criado_em: string
}

export interface Log {
  id: string
  empresa_id: string
  usuario_id: string | null
  tipo: TipoLog
  descricao: string | null
  status: 'sucesso' | 'erro'
  criado_em: string
}

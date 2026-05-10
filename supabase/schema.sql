-- ============================================================
-- SCHEMA — Sistema de Controle de Diaristas
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DROP em ordem inversa de dependência
DROP TABLE IF EXISTS logs, faturas, pagamentos, pontos,
  agendamentos, diaristas, admins, usuarios, empresas, planos CASCADE;
DROP FUNCTION IF EXISTS auth_empresa_id();
DROP FUNCTION IF EXISTS auth_is_admin();

-- ============================================================
-- 1. planos
-- ============================================================
CREATE TABLE planos (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT          NOT NULL,
  limite_diaristas INT           NOT NULL,
  preco_mensal     NUMERIC(10,2) NOT NULL,
  ativo            BOOLEAN       NOT NULL DEFAULT true,
  criado_em        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. empresas
-- ============================================================
CREATE TABLE empresas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT        NOT NULL,
  email_contato    TEXT,
  telefone         TEXT,
  endereco         TEXT,
  plano            TEXT        NOT NULL DEFAULT 'basic'
                               CHECK (plano IN ('basic', 'pro', 'enterprise')),
  limite_diaristas INT         NOT NULL DEFAULT 10,
  status           TEXT        NOT NULL DEFAULT 'pendente'
                               CHECK (status IN ('pendente', 'ativa', 'inativa')),
  tipo_cobranca     TEXT        NOT NULL DEFAULT 'manual'
                                CHECK (tipo_cobranca IN ('automatica', 'manual')),
  data_aprovacao    TIMESTAMPTZ,
  data_ativacao     TIMESTAMPTZ,
  valor_dia_padrao  NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_hora_padrao NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. usuarios
-- ============================================================
CREATE TABLE usuarios (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'admin'
                         CHECK (role IN ('admin', 'diarista')),
  permissoes JSONB       NOT NULL DEFAULT '{
    "dashboard": true, "diaristas": false, "agendamentos": true,
    "pontos": true, "historico": true, "pagamentos": false,
    "relatorios": false, "empresa": false, "configuracoes": false
  }'::jsonb,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. admins
-- ============================================================
CREATE TABLE admins (
  id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     TEXT        NOT NULL UNIQUE,
  role      TEXT        NOT NULL DEFAULT 'super_admin'
                        CHECK (role IN ('super_admin')),
  ativo     BOOLEAN     NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. diaristas
-- ============================================================
CREATE TABLE diaristas (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome          TEXT          NOT NULL,
  cpf           TEXT          NOT NULL,
  especialidade TEXT,
  valor_dia     NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_hora    NUMERIC(10,2),
  banco         TEXT,
  agencia       TEXT,
  conta         TEXT,
  tipo_conta    TEXT          CHECK (tipo_conta IN ('corrente', 'poupanca')),
  pix_tipo      TEXT          CHECK (pix_tipo IN ('cpf', 'email', 'telefone', 'aleatoria')),
  pix_chave     TEXT,
  ativo         BOOLEAN       NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. agendamentos
-- ============================================================
CREATE TABLE agendamentos (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  diarista_id    UUID          NOT NULL REFERENCES diaristas(id) ON DELETE CASCADE,
  data           DATE          NOT NULL,
  local          TEXT          NOT NULL,
  tipo_pagamento TEXT          NOT NULL DEFAULT 'diaria'
                               CHECK (tipo_pagamento IN ('diaria', 'hora', 'empreita')),
  valor          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT          NOT NULL DEFAULT 'agendado'
                               CHECK (status IN ('agendado', 'trabalhando', 'concluido', 'cancelado')),
  criado_em      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. pontos
-- ============================================================
CREATE TABLE pontos (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID        NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  entrada        TIMESTAMPTZ NOT NULL,
  saida          TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. pagamentos
-- ============================================================
CREATE TABLE pagamentos (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes        DATE          NOT NULL,
  total      NUMERIC(10,2) NOT NULL,
  status     TEXT          NOT NULL DEFAULT 'pendente'
                           CHECK (status IN ('pendente', 'pago')),
  criado_em  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. faturas
-- ============================================================
CREATE TABLE faturas (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes             DATE          NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente', 'pago')),
  tipo_cobranca   TEXT          NOT NULL DEFAULT 'manual'
                                CHECK (tipo_cobranca IN ('automatica', 'manual')),
  data_vencimento DATE          NOT NULL,
  data_pagamento  DATE,
  criado_em       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. logs
-- ============================================================
CREATE TABLE logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo       TEXT        NOT NULL
                         CHECK (tipo IN ('login', 'criacao_diarista', 'agendamento', 'pagamento', 'faturamento')),
  descricao  TEXT,
  status     TEXT        NOT NULL DEFAULT 'sucesso'
                         CHECK (status IN ('sucesso', 'erro')),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION auth_empresa_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT empresa_id FROM usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND ativo = true)
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE planos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins       ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaristas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs         ENABLE ROW LEVEL SECURITY;

-- planos: qualquer usuário autenticado pode listar
CREATE POLICY "planos_select" ON planos
  FOR SELECT USING (true);
-- planos: apenas super admins podem escrever
CREATE POLICY "planos_admin_insert" ON planos
  FOR INSERT WITH CHECK (auth_is_admin());
CREATE POLICY "planos_admin_update" ON planos
  FOR UPDATE USING (auth_is_admin());
CREATE POLICY "planos_admin_delete" ON planos
  FOR DELETE USING (auth_is_admin());

-- empresas
CREATE POLICY "empresas_insert" ON empresas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "empresas_select" ON empresas
  FOR SELECT USING (id = auth_empresa_id());
CREATE POLICY "empresas_update" ON empresas
  FOR UPDATE USING (id = auth_empresa_id());
-- empresas: super admins do SaaS podem ver e gerenciar todas
CREATE POLICY "empresas_admin_select" ON empresas
  FOR SELECT USING (auth_is_admin());
CREATE POLICY "empresas_admin_update" ON empresas
  FOR UPDATE USING (auth_is_admin());
CREATE POLICY "empresas_admin_delete" ON empresas
  FOR DELETE USING (auth_is_admin());

-- usuarios
CREATE POLICY "usuarios_insert" ON usuarios
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT USING (empresa_id = auth_empresa_id());
CREATE POLICY "usuarios_update" ON usuarios
  FOR UPDATE USING (empresa_id = auth_empresa_id());
CREATE POLICY "usuarios_delete" ON usuarios
  FOR DELETE USING (empresa_id = auth_empresa_id());
-- usuarios: super admins podem ver todos (lookup de email)
CREATE POLICY "usuarios_admin_select" ON usuarios
  FOR SELECT USING (auth_is_admin());

-- admins
CREATE POLICY "admins_select" ON admins
  FOR SELECT USING (id = auth.uid());

-- diaristas
CREATE POLICY "diaristas_all" ON diaristas
  FOR ALL USING (empresa_id = auth_empresa_id());

-- agendamentos
CREATE POLICY "agendamentos_all" ON agendamentos
  FOR ALL USING (empresa_id = auth_empresa_id());

-- pontos (via agendamento)
CREATE POLICY "pontos_all" ON pontos
  FOR ALL USING (
    agendamento_id IN (
      SELECT id FROM agendamentos WHERE empresa_id = auth_empresa_id()
    )
  );

-- pagamentos
CREATE POLICY "pagamentos_all" ON pagamentos
  FOR ALL USING (empresa_id = auth_empresa_id());

-- faturas
CREATE POLICY "faturas_all" ON faturas
  FOR ALL USING (empresa_id = auth_empresa_id());

-- logs
CREATE POLICY "logs_all" ON logs
  FOR ALL USING (empresa_id = auth_empresa_id());
CREATE POLICY "logs_admin_select" ON logs
  FOR SELECT USING (auth_is_admin());

-- faturas: admin pode ver e gerenciar todas
CREATE POLICY "faturas_admin_select" ON faturas
  FOR SELECT USING (auth_is_admin());
CREATE POLICY "faturas_admin_insert" ON faturas
  FOR INSERT WITH CHECK (auth_is_admin());
CREATE POLICY "faturas_admin_update" ON faturas
  FOR UPDATE USING (auth_is_admin());

-- pagamentos: admin pode ver todos (para stats)
CREATE POLICY "pagamentos_admin_select" ON pagamentos
  FOR SELECT USING (auth_is_admin());

-- ============================================================
-- 11. plano_modulos
-- ============================================================
CREATE TABLE IF NOT EXISTS plano_modulos (
  plano     TEXT        PRIMARY KEY CHECK (plano IN ('basic', 'pro', 'enterprise')),
  modulos   JSONB       NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plano_modulos ENABLE ROW LEVEL SECURITY;

-- qualquer usuário autenticado pode ler (necessário para layout.tsx)
CREATE POLICY "plano_modulos_select" ON plano_modulos
  FOR SELECT USING (true);
-- apenas super admins do SaaS podem escrever
CREATE POLICY "plano_modulos_admin" ON plano_modulos
  FOR ALL USING (auth_is_admin());

-- dados iniciais dos módulos por plano
INSERT INTO plano_modulos (plano, modulos) VALUES
  ('basic', '{
    "dashboard":true,"diaristas":false,"agendamentos":true,
    "pontos":true,"historico":true,"pagamentos":false,
    "relatorios":false,"empresa":false,"configuracoes":false
  }'),
  ('pro', '{
    "dashboard":true,"diaristas":true,"agendamentos":true,
    "pontos":true,"historico":true,"pagamentos":true,
    "relatorios":true,"empresa":false,"configuracoes":false
  }'),
  ('enterprise', '{
    "dashboard":true,"diaristas":true,"agendamentos":true,
    "pontos":true,"historico":true,"pagamentos":true,
    "relatorios":true,"empresa":true,"configuracoes":true
  }')
ON CONFLICT (plano) DO NOTHING;

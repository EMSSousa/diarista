-- ============================================================
-- SCHEMA — Sistema de Controle de Diaristas
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS empresas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT        NOT NULL,
  plano             TEXT        NOT NULL DEFAULT 'basic'
                                CHECK (plano IN ('basic', 'pro', 'enterprise')),
  limite_diaristas  INT         NOT NULL DEFAULT 10,
  ativo             BOOLEAN     NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'admin'
                          CHECK (role IN ('admin', 'diarista')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diaristas (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome          TEXT          NOT NULL,
  cpf           TEXT          NOT NULL,
  especialidade TEXT,
  valor_dia     NUMERIC(10,2) NOT NULL,
  banco         TEXT,
  ativo         BOOLEAN       NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  diarista_id   UUID          NOT NULL REFERENCES diaristas(id) ON DELETE CASCADE,
  data          DATE          NOT NULL,
  local         TEXT          NOT NULL,
  valor         NUMERIC(10,2) NOT NULL,
  status        TEXT          NOT NULL DEFAULT 'agendado'
                              CHECK (status IN ('agendado','trabalhando','concluido','cancelado')),
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pontos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id  UUID        NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  entrada         TIMESTAMPTZ NOT NULL,
  saida           TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes         DATE          NOT NULL,
  total       NUMERIC(10,2) NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente', 'pago')),
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- FUNÇÃO AUXILIAR — retorna empresa_id do usuário logado
-- ============================================================

CREATE OR REPLACE FUNCTION auth_empresa_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT empresa_id FROM usuarios WHERE id = auth.uid()
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE empresas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaristas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos    ENABLE ROW LEVEL SECURITY;

-- empresas
CREATE POLICY "empresa_select" ON empresas
  FOR SELECT USING (id = auth_empresa_id());
CREATE POLICY "empresa_update" ON empresas
  FOR UPDATE USING (id = auth_empresa_id());

-- usuarios
CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT USING (empresa_id = auth_empresa_id());
CREATE POLICY "usuarios_insert" ON usuarios
  FOR INSERT WITH CHECK (empresa_id = auth_empresa_id());
CREATE POLICY "usuarios_update" ON usuarios
  FOR UPDATE USING (empresa_id = auth_empresa_id());
CREATE POLICY "usuarios_delete" ON usuarios
  FOR DELETE USING (empresa_id = auth_empresa_id());

-- diaristas
CREATE POLICY "diaristas_all" ON diaristas
  FOR ALL USING (empresa_id = auth_empresa_id());

-- agendamentos
CREATE POLICY "agendamentos_all" ON agendamentos
  FOR ALL USING (empresa_id = auth_empresa_id());

-- pontos (via agendamentos)
CREATE POLICY "pontos_all" ON pontos
  FOR ALL USING (
    agendamento_id IN (
      SELECT id FROM agendamentos WHERE empresa_id = auth_empresa_id()
    )
  );

-- pagamentos
CREATE POLICY "pagamentos_all" ON pagamentos
  FOR ALL USING (empresa_id = auth_empresa_id());

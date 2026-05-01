-- ============================================================
-- SEED — Dados iniciais para desenvolvimento/teste
-- Execute APÓS o schema.sql no SQL Editor do Supabase
-- ============================================================

DO $$
DECLARE
  v_empresa_id  UUID := gen_random_uuid();
  v_user_id     UUID := gen_random_uuid();
  v_joao_id     UUID := gen_random_uuid();
  v_maria_id    UUID := gen_random_uuid();
  v_carlos_id   UUID := gen_random_uuid();
  v_ag1_id      UUID := gen_random_uuid();
  v_ag2_id      UUID := gen_random_uuid();
  v_ag3_id      UUID := gen_random_uuid();
  v_ag4_id      UUID := gen_random_uuid();
  v_ag5_id      UUID := gen_random_uuid();
BEGIN

  -- --------------------------------------------------------
  -- Empresa
  -- --------------------------------------------------------
  INSERT INTO empresas (id, nome, plano, limite_diaristas, ativo)
  VALUES (v_empresa_id, 'Construtora Silva', 'pro', 50, true);

  -- --------------------------------------------------------
  -- Usuário de autenticação (auth.users)
  -- Senha: 123456
  -- --------------------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    'admin@silva.com',
    crypt('123456', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
  ) VALUES (
    v_user_id, v_user_id, 'admin@silva.com', 'email',
    json_build_object('sub', v_user_id::text, 'email', 'admin@silva.com'),
    now(), now(), now()
  );

  -- --------------------------------------------------------
  -- Usuário (tabela própria)
  -- --------------------------------------------------------
  INSERT INTO usuarios (id, empresa_id, email, role)
  VALUES (v_user_id, v_empresa_id, 'admin@silva.com', 'admin');

  -- --------------------------------------------------------
  -- Diaristas
  -- --------------------------------------------------------
  INSERT INTO diaristas (id, empresa_id, nome, cpf, especialidade, valor_dia, banco, ativo) VALUES
    (v_joao_id,  v_empresa_id, 'João Silva',      '123.456.789-00', 'Pedreiro', 150.00, 'Banco do Brasil',  true),
    (v_maria_id, v_empresa_id, 'Maria Santos',    '987.654.321-00', 'Limpeza',  100.00, 'Caixa Econômica',  true),
    (v_carlos_id,v_empresa_id, 'Carlos Oliveira', '456.789.123-00', 'Pintor',   120.00, 'Itaú',             true);

  -- --------------------------------------------------------
  -- Agendamentos (próximas 2 semanas + histórico)
  -- --------------------------------------------------------
  INSERT INTO agendamentos (id, empresa_id, diarista_id, data, local, valor, status) VALUES
    (v_ag1_id, v_empresa_id, v_joao_id,  CURRENT_DATE + 1,  'Rua das Flores, 123 — Obra A',    150.00, 'agendado'),
    (v_ag2_id, v_empresa_id, v_maria_id, CURRENT_DATE + 2,  'Av. Paulista, 456 — Apt 12',      100.00, 'agendado'),
    (v_ag3_id, v_empresa_id, v_carlos_id,CURRENT_DATE + 5,  'Rua XV, 789 — Casa Principal',    120.00, 'agendado'),
    (v_ag4_id, v_empresa_id, v_joao_id,  CURRENT_DATE - 1,  'Rua das Acácias, 321 — Obra B',   150.00, 'concluido'),
    (v_ag5_id, v_empresa_id, v_maria_id, CURRENT_DATE - 2,  'Condomínio Verde, bl 3 — Apto 5', 100.00, 'concluido');

  -- --------------------------------------------------------
  -- Pontos (registros de entrada/saída)
  -- --------------------------------------------------------
  INSERT INTO pontos (agendamento_id, entrada, saida) VALUES
    (v_ag4_id, (CURRENT_DATE - 1 + TIME '07:30')::TIMESTAMPTZ, (CURRENT_DATE - 1 + TIME '16:00')::TIMESTAMPTZ),
    (v_ag5_id, (CURRENT_DATE - 2 + TIME '08:00')::TIMESTAMPTZ, (CURRENT_DATE - 2 + TIME '14:30')::TIMESTAMPTZ);

  -- --------------------------------------------------------
  -- Pagamentos
  -- --------------------------------------------------------
  INSERT INTO pagamentos (empresa_id, mes, total, status) VALUES
    (v_empresa_id, DATE_TRUNC('month', CURRENT_DATE)::DATE,                           1250.00, 'pendente'),
    (v_empresa_id, DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,       980.00, 'pago'),
    (v_empresa_id, DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE,      870.00, 'pago');

END $$;

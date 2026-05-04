-- ============================================================
-- SEED — Dados iniciais para desenvolvimento/teste
-- Idempotente: pode ser executado múltiplas vezes com segurança
-- ============================================================

DO $$
DECLARE
  v_empresa_id  UUID := gen_random_uuid();
  v_user_id     UUID;
  v_admin_id    UUID;
  v_gerente_id  UUID;
  v_joao_id     UUID := gen_random_uuid();
  v_maria_id    UUID := gen_random_uuid();
  v_carlos_id   UUID := gen_random_uuid();
  v_ag1_id      UUID := gen_random_uuid();
  v_ag2_id      UUID := gen_random_uuid();
  v_ag3_id      UUID := gen_random_uuid();
  v_ag4_id      UUID := gen_random_uuid();
  v_ag5_id      UUID := gen_random_uuid();
  v_ag6_id      UUID := gen_random_uuid();
BEGIN

  -- --------------------------------------------------------
  -- Limpar dados de aplicação (preserva auth.users)
  -- --------------------------------------------------------
  DELETE FROM logs;
  DELETE FROM faturas;
  DELETE FROM pagamentos;
  DELETE FROM pontos;
  DELETE FROM agendamentos;
  DELETE FROM diaristas;
  DELETE FROM admins;
  DELETE FROM usuarios;
  DELETE FROM empresas;
  DELETE FROM planos;

  -- --------------------------------------------------------
  -- Planos
  -- --------------------------------------------------------
  INSERT INTO planos (nome, limite_diaristas, preco_mensal) VALUES
    ('Básico',      10,      99.00),
    ('Pro',         50,     299.00),
    ('Enterprise',  999999, 999.00);

  -- --------------------------------------------------------
  -- Empresa
  -- --------------------------------------------------------
  INSERT INTO empresas (id, nome, plano, limite_diaristas, status, tipo_cobranca, data_aprovacao, data_ativacao)
  VALUES (v_empresa_id, 'Construtora Silva', 'pro', 50, 'ativa', 'manual', now(), now());

  -- --------------------------------------------------------
  -- Auth user — admin da empresa (admin@silva.com / 123456)
  -- --------------------------------------------------------
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@silva.com';
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
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
  END IF;

  -- --------------------------------------------------------
  -- Auth user — super admin do SaaS (admin@saas.com / admin123)
  -- --------------------------------------------------------
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@saas.com';
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id, 'authenticated', 'authenticated',
      'admin@saas.com',
      crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      v_admin_id, v_admin_id, 'admin@saas.com', 'email',
      json_build_object('sub', v_admin_id::text, 'email', 'admin@saas.com'),
      now(), now(), now()
    );
  ELSE
    -- Garante senha atualizada
    UPDATE auth.users SET encrypted_password = crypt('admin123', gen_salt('bf')) WHERE id = v_admin_id;
  END IF;

  -- --------------------------------------------------------
  -- Auth user — segundo admin (gerente@saas.com / gerente123)
  -- --------------------------------------------------------
  SELECT id INTO v_gerente_id FROM auth.users WHERE email = 'gerente@saas.com';
  IF v_gerente_id IS NULL THEN
    v_gerente_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_gerente_id, 'authenticated', 'authenticated',
      'gerente@saas.com',
      crypt('gerente123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      v_gerente_id, v_gerente_id, 'gerente@saas.com', 'email',
      json_build_object('sub', v_gerente_id::text, 'email', 'gerente@saas.com'),
      now(), now(), now()
    );
  END IF;

  -- --------------------------------------------------------
  -- Usuarios e Admins
  -- --------------------------------------------------------
  INSERT INTO usuarios (id, empresa_id, email, role)
  VALUES (v_user_id, v_empresa_id, 'admin@silva.com', 'admin');

  INSERT INTO admins (id, email, role, ativo)
  VALUES (v_admin_id, 'admin@saas.com', 'super_admin', true);

  INSERT INTO admins (id, email, role, ativo)
  VALUES (v_gerente_id, 'gerente@saas.com', 'super_admin', true);

  -- --------------------------------------------------------
  -- Diaristas
  -- João  → só diária (valor_hora = NULL)
  -- Maria → misto: pode trabalhar por diária ou por hora
  -- Carlos→ só por hora (valor_dia = 0)
  -- --------------------------------------------------------
  INSERT INTO diaristas (id, empresa_id, nome, cpf, especialidade, valor_dia, valor_hora, banco, ativo) VALUES
    (v_joao_id,   v_empresa_id, 'João Silva',      '123.456.789-00', 'Pedreiro', 150.00,  NULL, 'Banco do Brasil', true),
    (v_maria_id,  v_empresa_id, 'Maria Santos',    '987.654.321-00', 'Limpeza',  100.00, 15.00, 'Caixa Econômica', true),
    (v_carlos_id, v_empresa_id, 'Carlos Oliveira', '456.789.123-00', 'Pintor',     0.00, 20.00, 'Itaú',            true);

  -- --------------------------------------------------------
  -- Agendamentos
  -- Futuros (agendado): ag1=João diária, ag2=Maria diária, ag3=Carlos hora
  -- Passados (concluido): ag4=João diária, ag5=Maria hora (6h×R$15=R$90), ag6=Carlos hora (8h×R$20=R$160)
  -- --------------------------------------------------------
  INSERT INTO agendamentos (id, empresa_id, diarista_id, data, local, tipo_pagamento, valor, status) VALUES
    (v_ag1_id, v_empresa_id, v_joao_id,   CURRENT_DATE + 1, 'Rua das Flores, 123 — Obra A',    'diaria', 150.00, 'agendado'),
    (v_ag2_id, v_empresa_id, v_maria_id,  CURRENT_DATE + 2, 'Av. Paulista, 456 — Apt 12',      'diaria', 100.00, 'agendado'),
    (v_ag3_id, v_empresa_id, v_carlos_id, CURRENT_DATE + 5, 'Rua XV, 789 — Casa Principal',    'hora',     0.00, 'agendado'),
    (v_ag4_id, v_empresa_id, v_joao_id,   CURRENT_DATE - 1, 'Rua das Acácias, 321 — Obra B',   'diaria', 150.00, 'concluido'),
    (v_ag5_id, v_empresa_id, v_maria_id,  CURRENT_DATE - 2, 'Condomínio Verde, bl 3 — Apto 5', 'hora',    90.00, 'concluido'),
    (v_ag6_id, v_empresa_id, v_carlos_id, CURRENT_DATE - 3, 'Av. Brasil, 500 — Loja 3',        'hora',   160.00, 'concluido');

  -- --------------------------------------------------------
  -- Pontos de presença
  -- ag4: João — controle de presença (diária, horas não afetam o valor)
  -- ag5: Maria — 6h trabalhadas (08:00–14:00) × R$15/h = R$90
  -- ag6: Carlos — 8h trabalhadas (07:00–15:00) × R$20/h = R$160
  -- --------------------------------------------------------
  INSERT INTO pontos (agendamento_id, entrada, saida) VALUES
    (v_ag4_id, (CURRENT_DATE - 1 + TIME '07:30')::TIMESTAMPTZ, (CURRENT_DATE - 1 + TIME '16:00')::TIMESTAMPTZ),
    (v_ag5_id, (CURRENT_DATE - 2 + TIME '08:00')::TIMESTAMPTZ, (CURRENT_DATE - 2 + TIME '14:00')::TIMESTAMPTZ),
    (v_ag6_id, (CURRENT_DATE - 3 + TIME '07:00')::TIMESTAMPTZ, (CURRENT_DATE - 3 + TIME '15:00')::TIMESTAMPTZ);

  -- --------------------------------------------------------
  -- Pagamentos do período (diárias + horas somadas = R$400)
  -- --------------------------------------------------------
  INSERT INTO pagamentos (empresa_id, mes, total, status) VALUES
    (v_empresa_id, DATE_TRUNC('month', CURRENT_DATE)::DATE,                          400.00, 'pendente'),
    (v_empresa_id, DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,    980.00, 'pago'),
    (v_empresa_id, DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE,   870.00, 'pago');

  -- --------------------------------------------------------
  -- Faturas do SaaS
  -- --------------------------------------------------------
  INSERT INTO faturas (empresa_id, mes, valor, status, tipo_cobranca, data_vencimento) VALUES
    (v_empresa_id,
     DATE_TRUNC('month', CURRENT_DATE)::DATE,
     299.00, 'pendente', 'manual',
     (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days')::DATE),
    (v_empresa_id,
     DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
     299.00, 'pago', 'manual',
     (DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '10 days')::DATE);

  -- --------------------------------------------------------
  -- Logs de atividade
  -- --------------------------------------------------------
  INSERT INTO logs (empresa_id, usuario_id, tipo, descricao, status) VALUES
    (v_empresa_id, v_user_id, 'login',            'Login realizado com sucesso',        'sucesso'),
    (v_empresa_id, v_user_id, 'criacao_diarista',  'Diarista João Silva cadastrado',     'sucesso'),
    (v_empresa_id, v_user_id, 'agendamento',       'Agendamento criado para João Silva', 'sucesso');

END $$;

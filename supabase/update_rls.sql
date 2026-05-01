-- ============================================================
-- UPDATE RLS — Políticas para permitir cadastro de novas empresas
-- Execute no SQL Editor do Supabase (após schema.sql)
-- ============================================================

-- Empresas: qualquer usuário autenticado pode criar sua empresa
CREATE POLICY "empresa_insert" ON empresas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Usuários: usuário pode inserir seu próprio registro (primeiro acesso)
DROP POLICY IF EXISTS "usuarios_insert" ON usuarios;
CREATE POLICY "usuarios_insert" ON usuarios
  FOR INSERT WITH CHECK (id = auth.uid());

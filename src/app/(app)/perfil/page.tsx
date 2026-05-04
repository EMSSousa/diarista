import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PerfilClient, PerfilSkeleton } from './perfil-client'
import { Suspense } from 'react'
import type { PerfilData } from './actions'

async function PerfilData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('criado_em, empresas(nome, plano)')
    .eq('id', user.id)
    .single()

  const empresa = (usuario?.empresas as unknown) as { nome: string; plano: string } | null

  const perfil: PerfilData = {
    email: user.email ?? '',
    nomeEmpresa: empresa?.nome ?? null,
    plano: empresa?.plano ?? null,
    criadoEm: usuario?.criado_em ?? user.created_at ?? null,
  }

  return <PerfilClient perfil={perfil} />
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <PerfilData />
    </Suspense>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { EmpresaClient, EmpresaSkeleton } from './empresa-client'
import type { Empresa, Role } from '@/types/database'

async function EmpresaData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role, empresas(*)')
    .eq('id', user.id)
    .single()

  if (!usuario?.empresas) redirect('/dashboard')

  return (
    <EmpresaClient
      empresa={(usuario.empresas as unknown) as Empresa}
      role={usuario.role as Role}
    />
  )
}

export default function EmpresaPage() {
  return (
    <Suspense fallback={<EmpresaSkeleton />}>
      <EmpresaData />
    </Suspense>
  )
}

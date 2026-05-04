import { Suspense } from 'react'
import { getEmpresasAdmin } from './actions'
import { EmpresasClient, EmpresasSkeleton } from './empresas-client'

async function EmpresasData() {
  const { empresas, error } = await getEmpresasAdmin()

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">Erro ao carregar empresas. Tente novamente.</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return <EmpresasClient initialEmpresas={empresas} />
}

export default function EmpresasPage() {
  return (
    <Suspense fallback={<EmpresasSkeleton />}>
      <EmpresasData />
    </Suspense>
  )
}

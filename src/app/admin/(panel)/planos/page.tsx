import { Suspense } from 'react'
import { getPlanos } from './actions'
import { PlanosClient, PlanosSkeleton } from './planos-client'

async function PlanosData() {
  const { planos, error } = await getPlanos()

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">Erro ao carregar planos. Tente novamente.</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return <PlanosClient initialPlanos={planos} />
}

export default function PlanosPage() {
  return (
    <Suspense fallback={<PlanosSkeleton />}>
      <PlanosData />
    </Suspense>
  )
}

import { Suspense } from 'react'
import { getPlanos, getPlanoModulos } from './actions'
import { PlanosClient, PlanosSkeleton } from './planos-client'

async function PlanosData() {
  const [{ planos, error }, { modulos }] = await Promise.all([
    getPlanos(),
    getPlanoModulos(),
  ])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">Erro ao carregar planos. Tente novamente.</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  return <PlanosClient initialPlanos={planos} initialModulos={modulos} />
}

export default function PlanosPage() {
  return (
    <Suspense fallback={<PlanosSkeleton />}>
      <PlanosData />
    </Suspense>
  )
}

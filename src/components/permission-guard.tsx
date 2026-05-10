'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Permissoes, Role } from '@/types/database'

const PATH_PERM: Record<string, keyof Permissoes> = {
  '/dashboard':    'dashboard',
  '/diaristas':    'diaristas',
  '/agendamentos': 'agendamentos',
  '/pontos':       'pontos',
  '/historico':    'historico',
  '/pagamentos':   'pagamentos',
  '/relatorios':   'relatorios',
  '/empresa':      'empresa',
  '/configuracoes':'configuracoes',
}

export function PermissionGuard({
  userRole,
  permissoes,
}: {
  userRole: Role
  permissoes: Permissoes
}) {
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    if (userRole === 'admin') return

    const key = Object.keys(PATH_PERM).find(p => pathname === p || pathname.startsWith(p + '/'))
    const perm = key ? PATH_PERM[key] : null
    if (perm && !permissoes[perm]) {
      router.replace('/dashboard')
    }
  }, [pathname, permissoes, userRole, router])

  return null
}

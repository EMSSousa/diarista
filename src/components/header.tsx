'use client'

import { logoutAction } from '@/app/(auth)/login/actions'
import { LogOut, Menu } from 'lucide-react'
import type { Empresa } from '@/types/database'
import { useSidebar } from './sidebar-provider'

const planoBadge: Record<string, { label: string; className: string }> = {
  basic:      { label: 'Basic',      className: 'bg-gray-100 text-gray-600' },
  pro:        { label: 'Pro',        className: 'bg-purple-100 text-purple-700' },
  enterprise: { label: 'Enterprise', className: 'bg-amber-100 text-amber-700' },
}

interface HeaderProps {
  empresa: Empresa | null
  totalDiaristas: number
  userEmail: string | null
}

export function Header({ empresa, totalDiaristas, userEmail }: HeaderProps) {
  const { toggle } = useSidebar()
  const badge    = empresa ? planoBadge[empresa.plano] : null
  const atLimite = empresa ? totalDiaristas >= empresa.limite_diaristas : false

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">

      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo text — mobile only */}
        <span className="text-sm font-bold text-foreground md:hidden">Diarista</span>

        {/* Company + plan — desktop only */}
        {empresa && (
          <div className="hidden md:flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">{empresa.nome}</span>
            {badge && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Limite diaristas — desktop only */}
        {empresa && (
          <span className={`hidden md:block text-xs font-medium ${atLimite ? 'text-destructive' : 'text-muted-foreground'}`}>
            {atLimite && '⚠ '}
            {totalDiaristas} / {empresa.limite_diaristas} diaristas
          </span>
        )}

        <div className="hidden md:block h-4 w-px bg-border" />

        {/* Avatar + email */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {userEmail?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="hidden text-xs text-muted-foreground lg:block">{userEmail}</span>
        </div>

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Sair</span>
          </button>
        </form>
      </div>
    </header>
  )
}

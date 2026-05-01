'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CalendarDays, CreditCard,
  Settings, BarChart3, ChevronRight, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from './sidebar-provider'

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Diaristas',    href: '/diaristas',    icon: Users },
  { label: 'Agendamentos', href: '/agendamentos', icon: CalendarDays },
  { label: 'Pagamentos',   href: '/pagamentos',   icon: CreditCard },
  { label: 'Relatórios',   href: '/relatorios',   icon: BarChart3 },
]

const bottomItems = [
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
]

const planLabel: Record<string, string> = {
  basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
}

function NavItem({
  href, icon: Icon, label, badge, active, onClick,
}: {
  href: string; icon: React.ElementType; label: string
  badge?: string | null; active: boolean; onClick?: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <Link
          href={href}
          onClick={onClick}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            active
              ? 'bg-accent text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-primary'
          )}
        >
          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs font-semibold">{badge}</Badge>
          )}
          {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/60" />}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="hidden">{label}</TooltipContent>
    </Tooltip>
  )
}

function SidebarContent({
  companyName, plan, onClose,
}: {
  companyName?: string | null; plan?: string | null; onClose?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-border">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <span className="text-xs font-bold text-primary-foreground">D</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="block truncate text-sm font-bold text-foreground tracking-tight">
            {companyName ?? 'Diarista'}
          </span>
          {plan && <span className="text-[10px] text-muted-foreground">{planLabel[plan] ?? plan}</span>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Menu</p>
        <ul className="space-y-0.5">
          {navItems.map(item => (
            <li key={item.href}>
              <NavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname === item.href || pathname.startsWith(item.href + '/')}
                onClick={onClose}
              />
            </li>
          ))}
        </ul>

        <Separator className="my-4" />

        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Sistema</p>
        <ul className="space-y-0.5">
          {bottomItems.map(item => (
            <li key={item.href}>
              <NavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname === item.href}
                onClick={onClose}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {companyName?.[0]?.toUpperCase() ?? 'D'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-semibold text-foreground">{companyName ?? 'Conta'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{planLabel[plan ?? ''] ?? 'Online'}</p>
          </div>
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  )
}

interface AppSidebarProps {
  companyName?: string | null
  plan?: string | null
}

export function AppSidebar({ companyName, plan }: AppSidebarProps) {
  const { isOpen, close } = useSidebar()

  return (
    <>
      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <aside className="w-64 bg-sidebar border-r border-border shadow-2xl overflow-hidden">
            <SidebarContent companyName={companyName} plan={plan} onClose={close} />
          </aside>
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={close} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <SidebarContent companyName={companyName} plan={plan} />
      </aside>
    </>
  )
}

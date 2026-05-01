import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider } from '@/components/sidebar-provider'
import type { Empresa } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let empresa: Empresa | null = null
  let totalDiaristas = 0

  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresas(id, nome, plano, limite_diaristas, ativo, criado_em)')
      .eq('id', user.id)
      .single()

    empresa = (usuario?.empresas as Empresa) ?? null

    const { count } = await supabase
      .from('diaristas')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    totalDiaristas = count ?? 0
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar companyName={empresa?.nome} plan={empresa?.plano} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header
              empresa={empresa}
              totalDiaristas={totalDiaristas}
              userEmail={user?.email ?? null}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}

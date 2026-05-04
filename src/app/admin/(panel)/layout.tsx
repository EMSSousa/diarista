import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { adminLogoutAction } from '@/app/admin/login/actions'
import { ShieldCheck, LogOut } from 'lucide-react'
import { AdminNav } from './admin-nav'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('email, role, ativo')
    .eq('id', user.id)
    .single()

  if (!admin || !admin.ativo) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-blue-700 bg-blue-600 px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-200" />
          <span className="text-sm font-bold text-white">Admin SaaS</span>
          <span className="hidden rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-100 sm:inline-block">
            Super Admin
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-blue-100 sm:block">{admin.email}</span>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </header>

      {/* Secondary nav */}
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}

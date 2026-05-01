import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import type { Pagamento } from '@/types/database'

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatMes(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default async function PagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('pagamentos').select('*').order('mes', { ascending: false })
  const lista = (data ?? []) as Pagamento[]

  const totalPendente = lista.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.total), 0)
  const qtdPendente   = lista.filter(p => p.status === 'pendente').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Pagamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalPendente > 0
            ? `${formatBRL(totalPendente)} pendente${qtdPendente !== 1 ? 's' : ''}`
            : 'Tudo em dia'}
        </p>
      </div>

      {!lista.length ? (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="rounded-full bg-accent p-4"><CreditCard className="h-8 w-8 text-primary" /></div>
          <div>
            <p className="font-semibold text-foreground">Nenhum pagamento registrado</p>
            <p className="text-sm text-muted-foreground mt-1">O histórico aparecerá aqui.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {lista.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground text-sm capitalize">{formatMes(p.mes)}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'
                  }`}>
                    {p.status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-foreground">{formatBRL(Number(p.total))}</p>
                {p.status === 'pendente' && (
                  <button className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Marcar como pago
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mês de referência</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground capitalize">{formatMes(p.mes)}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{formatBRL(Number(p.total))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'
                      }`}>
                        {p.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pendente' && (
                        <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                          Marcar como pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

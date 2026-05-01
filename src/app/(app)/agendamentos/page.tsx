import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import type { Agendamento } from '@/types/database'

const statusConfig = {
  agendado:    { label: 'Agendado',    className: 'bg-blue-50 text-blue-600' },
  trabalhando: { label: 'Trabalhando', className: 'bg-amber-50 text-amber-600' },
  concluido:   { label: 'Concluído',   className: 'bg-emerald-50 text-emerald-600' },
  cancelado:   { label: 'Cancelado',   className: 'bg-red-50 text-red-500' },
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type AgendamentoComDiarista = Agendamento & { diaristas: { nome: string } }

export default async function AgendamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('agendamentos')
    .select('*, diaristas(nome)')
    .order('data', { ascending: false })

  const lista = (data ?? []) as AgendamentoComDiarista[]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Agendamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lista.length} registro{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-start">
          + Novo Agendamento
        </button>
      </div>

      {!lista.length ? (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="rounded-full bg-accent p-4"><CalendarDays className="h-8 w-8 text-primary" /></div>
          <div>
            <p className="font-semibold text-foreground">Nenhum agendamento encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Crie um agendamento para começar.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {lista.map(ag => {
              const cfg = statusConfig[ag.status]
              return (
                <div key={ag.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground text-sm">{ag.diaristas?.nome ?? '—'}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(ag.data)}</p>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{ag.local}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatBRL(Number(ag.valor))}</p>
                </div>
              )
            })}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Diarista</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Local</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((ag, i) => {
                  const cfg = statusConfig[ag.status]
                  return (
                    <tr key={ag.id} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{ag.diaristas?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(ag.data)}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[220px]">{ag.local}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{formatBRL(Number(ag.valor))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

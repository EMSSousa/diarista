import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Agendamento } from '@/types/database'

const statusConfig = {
  agendado:    { label: 'Agendado',    className: 'bg-blue-50 text-blue-600' },
  trabalhando: { label: 'Trabalhando', className: 'bg-amber-50 text-amber-600' },
  concluido:   { label: 'Concluído',   className: 'bg-emerald-50 text-emerald-600' },
  cancelado:   { label: 'Cancelado',   className: 'bg-red-50 text-red-500' },
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

type AgendamentoComDiarista = Agendamento & { diaristas: { nome: string } }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoje     = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { count: totalDiaristas },
    { data: agendamentosMes },
    { data: proximosAgendamentos },
    { data: pagamentosPendentes },
  ] = await Promise.all([
    supabase.from('diaristas').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('agendamentos').select('valor, status').gte('data', inicioMes).lte('data', fimMes),
    supabase.from('agendamentos').select('*, diaristas(nome)')
      .gte('data', hoje.toISOString().split('T')[0])
      .order('data', { ascending: true }).limit(5),
    supabase.from('pagamentos').select('total').eq('status', 'pendente'),
  ])

  const receitaMes    = agendamentosMes?.filter(a => a.status === 'concluido').reduce((s, a) => s + Number(a.valor), 0) ?? 0
  const totalPendente = pagamentosPendentes?.reduce((s, p) => s + Number(p.total), 0) ?? 0
  const totalAgendamentos = agendamentosMes?.length ?? 0
  const concluidosMes     = agendamentosMes?.filter(a => a.status === 'concluido').length ?? 0

  const metrics = [
    { label: 'Diaristas ativas',     value: String(totalDiaristas ?? 0), sub: 'em atividade',             cor: 'text-emerald-600' },
    { label: 'Agendamentos do mês',  value: String(totalAgendamentos),   sub: `${concluidosMes} concluídos`, cor: 'text-blue-600' },
    { label: 'Receita do mês',       value: formatBRL(receitaMes),       sub: 'serviços concluídos',      cor: 'text-emerald-600' },
    { label: 'Pagamentos pendentes', value: formatBRL(totalPendente),    sub: 'a pagar',                  cor: 'text-orange-500' },
  ]

  const proxList = (proximosAgendamentos ?? []) as AgendamentoComDiarista[]

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, sub, cor }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
            <p className="text-xs text-muted-foreground md:text-sm">{label}</p>
            <p className="mt-2 text-lg font-bold text-foreground md:text-2xl">{value}</p>
            <p className={`mt-1 text-[11px] font-medium md:text-xs ${cor}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Próximos agendamentos */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground md:text-lg">Próximos Agendamentos</h2>

        {!proxList.length ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento futuro encontrado.
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {proxList.map(ag => {
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
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{ag.local}</p>
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
                  {proxList.map((ag, i) => {
                    const cfg = statusConfig[ag.status]
                    return (
                      <tr key={ag.id} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{ag.diaristas?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(ag.data)}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{ag.local}</td>
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
    </div>
  )
}

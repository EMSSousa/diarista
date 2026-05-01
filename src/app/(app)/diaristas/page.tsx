import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import type { Diarista, Empresa } from '@/types/database'

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default async function DiaristaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: diaristas }, { data: usuario }] = await Promise.all([
    supabase.from('diaristas').select('*').order('nome'),
    supabase.from('usuarios').select('empresas(limite_diaristas)').eq('id', user.id).single(),
  ])

  const empresa     = usuario?.empresas as Pick<Empresa, 'limite_diaristas'> | null
  const totalAtivos = diaristas?.filter(d => d.ativo).length ?? 0
  const atLimite    = empresa ? totalAtivos >= empresa.limite_diaristas : false
  const lista       = (diaristas ?? []) as Diarista[]

  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Diaristas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalAtivos} ativa{totalAtivos !== 1 ? 's' : ''}
            {empresa && ` · limite ${empresa.limite_diaristas}`}
          </p>
        </div>
        {atLimite ? (
          <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            ⚠ Limite de diaristas atingido
          </div>
        ) : (
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-start">
            + Adicionar Diarista
          </button>
        )}
      </div>

      {!lista.length ? (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
          <div className="rounded-full bg-accent p-4"><Users className="h-8 w-8 text-primary" /></div>
          <div>
            <p className="font-semibold text-foreground">Nenhuma diarista cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione diaristas para começar.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {lista.map(d => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{d.nome}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{d.cpf}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {d.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Especialidade</p>
                    <p className="text-sm font-medium text-foreground">{d.especialidade ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Valor/dia</p>
                    <p className="text-sm font-semibold text-foreground">{formatBRL(Number(d.valor_dia))}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Banco</p>
                    <p className="text-sm font-medium text-foreground">{d.banco ?? '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidade</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor/dia</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Banco</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d, i) => (
                  <tr key={d.id} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{d.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{d.cpf}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.especialidade ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatBRL(Number(d.valor_dia))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.banco ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        {d.ativo ? 'Ativa' : 'Inativa'}
                      </span>
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

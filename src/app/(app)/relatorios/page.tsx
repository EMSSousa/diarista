import { BarChart3 } from 'lucide-react'

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Análises e relatórios do seu negócio.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
        <div className="rounded-full bg-accent p-4">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Relatórios em breve</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os relatórios estarão disponíveis assim que houver dados suficientes.
          </p>
        </div>
      </div>
    </div>
  )
}

import { Settings } from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as preferências do sistema.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
        <div className="rounded-full bg-accent p-4">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Configurações em construção</p>
          <p className="text-sm text-muted-foreground mt-1">
            As opções de configuração estarão disponíveis em breve.
          </p>
        </div>
      </div>
    </div>
  )
}

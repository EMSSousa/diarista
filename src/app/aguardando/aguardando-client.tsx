'use client'

import { useRouter } from 'next/navigation'
import { Clock, RefreshCw, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/(auth)/login/actions'

export function AguardandoClient({ nomeEmpresa }: { nomeEmpresa: string }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100 p-6 dark:bg-yellow-900/30">
            <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro em análise</h1>
          <p className="mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">{nomeEmpresa}</span> está aguardando
            aprovação. Nossa equipe analisará seu cadastro em breve.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 text-left text-sm space-y-2">
          <p className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <span>✓</span> Conta criada com sucesso
          </p>
          <p className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <span>⏳</span> Aguardando aprovação do administrador
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Você receberá acesso ao sistema assim que sua conta for aprovada.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.refresh()}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Verificar status
          </button>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

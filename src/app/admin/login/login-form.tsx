'use client'

import { useActionState } from 'react'
import { adminLoginAction } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Loader2 } from 'lucide-react'

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="mt-1 text-sm text-gray-500">Acesso restrito a super admins</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form action={action} className="flex flex-col gap-4">
            {/* Error */}
            {state?.error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 border border-red-200">
                {state.error}
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@saas.com"
                required
                disabled={pending}
                className={state?.error ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={pending}
                className={state?.error ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={pending}
              className="mt-2 h-11 w-full rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Acesso apenas para administradores do sistema
        </p>
      </div>
    </div>
  )
}

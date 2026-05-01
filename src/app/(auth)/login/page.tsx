import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md">
          <span className="text-xl font-bold text-primary-foreground">D</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Diarista</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faça login para acessar o painel
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <LoginForm />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Conta de teste: <span className="font-medium">admin@silva.com</span> / <span className="font-medium">123456</span>
      </p>
    </div>
  )
}

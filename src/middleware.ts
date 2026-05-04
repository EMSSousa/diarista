import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── Admin routes ────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // /admin/login: acessível sem autenticação
    if (!pathname.startsWith('/admin/login') && !user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return supabaseResponse
  }

  // ── App routes ───────────────────────────────────────────────
  const isAuthPage = pathname.startsWith('/login')

  // Redireciona usuário logado que tenta acessar login
  // (admins são barrados no AppLayout — aqui apenas redireciona para /dashboard)
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redireciona usuário não logado que tenta acessar rotas protegidas
  const protectedPrefixes = ['/dashboard', '/diaristas', '/agendamentos', '/pagamentos', '/relatorios', '/configuracoes', '/pontos', '/historico', '/perfil', '/empresa', '/aguardando']
  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

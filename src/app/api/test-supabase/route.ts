import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({ status: 'erro', message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'conectado',
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      session: data.session ? 'sessão ativa' : 'sem sessão (normal)',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ status: 'erro', message }, { status: 500 })
  }
}

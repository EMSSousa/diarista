import type { Periodo } from './actions'

export function periodoRange(periodo: Exclude<Periodo, 'custom'>): { inicio: string; fim: string } {
  const hoje = new Date()
  const fim   = hoje.toISOString().split('T')[0]
  let inicio: Date

  switch (periodo) {
    case 'mes':       inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);      break
    case 'trimestre': inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1); break
    case 'semestre':  inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1); break
    case 'ano':       inicio = new Date(hoje.getFullYear(), 0, 1);                   break
  }

  return { inicio: inicio.toISOString().split('T')[0], fim }
}

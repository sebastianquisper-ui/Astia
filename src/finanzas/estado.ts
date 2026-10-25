import type { ExpresionAlpi } from '../mascotas/alpi/datos'
import { alertas, estadoPresupuesto } from './presupuesto'
import { totales } from './resumen'
import type { Config, Medio, Movimiento } from './tipos'

// ¿Cómo está tu plata? Alpi se pone contenta con el dinero en verde y mendiga cuando estás en rojo.
//   neutro: todavía no hay nada anotado.
//   verde:  saldo total positivo, ningún tope pasado y el mes no va en pérdida.
//   ambar:  cerca de un tope (70 %) o el mes va gastando más de lo que ingresa.
//   rojo:   saldo negativo o un tope pasado.

export type EstadoDinero = 'neutro' | 'verde' | 'ambar' | 'rojo'

export interface InfoDinero {
  estado: EstadoDinero
  /** Saldo de las dos billeteras juntas, en soles. */
  saldo: number
  balanceMes: number
  excedidas: string[]
  cerca: string[]
}

export function estadoDinero({ config, movsMes }: { config: Config; movsMes: Movimiento[] }): InfoDinero {
  const saldo = (config.saldosCent.digital + config.saldosCent.efectivo) / 100
  const balanceMes = totales(movsMes).balance
  const excedidas: string[] = []
  const cerca: string[] = []
  for (const medio of ['digital', 'efectivo'] as Medio[]) {
    for (const f of alertas(estadoPresupuesto(movsMes, config, medio))) (f.nivel === 'excedido' ? excedidas : cerca).push(f.categoria)
  }
  const sinNada = saldo === 0 && movsMes.length === 0
  let estado: EstadoDinero
  if (sinNada) estado = 'neutro'
  else if (saldo < 0 || excedidas.length) estado = 'rojo'
  else if (cerca.length || balanceMes < 0) estado = 'ambar'
  else estado = 'verde'
  return { estado, saldo, balanceMes, excedidas, cerca }
}

export function expresionFinanzas(estado: EstadoDinero): ExpresionAlpi {
  switch (estado) {
    case 'verde':
      return 'feliz'
    case 'ambar':
      return 'concentrada'
    case 'rojo':
      return 'triste'
    default:
      return 'curiosa'
  }
}

const rotar = (frases: string[], semilla: number) => frases[semilla % frases.length]

/** Lo que dice Alpi. Tono directo, sin sermones: la plata que no se anota, se pierde. */
export function fraseFinanzas(info: InfoDinero, semilla: number): string {
  switch (info.estado) {
    case 'neutro':
      return 'Aún no anotas nada. Registra tu primer gasto o ingreso: la plata que no se anota, se pierde.'
    case 'verde':
      return rotar(['Vas en verde. Así se ahorra: sin excusas.', 'Tu plata está ordenada. No la regales.', 'Mes en verde. Aparta algo para tu meta antes de que se te vaya.'], semilla)
    case 'ambar':
      return info.cerca.length
        ? `Ojo: ${info.cerca.join(', ')} ya casi llega al tope. Cada sol cuenta.`
        : rotar(['Este mes gastas más de lo que ingresa. Frena antes de ponerte en rojo.', 'Vas gastando más de lo que entra. Revisa tus gastos de hoy.'], semilla)
    case 'rojo':
      return info.excedidas.length
        ? `Te pasaste del tope en ${info.excedidas.join(', ')}. Ni un gasto más que no sea necesario.`
        : rotar(['Estás en rojo. Ni un gasto más que no sea necesario.', 'Alpi está mendigando por tu culpa. Ordena tus gastos hoy.'], semilla)
  }
}

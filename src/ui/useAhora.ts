import { useEffect, useState } from 'react'

/** La hora actual, refrescada cada `cadaMs` y al volver a la app (para cuentas regresivas). */
export function useAhora(cadaMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), cadaMs)
    const alVolver = () => !document.hidden && setAhora(new Date())
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cadaMs])
  return ahora
}

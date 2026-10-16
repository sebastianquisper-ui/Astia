// Un pitido corto al terminar cada fase. En iPhone el sonido solo se permite si la
// pantalla ya se tocó, por eso `prepararSonido` se llama al tocar "Empezar".

let contexto: AudioContext | null = null

export function prepararSonido(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    contexto = contexto ?? new Ctor()
    void contexto.resume()
  } catch {
    contexto = null
  }
}

export function pitar(veces = 2): void {
  try {
    const ctx = contexto
    if (!ctx) return
    for (let i = 0; i < veces; i++) {
      const osc = ctx.createOscillator()
      const ganancia = ctx.createGain()
      osc.frequency.value = 880
      ganancia.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.3)
      ganancia.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.3 + 0.02)
      ganancia.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.3 + 0.22)
      osc.connect(ganancia).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.3)
      osc.stop(ctx.currentTime + i * 0.3 + 0.25)
    }
  } catch {
    /* si el navegador no deja sonar, la pantalla igual avisa */
  }
}

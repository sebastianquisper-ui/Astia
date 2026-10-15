export function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="vacio">
      <b>{titulo}</b>
      {texto}
    </div>
  )
}

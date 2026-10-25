# Dictado en Finanstia

Dices o escribes una frase ("gasté 15 soles en almuerzo") y Astia la convierte en un movimiento. **Siempre te muestra lo que entendió** y
solo guarda cuando confirmas. Si no está segura de algo (la categoría, la meta), no adivina: te lo dice y te deja corregir.

## Cómo entiende hoy (reglas del idioma, gratis y sin internet)

`src/finanzas/dictado.ts`:

- **Monto:** cifras (`15`, `15,50`, `1,200`) y palabras (`quince`, `treinta y cinco`, `mil doscientos`, `veinte con cincuenta`).
  Si hay varios números, elige el que va junto a "soles" o "S/".
- **Tipo:** por el verbo. Ingreso: *me llegó, cobré, recibí, me pagaron, vendí, me regalaron…* Gasto: *gasté, pagué, compré, me cobraron…*
  Transferencia: *de digital a efectivo*, *saqué del cajero*, *deposité en el banco*. Aporte a meta: *aporté, ahorré, guardé… a mi laptop*.
- **Categoría:** por su nombre o por palabras parecidas (almuerzo → Almuerzos, taxi/combi → Pasajes, sueldo → Sueldo…). También reconoce las
  categorías que tú creaste. "categoría gimnasio" crea una nueva.
- **Billetera:** efectivo / yape / plin / tarjeta / banco; si no dices, usa la que estás viendo.
- **Fecha:** hoy, ayer, anteayer, hace 3 días, el lunes… Si no dices, hoy.

## Dos formas de dictar en el iPhone

1. Botón **Hablar**: usa el reconocimiento de voz del navegador, si el teléfono lo permite.
2. Si no aparece (dentro de una app instalada en la pantalla de inicio, iOS a veces no lo deja): el **micrófono del teclado del iPhone**
   escribe la frase en el campo y Astia la entiende igual.

## Pasar a un intérprete con inteligencia artificial (de pago)

El resto de la app solo conoce la función `interpretar` (`export const interpretar: Interprete = interpretarConReglas`). Para mejorarlo:

1. Escribir otra función con la misma firma `(texto, contexto) => Interpretacion | Promise<Interpretacion>` que consulte un modelo de lenguaje.
2. Ponerla en `interpretar`. La pantalla de confirmación, el "Corregir" y las pruebas siguen igual.
3. La clave del servicio **nunca** va en la app: se llamaría desde un servidor propio (por ejemplo, Cloud Functions de Firebase), y eso tiene costo.
   Se decide cuando Astia sea de pago.

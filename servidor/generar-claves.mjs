// Genera las claves VAPID: son el "carnet" con el que tu servidor firma los avisos.
// La PÚBLICA va en src/notificaciones/config.ts (no es secreta). La PRIVADA solo va al servidor y no se comparte con nadie.
import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const priv = privateKey.export({ format: 'jwk' })
const b64 = (s) => Buffer.from(s, 'base64url')
const punto = Buffer.concat([Buffer.from([4]), b64(pub.x), b64(pub.y)])

console.log('\nCLAVE PÚBLICA (va en el código de Astia):\n' + punto.toString('base64url'))
console.log('\nCLAVE PRIVADA (SECRETA, solo para el servidor):\n' + priv.d)
console.log('\nGuarda la privada en un lugar seguro. Si la pierdes, se generan claves nuevas y hay que volver a activar los avisos.\n')

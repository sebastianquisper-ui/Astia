var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/uint8array-extras/index.js
var objectToString = Object.prototype.toString;
var uint8ArrayStringified = "[object Uint8Array]";
var arrayBufferStringified = "[object ArrayBuffer]";
function isType(value, typeConstructor, typeStringified) {
  if (!value) {
    return false;
  }
  if (value.constructor === typeConstructor) {
    return true;
  }
  return objectToString.call(value) === typeStringified;
}
__name(isType, "isType");
function isUint8Array(value) {
  return isType(value, Uint8Array, uint8ArrayStringified);
}
__name(isUint8Array, "isUint8Array");
function isArrayBuffer(value) {
  return isType(value, ArrayBuffer, arrayBufferStringified);
}
__name(isArrayBuffer, "isArrayBuffer");
function isUint8ArrayOrArrayBuffer(value) {
  return isUint8Array(value) || isArrayBuffer(value);
}
__name(isUint8ArrayOrArrayBuffer, "isUint8ArrayOrArrayBuffer");
function toUint8ArrayIfArrayBuffer(value) {
  return isArrayBuffer(value) ? new Uint8Array(value) : value;
}
__name(toUint8ArrayIfArrayBuffer, "toUint8ArrayIfArrayBuffer");
function assertUint8ArrayOrArrayBuffer(value) {
  if (!isUint8ArrayOrArrayBuffer(value)) {
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof value}\``);
  }
}
__name(assertUint8ArrayOrArrayBuffer, "assertUint8ArrayOrArrayBuffer");
function toUint8Array(value) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`Unsupported value, got \`${typeof value}\`.`);
}
__name(toUint8Array, "toUint8Array");
function concatUint8Arrays(arrays, totalLength) {
  if (arrays.length === 0) {
    return new Uint8Array(0);
  }
  totalLength ??= arrays.reduce((accumulator, currentValue) => accumulator + currentValue.byteLength, 0);
  const returnValue = new Uint8Array(totalLength);
  let offset = 0;
  for (let array of arrays) {
    assertUint8ArrayOrArrayBuffer(array);
    array = toUint8ArrayIfArrayBuffer(array);
    returnValue.set(array, offset);
    offset += array.length;
  }
  return returnValue;
}
__name(concatUint8Arrays, "concatUint8Arrays");
var cachedDecoders = {
  utf8: new globalThis.TextDecoder("utf8")
};
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
  }
}
__name(assertString, "assertString");
var cachedEncoder = new globalThis.TextEncoder();
function stringToUint8Array(string) {
  assertString(string);
  return cachedEncoder.encode(string);
}
__name(stringToUint8Array, "stringToUint8Array");
function base64ToBase64Url(base64) {
  return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
__name(base64ToBase64Url, "base64ToBase64Url");
function base64UrlToBase64(base64url) {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padding = (4 - base64.length % 4) % 4;
  return base64 + "=".repeat(padding);
}
__name(base64UrlToBase64, "base64UrlToBase64");
var MAX_BLOCK_SIZE = 65535;
function uint8ArrayToBase64(array, { urlSafe = false } = {}) {
  assertUint8ArrayOrArrayBuffer(array);
  array = toUint8ArrayIfArrayBuffer(array);
  let base64 = "";
  for (let index = 0; index < array.length; index += MAX_BLOCK_SIZE) {
    const chunk = array.subarray(index, index + MAX_BLOCK_SIZE);
    base64 += globalThis.btoa(String.fromCodePoint.apply(void 0, chunk));
  }
  return urlSafe ? base64ToBase64Url(base64) : base64;
}
__name(uint8ArrayToBase64, "uint8ArrayToBase64");
function base64ToUint8Array(base64String) {
  assertString(base64String);
  return Uint8Array.from(globalThis.atob(base64UrlToBase64(base64String)), (x) => x.codePointAt(0));
}
__name(base64ToUint8Array, "base64ToUint8Array");
var byteToHexLookupTable = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));

// node_modules/@block65/webcrypto-web-push/dist/lib/utils.js
function encodeRecordSize(size) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, size);
  return bytes;
}
__name(encodeRecordSize, "encodeRecordSize");
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
__name(invariant, "invariant");

// node_modules/@block65/webcrypto-web-push/dist/lib/client-keys.js
async function deriveClientKeys(sub) {
  const bytes = base64ToUint8Array(sub.keys.p256dh);
  const authSecretBytes = base64ToUint8Array(sub.keys.auth);
  invariant(bytes.byteLength === 65 && bytes[0] === 4, "Subscription p256dh is not an uncompressed P-256 point");
  invariant(authSecretBytes.byteLength === 16, "Subscription auth secret is not 16 bytes");
  return {
    publicKeyBytes: bytes,
    publicKey: await crypto.subtle.importKey("raw", bytes, {
      name: "ECDH",
      namedCurve: "P-256"
    }, false, []),
    authSecretBytes
  };
}
__name(deriveClientKeys, "deriveClientKeys");

// node_modules/@block65/webcrypto-web-push/dist/lib/hkdf.js
function createHMAC(data) {
  const keyPromise = crypto.subtle.importKey("raw", data, {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  return {
    hash: /* @__PURE__ */ __name(async (input) => {
      const k = await keyPromise;
      return crypto.subtle.sign("HMAC", k, input);
    }, "hash")
  };
}
__name(createHMAC, "createHMAC");
async function hkdf(salt, ikm) {
  const prkhPromise = createHMAC(salt).hash(ikm).then((prk) => createHMAC(prk));
  return {
    extract: /* @__PURE__ */ __name(async (info, len) => {
      const prkh = await prkhPromise;
      const blocks = await Array.from({ length: Math.ceil(len / 32) }, (_, i) => i).reduce(async (acc, i) => {
        const previous = await acc;
        const hash = await prkh.hash(new Uint8Array([...previous.at(-1) ?? [], ...info, i + 1]));
        return [...previous, new Uint8Array(hash)];
      }, Promise.resolve([]));
      return concatUint8Arrays(blocks).slice(0, len);
    }, "extract")
  };
}
__name(hkdf, "hkdf");

// node_modules/@block65/webcrypto-web-push/dist/lib/info.js
function createKeyInfo(clientPublic, serverPublic) {
  return new Uint8Array([
    ...stringToUint8Array("WebPush: info\0"),
    ...clientPublic,
    ...serverPublic
  ]);
}
__name(createKeyInfo, "createKeyInfo");
function createInfo(type) {
  return stringToUint8Array(`Content-Encoding: ${type}\0`);
}
__name(createInfo, "createInfo");

// node_modules/@block65/webcrypto-web-push/dist/lib/local-keys.js
async function generateLocalKeys() {
  const keyPair = await crypto.subtle.generateKey({
    name: "ECDH",
    namedCurve: "P-256"
  }, false, ["deriveBits"]);
  return {
    privateKey: keyPair.privateKey,
    publicKeyBytes: new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))
  };
}
__name(generateLocalKeys, "generateLocalKeys");

// node_modules/@block65/webcrypto-web-push/dist/lib/salt.js
async function getSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}
__name(getSalt, "getSalt");

// node_modules/@block65/webcrypto-web-push/dist/lib/encrypt.js
var recordSize = 4096;
var headerSize = 21 + 65;
var maxPlaintextSize = recordSize - headerSize - 17;
async function encryptNotification(subscription, plaintext, options = {}) {
  invariant(plaintext.byteLength <= maxPlaintextSize, `Payload is ${plaintext.byteLength} bytes, the maximum is ${maxPlaintextSize}`);
  const clientKeys = await deriveClientKeys(subscription);
  const salt = await getSalt();
  const localKeys = await generateLocalKeys();
  const sharedSecret = await crypto.subtle.deriveBits({
    name: "ECDH",
    public: clientKeys.publicKey
  }, localKeys.privateKey, 256);
  const keyInfo = createKeyInfo(clientKeys.publicKeyBytes, localKeys.publicKeyBytes);
  const cekInfo = createInfo("aes128gcm");
  const nonceInfo = createInfo("nonce");
  const ikmHkdf = await hkdf(clientKeys.authSecretBytes, sharedSecret);
  const ikm = await ikmHkdf.extract(keyInfo, 32);
  const messageHkdf = await hkdf(salt, ikm);
  const cekBytes = await messageHkdf.extract(cekInfo, 16);
  const nonceBytes = await messageHkdf.extract(nonceInfo, 12);
  const cekCryptoKey = await crypto.subtle.importKey("raw", cekBytes, {
    name: "AES-GCM",
    length: 128
  }, false, ["encrypt"]);
  const padTo = options.pad ?? true ? maxPlaintextSize : plaintext.byteLength;
  const padded = new Uint8Array(padTo + 1);
  padded.set(plaintext);
  padded[plaintext.byteLength] = 2;
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: nonceBytes
  }, cekCryptoKey, padded);
  return new Uint8Array([
    ...salt,
    ...encodeRecordSize(recordSize),
    localKeys.publicKeyBytes.byteLength,
    ...localKeys.publicKeyBytes,
    ...new Uint8Array(encrypted)
  ]);
}
__name(encryptNotification, "encryptNotification");

// node_modules/@block65/webcrypto-web-push/dist/lib/base64.js
function encodeBase64Url(value) {
  return uint8ArrayToBase64(toUint8Array(value), { urlSafe: true });
}
__name(encodeBase64Url, "encodeBase64Url");
function objectToBase64Url(obj) {
  return encodeBase64Url(stringToUint8Array(JSON.stringify(obj)));
}
__name(objectToBase64Url, "objectToBase64Url");

// node_modules/@block65/webcrypto-web-push/dist/lib/jwt.js
async function sign(payload, key) {
  const headerStr = objectToBase64Url({
    typ: "JWT",
    alg: "ES256"
  });
  const payloadStr = objectToBase64Url({
    iat: Math.floor(Date.now() / 1e3),
    ...payload
  });
  const dataStr = `${headerStr}.${payloadStr}`;
  const signature = await crypto.subtle.sign({
    name: "ECDSA",
    hash: "SHA-256"
  }, key, stringToUint8Array(dataStr));
  return `${dataStr}.${encodeBase64Url(signature)}`;
}
__name(sign, "sign");

// node_modules/@block65/webcrypto-web-push/dist/lib/vapid.js
async function vapidHeaders(subscription, vapid) {
  invariant(vapid.subject, "Vapid subject is empty");
  invariant(vapid.privateKey, "Vapid private key is empty");
  invariant(vapid.publicKey, "Vapid public key is empty");
  const endpoint = new URL(subscription.endpoint);
  invariant(endpoint.protocol === "https:", `Subscription endpoint is not https: ${endpoint.protocol}`);
  const vapidPublicKeyBytes = base64ToUint8Array(vapid.publicKey);
  const publicKey = await crypto.subtle.importKey("jwk", {
    kty: "EC",
    crv: "P-256",
    x: encodeBase64Url(vapidPublicKeyBytes.slice(1, 33)),
    y: encodeBase64Url(vapidPublicKeyBytes.slice(33, 65)),
    d: vapid.privateKey
  }, {
    name: "ECDSA",
    namedCurve: "P-256"
  }, false, ["sign"]);
  const jwt = await sign({
    aud: endpoint.origin,
    exp: Math.floor(Date.now() / 1e3) + 12 * 60 * 60,
    sub: vapid.subject
  }, publicKey);
  return {
    headers: {
      authorization: `vapid t=${jwt}, k=${vapid.publicKey}`
    }
  };
}
__name(vapidHeaders, "vapidHeaders");

// node_modules/@block65/webcrypto-web-push/dist/lib/payload.js
async function buildPushPayload(message, subscription, vapid) {
  const { headers } = await vapidHeaders(subscription, vapid);
  const body = await encryptNotification(subscription, stringToUint8Array(
    // if its a primitive, convert to string, otherwise stringify
    typeof message.data === "string" || typeof message.data === "number" ? message.data.toString() : JSON.stringify(message.data)
  ));
  return {
    headers: {
      ...headers,
      ttl: (message.options?.ttl || 60).toString(),
      ...message.options?.urgency && {
        urgency: message.options.urgency
      },
      ...message.options?.topic && {
        topic: message.options.topic
      },
      "content-encoding": "aes128gcm",
      "content-length": body.byteLength.toString(),
      "content-type": "application/octet-stream"
    },
    method: "post",
    body
  };
}
__name(buildPushPayload, "buildPushPayload");

// src/logica.ts
var MAX_AVISOS = 200;
var MAX_ENVIADOS = 200;
var MAX_SUSCRIPCIONES = 50;
var texto = /* @__PURE__ */ __name((x, max) => typeof x === "string" ? x.trim().slice(0, max) : "", "texto");
function validarSuscripcion(x) {
  const s = x;
  if (!s || typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || s.endpoint.length > 1e3) return null;
  const { p256dh, auth } = s.keys ?? {};
  if (typeof p256dh !== "string" || typeof auth !== "string" || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint: s.endpoint, keys: { p256dh, auth } };
}
__name(validarSuscripcion, "validarSuscripcion");
function validarAvisos(x) {
  if (!Array.isArray(x)) return [];
  const lista = [];
  for (const a of x.slice(0, MAX_AVISOS)) {
    const id = texto(a?.id, 80);
    const titulo = texto(a?.titulo, 120);
    if (!id || !titulo || typeof a?.cuando !== "number" || !Number.isFinite(a.cuando)) continue;
    lista.push({ id, cuando: Math.round(a.cuando), titulo, cuerpo: texto(a?.cuerpo, 300) });
  }
  return lista;
}
__name(validarAvisos, "validarAvisos");
async function idDe(endpoint) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
__name(idDe, "idDe");
function aplicarAgenda(estado, id, sub, avisos) {
  const previo = estado[id];
  if (!previo && Object.keys(estado).length >= MAX_SUSCRIPCIONES) return estado;
  const enviados = previo?.enviados ?? [];
  return { ...estado, [id]: { sub, avisos: avisos.filter((a) => !enviados.includes(a.id)), enviados } };
}
__name(aplicarAgenda, "aplicarAgenda");
function quitarSuscripcion(estado, id) {
  const { [id]: _quitada, ...resto } = estado;
  return resto;
}
__name(quitarSuscripcion, "quitarSuscripcion");
function sacarVencidos(estado, ahora) {
  const vencidos = [];
  const nuevo = {};
  for (const [id, r] of Object.entries(estado)) {
    const listos = r.avisos.filter((a) => a.cuando <= ahora);
    for (const aviso of listos) vencidos.push({ id, sub: r.sub, aviso });
    nuevo[id] = listos.length ? { ...r, avisos: r.avisos.filter((a) => a.cuando > ahora), enviados: [...r.enviados, ...listos.map((a) => a.id)].slice(-MAX_ENVIADOS) } : r;
  }
  return { vencidos, estado: nuevo };
}
__name(sacarVencidos, "sacarVencidos");

// src/index.ts
var CLAVE_ESTADO = "estado";
var MAX_CUERPO = 2e4;
var leerEstado = /* @__PURE__ */ __name(async (env) => await env.AVISOS.get(CLAVE_ESTADO, "json") ?? {}, "leerEstado");
var guardarEstado = /* @__PURE__ */ __name((env, estado) => env.AVISOS.put(CLAVE_ESTADO, JSON.stringify(estado)), "guardarEstado");
function cabecerasCors(req, env) {
  const origen = req.headers.get("Origin") ?? "";
  const permitido = env.ORIGENES.split(",").map((o) => o.trim()).includes(origen);
  return permitido ? { "Access-Control-Allow-Origin": origen, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" } : {};
}
__name(cabecerasCors, "cabecerasCors");
var responder = /* @__PURE__ */ __name((req, env, cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json", ...cabecerasCors(req, env) } }), "responder");
async function enviar(env, sub, aviso) {
  const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const payload = await buildPushPayload({ data: JSON.stringify({ id: aviso.id, titulo: aviso.titulo, cuerpo: aviso.cuerpo }), options: { ttl: 3600, urgency: "high" } }, { ...sub, expirationTime: null }, vapid);
  const res = await fetch(sub.endpoint, payload);
  return res.status;
}
__name(enviar, "enviar");
var index_default = {
  async fetch(req, env) {
    const origen = req.headers.get("Origin") ?? "";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecerasCors(req, env) });
    if (!env.ORIGENES.split(",").map((o) => o.trim()).includes(origen)) return new Response("No autorizado", { status: 403 });
    if (req.method !== "POST") return responder(req, env, { error: "M\xE9todo no permitido" }, 405);
    if (Number(req.headers.get("Content-Length") ?? 0) > MAX_CUERPO) return responder(req, env, { error: "Demasiado grande" }, 413);
    let datos;
    try {
      datos = await req.json();
    } catch {
      return responder(req, env, { error: "JSON inv\xE1lido" }, 400);
    }
    const sub = validarSuscripcion(datos.sub);
    if (!sub) return responder(req, env, { error: "Suscripci\xF3n inv\xE1lida" }, 400);
    const id = await idDe(sub.endpoint);
    const ruta = new URL(req.url).pathname;
    if (ruta === "/suscribir") {
      const estado = await leerEstado(env);
      await guardarEstado(env, aplicarAgenda(estado, id, sub, validarAvisos(datos.avisos)));
      return responder(req, env, { ok: true });
    }
    if (ruta === "/prueba") {
      const codigo = await enviar(env, sub, { id: "prueba", titulo: "Astia", cuerpo: "Si ves esto con la app cerrada, los avisos funcionan." });
      return responder(req, env, { ok: codigo >= 200 && codigo < 300, codigo });
    }
    if (ruta === "/olvidar") {
      await guardarEstado(env, quitarSuscripcion(await leerEstado(env), id));
      return responder(req, env, { ok: true });
    }
    return responder(req, env, { error: "No existe" }, 404);
  },
  /** Cada minuto: envía lo que ya toca y olvida las suscripciones que el dispositivo ya no acepta. */
  async scheduled(_evento, env) {
    const estado = await leerEstado(env);
    const { vencidos, estado: nuevo } = sacarVencidos(estado, Date.now());
    if (!vencidos.length) return;
    let final = nuevo;
    for (const { id, sub, aviso } of vencidos) {
      try {
        const codigo = await enviar(env, sub, aviso);
        if (codigo === 404 || codigo === 410) final = quitarSuscripcion(final, id);
      } catch {
      }
    }
    await guardarEstado(env, final);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

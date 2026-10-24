import modelo from './modelo/alpi-3d.html?raw'
import three from './modelo/three-0.149.min.js?raw'

// Arma la página de Alpi para meterla en un iframe: la librería 3D va dentro (funciona sin internet)
// y, embebida, sin sus controles, con fondo transparente y avisando a la app cuando la tocan.

const CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>'

const EMBEBIDA = `<script>window.ALPI_EMBED=true</script>
<style>html,body{background:transparent!important}.loading{display:none!important}</style>`

// Un toque sin arrastrar avisa a la app (para que Astia cambie de frase); dos toques seguidos, también.
const AVISO_TOQUE = `<script>(function(){var c=document.getElementById('stage');if(!c)return;var x=0,y=0,m=0;
c.addEventListener('pointerdown',function(e){x=e.clientX;y=e.clientY;m=0});
c.addEventListener('pointermove',function(e){m=Math.max(m,Math.abs(e.clientX-x)+Math.abs(e.clientY-y))});
var u=-1e9;c.addEventListener('pointerup',function(e){if(m>=8)return;if(e.timeStamp-u<400){u=-1e9;parent.postMessage({type:'alpi-doble'},'*')}else{u=e.timeStamp;parent.postMessage({type:'alpi-toque'},'*')}});})()</script>`

export function documentoAlpi(embebida: boolean): string {
  const libreria = '<script>' + three.replace(/<\/script/gi, '<\\/script') + '</script>'
  let html = modelo.replace(CDN, (embebida ? EMBEBIDA : '') + libreria)
  if (embebida) html = html.replace('</body>', AVISO_TOQUE + '</body>')
  return html
}

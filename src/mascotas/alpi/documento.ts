import modelo from './modelo/alpi-3d.html?raw'
import three from './modelo/three-0.149.min.js?raw'

// Arma la página de Alpi para meterla en un iframe: la librería 3D va dentro (funciona sin internet)
// y, embebida, sin sus controles, con fondo transparente y avisando a la app cuando la tocan.

const CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>'

const EMBEBIDA = `<script>window.ALPI_EMBED=true</script>
<style>html,body{background:transparent!important}.loading{display:none!important}</style>`

// Un toque sin arrastrar avisa a la app (para que Astia cambie de frase).
const AVISO_TOQUE = `<script>(function(){var c=document.getElementById('stage');if(!c)return;var x=0,y=0,m=0;
c.addEventListener('pointerdown',function(e){x=e.clientX;y=e.clientY;m=0});
c.addEventListener('pointermove',function(e){m=Math.max(m,Math.abs(e.clientX-x)+Math.abs(e.clientY-y))});
c.addEventListener('pointerup',function(){if(m<8)parent.postMessage({type:'alpi-toque'},'*')});})()</script>`

export function documentoAlpi(embebida: boolean): string {
  const libreria = '<script>' + three.replace(/<\/script/gi, '<\\/script') + '</script>'
  let html = modelo.replace(CDN, (embebida ? EMBEBIDA : '') + libreria)
  if (embebida) html = html.replace('</body>', AVISO_TOQUE + '</body>')
  return html
}

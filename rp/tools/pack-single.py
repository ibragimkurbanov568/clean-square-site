# Однофайловая версия: код, стили и облегчённые ресурсы (tools/build-lite.*) — внутри одной HTML-страницы.
# Загрузка «файлов» (fetch, картинки) подменяется чтением из встроенной таблицы, сеть не нужна.
# Запуск: python3 tools/pack-single.py <dist> <папка-lite> <выход.html>
import sys, os, re, json, base64
DIST, LITE, OUT = sys.argv[1:4]
html = open(f'{DIST}/index.html', encoding='utf-8').read()
js_name = re.search(r'src="\./assets/(index-[^"]+\.js)"', html).group(1)
css_name = re.search(r'href="\./assets/(index-[^"]+\.css)"', html).group(1)
js = open(f'{DIST}/assets/{js_name}', encoding='utf-8').read().replace('</script', '<\\/script')
css = open(f'{DIST}/assets/{css_name}', encoding='utf-8').read()
MIME = {'.glb': 'model/gltf-binary', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp'}
files = {}
for root, _, fs in os.walk(LITE):
    for f in fs:
        p = os.path.relpath(os.path.join(root, f), LITE).replace(os.sep, '/')
        files[p] = [MIME.get(os.path.splitext(f)[1], 'application/octet-stream'), base64.b64encode(open(os.path.join(root, f), 'rb').read()).decode()]
shim = """(function(){
var A = window.__KRAI_ASSETS, cache = {};
function key(u){ u = String(u).split('?')[0].split('#')[0]; var i = u.lastIndexOf('assets/'); return i < 0 ? null : u.slice(i + 7); }
function bytes(k){ if (!cache[k]) { var s = atob(A[k][1]), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); cache[k] = b; } return cache[k]; }
var urls = {}; function blobUrl(k){ return urls[k] || (urls[k] = URL.createObjectURL(new Blob([bytes(k)], { type: A[k][0] }))); }
var of = window.fetch.bind(window);
window.fetch = function(input, init){
  var u = typeof input === 'string' ? input : (input && input.url) || String(input), k = key(u);
  if (k !== null && A[k]) return Promise.resolve(new Response(bytes(k).slice(0), { status: 200, headers: { 'Content-Type': A[k][0] } }));
  if (k !== null && /\\.(glb|json|mp3|webp)$/.test(k)) return Promise.resolve(new Response('', { status: 404 }));
  return of(input, init);
};
var d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, get: function(){ return d.get.call(this); }, set: function(v){ var k = key(v); d.set.call(this, k !== null && A[k] ? blobUrl(k) : v); } });
})();"""
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
fonts = '\n'.join(re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts[^>]*>', html))
page = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>КРАЙ</title>
<meta name="theme-color" content="#0d1726">
{fonts}
<style>{css}</style>
{body.strip()}
<script>window.__KRAI_ASSETS = {json.dumps(files, separators=(',', ':'))};</script>
<script>{shim}</script>
<script type="module">{js}</script>
"""
open(OUT, 'w', encoding='utf-8').write(page)
print(OUT, len(files), 'files', round(len(page.encode()) / 1048576, 2), 'MB')

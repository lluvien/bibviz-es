const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), vm=require('node:vm');
const dir=path.join(__dirname,'dist');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const report=JSON.parse(read('build-report.json'));
assert.equal(report.entries,671);assert.equal(report.books,66);assert.equal(report.verses,31102);
assert.equal(report.unavailableReferences.length,12);
assert(report.unavailableReferences.every(ref=>/Machabees|Baruch/.test(ref)));
let linkCount=0;
assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.html')).length,674);
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.html'))){
 const html=read(file);assert(html.includes('<html lang="es">'),file);
 assert(!/\{%|\{\{|undefined|NaN/.test(html),file);
 for(const [,link] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(https?:|#|mailto:)/.test(link))continue;
  assert(!link.startsWith('/'),'Root-relative path breaks project Pages: '+link);
  const target=decodeURIComponent(link.split(/[?#]/)[0]);
  assert(fs.existsSync(path.join(dir,target)),file+' -> '+target);linkCount++;
 }
 for(const [,code]of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(code);
}
for(const file of fs.readdirSync(path.join(dir,'scripts')).filter(f=>f.endsWith('.js')))new vm.Script(read('scripts/'+file));
const bible=JSON.parse(fs.readFileSync(path.join(__dirname,'web/contents/data/rv1909-full.json'),'utf8'));
assert.equal(bible[0].chapters['1']['1'],'EN el principio crió Dios los cielos y la tierra.');
assert(read('was-abraham-justified-by-faith-or-works-sab.html').includes('¿Fue Abraham justificado por la fe o por las obras?'));
assert(read('was-jonah-swallowed-by-a-fish-or-a-whale-sab.html').includes('Jonás 2:1'));
assert(read('how-did-antiochus-die-sab.html').includes('Esta referencia no está disponible'));
assert(read('when-did-the-transfiguration-occur-sab.html').includes('17:2'));
console.log('OK:',fs.readdirSync(dir).filter(f=>f.endsWith('.html')).length,'HTML pages;',linkCount,'local links; Spanish, scripts, citations and explicit exceptions verified.');

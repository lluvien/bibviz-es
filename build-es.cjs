// Spanish static edition; original visualization code remains in web/contents.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const out = path.join(root, 'dist');
// Remove only generated HTML from the preceding build, including obsolete slugs.
if(fs.existsSync(out)) {
 if(fs.lstatSync(out).isSymbolicLink())throw Error('dist must be a local output directory');
 for(const name of fs.readdirSync(out))if(name.endsWith('.html'))fs.unlinkSync(path.join(out,name));
}
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const slugContext = {};
// Use the original browser's slug implementation for identical page URLs, without dependencies.
const originalJS = read('web/contents/scripts/main.js');
vm.runInNewContext(originalJS.slice(originalJS.indexOf('var defaultSeparator')), slugContext);
const slug = slugContext.slugg;
const json = p => JSON.parse(read(p));
const write = (p, value) => { const file = path.join(out, p); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, value); };
const es = json('web/locales/es.json');
const categories = json('web/contents/data/contra.json');
const books = json('web/contents/data/rv1909-full.json');
const referenceCorrections = {};
function normalizeRef(ref) {
 const fixed=ref.trim().replace('Nehemaih','Nehemiah').replace('Jeremaih','Jeremiah').replace('!6','16')
 .replace(/([A-Za-z])\s*[.:]?\s*(\d)/,'$1 $2').replace(/(\d)[.;](\d)/g,'$1:$2')
 .replace(/:\s+/g,':').replace(/:$/,'').replace(/(\d)[ab]$/,'$1').replace('11=23','11-23').replace('John 8:59 - 9:1-6','John 8:59 - 9:6');
 if(fixed!==ref)referenceCorrections[ref]=fixed;
 return fixed;
}
for(const category of Object.values(categories)) for(const c of category.contradictions) {
 if(Array.isArray(c.refs))c.refs=c.refs.map(normalizeRef);
 else for(const key of Object.keys(c.refs))c.refs[key]=c.refs[key].map(normalizeRef);
}
const t = value => es[String(value).trim()] || String(value);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = ref => 'biblia.html?ref=' + encodeURIComponent(ref);
const refLabel = ref => ref.replace(/^(.*?)(?=\s\d+:?)/, name => t(name));
const sourceURL = (c,category) => new URL(c.url || '', category.url).href;
const bookMap = Object.fromEntries(books.map(b => [b.name.toLowerCase(), b]));
bookMap.psalm = bookMap.psalms;
const missing = new Set();
const editionRefs = {'Jonah 1:17':'Jonah 2:1'};
function passage(ref) {
  if(editionRefs[ref])return passage(editionRefs[ref]);
  const match = /^(.*?)\s+(\d+)(?::(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?)?$/.exec(ref.trim());
  if (!match) {missing.add(ref); return null;}
  const [, name, chapter, start, endChapter, end] = match;
  const chapters = bookMap[name.toLowerCase()]?.chapters;
  if (!chapters?.[chapter]) {missing.add(ref); return null;}
  const selected = [];
  const finalChapter=endChapter?+endChapter:+chapter;
  for(let ch=+chapter;ch<=finalChapter;ch++) {
   const verses=chapters[ch];
   if(!verses){missing.add(ref);return null;}
   const first=ch===+chapter&&start?+start:1;
   const last=ch===finalChapter?(end?+end:start&&!endChapter?+start:Object.keys(verses).length):Object.keys(verses).length;
   for (let i=first;i<=last;i++) {
    if (!verses[i]) {missing.add(ref); return null;}
    selected.push({number:endChapter?ch+':'+i:i, text:verses[i]});
   }
  }
  return selected;
}
function layout(title, body, scripts='') {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · BibViz en español</title><meta name="description" content="Explora las referencias y contradicciones bíblicas de BibViz con el texto de la Reina-Valera 1909 en castellano."><link rel="icon" href="img/favicon.ico"><link rel="stylesheet" href="styles/es.css"></head><body><header><a class="brand" href="index.html">BIB<span>VIZ</span> <small>EN ESPAÑOL</small></a><nav><a href="index.html#explorar">Explorar</a><a href="index.html#contradictionList">Índice</a><a href="biblia.html">Leer la Biblia</a><a href="acerca.html">Acerca de</a></nav></header><main>${body}</main><footer><p><strong>BibViz en español</strong> · Una adaptación independiente del proyecto de Daniel G. Taylor.</p><p>Texto bíblico: <a href="https://ebible.org/details.php?id=spaRV1909">Reina-Valera 1909</a>, dominio público. Se conserva su ortografía histórica.</p><p><a href="acerca.html">Fuentes y criterios</a> · <a href="https://github.com/bibviz/bibviz">Proyecto original</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.es">Contenido CC BY-SA 3.0</a> · Código original con licencia de tipo MIT.</p></footer>${scripts}</body></html>`;
}
const catalogScript = 'scripts/es-catalog.js';
write(catalogScript, `window.BIBVIZ_ES=${JSON.stringify(es).replace(/</g,'\\u003c')};\n`);
const graphScripts = `<script src="scripts/vendor/d3.v3.min.js"></script><script src="${catalogScript}"></script><script src="scripts/main.js"></script>`;
const pageNames=new Set();
for(const category of Object.values(categories))for(const c of category.contradictions){
 const base=slug(c.desc)+'-'+category.name;let name=base+'.html', suffix=2;
 while(pageNames.has(name))name=base+'-'+suffix+++'.html';
 pageNames.add(name);c.page=name;
}
const all = Object.values(categories).flatMap(category => category.contradictions.map(c => ({...c, source:category.name, filename:c.page})));
// Retain original English identifiers to keep reference matching and category filters stable.
const stats = {version:'RV1909', sections:[{name:'Old Testament',books:[]},{name:'New Testament',books:[]}]};
let maxWords=0;
books.forEach((b,i) => {
  const chapters = Object.entries(b.chapters).map(([n, verses]) => {const text=Object.values(verses).join(' '); const wordCount=text.split(/\s+/).length; maxWords=Math.max(maxWords,wordCount); return {name:'Chapter '+n,wordCount,charCount:text.length,verseCount:Object.keys(verses).length};});
  stats.sections[i<39?0:1].books.push({name:b.name,shortName:b.name,chapters});
  write('data/bible/'+b.code+'.json',JSON.stringify(b));
});
stats.sections.forEach(s=>s.books.forEach(b=>b.chapters.forEach(c=>c.relativeLength=c.wordCount/maxWords)));
write('data/kjv.json',JSON.stringify(stats));
write('data/books.json',JSON.stringify(books.map(({chapters,...b})=>({...b,chapterCount:Object.keys(chapters).length}))));
write('data/contra.json',JSON.stringify(categories));
for(const name of ['misogyny','science','homosexual','violence']) write('data/'+name+'.json',read('web/contents/data/'+name+'.json'));
write('scripts/vendor/d3.v3.min.js',read('web/contents/scripts/vendor/d3.v3.min.js'));
write('scripts/vendor/D3-LICENSE.txt',read('web/contents/scripts/vendor/D3-LICENSE.txt'));
fs.mkdirSync(path.join(out,'img'),{recursive:true});
fs.copyFileSync(path.join(root,'web/contents/img/favicon.ico'),path.join(out,'img/favicon.ico'));
write('styles/es.css',read('spanish/es.css'));
write('scripts/reader.js',read('spanish/reader.js'));
let js=read('web/contents/scripts/main.js');
js=js.replace("new RegExp(contraFilters.search, 'gi')", () => "new RegExp(contraFilters.search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'i')");
js=js.replace('textSearch.test(d.desc)', 'textSearch.test(esText(d.desc).normalize("NFD").replace(/[\\u0300-\\u036f]/g, ""))');
js=js.replace('contraFilters.search.replace(', 'contraFilters.search.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(');
js=js.replace("var url = '/' + slugg(d.desc) + '-' + contraFilters.source + '.html';", "var url = d.page;");
js=js.replace('return d.desc;', 'return d.page;');
js=js.replaceAll("d3.json('/data/", "d3.json('data/");
js=js.replace(".html(d.desc +", ".html(esText(d.desc) +");
js=js.replace("refList.join(', ')", "refList.map(esRef).join(', ')");
js=js.replace("testament + ' - ' + d.name + ' - ' + d.verseCount + ' verses", "esText(testament) + ' - ' + esText(d.name) + ' - ' + d.verseCount + ' versículos");
js=js.replace(".text(json.sections[x].books[y].shortName)", ".attr('value', json.sections[x].books[y].shortName).text(esText(json.sections[x].books[y].shortName))");
js=js.replace("window.location = 'http://www.biblegateway.com/passage/?search=' + d.book + ' ' + chapterNum + '&version=KJV';", "window.location = 'biblia.html?ref=' + encodeURIComponent(d.book + ' ' + chapterNum);");
js=js.replace("d.section + ' - ' + d.book + ' - ' + d.chapter.name", "esText(d.section) + ' - ' + esText(d.book) + ' - ' + d.chapter.name.replace('Chapter', 'Capítulo')");
js=js.replace("' words, '", "' palabras, '").replace(' characters</span>', ' caracteres</span>');
js=js.replace(".text(function (d) {return d; });", ".attr('value', function(d){return d;}).text(function (d) {return esText(d); });");
js=js.replace('i < Math.min(refList.length - 1, 10)', 'i < Math.min(refList.length, 10)');
js=js.replace("kv[1].replace('+', ' ')", "decodeURIComponent(kv.slice(1).join(':')).replace(/\\+/g, ' ')");
js=js.replace("values[keys[i]].replace(' ', '+')", "encodeURIComponent(values[keys[i]])");
js=js.replace('if (contraFilters.search) {', 'if (!contra || !contra[contraFilters.source]) return;\n    if (contraFilters.search) {');
js=js.replace('for (var i = 0; i < selector.options.length; i++) {', 'if (!selector) return;\n    for (var i = 0; i < selector.options.length; i++) {');
js=js.replace('if (err) { console.log(err); }', 'if (err) { console.error(err); return; }');
js=js.replace(".on('keyup', function ()", ".on('input', function ()");
write('scripts/main.js', `function esText(s){return window.BIBVIZ_ES[String(s).trim()]||s;}\nfunction esRef(s){return s.replace(/^(.*?)(?=\\s\\d)/,function(n){return esText(n);});}\n`+js);

let body=read('web/contents/index.md').split('---').slice(2).join('---');
body=body.slice(body.indexOf('<h2>'),body.indexOf('<h2><i class="icon-bar-chart"'));
// The historical survey section is outside this edition's Bible exploration scope.
const poll=body.indexOf('<h2',body.indexOf('Romans 1:27'));
if(poll>=0) body=body.slice(0,poll);
body=body.replace(/\{% trans %\}([\s\S]*?)\{% endtrans %\}/g,(_,key)=>t(key));
body=body.replace(/<i\b[^>]*><\/i>/g,'').replace('placeholder="Search..."','placeholder="Buscar: fe, muerte, Jesús…" aria-label="Buscar contradicciones"');
body=body.replace(/<svg([^>]*?)width="1200" height="(\d+)"([^>]*)><\/svg>/g,'<div class="chart-scroll"><svg$1 viewBox="0 0 1200 $2" role="img" aria-label="Gráfico interactivo de referencias bíblicas"$3></svg></div>');
body=body.replace(/href="http:\/\/www.biblegateway.com\/passage\/\?search=([^"&]+)&amp;version=KJV"/g,(_,ref)=>'href="'+url(decodeURIComponent(ref))+'"');
body=body.replace(/<option value="sab">sab<\/option>/,'<option value="sab">sab</option>');
let index=`<section class="hero"><p class="eyebrow">LECTURA · REFERENCIAS · CONTRASTES</p><h1>La Biblia, <em>en perspectiva.</em></h1><p>Explora los pasajes que BibViz pone en relación. Lee las citas y su contexto en castellano, con la Reina-Valera de 1909.</p><div class="metrics"><span><b>${all.length}</b> entradas de análisis</span><span><b>66</b> libros para consultar</span><span><b>3</b> fuentes originales</span></div></section><section id="explorar"><p class="intro">Cada arco une pasajes citados en un mismo análisis. Filtra por tema o libro, pasa el cursor para explorar y pulsa para leer.</p>${body}</section>`;
index+='<section id="contradictionList"><p class="eyebrow">ÍNDICE DE CONSULTA</p><h2>Explora todas las preguntas</h2><input id="list-search" type="search" placeholder="Buscar en las 671 entradas…" aria-label="Buscar en el índice"><p id="list-count" aria-live="polite"></p>';
for(const category of Object.values(categories)) {
 index+=`<details open class="source-list"><summary>${escape(category.desc)} <span>${category.contradictions.length} entradas</span></summary><div class="question-grid">`;
 for(const c of category.contradictions) {if(!es[c.desc.trim()]) throw Error('Missing: '+c.desc); index+=`<a href="${c.page}">${escape(t(c.desc))}</a>`;}
 index+='</div></details>';
}
index+='</section><div id="selected" role="status">Pasa el cursor por un arco o una barra para explorar sus referencias.</div>';
write('index.html',layout('La Biblia, en perspectiva',index,graphScripts+`<script src="scripts/index.js"></script>`));
write('scripts/index.js',`const input=document.getElementById('list-search');const entries=[...document.querySelectorAll('.question-grid a')];const fold=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();function filter(){let n=0;entries.forEach(a=>{a.hidden=!fold(a.textContent).includes(fold(input.value));if(!a.hidden)n++;});document.getElementById('list-count').textContent=n+' entradas';document.querySelectorAll('.source-list').forEach(d=>{d.hidden=![...d.querySelectorAll('a')].some(a=>!a.hidden);});}input.addEventListener('input',filter);filter();`);
for(const category of Object.values(categories)) for(const c of category.contradictions) {
 const refs=Array.isArray(c.refs)?c.refs:Object.values(c.refs).flat();
 const groups=Array.isArray(c.refs)?[c.refs]:Object.values(c.refs);
 let content=`<a class="back" href="index.html#contradictionList">← Todas las preguntas</a><section class="detail-head"><p class="eyebrow">${escape(category.desc)} · ANÁLISIS DE LA FUENTE ORIGINAL</p><h1>${escape(t(c.desc))}</h1><p>Compara los pasajes y lee su contexto antes de sacar conclusiones. Los grupos conservan la organización de la fuente original.</p><a class="button" href="${escape(sourceURL(c,category))}" target="_blank" rel="noopener">Consultar el análisis original (inglés) ↗</a></section><div class="chart-scroll"><svg id="contradictions-chart" viewBox="0 0 1200 500" role="img" aria-label="Pasajes relacionados"></svg></div><div class="passage-groups">`;
 groups.forEach((group,i)=>{
  content+=`<section class="passage-group"><p class="eyebrow">GRUPO ${i+1}</p>`;
  group.forEach(ref=>{
   const verses=passage(ref);
   content+=`<article><h2>${escape(refLabel(ref))}</h2>`;
   if(editionRefs[ref])content+=`<p class="notice">En la RV1909 este pasaje se numera ${escape(refLabel(editionRefs[ref]))}.</p>`;
   if(verses) content+=verses.map(v=>`<p class="verse"><sup>${v.number}</sup> ${escape(v.text)}</p>`).join('')+`<a href="${url(editionRefs[ref]||ref)}">Leer el capítulo completo →</a>`;
   else content+='<p class="notice">Esta referencia no está disponible en el texto RV1909 incorporado. Consulta el análisis original para verificar el libro, la numeración y la cita.</p>';
   content+='</article>';
  });content+='</section>';
 });
 content+='</div><div id="selected" role="status">Pasa el cursor por el gráfico para ver las referencias.</div>';
 const single={ [category.name]:{...category,contradictions:[c]} };
 const setup=`<script>window._contraSource=${JSON.stringify(category.name)};window._contradictions=${JSON.stringify(single).replace(/</g,'\\u003c')};window.maxArcs=999;</script>`;
 write(c.page,layout(t(c.desc),content,setup+graphScripts));
}
write('biblia.html',layout('Leer la Reina-Valera 1909',`<section class="detail-head"><p class="eyebrow">BIBLIOTECA · DOMINIO PÚBLICO</p><h1>Lee el contexto.</h1><p>Reina-Valera 1909. Texto íntegro de 66 libros, con su ortografía original.</p></section><form id="reader-form" class="reader-controls"><label>Libro<select id="reader-book" required></select></label><label>Capítulo<input id="reader-chapter" type="number" min="1" value="1" required></label><button type="submit">Leer capítulo</button></form><div class="reader-nav"><button id="previous" type="button">← Anterior</button><button id="next" type="button">Siguiente →</button></div><article id="reader-content" aria-live="polite"><p>Cargando libros…</p></article>`,`<script src="scripts/reader.js"></script>`));
write('acerca.html',layout('Acerca de esta edición',`<article class="prose"><p class="eyebrow">FUENTES Y CRITERIOS</p><h1>Una lectura con contexto.</h1><p>Esta es una adaptación independiente al castellano de <a href="https://github.com/bibviz/bibviz">BibViz</a>, creado por Daniel G. Taylor. Conserva su visualización y las referencias de sus tres conjuntos de datos. No es el sitio oficial del autor.</p><h2>Cómo interpretar los gráficos</h2><p>Los arcos representan relaciones que las fuentes originales consideran contradicciones. No constituyen una demostración automática: el contexto, el género literario, la traducción y los criterios de interpretación pueden afectar a cada caso. Las preguntas se traducen al castellano; el análisis externo permanece en inglés.</p><p>Las páginas agrupan los pasajes conforme a la fuente, sin presentar como texto bíblico sus etiquetas interpretativas. Algunas entradas tratan una misma pregunta desde fuentes diferentes.</p><h2>Texto bíblico</h2><p>Se utiliza la <a href="https://ebible.org/details.php?id=spaRV1909">Reina-Valera 1909 publicada por eBible.org</a>, declarada de dominio público. Conservamos su ortografía histórica. No es una traducción de la King James; una conclusión basada en la redacción inglesa debe revisarse al contrastarla con esta versión.</p><p>Esta edición contiene 66 libros. Las referencias a libros ausentes o con numeración no disponible se indican expresamente, sin inventar ni sustituir versículos. Las barras de longitud por capítulo se calculan sobre la RV1909; las categorías temáticas proceden del proyecto original.</p><h2>Fuentes de los análisis</h2><ul>${Object.values(categories).map(c=>`<li><a href="${escape(c.url)}">${escape(c.desc)}</a></li>`).join('')}</ul><h2>Créditos y licencias</h2><p>Diseño y código de los gráficos originales: © 2013 Daniel G. Taylor. Según el README original, el contenido creativo se distribuye bajo <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.es">CC BY-SA 3.0</a> y el código pertinente bajo una licencia de tipo MIT. Esta adaptación mantiene esas condiciones. Los materiales de las fuentes externas conservan sus derechos respectivos.</p><p>D3.js © Mike Bostock, licencia BSD de tres cláusulas; se incluye una copia de su licencia en los archivos del sitio.</p></article>`));
write('.nojekyll','');
write('build-report.json',JSON.stringify({entries:all.length,books:books.length,verses:books.reduce((n,b)=>n+Object.values(b.chapters).reduce((m,c)=>m+Object.keys(c).length,0),0),referenceCorrections,editionRefs,unavailableReferences:[...missing]},null,2));
console.log(`Built ${all.length} analysis pages, 66 books. ${missing.size} unavailable references explicitly marked.`);

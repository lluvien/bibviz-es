(() => {
 'use strict';
 const form=document.getElementById('reader-form'), select=document.getElementById('reader-book'), number=document.getElementById('reader-chapter'), content=document.getElementById('reader-content');
 const previous=document.getElementById('previous'), next=document.getElementById('next');
 let books=[], token=0;
 const cache=new Map();
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const error=message=>{content.innerHTML='<p class="notice">'+esc(message)+'</p>';};
 async function show(ref, update=true) {
  const request=++token;
  const match=/^(.*?)\s+(\d+)(?::(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?)?$/.exec(ref.trim());
  if(!match) return error('La referencia no tiene un formato válido. Elige un libro y un capítulo.');
  let name=match[1];if(name.toLowerCase()==='psalm')name='Psalms';
  const book=books.find(b=>b.name.toLowerCase()===name.toLowerCase()||b.label.toLowerCase()===name.toLowerCase());
  if(!book||+match[2]<1||+match[2]>book.chapterCount)return error('Esta referencia no está disponible en la Reina-Valera 1909 incorporada.');
  select.value=book.code;number.max=book.chapterCount;number.value=+match[2];
  previous.disabled=+match[2]===1;next.disabled=+match[2]===book.chapterCount;
  try{
   if(!cache.has(book.code)){const response=await fetch('data/bible/'+book.code+'.json');if(!response.ok)throw Error('No se pudo cargar el libro.');cache.set(book.code,await response.json());}
   if(request!==token)return;
   const verses=cache.get(book.code).chapters[match[2]], first=+match[3], last=match[4]?Object.keys(verses).length:+(match[5]||match[3]);
   content.innerHTML='<h2>'+esc(book.label)+' '+match[2]+'</h2>'+Object.entries(verses).map(([n,text])=>'<p id="v'+n+'" class="verse'+(n>=first&&n<=last?' highlight':'')+'"><sup>'+n+'</sup>'+esc(text)+'</p>').join('');
   if(update)history.pushState(null,'','?ref='+encodeURIComponent(ref));
   document.title=book.label+' '+match[2]+' · Reina-Valera 1909';
   if(first&&verses[first])document.getElementById('v'+first).scrollIntoView({block:'center'});
  }catch(e){error('No se pudo cargar el texto. Comprueba la conexión y vuelve a intentarlo.');}
 }
 const selected=()=>books.find(b=>b.code===select.value);
 form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())show(selected().name+' '+number.value);});
 select.addEventListener('change',()=>{number.value=1;number.max=selected().chapterCount;});
 previous.addEventListener('click',()=>show(selected().name+' '+(+number.value-1)));
 next.addEventListener('click',()=>show(selected().name+' '+(+number.value+1)));
 const fromURL=()=>show(new URLSearchParams(location.search).get('ref')||'Genesis 1',false);
 window.addEventListener('popstate',fromURL);
 fetch('data/books.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{books=data;select.innerHTML=books.map(b=>'<option value="'+b.code+'">'+esc(b.label)+'</option>').join('');fromURL();}).catch(()=>error('No se pudo cargar la lista de libros. Recarga la página para intentarlo de nuevo.'));
})();

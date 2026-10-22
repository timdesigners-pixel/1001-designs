// Original scripts, handlers and navigations never run in the visual target picker.
let nonce = '', selected = null;
function path(element) {
  if (element.tagName === 'BODY') return 'body';
  const parts=[];
  while(element && element.tagName !== 'HTML') {
    const tag=element.tagName.toLowerCase();
    const same=[...element.parentElement.children].filter(e=>e.tagName===element.tagName);
    parts.unshift(tag+':nth-of-type('+(same.indexOf(element)+1)+')');element=element.parentElement;
  }
  return parts.join(' > ');
}
window.addEventListener('message', event=>{
  if(event.source!==parent||event.data?.type!=='pick-document'||typeof event.data.html!=='string'||typeof event.data.nonce!=='string')return;
  nonce=event.data.nonce;
  const parsed=new DOMParser().parseFromString(event.data.html,'text/html');
  parsed.querySelectorAll('script,iframe,frame,object,embed,base,meta,link[rel="import"],template').forEach(e=>e.remove());
  parsed.querySelectorAll('*').forEach(e=>{
    for(const attr of [...e.attributes]) if(/^on/i.test(attr.name)||['srcdoc','action','formaction','autofocus','autoplay','contenteditable'].includes(attr.name)||/^(?:javascript|vbscript):/i.test(attr.value.trim()))e.removeAttribute(attr.name);
  });
  // Styles may be retained; source CSP and executable nodes cannot replace our controls.
  for(const old of document.head.querySelectorAll('[data-source-style]'))old.remove();
  for(const style of parsed.head.querySelectorAll('style,link[rel="stylesheet"]')){
    const copy=document.importNode(style,true);copy.dataset.sourceStyle='';document.head.append(copy);
  }
  document.body.replaceChildren(...[...parsed.body.childNodes].map(n=>document.importNode(n,true)));
  selected=null;
});
document.addEventListener('pointermove', event=>{
  const next=event.target.closest?.('main,header,footer,nav,section,article,aside,div,p,h1,h2,h3,ul,ol,form,body');
  if(next===selected)return;
  if(selected)selected.style.outline='';selected=next;
  if(selected)selected.style.outline='3px solid #16b995';
},true);
document.addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(!nonce)return;
  const target=event.target.closest?.('main,header,footer,nav,section,article,aside,div,p,h1,h2,h3,ul,ol,form,body')||document.body;
  parent.postMessage({type:'picked-target',nonce,selector:path(target),label:target.tagName.toLowerCase()+' · '+(target.textContent||'').trim().slice(0,70)},'*');
},true);
document.addEventListener('submit',event=>event.preventDefault(),true);
parent.postMessage({type:'picker-ready'},'*');

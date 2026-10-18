// Cerca wallet: indirizzo, dominio .sol (risolto on-chain via SNS) o @username Phantom (non supportato: nessuna API pubblica).
(function(){
const RPC='https://solana-rpc.publicnode.com', WSOL='So11111111111111111111111111111111111111112';
const NAME_PROG='namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX', SOL_TLD='58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx';
const PROGS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function rpc(m,p){const r=await (await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})})).json();if(r.error)throw new Error(r.error.message);return r.result}
function loadW3(){return window.solanaWeb3?Promise.resolve():new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js';s.onload=ok;s.onerror=()=>ko(new Error('web3.js non caricato'));document.head.appendChild(s)})}
async function resolveSol(name){await loadW3();const W=solanaWeb3;name=name.toLowerCase().replace(/\.sol$/,'');
 const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('SPL Name Service'+name)));
 const [k]=W.PublicKey.findProgramAddressSync([h,new Uint8Array(32),new W.PublicKey(SOL_TLD).toBytes()],new W.PublicKey(NAME_PROG));
 const a=await rpc('getAccountInfo',[k.toBase58(),{encoding:'base64'}]);if(!a.value)throw new Error('Dominio .sol non trovato');
 const d=Uint8Array.from(atob(a.value.data[0]),c=>c.charCodeAt(0));return new W.PublicKey(d.slice(32,64)).toBase58()}
const isAddr=s=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const usd=x=>x==null?'–':Math.abs(x)>=1e6?'$'+(x/1e6).toFixed(2)+'M':Math.abs(x)>=1e3?'$'+(x/1e3).toFixed(1)+'K':x>=0.01||x<=-0.01?'$'+x.toFixed(2):x?'$'+x.toPrecision(2):'$0';
const pr=x=>!x?'–':x>=0.01?'$'+x.toFixed(4):'$'+x.toPrecision(3), q=x=>x>=1?x.toLocaleString('it-IT',{maximumFractionDigits:2}):x.toPrecision(4);
const pc=x=>x==null?'<span class=mut>–</span>':`<span class=${x>=0?'up':'dn'}>${x>=0?'+':''}${x.toFixed(1)}%</span>`;
const lg=(i,m,c='lg')=>i&&i.logo?`<img class=${c} src="${esc(i.logo)}" alt="" onerror="this.style.visibility='hidden'">`:`<span class="${c} ph">${esc(((i&&i.sym)||m).slice(0,2).toUpperCase())}</span>`;
async function dex(ms){const out={};for(let i=0;i<ms.length;i+=30){try{const r=await (await fetch('https://api.dexscreener.com/latest/dex/tokens/'+ms.slice(i,i+30).join(','))).json();
 (r.pairs||[]).sort((a,b)=>((b.liquidity||{}).usd||0)-((a.liquidity||{}).usd||0)).forEach(p=>{const a=p.baseToken.address;if(!out[a]&&ms.includes(a))out[a]={sym:p.baseToken.symbol,name:p.baseToken.name,price:+p.priceUsd||0,ch:(p.priceChange||{}).h24,logo:(p.info||{}).imageUrl,pair:p.pairAddress}})}catch(e){}}
 if(ms.includes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')&&!out['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'])out['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']={sym:'USDC',price:1,ch:0};return out}
let chartObj=null;
window.searchWallet=async function(raw){
 const s=(raw??$('wq').value).trim(), st=$('wsStatus'), out=$('wsOut');if(!s)return;out.innerHTML='';
 let a=s;try{
  if(s.startsWith('@')){st.innerHTML='Gli @username di Phantom non si possono risolvere: Phantom non offre un\'API pubblica per la ricerca degli username (gli endpoint di api.phantom.app rispondono 403). Usa l\'indirizzo o un dominio .sol.';return}
  if(/\.sol$/i.test(s)||(!isAddr(s)&&/^[a-z0-9-]{1,63}$/i.test(s))){st.textContent='Risolvo '+s+' su SNS…';a=await resolveSol(s);}
  else if(!isAddr(s))throw new Error('Indirizzo non valido');
  st.textContent='Carico '+a.slice(0,4)+'…'+a.slice(-4)+'…';LS_set(s);
  const bal=(await rpc('getBalance',[a])).value/1e9;const hold={};
  let est=false;try{for(const p of PROGS){for(const x of (await rpc('getTokenAccountsByOwner',[a,{programId:p},{encoding:'jsonParsed'}])).value){const i=x.account.data.parsed.info,v=+i.tokenAmount.uiAmount||0;if(v>0)hold[i.mint]=(hold[i.mint]||0)+v}}}catch(e){est=true}
  const sigs=await rpc('getSignaturesForAddress',[a,{limit:est?40:15}]);const seenM=new Set();const txs=[];
  for(const sg of sigs){if(sg.err)continue;try{const t=await rpc('getTransaction',[sg.signature,{encoding:'jsonParsed',maxSupportedTransactionVersion:0}]);if(!t)continue;
   const keys=t.transaction.message.accountKeys.map(k=>k.pubkey||k),i=keys.indexOf(a);const lam=i>=0?(t.meta.postBalances[i]-t.meta.preBalances[i])/1e9:0;const post=i>=0?t.meta.postBalances[i]/1e9:null;
   const B=l=>{const d={};(l||[]).forEach(b=>{if(b.owner===a)d[b.mint]=(d[b.mint]||0)+(+b.uiTokenAmount.uiAmount||0)});return d};const P0=B(t.meta.preTokenBalances),P1=B(t.meta.postTokenBalances);
   const sol=lam+(P1[WSOL]||0)-(P0[WSOL]||0);const dl={};new Set([...Object.keys(P0),...Object.keys(P1)]).forEach(m=>{if(m!==WSOL){const d=(P1[m]||0)-(P0[m]||0);if(Math.abs(d)>1e-12)dl[m]=d}});
   if(est)new Set([...Object.keys(P0),...Object.keys(P1)]).forEach(m=>{if(m!==WSOL&&!seenM.has(m)){seenM.add(m);if((P1[m]||0)>0)hold[m]=P1[m]}});
   txs.push({sig:sg.signature,bt:t.blockTime||sg.blockTime,sol,post,dl})}catch(e){}}
  const ms=[...new Set([...Object.keys(hold),...txs.flatMap(t=>Object.keys(t.dl)),WSOL])];const I=await dex(ms);const sp=(I[WSOL]||{}).price||0;
  const toks=Object.entries(hold).map(([m,v])=>({m,v,i:I[m]||{},u:v*((I[m]||{}).price||0)})).sort((x,y)=>y.u-x.u);const tv=toks.reduce((s,t)=>s+t.u,0);
  toks.forEach(t=>{if(t.i.pair&&window.CH_ADD)CH_ADD(t.m,t.i.sym,t.i.pair)});
  const cards=`<div class=tok><span class="lg ph sol">◎</span><div class=tn><b>SOL</b><small>${bal.toFixed(4)} SOL</small></div><div class="tv money"><b>${usd(bal*sp)}</b><small>${pc((I[WSOL]||{}).ch)}</small></div></div>`+
   toks.map(t=>`<div class="tok${t.i.pair?' cl':''}" ${t.i.pair?`data-m="${esc(t.m)}" onclick="openChart(this.dataset.m)"`:''}>${lg(t.i,t.m)}<div class=tn><b>${esc(t.i.sym||t.m.slice(0,6))}</b><small>${q(t.v)} · ${pr(t.i.price)}</small></div><div class="tv money"><b>${usd(t.u)}</b><small>${pc(t.i.ch)}</small></div></div>`).join('');
  const lbl={buy:'Acquisto',sell:'Vendita',in:'Ricevuto',out:'Inviato'};
  const rows=txs.map(t=>{const tm=t.bt?new Date(t.bt*1000).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'?';let k,w;const e=Object.entries(t.dl).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0];
   if(e){const [m,d]=e;k=d>0&&t.sol<-0.0005?'buy':d<0&&t.sol>0.0005?'sell':d>0?'in':'out';w=`${lg(I[m],m,'sl')}${q(Math.abs(d))} ${esc((I[m]||{}).sym||m.slice(0,6))}`}else{k=t.sol>0?'in':'out';w='<span class="sl ph sol">◎</span>SOL'}
   return `<tr><td class=mut>${tm}</td><td><span class="bd ${k}">${lbl[k]}</span></td><td class=tk>${w}</td><td class="r ${t.sol>=0?'up':'dn'}">${t.sol>=0?'+':''}${t.sol.toFixed(4)}</td><td class=r>${usd(Math.abs(t.sol)*sp)}</td><td><a href="https://solscan.io/tx/${t.sig}" target=_blank>↗</a></td></tr>`}).join('');
  out.innerHTML=`<section class=hero><div class=wtop><div class=wn><span class=av>🔎</span><div><b>${esc(s)}</b><span><a class=mut href="https://solscan.io/account/${a}" target=_blank>${a.slice(0,4)}…${a.slice(-4)}</a> <button class=cp onclick="copyTxt('${a}',this)">Copia</button></span></div></div></div>
   <div class="bal money">${usd(bal*sp+tv)}</div><div class=mut style=font-size:12px>${toks.length} token · ${bal.toFixed(4)} SOL${est?' · saldi token stimati dalle ultime '+txs.length+' tx (il nodo RPC pubblico non consente l\'elenco dei token account dal browser)':''}</div>
   <div class=grid2><div><h3>Token</h3><div class=toks>${cards}</div></div><div><h3>Saldo SOL nel tempo <small class=mut>ultime ${txs.length} tx</small></h3><div class=box><div id=wsChart class=lc></div></div></div></div>
   <h3>Storico transazioni</h3><div class="tw box money"><table class=dt><tr><th>Ora</th><th>Tipo</th><th>Token</th><th class=r>SOL</th><th class=r>Valore</th><th></th></tr>${rows||'<tr><td colspan=6 class=mut>nessuna</td></tr>'}</table></div></section>`;
  const pts=[...new Map(txs.filter(t=>t.bt&&t.post!=null).map(t=>[t.bt,t.post*sp])).entries()].sort((x,y)=>x[0]-y[0]);
  if(pts.length&&window.LightweightCharts){const ch=LightweightCharts.createChart($('wsChart'),{autoSize:true,layout:{background:{color:'transparent'},textColor:'#8a8a9c'},grid:{vertLines:{visible:false},horzLines:{color:'#1e1e28'}},timeScale:{timeVisible:true,borderVisible:false},rightPriceScale:{borderVisible:false}});
   ch.addAreaSeries({lineColor:'#ab9ff2',topColor:'rgba(171,159,242,.4)',bottomColor:'rgba(171,159,242,0)',lineWidth:2}).setData(pts.map(p=>({time:p[0],value:+p[1].toFixed(2)})));ch.timeScale().fitContent()}
  st.textContent=(a!==s?s+' → ':'')+a;
 }catch(e){st.textContent='Errore: '+(/blocked/i.test(e.message)?'il nodo RPC pubblico ha bloccato la richiesta (wallet con troppi token account)':e.message)+(a!==s&&isAddr(a)?' · '+s+' → '+a:'')}};
function LS_set(s){try{const h=JSON.parse(localStorage.getItem('wsHist')||'[]').filter(x=>x!==s);h.unshift(s);localStorage.setItem('wsHist',JSON.stringify(h.slice(0,6)));renderHist()}catch(e){}}
function renderHist(){const h=JSON.parse(localStorage.getItem('wsHist')||'[]');$('wsHist').innerHTML=h.map(x=>`<button class=cp data-q="${esc(x)}" onclick="document.getElementById('wq').value=this.dataset.q;searchWallet()">${esc(x.length>20?x.slice(0,6)+'…'+x.slice(-4):x)}</button>`).join(' ')}
renderHist();const m=location.hash.match(/cerca=([^&]+)/);if(m){$('wq').value=decodeURIComponent(m[1]);searchWallet()}
})();

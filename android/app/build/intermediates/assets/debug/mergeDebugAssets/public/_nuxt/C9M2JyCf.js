const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./CwbGTO_C.js","./D5W0RE9U.js","./entry.DVKA8PkM.css"])))=>i.map(i=>d[i]);
import{u as C}from"./Zw7dpR4N.js";import{r as L,_ as O,q as M,H as D,x as b}from"./D5W0RE9U.js";const B=L("SunmiPrinter",{web:()=>O(()=>import("./CwbGTO_C.js"),__vite__mapDeps([0,1,2]),import.meta.url).then(a=>new a.SunmiPrinterWeb)}),U=Object.freeze(Object.defineProperty({__proto__:null,SunmiPrinter:B},Symbol.toStringTag,{value:"Module"}));function $(a){return`${Number(a).toFixed(2).replace(".",",")}€`}function u(a){const i=new Date(a),s=i.getDate().toString().padStart(2,"0"),w=(i.getMonth()+1).toString().padStart(2,"0"),r=i.getFullYear(),f=i.getHours().toString().padStart(2,"0"),T=i.getMinutes().toString().padStart(2,"0");return`${s}/${w}/${r} ${f}:${T}`}const m="-".repeat(32),p="=".repeat(32);function E(a){const i=`[${a}]`,s=Math.max(0,32-i.length),w="*".repeat(Math.floor(s/2)),r="*".repeat(Math.ceil(s/2));return`${w}${i}${r}`}function N(a){return a.translations?.find(s=>s.language==="fr")?.name?.trim()||a.name}function v(a){const i=new Map;for(const s of a){const w=s.product.category?N(s.product.category):"Autres",r=i.get(w)??[];r.push(s),i.set(w,r)}return i}function R(a){return a.replace(/-/g,"").slice(-5).toUpperCase()}const j=()=>{const a=b(!1),i=b(null),s=b(""),{isCapacitor:w}=C(),r=()=>w,f=()=>B,T=async()=>{if(!r())return;const t=f();await t.bindService(),a.value=!0;const e=await t.getStatus();i.value=e.status,s.value=e.statusText},A=async()=>{if(!r()||!a.value)return;await f().unbindService(),a.value=!1},I=async()=>{if(!r())return;const e=await f().getStatus();i.value=e.status,s.value=e.statusText};M(T),D(A);async function _(t,e){await t.printerInit(),await t.setAlignment({alignment:"center"}),await t.setBold({enabled:!0}),await t.setFontSize({size:28}),await t.printText({text:`TOKYO SUSHI BAR
`}),await t.setFontSize({size:24});const y=e.type==="DELIVERY"?"LIVRAISON":"À EMPORTER";await t.printText({text:`${y}
`}),await t.printText({text:`** ${R(e.id)} **
`}),await t.setBold({enabled:!1}),await t.setAlignment({alignment:"left"}),await t.printText({text:`
${p}
`}),await t.printText({text:`Le: ${u(e.createdAt)}
`});const l=e.estimatedReadyTime??e.preferredReadyTime;if(await t.printText({text:`Prêt: ${l?u(l):"ASAP"}
`}),e.customer){await t.printText({text:`
${m}
`});const n=`${e.customer.firstName} ${e.customer.lastName}`;await t.printText({text:`${n}
`}),e.customer.phoneNumber&&await t.printText({text:`${e.customer.phoneNumber}
`})}if(e.address||e.displayAddress){if(await t.printText({text:`
${m}
`}),e.address){const{streetName:n,houseNumber:o,boxNumber:c,postcode:d,municipalityName:S}=e.address,F=c?` bte ${c}`:"";await t.printText({text:`${n} ${o}${F}
`}),await t.printText({text:`${d} ${S}
`})}else e.displayAddress&&await t.printText({text:`${e.displayAddress}
`});e.addressExtra&&await t.printText({text:`(${e.addressExtra})
`})}await t.printText({text:`
${m}
`}),await t.printText({text:`Qte Article              Prix
`});for(const[n,o]of v(e.items)){await t.printText({text:`
${E(n)}
`});for(const c of o){const d=c.product.code?`${c.product.code}. `:"",S=c.choice?.name?` (${c.choice.name})`:"";await t.printColumnsText({columns:[{text:`${c.quantity}x`,width:3,align:"left"},{text:`${d}${N(c.product)}${S}`,width:20,align:"left"},{text:$(c.totalPrice),width:7,align:"right"}]})}}await t.printText({text:`
${m}
`});const x=e.items.reduce((n,o)=>n+Number(o.totalPrice),0);if(await t.printColumnsText({columns:[{text:"Sous-total",width:23,align:"left"},{text:$(x),width:7,align:"right"}]}),parseFloat(e.discountAmount)>0&&await t.printColumnsText({columns:[{text:"Réduction",width:23,align:"left"},{text:`-${$(e.discountAmount)}`,width:7,align:"right"}]}),e.deliveryFee&&parseFloat(e.deliveryFee)>0&&await t.printColumnsText({columns:[{text:"Livraison",width:23,align:"left"},{text:$(e.deliveryFee),width:7,align:"right"}]}),await t.setBold({enabled:!0}),await t.printColumnsText({columns:[{text:"TOTAL",width:23,align:"left"},{text:$(e.totalPrice),width:7,align:"right"}]}),await t.setBold({enabled:!1}),await t.printText({text:`
${m}
`}),await t.setAlignment({alignment:"center"}),await t.setBold({enabled:!0}),e.isOnlinePayment?await t.printText({text:`EN LIGNE — PAYÉ
`}):await t.printText({text:`ESPÈCES
`}),await t.setBold({enabled:!1}),await t.setAlignment({alignment:"left"}),e.orderExtra?.length){await t.printText({text:`
${m}
`});for(const n of e.orderExtra)if(n.name){const o=n.options?.length?`: ${n.options.join(", ")}`:"";await t.printText({text:`+ ${n.name}${o}
`})}}e.orderNote&&(await t.printText({text:`
${m}
`}),await t.printText({text:`Note: ${e.orderNote}
`})),await t.printText({text:`
${p}
`}),await t.setAlignment({alignment:"center"}),await t.printText({text:`Merci pour votre commande
`}),await t.setAlignment({alignment:"left"}),await t.lineWrap({lines:4})}async function z(t,e){await t.printerInit(),await t.setAlignment({alignment:"center"}),await t.setBold({enabled:!0}),await t.setFontSize({size:32}),await t.printText({text:`CUISINE
`}),await t.setFontSize({size:24});const y=e.type==="DELIVERY"?"LIVRAISON":"À EMPORTER";await t.printText({text:`${y}
`}),await t.printText({text:`** ${R(e.id)} **
`}),await t.setBold({enabled:!1}),await t.setAlignment({alignment:"left"}),await t.printText({text:`
${p}
`}),await t.printText({text:`Le: ${u(e.createdAt)}
`});const l=e.estimatedReadyTime??e.preferredReadyTime;if(await t.printText({text:`Prêt: ${l?u(l):"ASAP"}
`}),e.customer){const x=`${e.customer.firstName} ${e.customer.lastName}`;await t.printText({text:`${x}
`}),e.customer.phoneNumber&&await t.printText({text:`${e.customer.phoneNumber}
`})}await t.printText({text:`
${m}
`}),await t.printText({text:`Qte Article
`});for(const[x,n]of v(e.items)){await t.printText({text:`
${E(x)}
`});for(const o of n){const c=o.product.code?`${o.product.code}. `:"",d=o.choice?.name?` (${o.choice.name})`:"";await t.setBold({enabled:!0}),await t.setFontSize({size:28}),await t.printText({text:`${o.quantity}x ${c}${N(o.product)}${d}
`}),await t.setFontSize({size:24}),await t.setBold({enabled:!1})}}if(e.orderExtra?.length){await t.printText({text:`
${m}
`});for(const x of e.orderExtra)if(x.name){const n=x.options?.length?`: ${x.options.join(", ")}`:"";await t.printText({text:`+ ${x.name}${n}
`})}}e.orderNote&&(await t.printText({text:`
${m}
`}),await t.printText({text:`Note: ${e.orderNote}
`})),await t.printText({text:`
${p}
`}),await t.lineWrap({lines:4})}const h=async t=>{if(!r())return;const e=f();await _(e,t)},P=async t=>{if(!r())return;const e=f();await z(e,t)};return{isBound:a,status:i,statusText:s,bind:T,unbind:A,refreshStatus:I,printDelivery:h,printKitchen:P,printBoth:async t=>{await P(t),await h(t)},printReceipt:t=>h(t),isNative:r}};export{U as i,j as u};

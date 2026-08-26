const HOUSEKEY="gastos-hogar-config-v2";
function getHouse(){return JSON.parse(localStorage.getItem(HOUSEKEY)||"null")}
function showWelcome(){document.getElementById("welcome").classList.remove("hidden");document.getElementById("onboarding").classList.add("hidden")}
function showCreate(){document.getElementById("welcome").classList.add("hidden");document.getElementById("onboarding").classList.remove("hidden");document.getElementById("createView").classList.remove("hidden");document.getElementById("joinView").classList.add("hidden");document.getElementById("inviteResult").classList.add("hidden")}
function showJoin(){document.getElementById("welcome").classList.add("hidden");document.getElementById("onboarding").classList.remove("hidden");document.getElementById("createView").classList.add("hidden");document.getElementById("joinView").classList.remove("hidden");document.getElementById("inviteResult").classList.add("hidden")}
function createHome(){
 const name=(document.getElementById("homeName").value||"Nuestro hogar").trim(), me=(document.getElementById("myName").value||"Yo").trim();
 const code="HOGAR-"+Math.random().toString(36).slice(2,6).toUpperCase();
 localStorage.setItem(HOUSEKEY,JSON.stringify({name,me,code,members:[me],cloud:false}));
 document.getElementById("generatedCode").textContent=code;document.getElementById("createView").classList.add("hidden");document.getElementById("inviteResult").classList.remove("hidden");
}
function joinHome(){
 const code=(document.getElementById("inviteCode").value||"").trim().toUpperCase(), me=(document.getElementById("joinName").value||"").trim()||"Esposo";
 if(!code){alert("Ingresa el código de invitación.");return}
 localStorage.setItem(HOUSEKEY,JSON.stringify({name:"Nuestro hogar",me,code,members:[me],cloud:false}));
 alert("Invitación registrada. La sincronización entre celulares se activará al conectar la nube.");
 enterApp();
}
function copyInvite(){navigator.clipboard?.writeText(document.getElementById("generatedCode").textContent);alert("Código copiado")}
function enterApp(){
 document.getElementById("welcome").classList.add("hidden");document.getElementById("onboarding").classList.add("hidden");document.getElementById("app").classList.remove("hidden");
 const h=getHouse();if(h){document.getElementById("homeDisplay").textContent=h.name;document.getElementById("homeTitle").textContent=h.code;document.getElementById("members").textContent="👤 "+h.me}
}
document.addEventListener("DOMContentLoaded",()=>{if(getHouse()) enterApp()});
const KEY="gastos-familiares-v1";
const CATKEY="gastos-categorias-v1";
const defaults=["Hogar","Mercado","Alimentación","Transporte","Combustible","Servicios","Familia","Educación","Salud","Ropa","Entretenimiento","Deudas","Ahorro","Otros"];
let expenses=JSON.parse(localStorage.getItem(KEY)||"[]");
let categories=JSON.parse(localStorage.getItem(CATKEY)||JSON.stringify(defaults));
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const today=new Date().toISOString().slice(0,10);
$("date").value=today;
$("monthLabel").textContent=new Intl.DateTimeFormat("es-CO",{month:"long",year:"numeric"}).format(new Date());

function save(){localStorage.setItem(KEY,JSON.stringify(expenses));localStorage.setItem(CATKEY,JSON.stringify(categories));render()}
function render(){
  const month=new Date().toISOString().slice(0,7);
  const current=expenses.filter(e=>e.date.startsWith(month));
  const total=current.reduce((s,e)=>s+e.amount,0);
  $("total").textContent=money(total);$("count").textContent=current.length;
  const sums={}; current.forEach(e=>sums[e.category]=(sums[e.category]||0)+e.amount);
  const sorted=Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  $("topCategory").textContent=sorted[0]?.[0]||"—";
  $("category").innerHTML=categories.map(c=>`<option>${esc(c)}</option>`).join("");
  $("categorySummary").innerHTML=sorted.length?sorted.map(([c,v])=>{
    const pct=total?Math.round(v/total*100):0;
    return `<div class="card"><div style="display:flex;justify-content:space-between"><strong>${esc(c)}</strong><strong>${money(v)}</strong></div><div class="bar"><i style="width:${pct}%"></i></div><small>${pct}% del gasto del mes</small></div>`
  }).join(""):`<div class="card">Aún no hay gastos este mes.</div>`;
  $("historyList").innerHTML=expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map((e,i)=>`
    <div class="expense"><div class="left"><strong>${esc(e.category)} · ${money(e.amount)}</strong><small>${e.date} · ${esc(e.paidBy)} · ${esc(e.method)}${e.description?" · "+esc(e.description):""}</small></div><button class="danger-text" onclick="removeExpense(${i})">Eliminar</button></div>`).join("")||`<div class="card">No hay gastos registrados.</div>`;
  $("categoryList").innerHTML=categories.map((c,i)=>`<span class="chip">${esc(c)} <button onclick="removeCategory(${i})">×</button></span>`).join("");
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
window.removeExpense=i=>{expenses.splice(i,1);save();toast("Gasto eliminado")};
window.removeCategory=i=>{if(confirm("¿Eliminar esta categoría?")){categories.splice(i,1);save();toast("Categoría eliminada")}};
$("expenseForm").addEventListener("submit",e=>{e.preventDefault();expenses.push({amount:Number($("amount").value),date:$("date").value,category:$("category").value,paidBy:$("paidBy").value,method:$("method").value,description:$("description").value.trim()});save();e.target.reset();$("date").value=today;toast("Gasto guardado ✓")});
$("categoryForm").addEventListener("submit",e=>{e.preventDefault();const c=$("newCategory").value.trim();if(c&&!categories.includes(c)){categories.push(c);save();$("newCategory").value="";toast("Categoría agregada ✓")}});
$("clearBtn").addEventListener("click",()=>{if(confirm("Esto eliminará todos los gastos de este dispositivo. ¿Continuar?")){expenses=[];save();toast("Historial borrado")}});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")}));
let deferred;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(deferred){deferred.prompt();deferred=null}};
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
render();

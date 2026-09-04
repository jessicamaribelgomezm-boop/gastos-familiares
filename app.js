const { createClient } = window.supabase;
const configured = window.SUPABASE_URL && !window.SUPABASE_URL.startsWith('PEGA_AQUI') && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.startsWith('PEGA_AQUI');
const supabase = configured ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;

let authMode = 'signup'; // signup | login
let onboardingMode = 'create'; // create | join
let currentUser = null;
let household = null;
let expenses = [];
let categories = [];
let members = [];
let realtimeChannel = null;

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const localDate = d => { const x=new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const today = localDate(new Date());
$('date').value = today;
$('monthLabel').textContent = new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(new Date());

function configuredGuard(){
  if(!configured){ alert('Falta configurar Supabase. En breve te indicaré dónde pegar el Project URL y la Publishable/anon key.'); return false; }
  return true;
}
function showWelcome(){ $('welcome').classList.remove('hidden'); $('onboarding').classList.add('hidden'); }
function showOnboarding(){ $('welcome').classList.add('hidden'); $('onboarding').classList.remove('hidden'); }
function showCreate(){ onboardingMode='create'; authMode='signup'; showOnboarding(); $('authView').classList.remove('hidden'); $('createView').classList.add('hidden'); $('joinView').classList.add('hidden'); $('inviteResult').classList.add('hidden'); updateAuthUI(); }
function showJoin(){ onboardingMode='join'; authMode='signup'; showOnboarding(); $('authView').classList.remove('hidden'); $('createView').classList.add('hidden'); $('joinView').classList.add('hidden'); $('inviteResult').classList.add('hidden'); updateAuthUI(); }
function updateAuthUI(){
  $('authTitle').textContent = authMode==='signup' ? 'Crear tu cuenta' : 'Iniciar sesión';
  $('authText').textContent = authMode==='signup' ? 'Usaremos tu cuenta para sincronizar los gastos entre los dos celulares.' : 'Entra con tu cuenta para continuar.';
  $('authName').parentElement.classList.toggle('hidden', authMode!=='signup');
  $('authButton').textContent = authMode==='signup' ? 'Crear cuenta' : 'Iniciar sesión';
  $('authToggle').textContent = authMode==='signup' ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva';
  $('authMessage').textContent='';
}
function toggleAuthMode(){ authMode=authMode==='signup'?'login':'signup'; updateAuthUI(); }
function authMessage(t){ $('authMessage').textContent=t; }

async function submitAuth(){
  if(!configuredGuard()) return;
  const email=$('authEmail').value.trim(), password=$('authPassword').value;
  const name=$('authName').value.trim();
  if(!email || password.length<6 || (authMode==='signup' && !name)){ authMessage('Completa los campos. La contraseña debe tener al menos 6 caracteres.'); return; }
  $('authButton').disabled=true;
  try{
    if(authMode==='signup'){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
      if(error) throw error;
      if(data.session){ currentUser=data.user; await continueAfterAuth(); }
      else authMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      currentUser=data.user; await continueAfterAuth();
    }
  }catch(e){ authMessage(e.message || 'No fue posible completar la operación.'); }
  finally{$('authButton').disabled=false;}
}

async function continueAfterAuth(){
  const h=await getMyHousehold();
  if(h){ household=h; await loadData(); enterApp(); }
  else{
    $('authView').classList.add('hidden');
    if(onboardingMode==='create') $('createView').classList.remove('hidden'); else $('joinView').classList.remove('hidden');
  }
}

async function getMyHousehold(){
  const {data,error}=await supabase.from('household_members').select('household_id, households(*)').eq('user_id',currentUser.id).limit(1).maybeSingle();
  if(error) throw error;
  return data?.households || null;
}

async function createHome(){
  const name=($('homeName').value||'Nuestro hogar').trim();
  if(!name){alert('Escribe un nombre para el hogar.');return;}
  try{
    const {data,error}=await supabase.rpc('create_household',{p_household_name:name,p_display_name:$('authName').value.trim() || currentUser.user_metadata?.display_name || 'Yo'});
    if(error) throw error;
    household=data;
    $('generatedCode').textContent=household.invite_code;
    $('createView').classList.add('hidden'); $('inviteResult').classList.remove('hidden');
    await loadData();
  }catch(e){alert(e.message||'No fue posible crear el hogar.');}
}

async function joinHome(){
  const code=($('inviteCode').value||'').trim().toUpperCase();
  if(!code){alert('Ingresa el código de invitación.');return;}
  try{
    const displayName=currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Esposo';
    const {data,error}=await supabase.rpc('join_household',{p_invite_code:code,p_display_name:displayName});
    if(error) throw error;
    household=data; await loadData(); enterApp();
  }catch(e){alert(e.message||'No fue posible unirse al hogar.');}
}

function copyInvite(){ navigator.clipboard?.writeText($('generatedCode').textContent); alert('Código copiado ✓'); }
function enterApp(){
  $('welcome').classList.add('hidden'); $('onboarding').classList.add('hidden'); $('app').classList.remove('hidden');
  if(household){ $('homeDisplay').textContent=household.name; $('homeTitle').textContent=household.invite_code; subscribeRealtime(); }
  render();
}

async function loadData(){
  if(!household) return;
  const [e,c,m] = await Promise.all([
    supabase.from('expenses').select('*').eq('household_id',household.id).order('expense_date',{ascending:false}),
    supabase.from('categories').select('*').eq('household_id',household.id).order('name'),
    supabase.from('household_members').select('user_id, profiles(display_name)').eq('household_id',household.id)
  ]);
  if(e.error) throw e.error; if(c.error) throw c.error; if(m.error) throw m.error;
  const categoryRows=c.data||[];
  const categoryNames=new Map(categoryRows.map(x=>[x.id,x.name]));
  expenses=(e.data||[]).map(x=>({...x,category_name:categoryNames.get(x.category_id)||'Sin categoría'}));
  categories=categoryRows.map(x=>x.name);
  members=m.data||[];
  $('members').textContent='👥 '+members.map(x=>x.profiles?.display_name||'Miembro').join(' · ');
  const paid=$('paidBy');
  if(paid){
    paid.innerHTML=members.map(x=>`<option value="${esc(x.user_id)}">${esc(x.profiles?.display_name || (x.user_id===currentUser?.id?'Yo':'Miembro'))}</option>`).join('');
    if(currentUser?.id) paid.value=currentUser.id;
  }
}
function subscribeRealtime(){
  if(!supabase || !household) return;
  if(realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel=supabase.channel('household-'+household.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'expenses',filter:`household_id=eq.${household.id}`},async()=>{await loadData();render();})
    .on('postgres_changes',{event:'*',schema:'public',table:'categories',filter:`household_id=eq.${household.id}`},async()=>{await loadData();render();})
    .subscribe();
}

function render(){
  const month=localDate(new Date()).slice(0,7);
  const current=expenses.filter(e=>String(e.expense_date).startsWith(month));
  const total=current.reduce((s,e)=>s+Number(e.amount),0);
  $('total').textContent=money(total); $('count').textContent=current.length;
  const sums={}; current.forEach(e=>sums[e.category_name||e.category||'Sin categoría']=(sums[e.category_name||e.category||'Sin categoría']||0)+Number(e.amount));
  const sorted=Object.entries(sums).sort((a,b)=>b[1]-a[1]); $('topCategory').textContent=sorted[0]?.[0]||'—';
  $('category').innerHTML=categories.map(c=>`<option>${esc(c)}</option>`).join('');
  $('categorySummary').innerHTML=sorted.length?sorted.map(([c,v])=>{const pct=total?Math.round(v/total*100):0;return `<div class="card"><div style="display:flex;justify-content:space-between"><strong>${esc(c)}</strong><strong>${money(v)}</strong></div><div class="bar"><i style="width:${pct}%"></i></div><small>${pct}% del gasto del mes</small></div>`}).join(''):`<div class="card">Aún no hay gastos este mes.</div>`;
  $('historyList').innerHTML=expenses.map(e=>`<div class="expense"><div class="left"><strong>${esc(e.category_name||e.category||'Sin categoría')} · ${money(e.amount)}</strong><small>${esc(e.expense_date)} · ${esc(e.payment_method||'Otro')}${e.description?' · '+esc(e.description):''}</small></div><button class="danger-text" onclick="removeExpense('${e.id}')">Eliminar</button></div>`).join('')||`<div class="card">No hay gastos registrados.</div>`;
  $('categoryList').innerHTML=categories.map(c=>`<span class="chip">${esc(c)}</span>`).join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1800)}

window.removeExpense=async id=>{if(!confirm('¿Eliminar este gasto?'))return;const {error}=await supabase.from('expenses').delete().eq('id',id).eq('household_id',household.id);if(error)alert(error.message);else{await loadData();render();toast('Gasto eliminado')}};

$('expenseForm').addEventListener('submit',async e=>{
  e.preventDefault(); if(!household){alert('Primero crea o únete a un hogar.');return;}
  const category=$('category').value; const {data:cat,error:ce}=await supabase.from('categories').select('id').eq('household_id',household.id).eq('name',category).single(); if(ce) {alert(ce.message);return;}
  const payload={household_id:household.id,category_id:cat.id,amount:Number($('amount').value),expense_date:$('date').value,paid_by:$('paidBy').value || currentUser.id,payment_method:$('method').value,description:$('description').value.trim()};
  const {error}=await supabase.from('expenses').insert(payload); if(error){alert(error.message);return;}
  await loadData();render();e.target.reset();$('date').value=today;toast('Gasto guardado ✓');
});

$('categoryForm').addEventListener('submit',async e=>{
  e.preventDefault(); if(!household)return; const c=$('newCategory').value.trim(); if(!c)return;
  const {error}=await supabase.from('categories').insert({household_id:household.id,name:c}); if(error){alert(error.message);return;} $('newCategory').value=''; await loadData();render();toast('Categoría agregada ✓');
});

$('clearBtn').addEventListener('click',async()=>{if(!confirm('Esto eliminará todos los gastos del hogar. ¿Continuar?'))return;const {error}=await supabase.from('expenses').delete().eq('household_id',household.id);if(error)alert(error.message);else{await loadData();render();toast('Historial borrado')}});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')}));

let deferred; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('installBtn').classList.remove('hidden')}); $('installBtn').onclick=async()=>{if(deferred){deferred.prompt();deferred=null}};

(async()=>{
  if(!configured){ $('welcome').classList.remove('hidden'); return; }
  const {data}=await supabase.auth.getSession();
  if(data.session){ currentUser=data.session.user; try{household=await getMyHousehold(); if(household){await loadData();enterApp();}}catch(e){console.error(e)} }
  supabase.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null; if(session && !household){try{household=await getMyHousehold(); if(household){await loadData();enterApp();}}catch(e){console.error(e)}}});
})();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');


const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>[...root.querySelectorAll(q)];

function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function toast(message){
  let el=$('#toast');
  if(!el){
    el=document.createElement('div');
    el.id='toast';
    Object.assign(el.style,{
      position:'fixed',right:'18px',bottom:'18px',padding:'13px 16px',
      background:'#172033',color:'#fff',borderRadius:'12px',zIndex:'200',
      boxShadow:'0 12px 30px rgba(0,0,0,.18)',display:'none'
    });
    document.body.appendChild(el);
  }
  el.textContent=message;
  el.style.display='block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>el.style.display='none',2800);
}

function openModal(id){document.getElementById(id)?.classList.add('open')}
function closeModal(id){document.getElementById(id)?.classList.remove('open')}

document.addEventListener('click',e=>{
  const open=e.target.closest('[data-open-modal]');
  if(open)openModal(open.dataset.openModal);
  const close=e.target.closest('[data-close-modal]');
  if(close)closeModal(close.dataset.closeModal);
  const sidebar=e.target.closest('[data-toggle-sidebar]');
  if(sidebar)$('#sidebar')?.classList.toggle('open');
});

document.addEventListener('submit',e=>{
  const form=e.target;
  if(form.matches('[data-demo-form]')){
    e.preventDefault();
    toast(form.dataset.success||'Saved successfully.');
    if(form.dataset.reset!=='false')form.reset();
    form.closest('.modal')?.classList.remove('open');
  }
});

function profileName(){
  return window.studyNestProfile?.full_name
    || window.studyNestUser?.user_metadata?.full_name
    || JSON.parse(localStorage.getItem('studynest_user')||'null')?.name
    || 'Student';
}

function updateUserUI(){
  $$('[data-user-name]').forEach(el=>el.textContent=profileName());
}
document.addEventListener('studynest:auth-ready', updateUserUI);
updateUserUI();

async function protectAppPage(){
  if(!document.body.classList.contains('app-body'))return;
  if(window.studyNestConfigured){
    await window.requireStudyNestUser();
  }
}
document.addEventListener('studynest:auth-ready', protectAppPage);

$('#loginForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector('button[type="submit"],button:not([type])');
  button.disabled=true;
  button.textContent='Logging in…';

  try{
    if(window.studyNestConfigured){
      const {error}=await window.studyNest.auth.signInWithPassword({
        email:form.email.value.trim(),
        password:form.password.value
      });
      if(error)throw error;
    }else{
      const email=form.email.value.trim();
      const name=email.split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      localStorage.setItem('studynest_user',JSON.stringify({name,email}));
    }
    location.href='dashboard.html';
  }catch(error){
    toast(error.message||'Could not log in.');
    button.disabled=false;
    button.textContent='Log in';
  }
});

$('#signupForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector('button[type="submit"],button:not([type])');
  button.disabled=true;
  button.textContent='Creating account…';

  try{
    const fullName=form.name.value.trim();
    const email=form.email.value.trim();

    if(window.studyNestConfigured){
      const {data,error}=await window.studyNest.auth.signUp({
        email,
        password:form.password.value,
        options:{data:{full_name:fullName}}
      });
      if(error)throw error;

      if(data.session){
        location.href='dashboard.html';
      }else{
        toast('Account created. Check your email to confirm it, then log in.');
        setTimeout(()=>location.href='login.html',1800);
      }
    }else{
      localStorage.setItem('studynest_user',JSON.stringify({name:fullName,email}));
      location.href='dashboard.html';
    }
  }catch(error){
    toast(error.message||'Could not create account.');
    button.disabled=false;
    button.textContent='Create free account';
  }
});

document.addEventListener('click',e=>{
  if(e.target.closest('[data-logout]')){
    if(window.studyNestConfigured)window.studyNestSignOut();
    else{
      localStorage.removeItem('studynest_user');
      location.href='index.html';
    }
  }
});

/* ---------------- Tasks ---------------- */
function demoTasks(){
  return JSON.parse(localStorage.getItem('studynest_tasks')||JSON.stringify([
    {id:1,title:'Review biology chapter 4',due_text:'Today',is_done:false},
    {id:2,title:'Submit mathematics assignment',due_text:'Tomorrow',is_done:false},
    {id:3,title:'Read history notes',due_text:'Completed',is_done:true}
  ]));
}
function saveDemoTasks(tasks){localStorage.setItem('studynest_tasks',JSON.stringify(tasks))}

async function fetchTasks(){
  if(window.studyNestConfigured){
    const user=await window.requireStudyNestUser();
    if(!user)return [];
    const {data,error}=await window.studyNest
      .from('tasks')
      .select('*')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false});
    if(error){toast(error.message);return []}
    return data||[];
  }
  return demoTasks();
}

async function renderTasks(){
  const wrap=$('#taskList');
  if(!wrap)return;
  wrap.innerHTML='<div class="empty">Loading tasks…</div>';
  const tasks=await fetchTasks();
  wrap.innerHTML=tasks.length?tasks.map(t=>`
    <div class="task ${t.is_done?'done':''}">
      <input type="checkbox" data-task-toggle="${t.id}" ${t.is_done?'checked':''}>
      <div><strong class="task-title">${escapeHtml(t.title)}</strong><div class="task-date">${escapeHtml(t.due_text||'No due date')}</div></div>
      <button class="icon-btn" data-task-delete="${t.id}" aria-label="Delete">×</button>
    </div>`).join(''):'<div class="empty">No tasks yet. Add your first task.</div>';
}

document.addEventListener('change',async e=>{
  const box=e.target.closest('[data-task-toggle]');
  if(!box)return;
  if(window.studyNestConfigured){
    const {error}=await window.studyNest
      .from('tasks')
      .update({is_done:box.checked})
      .eq('id',box.dataset.taskToggle);
    if(error)toast(error.message);
  }else{
    const tasks=demoTasks();
    const task=tasks.find(t=>String(t.id)===box.dataset.taskToggle);
    if(task)task.is_done=box.checked;
    saveDemoTasks(tasks);
  }
  renderTasks();
});

document.addEventListener('click',async e=>{
  const del=e.target.closest('[data-task-delete]');
  if(!del)return;
  if(window.studyNestConfigured){
    const {error}=await window.studyNest.from('tasks').delete().eq('id',del.dataset.taskDelete);
    if(error)return toast(error.message);
  }else{
    saveDemoTasks(demoTasks().filter(t=>String(t.id)!==del.dataset.taskDelete));
  }
  renderTasks();
  toast('Task removed.');
});

$('#taskForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const fd=new FormData(form);
  if(window.studyNestConfigured){
    const user=await window.requireStudyNestUser();
    if(!user)return;
    const {error}=await window.studyNest.from('tasks').insert({
      user_id:user.id,
      title:String(fd.get('title')||'').trim(),
      due_text:String(fd.get('date')||'').trim()||null
    });
    if(error)return toast(error.message);
  }else{
    const tasks=demoTasks();
    tasks.unshift({id:Date.now(),title:fd.get('title'),due_text:fd.get('date')||'No due date',is_done:false});
    saveDemoTasks(tasks);
  }
  form.reset();closeModal('taskModal');toast('Task added.');renderTasks();
});

/* ---------------- Notes ---------------- */
function demoNotes(){
  return JSON.parse(localStorage.getItem('studynest_notes')||JSON.stringify([
    {id:1,title:'Biology: Cell Structure',body:'Key parts: nucleus, mitochondria, cytoplasm, membrane.'},
    {id:2,title:'History: Industrial Revolution',body:'Major changes in manufacturing, transportation, and society.'},
    {id:3,title:'Math: Quadratic Formula',body:'Use when a quadratic equation cannot be factored easily.'}
  ]));
}
function saveDemoNotes(notes){localStorage.setItem('studynest_notes',JSON.stringify(notes))}

async function fetchNotes(){
  if(window.studyNestConfigured){
    const user=await window.requireStudyNestUser();
    if(!user)return [];
    const {data,error}=await window.studyNest
      .from('notes')
      .select('*')
      .eq('user_id',user.id)
      .order('updated_at',{ascending:false});
    if(error){toast(error.message);return []}
    return data||[];
  }
  return demoNotes();
}

async function renderNotes(){
  const wrap=$('#notesGrid');
  if(!wrap)return;
  wrap.innerHTML='<div class="empty">Loading notes…</div>';
  const notes=await fetchNotes();
  wrap.innerHTML=notes.length?notes.map(n=>`
    <article class="card note">
      <div class="panel-head"><h3>${escapeHtml(n.title)}</h3><button class="icon-btn" data-note-delete="${n.id}">×</button></div>
      <p>${escapeHtml(n.body)}</p>
    </article>`).join(''):'<div class="empty">No notes yet. Create your first note.</div>';
}

document.addEventListener('click',async e=>{
  const del=e.target.closest('[data-note-delete]');
  if(!del)return;
  if(window.studyNestConfigured){
    const {error}=await window.studyNest.from('notes').delete().eq('id',del.dataset.noteDelete);
    if(error)return toast(error.message);
  }else{
    saveDemoNotes(demoNotes().filter(n=>String(n.id)!==del.dataset.noteDelete));
  }
  renderNotes();toast('Note deleted.');
});

$('#noteForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const fd=new FormData(form);
  if(window.studyNestConfigured){
    const user=await window.requireStudyNestUser();
    if(!user)return;
    const {error}=await window.studyNest.from('notes').insert({
      user_id:user.id,
      title:String(fd.get('title')||'').trim(),
      body:String(fd.get('body')||'').trim()
    });
    if(error)return toast(error.message);
  }else{
    const notes=demoNotes();
    notes.unshift({id:Date.now(),title:fd.get('title'),body:fd.get('body')});
    saveDemoNotes(notes);
  }
  form.reset();closeModal('noteModal');toast('Note created.');renderNotes();
});

/* ---------------- Profile settings ---------------- */
$('#profileSettingsForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const fd=new FormData(form);
  if(!window.studyNestConfigured)return toast('Demo profile saved locally.');

  const user=await window.requireStudyNestUser();
  if(!user)return;
  const {error}=await window.studyNest.from('profiles').update({
    full_name:String(fd.get('full_name')||'').trim(),
    school:String(fd.get('school')||'').trim()||null
  }).eq('id',user.id);
  if(error)return toast(error.message);
  window.studyNestProfile={...(window.studyNestProfile||{}),full_name:fd.get('full_name'),school:fd.get('school')};
  updateUserUI();
  toast('Profile saved.');
});

/* ---------------- Pricing plan selection ---------------- */
document.addEventListener('click',async e=>{
  const planButton=e.target.closest('[data-select-plan]');
  if(!planButton)return;
  e.preventDefault();
  const plan=planButton.dataset.selectPlan;

  if(!window.studyNestConfigured){
    toast(`The ${plan} plan is a demo. Connect Supabase and a payment provider for real billing.`);
    return;
  }

  const user=await window.requireStudyNestUser();
  if(!user)return;
  const {error}=await window.studyNest.from('profiles').update({plan}).eq('id',user.id);
  if(error)return toast(error.message);
  toast(`${plan} selected. Payment is not charged in this starter version.`);
});

document.addEventListener('studynest:auth-ready',()=>{
  renderTasks();
  renderNotes();
});
if(!window.studyNestConfigured){
  renderTasks();
  renderNotes();
}


const $=(q,r=document)=>r.querySelector(q);
const $$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(message){
  let el=$('#toast');
  if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}
  Object.assign(el.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'500',background:'#172033',
    color:'#fff',padding:'13px 16px',borderRadius:'12px',boxShadow:'0 12px 30px rgba(0,0,0,.2)'});
  el.textContent=message;el.hidden=false;
  clearTimeout(window.__snToast);window.__snToast=setTimeout(()=>el.hidden=true,2800);
}
const openModal=id=>document.getElementById(id)?.classList.add('open');
const closeModal=id=>document.getElementById(id)?.classList.remove('open');

function ensureConfigured(){
  if(window.studyNestConfigured)return true;
  const box=$('#setupRequired');
  if(box)box.hidden=false;
  toast('Connect Supabase in config.js before using the app.');
  return false;
}

function displayName(){
  return window.studyNestProfile?.full_name ||
    window.studyNestUser?.user_metadata?.full_name ||
    window.studyNestUser?.email?.split('@')[0] || 'Student';
}
function updateUserUI(){
  $$('[data-user-name]').forEach(el=>el.textContent=displayName());
  $$('[data-user-email]').forEach(el=>el.value=window.studyNestUser?.email||'');
  $$('[data-user-initial]').forEach(el=>el.textContent=displayName().slice(0,1).toUpperCase());
}
document.addEventListener('studynest:auth-ready',updateUserUI);

document.addEventListener('click',e=>{
  const o=e.target.closest('[data-open-modal]'); if(o)openModal(o.dataset.openModal);
  const c=e.target.closest('[data-close-modal]'); if(c)closeModal(c.dataset.closeModal);
  if(e.target.closest('[data-toggle-sidebar]'))$('#sidebar')?.classList.toggle('open');
  if(e.target.closest('[data-logout]'))window.studyNestSignOut();
});

/* Auth */
$('#loginForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); if(!ensureConfigured())return;
  const form=e.currentTarget, btn=form.querySelector('button'); btn.disabled=true;btn.textContent='Logging in…';
  const {error}=await studyNest.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});
  if(error){toast(error.message);btn.disabled=false;btn.textContent='Log in';return}
  location.href='dashboard.html';
});
$('#signupForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); if(!ensureConfigured())return;
  const form=e.currentTarget, btn=form.querySelector('button');btn.disabled=true;btn.textContent='Creating account…';
  const {data,error}=await studyNest.auth.signUp({
    email:form.email.value.trim(),password:form.password.value,
    options:{data:{full_name:form.name.value.trim()}}
  });
  if(error){toast(error.message);btn.disabled=false;btn.textContent='Create free account';return}
  if(data.session)location.href='dashboard.html';
  else{toast('Account created. Confirm your email, then log in.');setTimeout(()=>location.href='login.html',1700)}
});

async function userOrStop(){
  if(!ensureConfigured())return null;
  return await requireStudyNestUser();
}

/* Dashboard */
async function loadDashboard(){
  if(!$('#dashboardStats'))return;
  const user=await userOrStop();if(!user)return;
  const [courses,tasks,sessions]=await Promise.all([
    studyNest.from('courses').select('id,progress').eq('user_id',user.id),
    studyNest.from('tasks').select('id,is_done,title,due_text,created_at').eq('user_id',user.id).order('created_at',{ascending:false}),
    studyNest.from('study_sessions').select('minutes,studied_on').eq('user_id',user.id)
  ]);
  const errors=[courses.error,tasks.error,sessions.error].filter(Boolean);
  if(errors.length)return toast(errors[0].message);
  const c=courses.data||[],t=tasks.data||[],s=sessions.data||[];
  const completed=t.filter(x=>x.is_done).length;
  const minutes=s.reduce((a,x)=>a+Number(x.minutes||0),0);
  const progress=c.length?Math.round(c.reduce((a,x)=>a+Number(x.progress||0),0)/c.length):0;
  $('#statCourses').textContent=c.length;
  $('#statTasks').textContent=completed;
  $('#statHours').textContent=`${Math.round(minutes/60)}h`;
  $('#statProgress').textContent=`${progress}%`;
  const upcoming=$('#dashboardUpcoming');
  upcoming.innerHTML=t.filter(x=>!x.is_done).slice(0,5).map(taskRow).join('') ||
    '<div class="empty">No tasks yet. Add your first task.</div>';
  const prog=$('#dashboardCourseProgress');
  prog.innerHTML=c.length?c.map((x,i)=>`<div class="progress-row"><div class="progress-meta"><strong>Course ${i+1}</strong><span>${x.progress}%</span></div><div class="progress"><span style="width:${x.progress}%"></span></div></div>`).join(''):
    '<div class="empty">No courses yet. Create your first course.</div>';
}

/* Courses */
let courseCache=[];
function courseCard(c){return `<article class="card course-card">
  <div class="course-cover">${esc(c.icon||'📘')}</div><div class="course-body">
  <span class="badge">${c.progress}% complete</span><h3>${esc(c.title)}</h3>
  <p>${esc(c.description||'No description yet.')}</p>
  <div class="progress"><span style="width:${c.progress}%"></span></div>
  <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-secondary" data-edit-course="${c.id}">Edit</button>
  <button class="btn btn-danger" data-delete-course="${c.id}">Delete</button></div></div></article>`}
async function loadCourses(){
  const grid=$('#courseGrid');if(!grid)return;
  const user=await userOrStop();if(!user)return;
  const {data,error}=await studyNest.from('courses').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
  if(error)return toast(error.message);
  courseCache=data||[];
  grid.innerHTML=courseCache.map(courseCard).join('')||'<div class="empty card">No courses yet. Click “Add course” to begin.</div>';
  fillCourseSelects();
}
function fillCourseSelects(){
  $$('[data-course-select]').forEach(select=>{
    const current=select.value;
    select.innerHTML='<option value="">No course</option>'+courseCache.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('');
    select.value=current;
  });
}
$('#courseForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const user=await userOrStop();if(!user)return;
  const f=e.currentTarget,fd=new FormData(f),id=fd.get('id');
  const payload={user_id:user.id,title:fd.get('title').trim(),description:fd.get('description').trim()||null,
    icon:fd.get('icon').trim()||'📘',progress:Number(fd.get('progress')||0)};
  const q=id?studyNest.from('courses').update(payload).eq('id',id):studyNest.from('courses').insert(payload);
  const {error}=await q;if(error)return toast(error.message);
  f.reset();f.elements.id.value='';closeModal('courseModal');toast(id?'Course updated.':'Course created.');loadCourses();
});
document.addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit-course]');
  if(edit){const c=courseCache.find(x=>x.id===edit.dataset.editCourse),f=$('#courseForm');if(c&&f){
    f.elements.id.value=c.id;f.elements.title.value=c.title;f.elements.description.value=c.description||'';
    f.elements.icon.value=c.icon||'';f.elements.progress.value=c.progress;openModal('courseModal');}}
  const del=e.target.closest('[data-delete-course]');
  if(del&&confirm('Delete this course? Tasks and notes will remain but lose the course link.')){
    const {error}=await studyNest.from('courses').delete().eq('id',del.dataset.deleteCourse);
    if(error)return toast(error.message);toast('Course deleted.');loadCourses();}
});

/* Tasks */
let taskCache=[];
function taskRow(t){return `<div class="task ${t.is_done?'done':''}">
  <input type="checkbox" data-task-toggle="${t.id}" ${t.is_done?'checked':''}>
  <div><strong class="task-title">${esc(t.title)}</strong><div class="task-date">${esc(t.due_text||'No due date')}</div></div>
  <button class="icon-btn" data-task-delete="${t.id}">×</button></div>`}
async function loadTasks(){
  const wrap=$('#taskList');if(!wrap)return;
  const user=await userOrStop();if(!user)return;
  const {data,error}=await studyNest.from('tasks').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
  if(error)return toast(error.message);taskCache=data||[];
  wrap.innerHTML=taskCache.map(taskRow).join('')||'<div class="empty">No tasks yet. Add your first task.</div>';
}
$('#taskForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const user=await userOrStop();if(!user)return;const f=e.currentTarget,fd=new FormData(f);
  const {error}=await studyNest.from('tasks').insert({user_id:user.id,title:fd.get('title').trim(),
    due_text:fd.get('date').trim()||null,course_id:fd.get('course_id')||null});
  if(error)return toast(error.message);f.reset();closeModal('taskModal');toast('Task added.');loadTasks();loadDashboard();
});
document.addEventListener('change',async e=>{
  const t=e.target.closest('[data-task-toggle]');if(!t)return;
  const {error}=await studyNest.from('tasks').update({is_done:t.checked}).eq('id',t.dataset.taskToggle);
  if(error)return toast(error.message);loadTasks();loadDashboard();
});
document.addEventListener('click',async e=>{
  const d=e.target.closest('[data-task-delete]');if(!d)return;
  const {error}=await studyNest.from('tasks').delete().eq('id',d.dataset.taskDelete);
  if(error)return toast(error.message);toast('Task deleted.');loadTasks();loadDashboard();
});

/* Notes */
let noteCache=[];
function noteCard(n){return `<article class="card note"><div class="panel-head"><h3>${esc(n.title)}</h3>
  <div><button class="icon-btn" data-edit-note="${n.id}">✎</button><button class="icon-btn" data-delete-note="${n.id}">×</button></div></div>
  <p>${esc(n.body)}</p></article>`}
async function loadNotes(){
  const grid=$('#notesGrid');if(!grid)return;const user=await userOrStop();if(!user)return;
  const {data,error}=await studyNest.from('notes').select('*').eq('user_id',user.id).order('updated_at',{ascending:false});
  if(error)return toast(error.message);noteCache=data||[];
  grid.innerHTML=noteCache.map(noteCard).join('')||'<div class="empty card">No notes yet. Create your first note.</div>';
}
$('#noteForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const user=await userOrStop();if(!user)return;const f=e.currentTarget,fd=new FormData(f),id=fd.get('id');
  const payload={user_id:user.id,title:fd.get('title').trim(),body:fd.get('body').trim(),course_id:fd.get('course_id')||null};
  const q=id?studyNest.from('notes').update(payload).eq('id',id):studyNest.from('notes').insert(payload);
  const {error}=await q;if(error)return toast(error.message);
  f.reset();f.elements.id.value='';closeModal('noteModal');toast(id?'Note updated.':'Note created.');loadNotes();
});
document.addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit-note]');
  if(edit){const n=noteCache.find(x=>x.id===edit.dataset.editNote),f=$('#noteForm');if(n&&f){
    f.elements.id.value=n.id;f.elements.title.value=n.title;f.elements.body.value=n.body;f.elements.course_id.value=n.course_id||'';openModal('noteModal');}}
  const del=e.target.closest('[data-delete-note]');
  if(del&&confirm('Delete this note?')){const {error}=await studyNest.from('notes').delete().eq('id',del.dataset.deleteNote);
    if(error)return toast(error.message);toast('Note deleted.');loadNotes();}
});

/* Study sessions and progress */
$('#sessionForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const user=await userOrStop();if(!user)return;const f=e.currentTarget,fd=new FormData(f);
  const {error}=await studyNest.from('study_sessions').insert({user_id:user.id,course_id:fd.get('course_id')||null,
    minutes:Number(fd.get('minutes')),studied_on:fd.get('studied_on')});
  if(error)return toast(error.message);f.reset();closeModal('sessionModal');toast('Study session recorded.');loadProgress();loadDashboard();
});
async function loadProgress(){
  if(!$('#progressStats'))return;const user=await userOrStop();if(!user)return;
  const [c,t,s]=await Promise.all([
    studyNest.from('courses').select('*').eq('user_id',user.id),
    studyNest.from('tasks').select('*').eq('user_id',user.id),
    studyNest.from('study_sessions').select('*').eq('user_id',user.id).order('studied_on',{ascending:true})
  ]);
  const courses=c.data||[],tasks=t.data||[],sessions=s.data||[];
  $('#progressHours').textContent=`${Math.round(sessions.reduce((a,x)=>a+Number(x.minutes),0)/60)}h`;
  $('#progressCompleted').textContent=tasks.filter(x=>x.is_done).length;
  $('#progressAverage').textContent=`${courses.length?Math.round(courses.reduce((a,x)=>a+x.progress,0)/courses.length):0}%`;
  $('#progressCourses').innerHTML=courses.map(x=>`<div class="progress-row"><div class="progress-meta"><strong>${esc(x.title)}</strong><span>${x.progress}%</span></div><div class="progress"><span style="width:${x.progress}%"></span></div></div>`).join('')||'<div class="empty">No courses yet.</div>';
}

/* Settings */
async function loadSettings(){
  const f=$('#profileSettingsForm');if(!f)return;const user=await userOrStop();if(!user)return;
  f.full_name.value=window.studyNestProfile?.full_name||'';
  f.email.value=user.email||'';
  f.school.value=window.studyNestProfile?.school||'';
  $('#prefWeekly').checked=Boolean(window.studyNestProfile?.weekly_email);
  $('#prefTasks').checked=window.studyNestProfile?.task_reminders!==false;
  $('#currentPlan').textContent=(window.studyNestProfile?.plan||'starter').toUpperCase();
}
$('#profileSettingsForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const user=await userOrStop();if(!user)return;const f=e.currentTarget;
  const {error}=await studyNest.from('profiles').update({full_name:f.full_name.value.trim(),school:f.school.value.trim()||null}).eq('id',user.id);
  if(error)return toast(error.message);await studyNestRefreshAuth();toast('Profile saved.');
});
$('#preferencesForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const user=await userOrStop();if(!user)return;
  const {error}=await studyNest.from('profiles').update({weekly_email:$('#prefWeekly').checked,task_reminders:$('#prefTasks').checked}).eq('id',user.id);
  if(error)return toast(error.message);toast('Preferences saved.');
});

/* Pricing: records selection, no charging */
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-select-plan]');if(!b)return;e.preventDefault();
  if(!window.studyNestUser){location.href='signup.html';return}
  const {error}=await studyNest.from('profiles').update({plan:b.dataset.selectPlan}).eq('id',window.studyNestUser.id);
  if(error)return toast(error.message);toast(`${b.dataset.selectPlan} plan selected. No payment was charged.`);
});

async function boot(){
  if(document.body.classList.contains('app-body')){
    const user=await userOrStop();if(!user)return;
  }
  await loadCourses();
  await Promise.all([loadTasks(),loadNotes(),loadDashboard(),loadProgress(),loadSettings()]);
}
document.addEventListener('studynest:auth-ready',boot);

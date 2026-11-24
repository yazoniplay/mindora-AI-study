import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, Clock3, CalendarDays, Circle, FileImage,
  FileText, FolderOpen, GraduationCap, House, Layers3, LoaderCircle, LogIn,
  LogOut, Menu, Plus, Search, Trash2, Upload, X, Cloud,
} from 'lucide-react';
import {
  createSubject, deleteMaterial, deleteSubject, getMaterials, getSubjects, getTasks, saveTask, putTask, deleteTask,
  putMaterial, putSubject, saveMaterial, type Material, type Subject, type StudyTask,
} from './lib/database';
import {
  deleteCloudFile, deleteCloudMaterial, deleteCloudSubject, downloadCloudFile, fetchCloudRows,
  getCloudUser, signIn, signOut, signUp, uploadCloudFile, upsertCloud,
  type CloudUser,
} from './lib/supabase';
import { extractText, fileKind, isImageFile, supportedFile, supportedExtensions } from './lib/extract';

type Page = 'Today' | 'Planner' | 'Library' | 'Subjects';
function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
function dateLabel() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}
function StoredImage({ blob, name, className }: { blob: Blob; name: string; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return src ? <img className={className} src={src} alt={name} /> : <div className={className + ' image-loading'}><FileImage size={24}/></div>;
}
function App() {
  const [page, setPage] = useState<Page>('Today');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState<StudyTask['priority']>('medium');
  const [taskSubject, setTaskSubject] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [importSubject, setImportSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(25);

  const refresh = useCallback(async () => {
    const [nextSubjects, nextMaterials, nextTasks] = await Promise.all([getSubjects(), getMaterials(), getTasks()]);
    setSubjects(nextSubjects);
    setMaterials(nextMaterials);
    setTasks(nextTasks);
  }, []);
  useEffect(() => {
    refresh().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load your study library.'))
      .finally(() => setLoading(false));
    getCloudUser().then(user => { setCloudUser(user); if (user) void performSync(user); }).catch(() => setCloudUser(null));
  }, [refresh]);
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setTimerSeconds(value => {
      if (value <= 1) { window.clearInterval(interval); setTimerRunning(false); setToast('Study block complete. Take a short break.'); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);
  const selectedSubject = subjects.find(item => item.id === subjectId) ?? null;
  const visibleMaterials = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materials.filter(item => {
      const inSubject = page !== 'Subjects' || !subjectId || item.subjectId === subjectId;
      const matches = !term || item.name.toLowerCase().includes(term) || item.text.toLowerCase().includes(term);
      return inSubject && matches;
    });
  }, [materials, page, search, subjectId]);
  const openTask = () => { setError(''); setTaskTitle(''); setTaskSubject(subjectId ?? ''); const d = new Date(); d.setHours(18,0,0,0); setTaskDue(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)); setTaskPriority('medium'); setTaskOpen(true); };
  const submitTask = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { if (!taskDue) throw new Error('Choose a due date.'); await saveTask({ title: taskTitle, dueAt: new Date(taskDue).getTime(), subjectId: taskSubject || null, priority: taskPriority, completed: false }); await refresh(); setTaskOpen(false); setToast('Task added to your planner.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save task.'); } };
  const toggleTask = async (task: StudyTask) => { await putTask({ ...task, completed: !task.completed }); await refresh(); };
  const openImport = () => { setError(''); setFiles([]); setNotes(''); setMaterialTitle(''); setImportSubject(subjectId ?? ''); setImportOpen(true); };
  const performSync = async (user: CloudUser) => {
    setSyncing(true); setError('');
    try {
      const localSubjects = await getSubjects();
      const localMaterials = await getMaterials();
      await upsertCloud('subjects', localSubjects.map(subject => ({
        id: subject.id, user_id: user.id, name: subject.name, created_at: new Date(subject.createdAt).toISOString(),
      })));
      const rows: Record<string, unknown>[] = [];
      for (const material of localMaterials) {
        let storagePath = material.storagePath ?? null;
        if (material.imageBlob) {
          const ext = material.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
          storagePath = `${user.id}/${material.id}/source.${ext}`;
          await uploadCloudFile(storagePath, material.imageBlob, material.imageBlob.type || 'application/octet-stream');
          if (storagePath !== material.storagePath) await putMaterial({ ...material, storagePath });
        }
        rows.push({
          id: material.id, user_id: user.id, subject_id: material.subjectId, name: material.name,
          kind: material.kind, content_text: material.text, storage_path: storagePath,
          character_count: material.characterCount, created_at: new Date(material.createdAt).toISOString(),
        });
      }
      await upsertCloud('materials', rows);
      const [cloudSubjects, cloudMaterials] = await Promise.all([fetchCloudRows('subjects', user.id), fetchCloudRows('materials', user.id)]);
      for (const row of cloudSubjects) {
        await putSubject({ id: String(row.id), name: String(row.name), createdAt: new Date(String(row.created_at)).getTime() });
      }
      const existing = new Map((await getMaterials()).map(item => [item.id, item]));
      for (const row of cloudMaterials) {
        const id = String(row.id);
        const storagePath = row.storage_path ? String(row.storage_path) : null;
        let imageBlob = existing.get(id)?.imageBlob;
        if (storagePath && !imageBlob) {
          try { imageBlob = await downloadCloudFile(storagePath); } catch { imageBlob = undefined; }
        }
        await putMaterial({
          id, name: String(row.name), kind: String(row.kind), text: String(row.content_text ?? ''),
          subjectId: row.subject_id ? String(row.subject_id) : null,
          createdAt: new Date(String(row.created_at)).getTime(),
          characterCount: Number(row.character_count ?? 0), imageBlob, storagePath,
        });
      }
      await refresh();
      setToast('Your library is synced with Mindora Cloud.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Cloud sync failed.');
    } finally { setSyncing(false); }
  };
  const importMaterials = async () => {
    if (!files.length && !notes.trim()) { setError('Choose files or paste your notes first.'); return; }
    setBusy(true); setError('');
    const failures: string[] = []; let count = 0;
    try {
      for (const file of files) {
        if (!supportedFile(file)) { failures.push(file.name + ': unsupported file type'); continue; }
        try {
          if (isImageFile(file)) {
            await saveMaterial({ name: file.name, kind: 'image', text: `Image file · ${file.type} · ${Math.ceil(file.size / 1024)} KB`, imageBlob: file, subjectId: importSubject || null });
          } else {
            await saveMaterial({ name: file.name, kind: fileKind(file), text: await extractText(file), subjectId: importSubject || null });
          }
          count++;
        } catch (reason) { failures.push(`${file.name}: ${reason instanceof Error ? reason.message : 'could not read file'}`); }
      }
      if (notes.trim()) {
        await saveMaterial({ name: materialTitle.trim() || 'Study notes', kind: 'notes', text: notes.trim(), subjectId: importSubject || null });
        count++;
      }
      await refresh();
      if (count) {
        setImportOpen(false); setPage('Library'); setSubjectId(importSubject || null);
        setToast(`Added ${count} ${count === 1 ? 'material' : 'materials'} to your library.`);
        if (cloudUser) await performSync(cloudUser);
      }
      if (failures.length) setError(failures.join('\n'));
      if (!count && !failures.length) setError('No readable study content was found.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import failed.'); }
    finally { setBusy(false); }
  };
  const addSubject = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      await createSubject(subjectName); await refresh(); setSubjectName(''); setSubjectOpen(false);
      setPage('Subjects'); if (cloudUser) await performSync(cloudUser);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create subject.'); }
  };
  const removeMaterial = async (material: Material) => {
    if (!window.confirm(`Delete “${material.name}” from your library?`)) return;
    await deleteMaterial(material.id);
    if (cloudUser) { try { await deleteCloudMaterial(material.id); if (material.storagePath) await deleteCloudFile(material.storagePath); } catch {} }
    if (activeMaterial?.id === material.id) setActiveMaterial(null);
    await refresh();
  };
  const removeSubject = async (subject: Subject) => {
    if (!window.confirm(`Delete “${subject.name}”? Materials will remain in your library.`)) return;
    await deleteSubject(subject.id);
    if (cloudUser) { try { await deleteCloudSubject(subject.id); } catch {} }
    if (subjectId === subject.id) setSubjectId(null);
    await refresh();
  };
  const navigate = (next: Page) => { setPage(next); setSubjectId(null); setActiveMaterial(null); setSidebarOpen(false); };
  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (authMode === 'signin') {
        const user = await signIn(email, password); setCloudUser(user); setAuthOpen(false); setPassword('');
        await performSync(user);
      } else {
        const result = await signUp(email, password);
        if (result.needsConfirmation) { setToast('Check your email to confirm your Mindora account, then sign in.'); setAuthMode('signin'); }
        else { setCloudUser(result.user); setAuthOpen(false); await performSync(result.user); }
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not authenticate.'); }
    finally { setBusy(false); }
  };
  const clock = `${Math.floor(timerSeconds / 60).toString().padStart(2,'0')}:${(timerSeconds % 60).toString().padStart(2,'0')}`;

  return <div className="mindora-app">
    <div className="background-wash wash-a"/><div className="background-wash wash-b"/>
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="brand" onClick={()=>navigate('Today')}><span className="brand-symbol"><GraduationCap size={22}/></span><span>mindora<span className="brand-period">.</span><small>STUDY SPACE</small></span></button>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list">
        {([{label:'Today' as Page,icon:House},{label:'Planner' as Page,icon:CalendarDays},{label:'Library' as Page,icon:Layers3},{label:'Subjects' as Page,icon:BookOpen}]).map(({label,icon:Icon})=><button key={label} className={`nav-link ${page===label?'nav-active':''}`} onClick={()=>navigate(label)}><Icon size={18}/><span>{label}</span>{label==='Library'&&materials.length>0&&<small>{materials.length}</small>}</button>)}
      </nav>
      <div className="nav-caption subject-caption">YOUR SUBJECTS <button onClick={()=>setSubjectOpen(true)} aria-label="Add subject"><Plus size={15}/></button></div>
      <div className="subject-list">{subjects.map(subject=><button key={subject.id} className={`subject-link ${subjectId===subject.id?'subject-active':''}`} onClick={()=>{setPage('Subjects');setSubjectId(subject.id);setActiveMaterial(null);setSidebarOpen(false)}}><span className="subject-color"/>{subject.name}<ChevronRight size={14}/></button>)}
        <button className="subject-create" onClick={()=>setSubjectOpen(true)}><Plus size={15}/> Add a subject</button>
      </div>
      <div className="sidebar-bottom">
        <div className="cloud-card"><div className="cloud-card-head"><Cloud size={17}/><span>{cloudUser?'Mindora Cloud':'Your study space'}</span><span className={cloudUser?'cloud-status':'cloud-status local'}/></div><p>{cloudUser?'Your library is linked to your account.':'Sign in to sync notes and images across devices.'}</p>{cloudUser?<button className="cloud-action" onClick={()=>performSync(cloudUser)} disabled={syncing}>{syncing?<LoaderCircle size={14} className="spin"/>:<Check size={14}/>} {syncing?'Syncing…':'Sync now'}</button>:<button className="cloud-action" onClick={()=>{setError('');setAuthOpen(true)}}><LogIn size={14}/> Connect account</button>}</div>
        <div className="profile-row"><span className="profile-avatar"><GraduationCap size={18}/></span><span className="profile-text"><strong>{cloudUser?.email??'Your profile'}</strong><small>{cloudUser?'Cloud account connected':'Local library'}</small></span>{cloudUser&&<button className="profile-logout" onClick={async()=>{await signOut();setCloudUser(null)}} aria-label="Sign out"><LogOut size={15}/></button>}</div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setSidebarOpen(v=>!v)} aria-label="Open menu">{sidebarOpen?<X size={19}/>:<Menu size={19}/>}</button><div className="crumb"><span>Workspace</span><span>/</span><strong>{activeMaterial?.name??(subjectId?selectedSubject?.name:page)}</strong></div><div className="topbar-actions"><label className="search-field"><Search size={16}/><input value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.trim()){setPage('Library');setSubjectId(null);setActiveMaterial(null)}}} placeholder="Search your study materials"/></label><button className="add-material-button" onClick={openImport}><Plus size={16}/><span>Add material</span></button></div></header>
      <div className="content-area">
        {error&&!importOpen&&!subjectOpen&&!authOpen&&<div className="error-banner">{error}</div>}
        {activeMaterial?<section className="reader-view"><button className="back-button" onClick={()=>setActiveMaterial(null)}>← Back to {page==='Subjects'?'subject':'library'}</button><div className="reader-title"><span className="reader-icon">{activeMaterial.kind==='image'?<FileImage size={22}/>:<FileText size={22}/>}</span><div><div className="kicker">STUDY MATERIAL</div><h1>{activeMaterial.name}</h1><p>{activeMaterial.kind.toUpperCase()} · {activeMaterial.characterCount.toLocaleString()} characters</p></div><button className="delete-icon" onClick={()=>removeMaterial(activeMaterial)} aria-label="Delete material"><Trash2 size={17}/></button></div>{activeMaterial.imageBlob&&<div className="reader-image"><StoredImage blob={activeMaterial.imageBlob} name={activeMaterial.name} className="image-preview"/></div>}<article className="reader-text">{activeMaterial.text}</article></section>
        :page==='Today'?<div className="home-dashboard">
          <section className="home-topline">
            <div><div className="kicker"><span className="kicker-dot"/> YOUR STUDY OVERVIEW</div><h1>{greeting()}, <span>ready to focus?</span></h1><p>{dateLabel()} <i className="home-date-dot"/> A little progress adds up.</p></div>
            <button className="solid-button" onClick={openImport}><Plus size={16}/> Add material</button>
          </section>
          <section className="home-stat-row">
            <article className="home-stat"><span className="home-stat-icon stat-lilac"><Layers3 size={17}/></span><div><small>STUDY MATERIALS</small><strong>{materials.length}</strong></div><button onClick={()=>navigate('Library')}>Open library <ArrowRight size={14}/></button></article>
            <article className="home-stat"><span className="home-stat-icon stat-mint"><BookOpen size={17}/></span><div><small>SUBJECTS</small><strong>{subjects.length}</strong></div><button onClick={()=>navigate('Subjects')}>View subjects <ArrowRight size={14}/></button></article>
            <article className="home-stat"><span className="home-stat-icon stat-peach"><CalendarDays size={17}/></span><div><small>OPEN TASKS</small><strong>{tasks.filter(t=>!t.completed).length}</strong></div><button onClick={()=>navigate('Planner')}>Plan work <ArrowRight size={14}/></button></article>
          </section>
          <section className="home-main-grid">
            <div className="home-primary-stack">
              <article className="home-card home-plan-card">
                <div className="home-card-heading"><div><span className="section-overline">YOUR NEXT STEPS</span><h2>Study plan</h2></div><button className="home-text-link" onClick={()=>navigate('Planner')}>See planner <ArrowRight size={14}/></button></div>
                {tasks.filter(t=>!t.completed).length===0?<div className="home-plan-empty"><span className="home-empty-icon"><CalendarDays size={20}/></span><div><strong>Nothing on your plan yet</strong><p>Add a deadline or a small study goal to give your next session direction.</p><button className="home-inline-action" onClick={openTask}>Create a task <ArrowRight size={14}/></button></div></div>:<div className="home-plan-list">{tasks.filter(t=>!t.completed).slice(0,4).map(task=><div className="home-plan-row" key={task.id}><button className="home-task-check" onClick={()=>toggleTask(task)} aria-label="Complete task"><Circle size={17}/></button><div className="home-plan-copy"><strong>{task.title}</strong><small>{subjects.find(s=>s.id===task.subjectId)?.name??'Personal study'} <span>·</span> {new Date(task.dueAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></div><span className={`home-priority priority-${task.priority}`}>{task.priority}</span></div>)}</div>}
                <button className="home-add-task-row" onClick={openTask}><Plus size={15}/> Add task</button>
              </article>
              <article className="home-card home-material-card">
                <div className="home-card-heading"><div><span className="section-overline">RECENTLY ADDED</span><h2>Your study materials</h2></div><button className="home-text-link" onClick={()=>navigate('Library')}>View all <ArrowRight size={14}/></button></div>
                {loading?<div className="home-loading"><LoaderCircle size={18} className="spin"/> Loading your library…</div>:materials.length===0?<div className="home-material-empty"><span className="home-empty-icon"><Upload size={20}/></span><div><strong>Bring your class materials together</strong><p>Upload notes, worksheets, slides or textbook pages. Your library will appear here.</p></div><button className="solid-button" onClick={openImport}>Import files <ArrowRight size={14}/></button></div>:<div className="home-recent-list">{materials.slice(0,5).map(material=><button className="home-recent-item" key={material.id} onClick={()=>setActiveMaterial(material)}><span className="home-recent-icon">{material.kind==='image'?<FileImage size={17}/>:<FileText size={17}/>}</span><span className="home-recent-info"><strong>{material.name}</strong><small>{subjects.find(s=>s.id===material.subjectId)?.name??material.kind.toUpperCase()} <span>·</span> {material.characterCount.toLocaleString()} characters</small></span><ChevronRight size={16}/></button>)}</div>}
              </article>
            </div>
            <aside className="home-secondary-stack">
              <article className="home-card home-timer-card">
                <div className="home-card-heading"><div><span className="section-overline">BUILD YOUR MOMENTUM</span><h2>Focus timer</h2></div><span className="home-timer-tag"><Clock3 size={13}/> Pomodoro</span></div>
                <div className="home-timer-face"><svg viewBox="0 0 160 160" role="img" aria-label={clock}><circle className="timer-track" cx="80" cy="80" r="69"/><circle className="timer-progress" cx="80" cy="80" r="69" style={{strokeDashoffset:434*(1-timerSeconds/(timerMinutes*60))}}/></svg><div className="timer-center"><strong>{clock}</strong><small>{timerRunning?'SESSION IN PROGRESS':'READY WHEN YOU ARE'}</small></div></div>
                <div className="home-timer-presets"><button className={timerMinutes===25?'preset-active':''} onClick={()=>{setTimerRunning(false);setTimerMinutes(25);setTimerSeconds(1500)}}>25 min</button><button className={timerMinutes===50?'preset-active':''} onClick={()=>{setTimerRunning(false);setTimerMinutes(50);setTimerSeconds(3000)}}>50 min</button></div>
                <button className="home-timer-start" onClick={()=>{if(timerSeconds===0)setTimerSeconds(timerMinutes*60);setTimerRunning(v=>!v)}}>{timerRunning?'Pause focus':'Start focus'} <ArrowRight size={15}/></button>
              </article>
              <article className="home-card home-subjects-card">
                <div className="home-card-heading"><div><span className="section-overline">KEEP IT ORGANIZED</span><h2>Subjects</h2></div><button className="home-add-subject" onClick={()=>setSubjectOpen(true)} aria-label="Create subject"><Plus size={16}/></button></div>
                {subjects.length===0?<div className="home-subject-empty"><p>Make a space for each class so your materials stay organized.</p><button className="home-inline-action" onClick={()=>setSubjectOpen(true)}>Create a subject <ArrowRight size={14}/></button></div>:<div className="home-subject-list">{subjects.slice(0,5).map(subject=><button key={subject.id} className="home-subject-item" onClick={()=>{setPage('Subjects');setSubjectId(subject.id);setActiveMaterial(null)}}><span className="home-subject-mark"><BookOpen size={15}/></span><span><strong>{subject.name}</strong><small>{materials.filter(m=>m.subjectId===subject.id).length} materials</small></span><ChevronRight size={15}/></button>)}</div>}
                <button className="home-subject-manage" onClick={()=>navigate('Subjects')}>Manage subjects <ArrowRight size={13}/></button>
              </article>
            </aside>
          </section>
        </div>
        :page==='Planner'?<section className="planner-page"><div className="page-heading"><div><div className="kicker">YOUR PLAN</div><h1>Study planner</h1><p>Assignments, revision and deadlines in one place.</p></div><button className="solid-button" onClick={openTask}><Plus size={16}/> Add task</button></div><div className="planner-summary"><div><span>OPEN TASKS</span><strong>{tasks.filter(t=>!t.completed).length}</strong></div><div><span>COMPLETED</span><strong>{tasks.filter(t=>t.completed).length}</strong></div><div><span>UPCOMING</span><strong>{tasks.filter(t=>!t.completed&&t.dueAt>=Date.now()).length}</strong></div></div><div className="planner-task-list">{loading?<div className="empty-state">Loading your planner…</div>:tasks.length===0?<div className="empty-state"><span className="empty-book"><CalendarDays size={25}/></span><h3>Your plan starts with one task</h3><p>Add an assignment, exam or study goal with a real due date.</p><button className="solid-button" onClick={openTask}><Plus size={16}/> Add your first task</button></div>:tasks.map(task=><article key={task.id} className={`planner-task ${task.completed?'task-completed':''}`}><button className="task-check" onClick={()=>toggleTask(task)} aria-label={task.completed?'Mark task incomplete':'Complete task'}>{task.completed?<Check size={17}/>:<Circle size={17}/>}</button><div className="task-main"><strong>{task.title}</strong><small>{subjects.find(s=>s.id===task.subjectId)?.name??'No subject'} · {new Date(task.dueAt).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></div><span className={`task-priority priority-${task.priority}`}>{task.priority}</span><button className="task-delete" onClick={async()=>{await deleteTask(task.id);await refresh()}} aria-label={`Delete ${task.title}`}><Trash2 size={15}/></button></article>)}</div></section>:page==='Library'?<section className="library-page"><div className="page-heading"><div><div className="kicker">YOUR MATERIALS</div><h1>Study library</h1><p>Everything you've imported, ready for your next review.</p></div><button className="solid-button" onClick={openImport}><Upload size={16}/> Import materials</button></div><div className="library-toolbar"><span>{visibleMaterials.length} {visibleMaterials.length===1?'material':'materials'}{search?' matching your search':''}</span><span>Stored {cloudUser?'locally + cloud when synced':'on this device'}</span></div>{loading?<div className="empty-state"><LoaderCircle className="spin" size={22}/><p>Loading your materials…</p></div>:visibleMaterials.length===0?<div className="empty-state"><span className="empty-book"><FolderOpen size={25}/></span><h3>{search?'No materials match':'Your library is ready to grow'}</h3><p>{search?'Try another search.':'Add class notes, images, documents, or presentation slides to begin.'}</p>{!search&&<button className="solid-button" onClick={openImport}><Upload size={16}/> Import your first material</button>}</div>:<div className="library-grid">{visibleMaterials.map(material=><article className="library-card" key={material.id}><button className="library-card-open" onClick={()=>setActiveMaterial(material)}>{material.imageBlob&&<StoredImage blob={material.imageBlob} name={material.name} className="library-image"/>}<div className="library-card-meta"><span>{material.kind.toUpperCase()}</span><small>{material.characterCount.toLocaleString()} chars</small></div><h3>{material.name}</h3><p>{material.text.slice(0,160).replace(/\s+/g,' ').trim()}{material.text.length>160?'…':''}</p><footer><span>{subjects.find(s=>s.id===material.subjectId)?.name??'Unsorted'}</span><span>{new Date(material.createdAt).toLocaleDateString()}</span></footer></button><button className="card-delete" onClick={()=>removeMaterial(material)} aria-label={`Delete ${material.name}`}><Trash2 size={15}/></button></article>)}</div>}</section>
        :<section className="subjects-page"><div className="page-heading"><div><div className="kicker">YOUR LEARNING MAP</div><h1>{selectedSubject?.name??'Subjects'}</h1><p>Keep each class, exam, and topic in its own study space.</p></div><button className="solid-button" onClick={()=>setSubjectOpen(true)}><Plus size={16}/> New subject</button></div>{subjectId&&<button className="back-button" onClick={()=>setSubjectId(null)}>← All subjects</button>}{subjectId?<><div className="library-toolbar"><span>{visibleMaterials.length} materials in this subject</span></div>{visibleMaterials.length===0?<div className="empty-state"><span className="empty-book"><BookOpen size={25}/></span><h3>Start adding to {selectedSubject?.name}</h3><p>Import materials and assign them to this subject.</p><button className="solid-button" onClick={openImport}><Upload size={16}/> Add materials</button></div>:<div className="library-grid">{visibleMaterials.map(material=><article className="library-card" key={material.id}><button className="library-card-open" onClick={()=>setActiveMaterial(material)}><div className="library-card-meta"><span>{material.kind.toUpperCase()}</span></div><h3>{material.name}</h3><p>{material.text.slice(0,160).replace(/\s+/g,' ').trim()}</p></button><button className="card-delete" onClick={()=>removeMaterial(material)} aria-label="Delete material"><Trash2 size={15}/></button></article>)}</div>}</>:subjects.length===0?<div className="empty-state"><span className="empty-book"><BookOpen size={25}/></span><h3>Create your first subject</h3><p>Build a learning space for a class, topic, or upcoming exam.</p><button className="solid-button" onClick={()=>setSubjectOpen(true)}><Plus size={16}/> Create subject</button></div>:<div className="subject-grid">{subjects.map(subject=><article className="subject-card" key={subject.id}><button onClick={()=>setSubjectId(subject.id)}><span className="subject-card-symbol"><BookOpen size={20}/></span><h3>{subject.name}</h3><p>{materials.filter(m=>m.subjectId===subject.id).length} study materials</p><span className="subject-card-open">Open subject <ArrowRight size={14}/></span></button><button className="card-delete" onClick={()=>removeSubject(subject)} aria-label={`Delete ${subject.name}`}><Trash2 size={15}/></button></article>)}</div>}</section>}
        <footer className="app-footer"><span>Mindora <i>✦</i> Make every late night count.</span><span>{cloudUser?'Cloud account connected':'Offline-first study space'}</span></footer>
      </div>
    </main>
    {taskOpen&&<div className="modal-layer" onClick={()=>setTaskOpen(false)}><form className="modal-card compact-modal" onSubmit={submitTask} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setTaskOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><CalendarDays size={22}/></span><div className="kicker">PLAN YOUR STUDY</div><h2>Add a task</h2><p>Give an assignment, exam or study goal a due date.</p><label className="form-select-label">Task title<input className="form-input" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} maxLength={160} required autoFocus/></label><label className="form-select-label">Due date<input className="form-input" type="datetime-local" value={taskDue} onChange={e=>setTaskDue(e.target.value)} required/></label><label className="form-select-label">Priority<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value as StudyTask['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>{subjects.length>0&&<label className="form-select-label">Subject<select value={taskSubject} onChange={e=>setTaskSubject(e.target.value)}><option value="">No subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" type="submit">Save task <ArrowRight size={16}/></button></form></div>}
    {importOpen&&<div className="modal-layer" onClick={()=>!busy&&setImportOpen(false)}><section className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setImportOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><Upload size={22}/></span><div className="kicker">ADD TO YOUR LIBRARY</div><h2>Bring your study material</h2><p>Upload notes, slides, documents, or images. Files are processed in your browser and saved to your library.</p><label className="drop-zone"><input type="file" multiple accept={`${supportedExtensions},image/*`} onChange={e=>setFiles(Array.from(e.target.files??[]))}/><span className="drop-icon"><ArrowDownToLine size={20}/></span><strong>Choose files to import</strong><small>PDF, DOCX, PPTX, TXT, MD, CSV and images</small></label>{files.length>0&&<div className="selected-files">{files.map((file,i)=><div key={file.name+i}><span>{file.type.startsWith('image/')?<FileImage size={14}/>:<FileText size={14}/>}</span><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KB</small></div>)}</div>}<div className="form-separator"><span>or paste notes</span></div><input className="form-input" value={materialTitle} onChange={e=>setMaterialTitle(e.target.value)} placeholder="Notes title (optional)"/><textarea className="form-textarea" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Paste your notes here…"/>{subjects.length>0&&<label className="form-select-label">Subject<select value={importSubject} onChange={e=>setImportSubject(e.target.value)}><option value="">Unsorted</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" disabled={busy} onClick={importMaterials}>{busy?<><LoaderCircle size={16} className="spin"/> Saving material…</>:<>Save to library <ArrowRight size={16}/></>}</button></section></div>}
    {subjectOpen&&<div className="modal-layer" onClick={()=>setSubjectOpen(false)}><form className="modal-card compact-modal" onSubmit={addSubject} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setSubjectOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><BookOpen size={22}/></span><div className="kicker">NEW LEARNING SPACE</div><h2>Create a subject</h2><p>Choose a class, exam, or topic to organize.</p><label className="form-select-label">Subject name<input className="form-input" value={subjectName} onChange={e=>setSubjectName(e.target.value)} maxLength={80} required autoFocus/></label>{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" type="submit">Create subject <ArrowRight size={16}/></button></form></div>}
    {authOpen&&<div className="modal-layer" onClick={()=>setAuthOpen(false)}><form className="modal-card compact-modal" onSubmit={submitAuth} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><Cloud size={22}/></span><div className="kicker">MINDORA CLOUD</div><h2>{authMode==='signin'?'Welcome back':'Create your account'}</h2><p>Sync your subjects, notes, and image materials between devices.</p><label className="form-select-label">Email<input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label className="form-select-label">Password<input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} autoComplete={authMode==='signin'?'current-password':'new-password'} required/></label>{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" disabled={busy}>{busy?<><LoaderCircle size={16} className="spin"/> Connecting…</>:authMode==='signin'?'Sign in and sync':'Create account'}</button><button type="button" className="auth-switch" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setError('')}}>{authMode==='signin'?'New to Mindora? Create an account':'Already have an account? Sign in'}</button></form></div>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={13}/></button></div>}
  </div>;
}
export default App;

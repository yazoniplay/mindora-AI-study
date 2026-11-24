import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, Clock3, FileImage,
  FileText, FolderOpen, GraduationCap, House, Layers3, LoaderCircle, LogIn,
  LogOut, Menu, Plus, Search, Sparkles, Trash2, Upload, X, Cloud,
} from 'lucide-react';
import {
  createSubject, deleteMaterial, deleteSubject, getMaterials, getSubjects,
  putMaterial, putSubject, saveMaterial, type Material, type Subject,
} from './lib/database';
import {
  deleteCloudFile, deleteCloudMaterial, deleteCloudSubject, downloadCloudFile, fetchCloudRows,
  getCloudUser, signIn, signOut, signUp, uploadCloudFile, upsertCloud,
  type CloudUser,
} from './lib/supabase';
import { extractText, fileKind, isImageFile, supportedFile, supportedExtensions } from './lib/extract';

type Page = 'Today' | 'Library' | 'Subjects';
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
    const [nextSubjects, nextMaterials] = await Promise.all([getSubjects(), getMaterials()]);
    setSubjects(nextSubjects);
    setMaterials(nextMaterials);
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
  const totalChars = materials.reduce((sum, item) => sum + item.characterCount, 0);
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
        {([{label:'Today' as Page,icon:House},{label:'Library' as Page,icon:Layers3},{label:'Subjects' as Page,icon:BookOpen}]).map(({label,icon:Icon})=><button key={label} className={`nav-link ${page===label?'nav-active':''}`} onClick={()=>navigate(label)}><Icon size={18}/><span>{label}</span>{label==='Library'&&materials.length>0&&<small>{materials.length}</small>}</button>)}
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
        :page==='Today'?<div className="dashboard">
          <section className="dashboard-heading"><div><div className="kicker"><span className="kicker-dot"/> YOUR LEARNING DASHBOARD</div><h1>{greeting()},<br/><span>ready to learn?</span></h1><p>Make a little progress today. It adds up.</p></div><div className="today-date"><span>TODAY</span><strong>{dateLabel()}</strong></div></section>
          <section className="study-banner"><div className="banner-copy"><div className="banner-label"><Sparkles size={14}/> YOUR NEXT STUDY SESSION</div><h2>Turn your materials<br/><em>into momentum.</em></h2><p>Bring your notes, slides, and images into one place—then make time to focus.</p><button className="banner-button" onClick={openImport}><Upload size={16}/> Add study material <ArrowRight size={16}/></button></div><div className="banner-visual" aria-hidden="true"><img className="banner-photo" src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85" alt="" loading="eager"/><div className="banner-photo-shade"/><div className="photo-caption"><span className="photo-caption-dot"/><span>YOUR STUDY SPACE</span></div><div className="float-note note-one"><Check size={13}/> One step at a time</div><div className="float-note note-two"><Sparkles size={14}/> Your focus matters</div></div></section>
          <section className="overview-grid"><article className="overview-card"><div className="overview-card-top"><span className="overview-icon lilac"><Layers3 size={18}/></span><span className="overline">IN YOUR LIBRARY</span></div><strong className="overview-number">{materials.length}</strong><span className="overview-label">Study materials</span><div className="overview-foot"><span>Files, notes & images</span><button onClick={()=>navigate('Library')}>Explore <ArrowRight size={13}/></button></div></article><article className="overview-card"><div className="overview-card-top"><span className="overview-icon mint"><BookOpen size={18}/></span><span className="overline">ORGANIZED BY</span></div><strong className="overview-number">{subjects.length}</strong><span className="overview-label">Subjects</span><div className="overview-foot"><span>Your learning topics</span><button onClick={()=>navigate('Subjects')}>Explore <ArrowRight size={13}/></button></div></article><article className="overview-card"><div className="overview-card-top"><span className="overview-icon peach"><FileText size={18}/></span><span className="overline">READY TO REVIEW</span></div><strong className="overview-number">{totalChars.toLocaleString()}</strong><span className="overview-label">Characters of content</span><div className="overview-foot"><span>From your imported text</span><button onClick={()=>navigate('Library')}>Review <ArrowRight size={13}/></button></div></article></section>
          <section className="dashboard-lower"><article className="surface recent-surface"><div className="surface-heading"><div><span className="section-overline">KEEP LEARNING</span><h2>Recently added</h2></div><button className="quiet-button" onClick={()=>navigate('Library')}>Open library <ArrowRight size={14}/></button></div>{materials.length===0?<div className="empty-learning"><span className="empty-book"><BookOpen size={22}/></span><div><strong>Your first study material is waiting</strong><p>Upload a worksheet, textbook page, presentation, or notes to get started.</p></div><button onClick={openImport}>Import <ArrowRight size={14}/></button></div>:<div className="recent-materials">{materials.slice(0,4).map(material=><button className="material-row" key={material.id} onClick={()=>setActiveMaterial(material)}><span className="material-row-icon">{material.kind==='image'?<FileImage size={17}/>:<FileText size={17}/>}</span><span className="material-row-info"><strong>{material.name}</strong><small>{material.kind.toUpperCase()} · {material.characterCount.toLocaleString()} characters</small></span><ChevronRight size={16}/></button>)}</div>}</article>
          <article className="surface focus-surface"><div className="surface-heading"><div><span className="section-overline">FOCUS CORNER</span><h2>Study timer</h2></div><span className="timer-badge"><Clock3 size={14}/> Pomodoro</span></div><div className="timer-display"><svg viewBox="0 0 160 160" role="img" aria-label={clock}><circle className="timer-track" cx="80" cy="80" r="69"/><circle className="timer-progress" cx="80" cy="80" r="69" style={{strokeDashoffset:434*(1-timerSeconds/(timerMinutes*60))}}/></svg><div className="timer-center"><strong>{clock}</strong><small>{timerRunning?'FOCUSING':'READY TO FOCUS'}</small></div></div><div className="timer-controls"><button onClick={()=>{setTimerRunning(false);setTimerMinutes(25);setTimerSeconds(1500)}}>25 min</button><button onClick={()=>{setTimerRunning(false);setTimerMinutes(50);setTimerSeconds(3000)}}>50 min</button><button className="timer-main" onClick={()=>{if(timerSeconds===0)setTimerSeconds(timerMinutes*60);setTimerRunning(v=>!v)}}>{timerRunning?'Pause':'Start focus'}</button></div></article></section>
          <section className="bottom-strip"><div><span className="strip-icon"><GraduationCap size={18}/></span><span><strong>Small sessions. Strong understanding.</strong><small>Make every late night count.</small></span></div><button onClick={()=>setSubjectOpen(true)}>Create a subject <Plus size={15}/></button></section>
        </div>
        :page==='Library'?<section className="library-page"><div className="page-heading"><div><div className="kicker">YOUR MATERIALS</div><h1>Study library</h1><p>Everything you've imported, ready for your next review.</p></div><button className="solid-button" onClick={openImport}><Upload size={16}/> Import materials</button></div><div className="library-toolbar"><span>{visibleMaterials.length} {visibleMaterials.length===1?'material':'materials'}{search?' matching your search':''}</span><span>Stored {cloudUser?'locally + cloud when synced':'on this device'}</span></div>{loading?<div className="empty-state"><LoaderCircle className="spin" size={22}/><p>Loading your materials…</p></div>:visibleMaterials.length===0?<div className="empty-state"><span className="empty-book"><FolderOpen size={25}/></span><h3>{search?'No materials match':'Your library is ready to grow'}</h3><p>{search?'Try another search.':'Add class notes, images, documents, or presentation slides to begin.'}</p>{!search&&<button className="solid-button" onClick={openImport}><Upload size={16}/> Import your first material</button>}</div>:<div className="library-grid">{visibleMaterials.map(material=><article className="library-card" key={material.id}><button className="library-card-open" onClick={()=>setActiveMaterial(material)}>{material.imageBlob&&<StoredImage blob={material.imageBlob} name={material.name} className="library-image"/>}<div className="library-card-meta"><span>{material.kind.toUpperCase()}</span><small>{material.characterCount.toLocaleString()} chars</small></div><h3>{material.name}</h3><p>{material.text.slice(0,160).replace(/\s+/g,' ').trim()}{material.text.length>160?'…':''}</p><footer><span>{subjects.find(s=>s.id===material.subjectId)?.name??'Unsorted'}</span><span>{new Date(material.createdAt).toLocaleDateString()}</span></footer></button><button className="card-delete" onClick={()=>removeMaterial(material)} aria-label={`Delete ${material.name}`}><Trash2 size={15}/></button></article>)}</div>}</section>
        :<section className="subjects-page"><div className="page-heading"><div><div className="kicker">YOUR LEARNING MAP</div><h1>{selectedSubject?.name??'Subjects'}</h1><p>Keep each class, exam, and topic in its own study space.</p></div><button className="solid-button" onClick={()=>setSubjectOpen(true)}><Plus size={16}/> New subject</button></div>{subjectId&&<button className="back-button" onClick={()=>setSubjectId(null)}>← All subjects</button>}{subjectId?<><div className="library-toolbar"><span>{visibleMaterials.length} materials in this subject</span></div>{visibleMaterials.length===0?<div className="empty-state"><span className="empty-book"><BookOpen size={25}/></span><h3>Start adding to {selectedSubject?.name}</h3><p>Import materials and assign them to this subject.</p><button className="solid-button" onClick={openImport}><Upload size={16}/> Add materials</button></div>:<div className="library-grid">{visibleMaterials.map(material=><article className="library-card" key={material.id}><button className="library-card-open" onClick={()=>setActiveMaterial(material)}><div className="library-card-meta"><span>{material.kind.toUpperCase()}</span></div><h3>{material.name}</h3><p>{material.text.slice(0,160).replace(/\s+/g,' ').trim()}</p></button><button className="card-delete" onClick={()=>removeMaterial(material)} aria-label="Delete material"><Trash2 size={15}/></button></article>)}</div>}</>:subjects.length===0?<div className="empty-state"><span className="empty-book"><BookOpen size={25}/></span><h3>Create your first subject</h3><p>Build a learning space for a class, topic, or upcoming exam.</p><button className="solid-button" onClick={()=>setSubjectOpen(true)}><Plus size={16}/> Create subject</button></div>:<div className="subject-grid">{subjects.map(subject=><article className="subject-card" key={subject.id}><button onClick={()=>setSubjectId(subject.id)}><span className="subject-card-symbol"><BookOpen size={20}/></span><h3>{subject.name}</h3><p>{materials.filter(m=>m.subjectId===subject.id).length} study materials</p><span className="subject-card-open">Open subject <ArrowRight size={14}/></span></button><button className="card-delete" onClick={()=>removeSubject(subject)} aria-label={`Delete ${subject.name}`}><Trash2 size={15}/></button></article>)}</div>}</section>}
        <footer className="app-footer"><span>Mindora <i>✦</i> Make every late night count.</span><span>{cloudUser?'Cloud account connected':'Offline-first study space'}</span></footer>
      </div>
    </main>
    {importOpen&&<div className="modal-layer" onClick={()=>!busy&&setImportOpen(false)}><section className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setImportOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><Upload size={22}/></span><div className="kicker">ADD TO YOUR LIBRARY</div><h2>Bring your study material</h2><p>Upload notes, slides, documents, or images. Files are processed in your browser and saved to your library.</p><label className="drop-zone"><input type="file" multiple accept={`${supportedExtensions},image/*`} onChange={e=>setFiles(Array.from(e.target.files??[]))}/><span className="drop-icon"><ArrowDownToLine size={20}/></span><strong>Choose files to import</strong><small>PDF, DOCX, PPTX, TXT, MD, CSV and images</small></label>{files.length>0&&<div className="selected-files">{files.map((file,i)=><div key={file.name+i}><span>{file.type.startsWith('image/')?<FileImage size={14}/>:<FileText size={14}/>}</span><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KB</small></div>)}</div>}<div className="form-separator"><span>or paste notes</span></div><input className="form-input" value={materialTitle} onChange={e=>setMaterialTitle(e.target.value)} placeholder="Notes title (optional)"/><textarea className="form-textarea" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Paste your notes here…"/>{subjects.length>0&&<label className="form-select-label">Subject<select value={importSubject} onChange={e=>setImportSubject(e.target.value)}><option value="">Unsorted</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" disabled={busy} onClick={importMaterials}>{busy?<><LoaderCircle size={16} className="spin"/> Saving material…</>:<>Save to library <ArrowRight size={16}/></>}</button></section></div>}
    {subjectOpen&&<div className="modal-layer" onClick={()=>setSubjectOpen(false)}><form className="modal-card compact-modal" onSubmit={addSubject} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setSubjectOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><BookOpen size={22}/></span><div className="kicker">NEW LEARNING SPACE</div><h2>Create a subject</h2><p>Choose a class, exam, or topic to organize.</p><label className="form-select-label">Subject name<input className="form-input" value={subjectName} onChange={e=>setSubjectName(e.target.value)} maxLength={80} required autoFocus/></label>{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" type="submit">Create subject <ArrowRight size={16}/></button></form></div>}
    {authOpen&&<div className="modal-layer" onClick={()=>setAuthOpen(false)}><form className="modal-card compact-modal" onSubmit={submitAuth} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Close"><X size={18}/></button><span className="modal-symbol"><Cloud size={22}/></span><div className="kicker">MINDORA CLOUD</div><h2>{authMode==='signin'?'Welcome back':'Create your account'}</h2><p>Sync your subjects, notes, and image materials between devices.</p><label className="form-select-label">Email<input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label className="form-select-label">Password<input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} autoComplete={authMode==='signin'?'current-password':'new-password'} required/></label>{error&&<div className="form-error">{error}</div>}<button className="solid-button modal-submit" disabled={busy}>{busy?<><LoaderCircle size={16} className="spin"/> Connecting…</>:authMode==='signin'?'Sign in and sync':'Create account'}</button><button type="button" className="auth-switch" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setError('')}}>{authMode==='signin'?'New to Mindora? Create an account':'Already have an account? Sign in'}</button></form></div>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={13}/></button></div>}
  </div>;
}
export default App;

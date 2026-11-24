import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Check, ChevronRight, FileText, FlaskConical, FolderOpen,
  GraduationCap, House, Layers3, LoaderCircle, Menu, Plus, Search, Sparkles,
  Trash2, Upload, X,
} from 'lucide-react';
import { createSubject, deleteMaterial, deleteSubject, getMaterials, getSubjects, saveMaterial, type Material, type Subject } from './lib/database';
import { extractText, fileKind, supportedFile, supportedExtensions } from './lib/extract';

type Page = 'Home' | 'Library' | 'Subjects';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const today = () => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());

function App() {
  const [page, setPage] = useState<Page>('Home');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [importSubject, setImportSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextMaterials, nextSubjects] = await Promise.all([getMaterials(), getSubjects()]);
    setMaterials(nextMaterials);
    setSubjects(nextSubjects);
  }, []);

  useEffect(() => {
    refresh().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not read your local study library.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  const selectedSubjectName = subjects.find(subject => subject.id === selectedSubject)?.name;
  const visibleMaterials = useMemo(() => {
    const term = query.trim().toLowerCase();
    return materials.filter(material => {
      const belongs = page !== 'Subjects' || !selectedSubject || material.subjectId === selectedSubject;
      const matches = !term || material.name.toLowerCase().includes(term) || material.text.toLowerCase().includes(term);
      return belongs && matches;
    });
  }, [materials, page, query, selectedSubject]);

  const openImport = () => {
    setError('');
    setNotice('');
    setFiles([]);
    setNotes('');
    setMaterialTitle('');
    setImportSubject(selectedSubject ?? '');
    setImportOpen(true);
  };

  const importMaterials = async () => {
    if (!files.length && !notes.trim()) {
      setError('Choose one or more files, or paste your notes first.');
      return;
    }
    setBusy(true);
    setError('');
    let imported = 0;
    const failures: string[] = [];
    try {
      for (const file of files) {
        if (!supportedFile(file)) {
          failures.push(`${file.name}: unsupported file type`);
          continue;
        }
        try {
          const text = await extractText(file);
          await saveMaterial({
            name: file.name,
            kind: fileKind(file),
            text,
            subjectId: importSubject || null,
          });
          imported += 1;
        } catch (reason) {
          failures.push(`${file.name}: ${reason instanceof Error ? reason.message : 'could not read file'}`);
        }
      }
      if (notes.trim()) {
        try {
          await saveMaterial({
            name: materialTitle.trim() || 'Study notes',
            kind: 'notes',
            text: notes.trim(),
            subjectId: importSubject || null,
          });
          imported += 1;
        } catch (reason) {
          failures.push(reason instanceof Error ? reason.message : 'Could not save notes');
        }
      }
      await refresh();
      if (imported > 0) {
        setImportOpen(false);
        setPage('Library');
        setSelectedSubject(importSubject || null);
        setNotice(`Imported ${imported} ${imported === 1 ? 'material' : 'materials'} into your library.`);
      }
      if (failures.length) setError(failures.join('\n'));
      if (imported === 0 && !failures.length) setError('No readable study content was found.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const addSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const subject = await createSubject(subjectName);
      await refresh();
      setSubjectName('');
      setSubjectOpen(false);
      setSelectedSubject(subject.id);
      setPage('Subjects');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create subject.');
    }
  };

  const removeMaterial = async (material: Material) => {
    if (!window.confirm(`Delete “${material.name}” from this device?`)) return;
    await deleteMaterial(material.id);
    if (selectedMaterial?.id === material.id) setSelectedMaterial(null);
    await refresh();
  };

  const removeSubject = async (subject: Subject) => {
    if (!window.confirm(`Delete the subject “${subject.name}”? Its materials will remain in your library.`)) return;
    await deleteSubject(subject.id);
    if (selectedSubject === subject.id) setSelectedSubject(null);
    await refresh();
  };

  const navigate = (next: Page) => {
    setPage(next);
    setSelectedMaterial(null);
    if (next !== 'Subjects') setSelectedSubject(null);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => navigate('Home')} aria-label="Mindora home">
          <span className="brand-mark"><Sparkles size={19}/></span><span>mindora<span className="brand-dot">.</span></span>
        </button>
        <div className="side-label">YOUR SPACE</div>
        <nav className="main-nav">
          {([{label:'Home' as Page,icon:House},{label:'Library' as Page,icon:Layers3},{label:'Subjects' as Page,icon:BookOpen}]).map(({label,icon:Icon})=>(
            <button key={label} className={`nav-item ${page===label?'active':''}`} onClick={()=>navigate(label)}>
              <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
              {label==='Library'&&materials.length>0&&<span className="nav-count">{materials.length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-label subject-label">SUBJECTS <button className="tiny-add" onClick={()=>{setError('');setSubjectOpen(true)}} aria-label="Create subject"><Plus size={15}/></button></div>
        <div className="subject-nav">
          {subjects.map(subject=><button key={subject.id} className={`subject-link ${selectedSubject===subject.id?'subject-selected':''}`} onClick={()=>{setPage('Subjects');setSelectedSubject(subject.id);setSelectedMaterial(null);setSidebarOpen(false)}}><span className="subject-dot"/>{subject.name}</button>)}
          <button className="add-subject" onClick={()=>{setError('');setSubjectOpen(true)}}><Plus size={15}/> Create subject</button>
        </div>
        <div className="sidebar-bottom">
          <div className="local-card"><div className="local-card-icon"><FolderOpen size={17}/></div><strong>Your library, your device</strong><p>Study materials are saved in this browser on this device.</p></div>
          <div className="profile-row"><div className="avatar"><GraduationCap size={17}/></div><div className="profile-copy"><strong>Mindora</strong><small>Personal study space</small></div></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">{sidebarOpen?<X size={19}/>:<Menu size={19}/>}</button>
          <div className="breadcrumb"><span>My space</span><span className="crumb-slash">/</span><strong>{selectedSubjectName ?? (selectedMaterial ? selectedMaterial.name : page)}</strong></div>
          <div className="top-actions">
            <label className="search-box"><Search size={16}/><input value={query} onChange={event=>{setQuery(event.target.value);if(event.target.value.trim())setPage('Library')}} placeholder="Search your materials" aria-label="Search your study materials"/></label>
            <button className="top-import" onClick={openImport}><Plus size={15}/> Add material</button>
          </div>
        </header>

        <div className="page-content">
          {selectedMaterial ? (
            <section className="material-reader">
              <button className="back-link" onClick={()=>setSelectedMaterial(null)}>← Back to {page==='Subjects'?'subject':'library'}</button>
              <div className="reader-head"><div className="reader-file-icon"><FileText size={22}/></div><div><span className="eyebrow">STUDY MATERIAL</span><h1>{selectedMaterial.name}</h1><p>{selectedMaterial.kind.toUpperCase()} · {selectedMaterial.characterCount.toLocaleString()} characters · {new Date(selectedMaterial.createdAt).toLocaleDateString()}</p></div><button className="icon-button danger-icon" onClick={()=>removeMaterial(selectedMaterial)} aria-label="Delete material"><Trash2 size={17}/></button></div>
              <article className="material-text">{selectedMaterial.text}</article>
            </section>
          ) : page==='Home' ? (
            <>
              <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-spark"><Sparkles size={13}/></span> YOUR PERSONAL LEARNING SPACE</div><h1>{greeting()}<span className="wave"> ✦</span></h1><p className="welcome-sub">A calmer way to get test-ready, one step at a time.</p></div><div className="date-pill">{today()}</div></section>
              <section className="hero-card"><div className="hero-glow"/><div className="hero-content"><div className="hero-tag"><span className="live-dot"/> YOUR STUDY SPACE</div><h2>Make tonight<br/><span>count for something.</span></h2><p>Bring your own notes and materials. Build a study session from what you're learning.</p><button className="primary-button" onClick={openImport}><Upload size={15}/> Add study material <ArrowRight size={15}/></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="glass-orb"><div className="orb-core"/><div className="orb-shine"/></div><div className="spark spark-a">✦</div><div className="spark spark-b">✧</div></div></section>
              <section className="stats-grid"><div className="stat-card"><div className="stat-icon violet"><Layers3 size={17}/></div><div className="stat-label">Study materials</div><div className="stat-value">{materials.length.toLocaleString()}</div><div className="stat-foot">Saved in your library</div></div><div className="stat-card"><div className="stat-icon mint"><BookOpen size={17}/></div><div className="stat-label">Subjects</div><div className="stat-value">{subjects.length.toLocaleString()}</div><div className="stat-foot">Your learning spaces</div></div><div className="stat-card"><div className="stat-icon peach"><FlaskConical size={17}/></div><div className="stat-label">Study content</div><div className="stat-value">{materials.reduce((sum,item)=>sum+item.characterCount,0).toLocaleString()}</div><div className="stat-foot">Characters in your materials</div></div></section>
              <div className="section-grid"><section className="panel subjects-panel"><div className="section-heading"><div><h3>Your subjects</h3><p>Organize materials by what you're studying.</p></div><button className="text-button" onClick={()=>navigate('Subjects')}>View subjects <ArrowRight size={14}/></button></div>{subjects.length===0?<div className="empty-inline"><div className="empty-icon"><BookOpen size={20}/></div><strong>Your subjects start here</strong><p>Create a subject to keep related notes and files together.</p><button className="secondary-button" onClick={()=>setSubjectOpen(true)}><Plus size={14}/> Create subject</button></div>:<div className="subject-cards">{subjects.slice(0,6).map((subject,index)=><button className="subject-card" key={subject.id} onClick={()=>{setPage('Subjects');setSelectedSubject(subject.id)}}><div className="subject-card-top"><span className={`subject-icon ${['mint','blue','peach'][index%3]}`}><BookOpen size={18}/></span><ChevronRight size={16} className="muted-icon"/></div><h4>{subject.name}</h4><p>{materials.filter(material=>material.subjectId===subject.id).length} materials</p><div className="subject-progress"><span className={['mint','blue','peach'][index%3]} style={{width:'100%'}}/></div><div className="subject-progress-label"><span>Open subject</span><ArrowRight size={14}/></div></button>)}</div>}</section><section className="panel focus-panel"><div className="section-heading"><div><h3>Recently added</h3><p>Your actual study materials.</p></div><button className="text-button" onClick={()=>navigate('Library')}>Library <ArrowRight size={14}/></button></div>{materials.length===0?<div className="empty-inline compact"><div className="empty-icon"><FileText size={19}/></div><strong>No materials yet</strong><p>Import notes or files to start building your library.</p><button className="text-button" onClick={openImport}>Import materials <ArrowRight size={14}/></button></div>:<div className="recent-list">{materials.slice(0,4).map(material=><button className="recent-item" key={material.id} onClick={()=>setSelectedMaterial(material)}><span className="recent-file"><FileText size={15}/></span><span className="recent-copy"><strong>{material.name}</strong><small>{material.kind.toUpperCase()} · {material.characterCount.toLocaleString()} characters</small></span><ChevronRight size={15}/></button>)}</div>}</section></div>
            </>
          ) : page==='Library' ? (
            <section className="library-page"><div className="page-title-row"><div><div className="eyebrow">YOUR MATERIALS</div><h1>Study library</h1><p className="welcome-sub">Everything you've imported, all in one place.</p></div><button className="primary-button" onClick={openImport}><Upload size={15}/> Import materials</button></div><div className="library-meta">{visibleMaterials.length} {visibleMaterials.length===1?'material':'materials'}{query.trim()?' matching your search':''}</div>{loading?<div className="empty-state"><LoaderCircle className="spin" size={22}/><p>Loading your library…</p></div>:visibleMaterials.length===0?<div className="empty-state"><div className="empty-icon large"><FolderOpen size={25}/></div><h3>{query.trim()?'No matching materials':'Your library is empty'}</h3><p>{query.trim()?'Try a different search term.':'Import your notes, documents, or slides. The extracted text will be saved in this browser.'}</p>{!query.trim()&&<button className="primary-button" onClick={openImport}><Upload size={15}/> Import your first material</button>}</div>:<div className="library-grid">{visibleMaterials.map(material=><article className="library-card" key={material.id}><button className="library-card-open" onClick={()=>setSelectedMaterial(material)}><div className="library-card-top"><span className="file-type">{material.kind.toUpperCase()}</span><span className="material-size">{material.characterCount.toLocaleString()} chars</span></div><h3>{material.name}</h3><p>{material.text.slice(0,180).replace(/\s+/g,' ').trim()}{material.text.length>180?'…':''}</p><div className="library-card-foot"><span>{subjects.find(subject=>subject.id===material.subjectId)?.name??'Unsorted'}</span><span>{new Date(material.createdAt).toLocaleDateString()}</span></div></button><button className="delete-material" onClick={()=>removeMaterial(material)} aria-label={`Delete ${material.name}`}><Trash2 size={15}/></button></article>)}</div>}</section>
          ) : (
            <section className="library-page"><div className="page-title-row"><div><div className="eyebrow">YOUR LEARNING SPACES</div><h1>{selectedSubjectName??'Subjects'}</h1><p className="welcome-sub">Group your materials by class, topic, or exam.</p></div><button className="primary-button" onClick={()=>setSubjectOpen(true)}><Plus size={15}/> New subject</button></div>{selectedSubjectName&&<button className="back-link subject-back" onClick={()=>setSelectedSubject(null)}>← All subjects</button>}{selectedSubjectName?<><div className="library-meta">{visibleMaterials.length} materials in this subject</div>{visibleMaterials.length===0?<div className="empty-state"><div className="empty-icon large"><BookOpen size={25}/></div><h3>This subject is ready for your materials</h3><p>Import files or notes and assign them to this subject.</p><button className="primary-button" onClick={openImport}><Upload size={15}/> Add materials</button></div>:<div className="library-grid">{visibleMaterials.map(material=><article className="library-card" key={material.id}><button className="library-card-open" onClick={()=>setSelectedMaterial(material)}><div className="library-card-top"><span className="file-type">{material.kind.toUpperCase()}</span><span className="material-size">{material.characterCount.toLocaleString()} chars</span></div><h3>{material.name}</h3><p>{material.text.slice(0,180).replace(/\s+/g,' ').trim()}{material.text.length>180?'…':''}</p><div className="library-card-foot"><span>{new Date(material.createdAt).toLocaleDateString()}</span></div></button><button className="delete-material" onClick={()=>removeMaterial(material)} aria-label={`Delete ${material.name}`}><Trash2 size={15}/></button></article>)}</div>}</>:subjects.length===0?<div className="empty-state"><div className="empty-icon large"><BookOpen size={25}/></div><h3>Create your first subject</h3><p>Subjects keep your notes and study materials organized.</p><button className="primary-button" onClick={()=>setSubjectOpen(true)}><Plus size={15}/> Create subject</button></div>:<div className="subject-manage-grid">{subjects.map((subject,index)=><article className="subject-manage-card" key={subject.id}><button className="subject-manage-open" onClick={()=>{setSelectedSubject(subject.id);setSelectedMaterial(null)}}><span className={`subject-icon ${['mint','blue','peach'][index%3]}`}><BookOpen size={19}/></span><h3>{subject.name}</h3><p>{materials.filter(material=>material.subjectId===subject.id).length} materials</p><span className="manage-open-label">Open subject <ArrowRight size={14}/></span></button><button className="delete-material" onClick={()=>removeSubject(subject)} aria-label={`Delete subject ${subject.name}`}><Trash2 size={15}/></button></article>)}</div>}</section>
          )}
          <footer className="footer"><span>made for your midnight mind <span>✦</span></span><span>Mindora · Your study space</span></footer>
        </div>
      </main>

      {importOpen&&<div className="modal-backdrop" onClick={()=>!busy&&setImportOpen(false)}><section className="upload-modal" onClick={event=>event.stopPropagation()}><button className="modal-close" onClick={()=>setImportOpen(false)} disabled={busy} aria-label="Close import"><X size={18}/></button><div className="modal-icon"><Upload size={22}/></div><h2>Bring your study material</h2><p>Select files or paste notes. Mindora extracts readable text and saves it to this browser's study library.</p><label className="upload-drop"><input type="file" multiple accept={supportedExtensions} onChange={event=>setFiles(Array.from(event.target.files??[]))}/><Upload size={20}/><strong>Select files</strong><span>PDF, DOCX, PPTX, TXT, MD, CSV · multiple files supported</span></label>{files.length>0&&<div className="selected-files">{files.map((file,index)=><div className="selected-file" key={`${file.name}-${index}`}><FileText size={14}/><span>{file.name}</span><small>{(file.size/1024).toLocaleString(undefined,{maximumFractionDigits:0})} KB</small></div>)}</div>}<div className="modal-divider"><span>and / or paste notes</span></div><input className="video-input" value={materialTitle} onChange={event=>setMaterialTitle(event.target.value)} aria-label="Notes title" placeholder="Notes title (optional)"/><textarea className="notes-input" value={notes} onChange={event=>setNotes(event.target.value)} aria-label="Paste study notes" placeholder="Paste your notes here…"/>{subjects.length>0&&<label className="subject-select-label">Save in subject<select value={importSubject} onChange={event=>setImportSubject(event.target.value)}><option value="">Unsorted</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>}{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-button modal-submit" onClick={importMaterials} disabled={busy}>{busy?<><LoaderCircle size={15} className="spin"/> Reading and saving…</>:<>Save to library <ArrowRight size={16}/></>}</button></section></div>}
      {subjectOpen&&<div className="modal-backdrop" onClick={()=>setSubjectOpen(false)}><form className="upload-modal subject-modal" onSubmit={addSubject} onClick={event=>event.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setSubjectOpen(false)} aria-label="Close"><X size={18}/></button><div className="modal-icon"><BookOpen size={22}/></div><h2>Create a subject</h2><p>Make a space for a class, exam, or topic you're learning.</p><label className="field-label">Subject name<input className="video-input" value={subjectName} onChange={event=>setSubjectName(event.target.value)} autoFocus required maxLength={80}/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-button modal-submit" type="submit">Create subject <ArrowRight size={16}/></button></form></div>}
      {notice&&<div className="toast"><span className="toast-check"><Check size={14}/></span>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notification"><X size={13}/></button></div>}
    </div>
  );
}

export default App;

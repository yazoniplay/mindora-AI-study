import { useState } from 'react';
import {
  ArrowDownRight, ArrowRight, Atom, BookOpen, Brain, CalendarDays,
  Check, ChevronDown, Clock3, Flame, FlaskConical, House,
  Layers3, Menu, MoreHorizontal, Plus, Search, Settings2, Sparkles,
  Target, Trophy, Upload, X, Zap,
} from 'lucide-react';

type Subject = { name: string; detail: string; progress: number; color: string; icon: typeof Atom };

const subjects: Subject[] = [
  { name: 'Biology', detail: 'Cell structure · 24 cards', progress: 72, color: 'mint', icon: FlaskConical },
  { name: 'Physics', detail: 'Forces & motion · 18 cards', progress: 38, color: 'blue', icon: Atom },
  { name: 'History', detail: 'World War II · 32 cards', progress: 56, color: 'peach', icon: BookOpen },
];

const nav = [
  { label: 'Home', icon: House },
  { label: 'My subjects', icon: BookOpen },
  { label: 'Flashcards', icon: Layers3 },
  { label: 'Practice tests', icon: Target },
  { label: 'Study games', icon: Zap },
];

function App() {
  const [active, setActive] = useState('Home');
  const [showUpload, setShowUpload] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const handleAction = (label: string) => {
    setNotice(label);
    window.setTimeout(() => setNotice(''), 2600);
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => setActive('Home')} aria-label="Mindora home">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>mindora<span className="brand-dot">.</span></span>
        </button>
        <div className="side-label">YOUR SPACE</div>
        <nav className="main-nav">
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setMenuOpen(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Flashcards' && <span className="nav-count">12</span>}
            </button>
          ))}
        </nav>
        <div className="side-label subject-label">YOUR SUBJECTS <button className="tiny-add" onClick={() => setShowUpload(true)} aria-label="Add subject"><Plus size={15}/></button></div>
        <div className="subject-nav">
          {subjects.map((subject) => (
            <button className="subject-link" key={subject.name} onClick={() => setActive(subject.name)}>
              <span className={`subject-dot ${subject.color}`} />{subject.name}
            </button>
          ))}
          <button className="add-subject" onClick={() => setShowUpload(true)}><Plus size={15}/> Add subject</button>
        </div>
        <div className="sidebar-bottom">
          <div className="streak-card">
            <div className="streak-top"><span className="streak-icon"><Flame size={16}/></span><span className="streak-number">4 day streak</span></div>
            <p>You're building a habit.<br/>Keep the glow going.</p>
            <div className="streak-days">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i} className={i<4?'day-done':''}>{i<4?<Check size={11}/>:d}</span>)}</div>
          </div>
          <button className="profile-row" onClick={() => handleAction('Profile customization is coming soon')}>
            <div className="avatar">Y<span className="avatar-status"/></div>
            <div className="profile-copy"><strong>Your profile</strong><small>Level 8 · 640 XP</small></div>
            <MoreHorizontal size={18} className="muted-icon"/>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen?<X size={19}/>:<Menu size={19}/>}</button>
          <div className="breadcrumb"><span>My space</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="top-actions">
            <label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your study space"/><kbd>⌘ K</kbd></label>
            <button className="icon-button" onClick={() => handleAction('Settings are coming soon')} aria-label="Settings"><Settings2 size={18}/></button>
            <button className="top-avatar" onClick={() => handleAction('Your profile is coming soon')}>Y</button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-spark"><Sparkles size={13}/></span> YOUR LITTLE CORNER OF KNOWLEDGE</div>
              <h1>Hey, welcome back<span className="wave"> ✦</span></h1>
              <p className="welcome-sub">Ready to make a little progress today?</p>
            </div>
            <button className="date-pill"><CalendarDays size={15}/> Tuesday, Nov 24 <ChevronDown size={14}/></button>
          </section>

          <section className="hero-card">
            <div className="hero-glow"/>
            <div className="hero-content">
              <div className="hero-tag"><span className="live-dot"/> YOUR STUDY SPACE</div>
              <h2>Small steps.<br/><span>Big brain energy.</span></h2>
              <p>Your next breakthrough is just one study session away.<br/>Let's make tonight count.</p>
              <button className="primary-button" onClick={() => handleAction('Your study session is ready to begin')}><Sparkles size={16}/> Start studying <ArrowRight size={16}/></button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-a"/><div className="orbit orbit-b"/>
              <div className="glass-orb"><div className="orb-core"/><div className="orb-shine"/></div>
              <div className="float-chip chip-xp"><Zap size={14}/><span><b>+40 XP</b><small>Nice work!</small></span></div>
              <div className="float-chip chip-focus"><Brain size={15}/><span><b>In the zone</b><small>Focus mode</small></span></div>
              <div className="spark spark-a">✦</div><div className="spark spark-b">✧</div><div className="spark spark-c">·</div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-icon violet"><Clock3 size={17}/></div><div className="stat-label">Study time</div><div className="stat-value">2h 40m <span className="stat-change"><ArrowDownRight size={13}/> this week</span></div><div className="mini-bars">{[35,58,42,76,52,88,65].map((h,i)=><span key={i} style={{height:`${h}%`}} className={i===5?'bar-highlight':''}/>)}</div></div>
            <div className="stat-card"><div className="stat-icon mint"><Layers3 size={17}/></div><div className="stat-label">Cards mastered</div><div className="stat-value">128 <span className="stat-change">+18 this week</span></div><div className="stat-progress"><span style={{width:'68%'}}/></div><div className="stat-foot">68% of your goal</div></div>
            <div className="stat-card"><div className="stat-icon peach"><Trophy size={17}/></div><div className="stat-label">Current level</div><div className="stat-value">Level 8 <span className="stat-change">Scholar</span></div><div className="level-progress"><span style={{width:'64%'}}/></div><div className="stat-foot">640 / 1,000 XP to level 9</div></div>
          </section>

          <div className="section-grid">
            <section className="panel subjects-panel">
              <div className="section-heading"><div><h3>Pick up where you left off</h3><p>A little review goes a long way.</p></div><button className="text-button" onClick={() => setActive('My subjects')}>All subjects <ArrowRight size={14}/></button></div>
              <div className="subject-cards">
                {subjects.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())).map(({name,detail,progress,color,icon:Icon})=>(
                  <button className="subject-card" key={name} onClick={()=>{setActive(name);handleAction(`Opening ${name}`)}}>
                    <div className="subject-card-top"><span className={`subject-icon ${color}`}><Icon size={19}/></span><MoreHorizontal size={18} className="muted-icon"/></div>
                    <h4>{name}</h4><p>{detail}</p>
                    <div className="subject-progress"><span style={{width:`${progress}%`}} className={color}/></div>
                    <div className="subject-progress-label"><span>{progress}% mastered</span><ArrowRight size={14}/></div>
                  </button>
                ))}
                <button className="new-subject-card" onClick={()=>setShowUpload(true)}><span className="new-subject-icon"><Plus size={20}/></span><strong>Add a subject</strong><small>Make a new study space</small></button>
              </div>
            </section>
            <section className="panel focus-panel">
              <div className="section-heading"><div><h3>Tonight's little plan</h3><p>One thing at a time.</p></div><button className="more-button" onClick={()=>handleAction('Your study plan is coming soon')}><MoreHorizontal size={18}/></button></div>
              <div className="plan-progress"><div className="plan-ring"><span>1<small>/3</small></span></div><div><strong>You're off to a start</strong><p>One step closer to test-ready.</p></div></div>
              <div className="plan-list">
                <button className="plan-item completed" onClick={()=>handleAction('Review complete!')}><span className="plan-check"><Check size={13}/></span><span><strong>Review biology notes</strong><small>10 min · Completed</small></span><span className="plan-xp">+20 XP</span></button>
                <button className="plan-item" onClick={()=>handleAction('Flashcard session selected')}><span className="plan-check"/><span><strong>Practice flashcards</strong><small>15 min · Biology</small></span><span className="plan-arrow"><ArrowRight size={15}/></span></button>
                <button className="plan-item" onClick={()=>handleAction('Quick quiz selected')}><span className="plan-check"/><span><strong>Take a quick quiz</strong><small>10 min · Physics</small></span><span className="plan-arrow"><ArrowRight size={15}/></span></button>
              </div>
              <button className="plan-button" onClick={()=>handleAction('Study plan opened')}>View study plan <ArrowRight size={15}/></button>
            </section>
          </div>

          <section className="bottom-row">
            <div className="quick-start"><div className="quick-copy"><span className="quick-kicker">READY WHEN YOU ARE</span><h3>What are we learning today?</h3><p>Bring your notes. Mindora will help you turn them into a study session.</p><button className="secondary-button" onClick={()=>setShowUpload(true)}><Upload size={15}/> Add your study material</button></div><div className="quick-icon"><BookOpen size={42} strokeWidth={1.2}/><Sparkles size={18}/></div></div>
            <div className="quote-card"><span className="quote-mark">“</span><p>It doesn't have to be perfect.<br/><strong>It just has to be started.</strong></p><span className="quote-caption">A LITTLE REMINDER FROM MINDORA</span></div>
          </section>
          <footer className="footer"><span>made for your midnight mind <span>✦</span></span><span>Mindora · Your study space</span></footer>
        </div>
      </main>

      {showUpload && <div className="modal-backdrop" onClick={()=>setShowUpload(false)}><div className="upload-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowUpload(false)}><X size={18}/></button><div className="modal-icon"><Upload size={22}/></div><h2>Let's make a study space</h2><p>Bring your notes, PDFs, slides, or a video. We'll turn them into something you can learn from.</p><button className="upload-drop" onClick={()=>handleAction('File import will be connected next')}><Upload size={20}/><strong>Choose files to upload</strong><span>PDF, DOCX, PPTX, TXT, images</span></button><div className="modal-divider"><span>or</span></div><input className="video-input" placeholder="Paste a YouTube link or notes here…"/><button className="primary-button modal-submit" onClick={()=>{setShowUpload(false);handleAction('Study material import is the next feature')}}>Create study space <ArrowRight size={16}/></button></div></div>}
      {notice && <div className="toast"><span className="toast-check"><Check size={14}/></span>{notice}</div>}
    </div>
  );
}

export default App;
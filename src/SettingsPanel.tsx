import { Check, Monitor, Moon, Palette, RotateCcw, Settings2, Sun, UserRound, ArrowUpRight } from 'lucide-react';
export type MindoraSettings = {
 theme: 'dark' | 'light' | 'midnight';
 accent: string;
 fontScale: number;
 compact: boolean;
 reduceMotion: boolean;
 focusMinutes: number;
 dailyGoalMinutes: number;
 language: string;
};
export const DEFAULT_SETTINGS: MindoraSettings = {
 theme:'dark', accent:'#b8a7ff', fontScale:1, compact:false, reduceMotion:false,
 focusMinutes:25, dailyGoalMinutes:60, language:'en'
};
const accents=[['Lavender','#b8a7ff'],['Ocean','#82b9ff'],['Mint','#91dfc9'],['Rose','#f3a9c7'],['Amber','#f4b88f'],['Violet','#b69bff'],['Sky','#7dd9e8'],['Coral','#ff9f8f']];
export default function SettingsPanel({settings,onChange,onReset,onOpenProfile}:{settings:MindoraSettings;onChange:(next:MindoraSettings)=>void;onReset:()=>void;onOpenProfile:()=>void}){
 const set=<K extends keyof MindoraSettings>(key:K,value:MindoraSettings[K])=>onChange({...settings,[key]:value});
 const Toggle=({label,detail,checked,onToggle}:{label:string;detail:string;checked:boolean;onToggle:(value:boolean)=>void})=><label className="settings-toggle-row"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={e=>onToggle(e.target.checked)}/><i/></label>;
 return <section className="settings-page">
  <header className="settings-page-heading"><div><div className="kicker"><Settings2 size={13}/> YOUR WORKSPACE</div><h1>Settings</h1><p>Make Mindora feel like your own study space. Your preferences save automatically on this device.</p></div><button className="settings-reset" onClick={onReset}><RotateCcw size={14}/> Reset all</button></header>
  <div className="settings-layout"><aside className="settings-index"><span>PERSONALIZATION</span><a href="#settings-profile">Profile & identity</a><a href="#settings-appearance">Appearance</a><a href="#settings-study">Study preferences</a><a href="#settings-accessibility">Accessibility</a><a href="#settings-language">Language</a></aside>
  <div className="settings-sections">
   <section className="settings-card" id="settings-profile"><div className="settings-card-heading"><span className="settings-card-icon"><UserRound size={17}/></span><div><h2>Profile & identity</h2><p>Manage your study name, avatar, level and achievements.</p></div></div><div className="settings-profile-link"><span><strong>Student profile</strong><small>Personal details and earned milestones.</small></span><button onClick={onOpenProfile}>Open profile editor <ArrowUpRight size={15}/></button></div></section>
   <section className="settings-card" id="settings-appearance"><div className="settings-card-heading"><span className="settings-card-icon"><Palette size={17}/></span><div><h2>Appearance</h2><p>Colors and layout across your study space.</p></div></div>
    <div className="settings-setting"><div><strong>Theme</strong><small>Choose the look of your workspace.</small></div><div className="settings-theme-choices"><button className={settings.theme==='dark'?'active':''} onClick={()=>set('theme','dark')}><Moon size={16}/>Dark</button><button className={settings.theme==='light'?'active':''} onClick={()=>set('theme','light')}><Sun size={16}/>Light</button><button className={settings.theme==='midnight'?'active':''} onClick={()=>set('theme','midnight')}><Monitor size={16}/>Midnight</button></div></div>
    <div className="settings-setting"><div><strong>Accent color</strong><small>Use this color for active controls and highlights.</small></div><div className="settings-color-grid">{accents.map(([name,color])=><button key={name} title={name} aria-label={name} className={settings.accent===color?'active':''} style={{'--swatch':color} as React.CSSProperties} onClick={()=>set('accent',color)}>{settings.accent===color&&<Check size={14}/>}</button>)}</div></div>
    <div className="settings-setting settings-custom-color"><label htmlFor="settings-custom-accent"><strong>Custom accent</strong><small>Pick any color you want.</small></label><input id="settings-custom-accent" type="color" value={settings.accent} onChange={e=>set('accent',e.target.value)}/></div>
    <div className="settings-setting"><div><strong>Interface size</strong><small>Adjust text and interface scale.</small></div><div className="settings-range"><input type="range" min="0.9" max="1.15" step="0.05" value={settings.fontScale} onChange={e=>set('fontScale',Number(e.target.value))}/><span>{Math.round(settings.fontScale*100)}%</span></div></div>
    <Toggle label="Compact layout" detail="Reduce spacing so more content fits on screen." checked={settings.compact} onToggle={v=>set('compact',v)}/>
   </section>
   <section className="settings-card" id="settings-study"><div className="settings-card-heading"><span className="settings-card-icon mint"><Settings2 size={17}/></span><div><h2>Study preferences</h2><p>Set the defaults for your study sessions.</p></div></div>
    <div className="settings-setting"><div><strong>Focus session length</strong><small>Default timer duration for a new session.</small></div><select value={settings.focusMinutes} onChange={e=>set('focusMinutes',Number(e.target.value))}><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={25}>25 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></div>
    <div className="settings-setting"><div><strong>Daily study goal</strong><small>Target time for your daily progress.</small></div><select value={settings.dailyGoalMinutes} onChange={e=>set('dailyGoalMinutes',Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={180}>3 hours</option><option value={240}>4 hours</option></select></div>
   </section>
   <section className="settings-card" id="settings-accessibility"><div className="settings-card-heading"><span className="settings-card-icon peach"><Monitor size={17}/></span><div><h2>Accessibility & comfort</h2><p>Make studying comfortable for longer sessions.</p></div></div>
    <Toggle label="Reduce motion" detail="Turn off decorative movement and transitions." checked={settings.reduceMotion} onToggle={v=>set('reduceMotion',v)}/>
   </section>
   <section className="settings-card" id="settings-language"><div className="settings-card-heading"><span className="settings-card-icon blue"><Monitor size={17}/></span><div><h2>Language</h2><p>Choose your preferred language for future translated interface support.</p></div></div><div className="settings-setting"><div><strong>Interface language</strong><small>Currently, the app interface is available in English.</small></div><select value={settings.language} onChange={e=>set('language',e.target.value)}><option value="en">English</option><option value="lv">Latviešu</option><option value="sv">Svenska</option><option value="ru">Русский</option><option value="de">Deutsch</option><option value="es">Español</option><option value="fr">Français</option></select></div>{settings.language!=='en'&&<p className="settings-note">Your language preference is saved. Full interface translation is not available yet; the app remains in English for now.</p>}</section>
   <p className="settings-save-note"><Check size={14}/> Changes save automatically on this device.</p>
  </div></div>
 </section>;
}

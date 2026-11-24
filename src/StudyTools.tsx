import { useMemo, useState } from 'react';
import { Brain, Check, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import type { Material } from './lib/database';

type Card = { prompt: string; answer: string };
const STOP = new Set('about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves'.split(' '));
function sentences(source: string) {
  return source.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 38 && s.length <= 280);
}
function makeCards(source: string): Card[] {
  const lines = sentences(source);
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const line of lines) {
    const words = line.match(/[A-Za-z][A-Za-z'-]{3,}/g) ?? [];
    const candidates = words.filter(w => !STOP.has(w.toLowerCase()));
    if (candidates.length < 2) continue;
    const target = [...candidates].sort((a, b) => b.length - a.length)[0];
    const at = line.toLowerCase().indexOf(target.toLowerCase());
    const prompt = line.slice(0, at) + '________' + line.slice(at + target.length);
    if (!seen.has(prompt) && prompt !== line) { seen.add(prompt); cards.push({ prompt, answer: target }); }
    if (cards.length >= 24) break;
  }
  if (cards.length < 3) {
    for (const line of lines) {
      if (!seen.has(line)) { seen.add(line); cards.push({ prompt: 'Explain this idea in your own words:', answer: line }); }
      if (cards.length >= 12) break;
    }
  }
  return cards;
}
function makeQuiz(source: string): Card[] {
  const lines = sentences(source);
  return lines.slice(0, 12).map((answer, index) => ({ prompt: 'Which statement is supported by your material? (Question ' + (index + 1) + ')', answer }));
}
export default function StudyTools({ material, onCardReviewed }: { material: Material; onCardReviewed?: () => void | Promise<void> }) {
  const cards = useMemo(() => makeCards(material.text), [material.id, material.text]);
  const quiz = useMemo(() => makeQuiz(material.text), [material.id, material.text]);
  const [mode, setMode] = useState<'cards' | 'quiz'>('cards');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [choice, setChoice] = useState('');
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());
  const current = cards[index];
  const question = quiz[index];
  const options = useMemo(() => {
    if (!question) return [];
    const distractors = quiz.filter((_, i) => i !== index).map(item => item.answer);
    return [question.answer, ...distractors.slice(0, 3)].sort((a, b) => (a.length % 7) - (b.length % 7));
  }, [quiz, index, question]);
  const reset = (nextMode: 'cards' | 'quiz') => { setMode(nextMode); setIndex(0); setFlipped(false); setChoice(''); setChecked(false); setScore(0); setReviewedCards(new Set()); };
  const next = () => { setIndex(v => (v + 1) % (mode === 'cards' ? cards.length : quiz.length)); setFlipped(false); setChoice(''); setChecked(false); };
  if (!material.text.trim()) return <section className="practice-panel"><h2>Quick practice</h2><p>This material has no extracted text to practice from yet.</p></section>;
  return <section className="practice-panel">
    <div className="practice-heading"><div><span className="practice-kicker"><Sparkles size={13}/> STUDY FROM THIS MATERIAL</span><h2>Quick practice</h2><p>Turn the text you imported into a short self-check.</p></div><div className="practice-mode"><button className={mode==='cards'?'selected':''} onClick={()=>reset('cards')}><Brain size={14}/> Flashcards</button><button className={mode==='quiz'?'selected':''} onClick={()=>reset('quiz')}>Quiz</button></div></div>
    {mode==='cards' ? cards.length ? <div className="practice-card-wrap"><div className="practice-count">CARD {index+1} OF {cards.length}</div><button className={'practice-card '+(flipped?'is-flipped':'')} onClick={()=>{const next=!flipped;setFlipped(next);if(next&&!reviewedCards.has(index)){setReviewedCards(previous=>new Set(previous).add(index));void onCardReviewed?.();}}}><small>{flipped?'ANSWER':'PROMPT'} · TAP TO FLIP</small><strong>{flipped?current.answer:current.prompt}</strong><span>{flipped?'Try to explain why this term matters.':'Think of the missing term or idea.'}</span></button><div className="practice-controls"><button onClick={()=>{setIndex(v=>(v-1+cards.length)%cards.length);setFlipped(false)}}><ChevronLeft size={17}/> Previous</button><button className="practice-primary" onClick={()=>setFlipped(v=>!v)}>{flipped?'Show prompt':'Reveal answer'}</button><button onClick={next}>Next <ChevronRight size={17}/></button></div></div> : <div className="practice-empty"><p>There isn't enough readable text to make flashcards yet. Add notes or import a text-based document.</p></div>
    : quiz.length ? <div className="practice-quiz"><div className="practice-count">QUESTION {index+1} OF {quiz.length}</div><h3>{question.prompt}</h3><p className="quiz-hint">Choose the sentence that matches the source material.</p><div className="quiz-options">{options.map((option,i)=><button key={i} className={checked&&option===question.answer?'correct':checked&&option===choice?'incorrect':''} disabled={checked} onClick={()=>setChoice(option)}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}</div><div className="practice-controls"><span className="practice-score">{checked?'Score: '+score+' / '+(index+1):'Based on your imported text'}</span>{checked?<button className="practice-primary" onClick={next}>Next <ChevronRight size={17}/></button>:<button className="practice-primary" disabled={!choice} onClick={()=>{setChecked(true);if(choice===question.answer)setScore(v=>v+1)}}><Check size={16}/> Check answer</button>}</div></div> : <div className="practice-empty"><p>Not enough text for a quiz. Import more readable material first.</p></div>}
    <div className="practice-foot"><span>Made from this material only · No outside facts added</span><button onClick={()=>reset(mode)}><RotateCcw size={13}/> Restart</button></div>
  </section>;
}

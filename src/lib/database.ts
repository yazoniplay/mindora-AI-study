export type Subject = { id: string; name: string; createdAt: number; };
export type StudyTask = { id: string; title: string; dueAt: number; subjectId: string | null; priority: 'low' | 'medium' | 'high'; completed: boolean; createdAt: number; };
export type Material = { id: string; name: string; kind: string; text: string; subjectId: string | null; createdAt: number; characterCount: number; imageBlob?: Blob; storagePath?: string | null; };
export type StudentProfile = { id: 'local'; displayName: string; avatar: string; totalXp: number; completedTasks: number; focusSessions: number; cardsReviewed: number; activityDates: string[]; updatedAt: number; };
const DATABASE_NAME = 'mindora-library';
const DATABASE_VERSION = 3;
const SUBJECTS_STORE = 'subjects', MATERIALS_STORE = 'materials', TASKS_STORE = 'tasks', PROFILE_STORE = 'profile';
function openDatabase(): Promise<IDBDatabase> {
 return new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE_NAME,DATABASE_VERSION);request.onupgradeneeded=()=>{const db=request.result;
 if(!db.objectStoreNames.contains(SUBJECTS_STORE))db.createObjectStore(SUBJECTS_STORE,{keyPath:'id'});
 if(!db.objectStoreNames.contains(TASKS_STORE)){const s=db.createObjectStore(TASKS_STORE,{keyPath:'id'});s.createIndex('dueAt','dueAt');s.createIndex('subjectId','subjectId');}
 if(!db.objectStoreNames.contains(MATERIALS_STORE)){const s=db.createObjectStore(MATERIALS_STORE,{keyPath:'id'});s.createIndex('createdAt','createdAt');s.createIndex('subjectId','subjectId');}
 if(!db.objectStoreNames.contains(PROFILE_STORE))db.createObjectStore(PROFILE_STORE,{keyPath:'id'});
 };request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error??new Error('Could not open local study library.'));});
}
async function requestResult<T>(storeName:string,mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,mode);const req=operation(tx.objectStore(storeName));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error??new Error('Study library operation failed.'));tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error??new Error('Study library transaction failed.'));};tx.onabort=()=>{db.close();reject(tx.error??new Error('Study library transaction cancelled.'));};});
}
export async function getProfile():Promise<StudentProfile>{
 const existing=await requestResult<StudentProfile|undefined>(PROFILE_STORE,'readonly',s=>s.get('local'));
 if(existing)return existing;
 const profile:StudentProfile={id:'local',displayName:'Student',avatar:'🌱',totalXp:0,completedTasks:0,focusSessions:0,cardsReviewed:0,activityDates:[],updatedAt:Date.now()};
 await requestResult<IDBValidKey>(PROFILE_STORE,'readwrite',s=>s.put(profile));return profile;
}
export async function putProfile(profile:StudentProfile):Promise<void>{await requestResult<IDBValidKey>(PROFILE_STORE,'readwrite',s=>s.put({...profile,updatedAt:Date.now()}));}
export async function awardStudyXp(kind:'task'|'focus'|'card',amount:number):Promise<StudentProfile>{
 const profile=await getProfile();const now=new Date();const today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');const dates=profile.activityDates.includes(today)?profile.activityDates:[...profile.activityDates,today];
 const updated:StudentProfile={...profile,totalXp:profile.totalXp+Math.max(0,amount),completedTasks:profile.completedTasks+(kind==='task'?1:0),focusSessions:profile.focusSessions+(kind==='focus'?1:0),cardsReviewed:profile.cardsReviewed+(kind==='card'?1:0),activityDates:dates.slice(-365),updatedAt:Date.now()};
 await putProfile(updated);return updated;
}
export async function getSubjects():Promise<Subject[]>{const rows=await requestResult<Subject[]>(SUBJECTS_STORE,'readonly',s=>s.getAll());return rows.sort((a,b)=>a.name.localeCompare(b.name));}
export async function createSubject(name:string):Promise<Subject>{const clean=name.trim();if(!clean)throw new Error('Enter a subject name.');const subject={id:crypto.randomUUID(),name:clean,createdAt:Date.now()};await requestResult<IDBValidKey>(SUBJECTS_STORE,'readwrite',s=>s.add(subject));return subject;}
export async function putSubject(subject:Subject):Promise<void>{await requestResult<IDBValidKey>(SUBJECTS_STORE,'readwrite',s=>s.put(subject));}
export async function getMaterials():Promise<Material[]>{const rows=await requestResult<Material[]>(MATERIALS_STORE,'readonly',s=>s.getAll());return rows.sort((a,b)=>b.createdAt-a.createdAt);}
export async function saveMaterial(input:Omit<Material,'id'|'createdAt'|'characterCount'>):Promise<Material>{if(!input.name.trim())throw new Error('A material needs a file or title.');if(!input.text.trim()&&!input.imageBlob)throw new Error('No readable text or image content was found in this material.');const material:Material={...input,id:crypto.randomUUID(),createdAt:Date.now(),characterCount:input.text.length};await requestResult<IDBValidKey>(MATERIALS_STORE,'readwrite',s=>s.add(material));return material;}
export async function putMaterial(material:Material):Promise<void>{await requestResult<IDBValidKey>(MATERIALS_STORE,'readwrite',s=>s.put(material));}
export async function deleteMaterial(id:string):Promise<void>{await requestResult<undefined>(MATERIALS_STORE,'readwrite',s=>s.delete(id));}
export async function deleteSubject(id:string):Promise<void>{const db=await openDatabase();await new Promise<void>((resolve,reject)=>{const tx=db.transaction([SUBJECTS_STORE,MATERIALS_STORE],'readwrite');tx.objectStore(SUBJECTS_STORE).delete(id);const req=tx.objectStore(MATERIALS_STORE).index('subjectId').openCursor(IDBKeyRange.only(id));req.onsuccess=()=>{const cursor=req.result;if(cursor){const material=cursor.value as Material;material.subjectId=null;cursor.update(material);cursor.continue();}};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};});}
export async function getTasks():Promise<StudyTask[]>{const rows=await requestResult<StudyTask[]>(TASKS_STORE,'readonly',s=>s.getAll());return rows.sort((a,b)=>a.dueAt-b.dueAt);}
export async function saveTask(input:Omit<StudyTask,'id'|'createdAt'>):Promise<StudyTask>{if(!input.title.trim())throw new Error('Enter a task title.');const task:StudyTask={...input,title:input.title.trim(),id:crypto.randomUUID(),createdAt:Date.now()};await requestResult<IDBValidKey>(TASKS_STORE,'readwrite',s=>s.add(task));return task;}
export async function putTask(task:StudyTask):Promise<void>{await requestResult<IDBValidKey>(TASKS_STORE,'readwrite',s=>s.put(task));}
export async function deleteTask(id:string):Promise<void>{await requestResult<undefined>(TASKS_STORE,'readwrite',s=>s.delete(id));}

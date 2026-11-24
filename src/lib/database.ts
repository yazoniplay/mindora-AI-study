export type Subject = {
  id: string;
  name: string;
  createdAt: number;
};
export type Material = {
  id: string;
  name: string;
  kind: string;
  text: string;
  subjectId: string | null;
  createdAt: number;
  characterCount: number;
  imageBlob?: Blob;
  storagePath?: string | null;
};
const DATABASE_NAME = 'mindora-library';
const DATABASE_VERSION = 1;
const SUBJECTS_STORE = 'subjects';
const MATERIALS_STORE = 'materials';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SUBJECTS_STORE)) database.createObjectStore(SUBJECTS_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(MATERIALS_STORE)) {
        const store = database.createObjectStore(MATERIALS_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('subjectId', 'subjectId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local study library.'));
  });
}
async function requestResult<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Study library operation failed.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Study library transaction failed.')); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Study library transaction was cancelled.')); };
  });
}
export async function getSubjects(): Promise<Subject[]> {
  const rows = await requestResult<Subject[]>(SUBJECTS_STORE, 'readonly', store => store.getAll());
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
export async function createSubject(name: string): Promise<Subject> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Enter a subject name.');
  const subject: Subject = { id: crypto.randomUUID(), name: cleanName, createdAt: Date.now() };
  await requestResult<IDBValidKey>(SUBJECTS_STORE, 'readwrite', store => store.add(subject));
  return subject;
}
export async function putSubject(subject: Subject): Promise<void> {
  await requestResult<IDBValidKey>(SUBJECTS_STORE, 'readwrite', store => store.put(subject));
}
export async function getMaterials(): Promise<Material[]> {
  const rows = await requestResult<Material[]>(MATERIALS_STORE, 'readonly', store => store.getAll());
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}
export async function saveMaterial(input: Omit<Material, 'id' | 'createdAt' | 'characterCount'>): Promise<Material> {
  if (!input.name.trim()) throw new Error('A material needs a file or title.');
  if (!input.text.trim() && !input.imageBlob) throw new Error('No readable text or image content was found in this material.');
  const material: Material = { ...input, id: crypto.randomUUID(), createdAt: Date.now(), characterCount: input.text.length };
  await requestResult<IDBValidKey>(MATERIALS_STORE, 'readwrite', store => store.add(material));
  return material;
}
export async function putMaterial(material: Material): Promise<void> {
  await requestResult<IDBValidKey>(MATERIALS_STORE, 'readwrite', store => store.put(material));
}
export async function deleteMaterial(id: string): Promise<void> {
  await requestResult<undefined>(MATERIALS_STORE, 'readwrite', store => store.delete(id));
}
export async function deleteSubject(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([SUBJECTS_STORE, MATERIALS_STORE], 'readwrite');
    transaction.objectStore(SUBJECTS_STORE).delete(id);
    const materials = transaction.objectStore(MATERIALS_STORE);
    const request = materials.index('subjectId').openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { const material = cursor.value as Material; material.subjectId = null; cursor.update(material); cursor.continue(); }
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}

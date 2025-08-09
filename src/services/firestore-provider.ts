/*
  FirestoreProvider abstraction to allow the engine to run with either
  - Client SDK (firebase/firestore) in the browser, or
  - Admin SDK (firebase-admin/firestore) on the server

  Keep the interface minimal and focused on operations actually used by
  dictionary, daily puzzle generator, and daily puzzle service.
*/

export type QueryConstraint =
  | { type: 'where'; field: string; operator: FirebaseWhereOperator; value: any }
  | { type: 'orderBy'; field: string; direction?: 'asc' | 'desc' }
  | { type: 'limit'; count: number };

export type FirebaseWhereOperator =
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';

export interface FirestoreProvider {
  getDocument<T = any>(collectionPath: string, docId: string): Promise<T | null>;
  setDocument<T = any>(collectionPath: string, docId: string, data: T): Promise<void>;
  queryCollection<T = any>(collectionPath: string, constraints: QueryConstraint[]): Promise<T[]>;
  writeBatch(ops: Array<{ type: 'set' | 'delete'; collectionPath: string; docId: string; data?: any }>): Promise<void>;
  runTransaction<T>(fn: (ctx: { get<T = any>(collectionPath: string, docId: string): Promise<T | null>; set<T = any>(collectionPath: string, docId: string, data: T): Promise<void>; }) => Promise<T>): Promise<T>;
  documentExists(collectionPath: string, docId: string): Promise<boolean>;
}

// Client provider (to be used only in the browser)
export class ClientFirestoreProvider implements FirestoreProvider {
  constructor(private db: any) {
    if (!db) throw new Error('Client Firestore not initialized');
  }

  async getDocument<T = any>(collectionPath: string, docId: string): Promise<T | null> {
    const { doc, getDoc, collection } = await import('firebase/firestore');
    const ref = doc(this.db, collectionPath, docId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as T) : null;
  }

  async setDocument<T = any>(collectionPath: string, docId: string, data: T): Promise<void> {
    const { doc, setDoc } = await import('firebase/firestore');
    const ref = doc(this.db, collectionPath, docId);
    await setDoc(ref, data as any);
  }

  async queryCollection<T = any>(collectionPath: string, constraints: QueryConstraint[]): Promise<T[]> {
    const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
    let q: any = query(collection(this.db, collectionPath));
    for (const c of constraints) {
      if (c.type === 'where') q = query(q, where(c.field, c.operator as any, c.value));
      if (c.type === 'orderBy') q = query(q, orderBy(c.field, c.direction));
      if (c.type === 'limit') q = query(q, limit(c.count));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d: any) => d.data() as T);
  }

  async writeBatch(ops: Array<{ type: 'set' | 'delete'; collectionPath: string; docId: string; data?: any }>): Promise<void> {
    const { writeBatch, doc } = await import('firebase/firestore');
    const batch = writeBatch(this.db);
    for (const op of ops) {
      const ref = doc(this.db, op.collectionPath, op.docId);
      if (op.type === 'set') batch.set(ref, op.data);
      if (op.type === 'delete') batch.delete(ref);
    }
    await batch.commit();
  }

  async runTransaction<T>(fn: (ctx: { get<T = any>(collectionPath: string, docId: string): Promise<T | null>; set<T = any>(collectionPath: string, docId: string, data: T): Promise<void>; }) => Promise<T>): Promise<T> {
    const { runTransaction, doc, getDoc } = await import('firebase/firestore');
    return runTransaction(this.db, async (tx: any) => {
      const ctx = {
        get: async <T = any>(collectionPath: string, docId: string): Promise<T | null> => {
          const ref = doc(this.db, collectionPath, docId);
          const snap = await tx.get(ref);
          return snap.exists() ? (snap.data() as T) : null;
        },
        set: async <T = any>(collectionPath: string, docId: string, data: T): Promise<void> => {
          const ref = doc(this.db, collectionPath, docId);
          tx.set(ref, data as any);
        }
      };
      return fn(ctx);
    });
  }

  async documentExists(collectionPath: string, docId: string): Promise<boolean> {
    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(this.db, collectionPath, docId);
    const snap = await getDoc(ref);
    return snap.exists();
  }
}

// Admin provider (to be used only on the server)
export class AdminFirestoreProvider implements FirestoreProvider {
  constructor(private adminDb: any) {
    if (!adminDb) throw new Error('Admin Firestore not initialized');
  }

  async getDocument<T = any>(collectionPath: string, docId: string): Promise<T | null> {
    const ref = this.adminDb.collection(collectionPath).doc(docId);
    const snap = await ref.get();
    return snap.exists ? (snap.data() as T) : null;
  }

  async setDocument<T = any>(collectionPath: string, docId: string, data: T): Promise<void> {
    const ref = this.adminDb.collection(collectionPath).doc(docId);
    await ref.set(data);
  }

  async queryCollection<T = any>(collectionPath: string, constraints: QueryConstraint[]): Promise<T[]> {
    let q: any = this.adminDb.collection(collectionPath);
    for (const c of constraints) {
      if (c.type === 'where') q = q.where(c.field, c.operator, c.value);
      if (c.type === 'orderBy') q = q.orderBy(c.field, c.direction);
      if (c.type === 'limit') q = q.limit(c.count);
    }
    const snap = await q.get();
    return snap.docs.map((d: any) => d.data() as T);
  }

  async writeBatch(ops: Array<{ type: 'set' | 'delete'; collectionPath: string; docId: string; data?: any }>): Promise<void> {
    const batch = this.adminDb.batch();
    for (const op of ops) {
      const ref = this.adminDb.collection(op.collectionPath).doc(op.docId);
      if (op.type === 'set') batch.set(ref, op.data);
      if (op.type === 'delete') batch.delete(ref);
    }
    await batch.commit();
  }

  async runTransaction<T>(fn: (ctx: { get<T = any>(collectionPath: string, docId: string): Promise<T | null>; set<T = any>(collectionPath: string, docId: string, data: T): Promise<void>; }) => Promise<T>): Promise<T> {
    return this.adminDb.runTransaction(async (tx: any) => {
      const ctx = {
        get: async <T = any>(collectionPath: string, docId: string): Promise<T | null> => {
          const ref = this.adminDb.collection(collectionPath).doc(docId);
          const snap = await tx.get(ref);
          return snap.exists ? (snap.data() as T) : null;
        },
        set: async <T = any>(collectionPath: string, docId: string, data: T): Promise<void> => {
          const ref = this.adminDb.collection(collectionPath).doc(docId);
          tx.set(ref, data);
        }
      };
      return fn(ctx);
    });
  }

  async documentExists(collectionPath: string, docId: string): Promise<boolean> {
    const ref = this.adminDb.collection(collectionPath).doc(docId);
    const snap = await ref.get();
    return snap.exists;
  }
}



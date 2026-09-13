/**
 * ============================================================================
 * GROBAAX SUPABASE MASTER ADAPTER
 * ============================================================================
 * Complete drop-in replacement for Firestore & Firebase Auth backed by Supabase.
 * - Routes all document queries, writes, transactions, and real-time listeners to Supabase.
 * - Zero Firestore quota limits.
 * - Enforces Super Admin access for UID: 4403bd2b-e385-479b-af16-058582fa4ee3 / grobaxycompany@gmail.com
 */

import {
  supabase,
  supabaseAdmin,
  PRIMARY_SUPER_ADMIN_UID,
  SUPER_ADMIN_EMAIL,
  LEGACY_SUPER_ADMIN_UID,
  isSuperAdmin,
  getDocFromSupabase,
  setDocToSupabase,
  updateDocInSupabase,
  deleteDocFromSupabase,
  queryDocsFromSupabase,
  subscribeToSupabase,
} from './supabase';

export {
  supabase,
  supabaseAdmin,
  PRIMARY_SUPER_ADMIN_UID,
  SUPER_ADMIN_EMAIL,
  LEGACY_SUPER_ADMIN_UID,
  isSuperAdmin,
  getDocFromSupabase,
  setDocToSupabase,
  updateDocInSupabase,
  deleteDocFromSupabase,
  queryDocsFromSupabase,
  subscribeToSupabase,
};

// ---------------------------------------------------------------------------
// REFERENCE & QUERY TYPES
// ---------------------------------------------------------------------------

export interface DocumentReference {
  type: 'document';
  id: string;
  collection: string;
  path: string;
}

export interface CollectionReference {
  type: 'collection';
  id: string;
  collection: string;
  path: string;
}

export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter';
  field?: string;
  op?: WhereFilterOp;
  value?: any;
  direction?: 'asc' | 'desc';
}

export interface Query {
  type: 'query';
  collection: string;
  constraints: QueryConstraint[];
}

export interface DocumentSnapshot<T = any> {
  id: string;
  ref: DocumentReference;
  exists: () => boolean;
  data: () => T | undefined;
}

export interface QuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: DocumentSnapshot<T>[];
  forEach: (callback: (doc: DocumentSnapshot<T>) => void) => void;
}

export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// SPECIAL FIELD VALUES (serverTimestamp, increment, arrayUnion)
// ---------------------------------------------------------------------------

export const serverTimestamp = () => new Date().toISOString();

export const increment = (n: number) => ({
  __op: 'increment',
  value: n,
});

export const arrayUnion = (...items: any[]) => ({
  __op: 'arrayUnion',
  items,
});

export const arrayRemove = (...items: any[]) => ({
  __op: 'arrayRemove',
  items,
});

// Helper to resolve special field values on objects
export function resolveFieldUpdates(target: any, updates: any): any {
  if (!updates || typeof updates !== 'object') return updates;
  const result = { ...(target || {}) };

  for (const [key, val] of Object.entries(updates)) {
    if (val && typeof val === 'object' && (val as any).__op) {
      const op = (val as any).__op;
      if (op === 'increment') {
        result[key] = (Number(result[key]) || 0) + Number((val as any).value || 0);
      } else if (op === 'arrayUnion') {
        const existingArr = Array.isArray(result[key]) ? result[key] : [];
        const toAdd = (val as any).items || [];
        result[key] = Array.from(new Set([...existingArr, ...toAdd]));
      } else if (op === 'arrayRemove') {
        const existingArr = Array.isArray(result[key]) ? result[key] : [];
        const toRemove = new Set((val as any).items || []);
        result[key] = existingArr.filter((item: any) => !toRemove.has(item));
      }
    } else {
      result[key] = val;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// FIRESTORE COMPATIBILITY FUNCTIONS
// ---------------------------------------------------------------------------

export function generateDocId(prefix: string = 'doc'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function collection(database: any, ...pathSegments: string[]): CollectionReference {
  const fullPath = pathSegments.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  const parts = fullPath.split('/');
  const collName = parts[parts.length - 1] || 'records';
  return {
    type: 'collection',
    id: collName,
    collection: collName,
    path: fullPath,
  };
}

export function doc(
  target: any,
  ...pathSegments: string[]
): DocumentReference {
  if (target?.type === 'collection') {
    const docId = pathSegments[0] || generateDocId();
    return {
      type: 'document',
      id: docId,
      collection: target.collection,
      path: `${target.path}/${docId}`,
    };
  }

  const allSegments = pathSegments.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  const parts = allSegments.split('/');

  if (parts.length === 1) {
    // only collection passed; generate ID
    const coll = parts[0];
    const docId = generateDocId();
    return {
      type: 'document',
      id: docId,
      collection: coll,
      path: `${coll}/${docId}`,
    };
  }

  const docId = parts[parts.length - 1];
  const coll = parts[parts.length - 2] || 'records';

  return {
    type: 'document',
    id: docId,
    collection: coll,
    path: allSegments,
  };
}

export function query(
  collRef: CollectionReference,
  ...constraints: QueryConstraint[]
): Query {
  return {
    type: 'query',
    collection: collRef.collection,
    constraints: constraints.filter(Boolean),
  };
}

export function where(field: string, op: WhereFilterOp, value: any): QueryConstraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(value: number): QueryConstraint {
  return { type: 'limit', value };
}

export function startAfter(value: any): QueryConstraint {
  return { type: 'startAfter', value };
}

export async function getDoc<T = any>(docRef: DocumentReference): Promise<DocumentSnapshot<T>> {
  if (!docRef || !docRef.id) {
    return {
      id: '',
      ref: docRef,
      exists: () => false,
      data: () => undefined,
    };
  }

  const data = await getDocFromSupabase<T>(docRef.collection, docRef.id);
  const exists = data !== null && data !== undefined;

  return {
    id: docRef.id,
    ref: docRef,
    exists: () => exists,
    data: () => (exists ? data : undefined),
  };
}

export async function getDocs<T = any>(target: CollectionReference | Query): Promise<QuerySnapshot<T>> {
  const collectionName = target.collection;
  const constraints = target.type === 'query' ? target.constraints : [];

  const whereOpts: [string, any, any][] = [];
  const orderOpts: { field: string; direction?: 'asc' | 'desc' }[] = [];
  let limitVal: number | undefined;

  for (const c of constraints) {
    if (c.type === 'where' && c.field && c.op !== undefined) {
      whereOpts.push([c.field, c.op, c.value]);
    } else if (c.type === 'orderBy' && c.field) {
      orderOpts.push({ field: c.field, direction: c.direction });
    } else if (c.type === 'limit' && c.value) {
      limitVal = c.value;
    }
  }

  const items = await queryDocsFromSupabase<T>(collectionName, {
    where: whereOpts,
    orderBy: orderOpts,
    limit: limitVal,
  });

  const docs: DocumentSnapshot<T>[] = items.map((item: any) => {
    const id = item.id || generateDocId();
    return {
      id,
      ref: {
        type: 'document',
        id,
        collection: collectionName,
        path: `${collectionName}/${id}`,
      },
      exists: () => true,
      data: () => item,
    };
  });

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb),
  };
}

export async function setDoc<T = any>(
  docRef: DocumentReference,
  data: T,
  options?: { merge?: boolean }
): Promise<void> {
  const merge = options?.merge ?? true;
  await setDocToSupabase(docRef.collection, docRef.id, data, merge);
}

export async function updateDoc<T = any>(
  docRef: DocumentReference,
  data: Partial<T>
): Promise<void> {
  const existing = await getDocFromSupabase(docRef.collection, docRef.id);
  const resolved = resolveFieldUpdates(existing, data);
  await setDocToSupabase(docRef.collection, docRef.id, resolved, true);
}

export async function deleteDoc(docRef: DocumentReference): Promise<void> {
  await deleteDocFromSupabase(docRef.collection, docRef.id);
}

export async function addDoc<T = any>(
  collRef: CollectionReference,
  data: T
): Promise<DocumentReference> {
  const docId = (data as any)?.id || generateDocId(collRef.collection.toLowerCase());
  const docRef: DocumentReference = {
    type: 'document',
    id: docId,
    collection: collRef.collection,
    path: `${collRef.path}/${docId}`,
  };

  await setDocToSupabase(collRef.collection, docId, { ...(data as any), id: docId }, true);
  return docRef;
}

export function onSnapshot(
  target: DocumentReference | CollectionReference | Query,
  onNext: (snapshot: any) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (target.type === 'document') {
    return subscribeToSupabase(
      target.collection,
      (items) => {
        const item = items.find((i) => i.id === target.id) || items[0];
        const exists = Boolean(item);
        onNext({
          id: target.id,
          ref: target,
          exists: () => exists,
          data: () => (exists ? item : undefined),
        });
      },
      { filterDocId: target.id }
    );
  }

  // Collection or Query
  const collectionName = target.collection;
  const constraints = target.type === 'query' ? target.constraints : [];

  const whereOpts: [string, any, any][] = [];
  const orderOpts: { field: string; direction?: 'asc' | 'desc' }[] = [];
  let limitVal: number | undefined;

  for (const c of constraints) {
    if (c.type === 'where' && c.field && c.op !== undefined) {
      whereOpts.push([c.field, c.op, c.value]);
    } else if (c.type === 'orderBy' && c.field) {
      orderOpts.push({ field: c.field, direction: c.direction });
    } else if (c.type === 'limit' && c.value) {
      limitVal = c.value;
    }
  }

  return subscribeToSupabase(
    collectionName,
    (items) => {
      const docs = items.map((item: any) => {
        const id = item.id || generateDocId();
        return {
          id,
          ref: {
            type: 'document' as const,
            id,
            collection: collectionName,
            path: `${collectionName}/${id}`,
          },
          exists: () => true,
          data: () => item,
        };
      });

      onNext({
        empty: docs.length === 0,
        size: docs.length,
        docs,
        forEach: (cb: any) => docs.forEach(cb),
      });
    },
    {
      where: whereOpts,
      orderBy: orderOpts,
      limit: limitVal,
    }
  );
}

export function writeBatch(dbInstance?: any) {
  const operations: Array<() => Promise<void>> = [];

  return {
    set: (docRef: DocumentReference, data: any, options?: { merge?: boolean }) => {
      operations.push(() => setDoc(docRef, data, options));
    },
    update: (docRef: DocumentReference, data: any) => {
      operations.push(() => updateDoc(docRef, data));
    },
    delete: (docRef: DocumentReference) => {
      operations.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    },
  };
}

export async function runTransaction<T>(
  dbInstance: any,
  updateFunction: (transaction: any) => Promise<T>
): Promise<T> {
  const tx = {
    get: async (docRef: DocumentReference) => getDoc(docRef),
    set: (docRef: DocumentReference, data: any, options?: { merge?: boolean }) =>
      setDoc(docRef, data, options),
    update: (docRef: DocumentReference, data: any) => updateDoc(docRef, data),
    delete: (docRef: DocumentReference) => deleteDoc(docRef),
  };
  return updateFunction(tx);
}

// Global DB instance satisfying both Supabase and Firestore types
export const db: any = {
  type: 'supabase-firestore-facade',
  app: {} as any,
  toJSON: () => ({ type: 'supabase-firestore-facade' }),
};

// ---------------------------------------------------------------------------
// AUTH ADAPTER WITH SUPER ADMIN ENFORCEMENT
// ---------------------------------------------------------------------------

let cachedCurrentUser: any = null;
const authListeners = new Set<(user: any) => void>();

// Check local storage for initial user or session
if (typeof window !== 'undefined') {
  try {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        handleSupabaseUser(data.session.user);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      handleSupabaseUser(session?.user || null);
    });
  } catch (e) {
    console.warn('[Supabase Auth] Init listener notice:', e);
  }
}

function handleSupabaseUser(rawUser: any) {
  if (!rawUser) {
    cachedCurrentUser = null;
    authListeners.forEach((listener) => listener(null));
    return;
  }

  const isSuper = isSuperAdmin(rawUser.id, rawUser.email);

  cachedCurrentUser = {
    uid: rawUser.id,
    id: rawUser.id,
    email: rawUser.email,
    displayName:
      rawUser.user_metadata?.full_name ||
      rawUser.user_metadata?.name ||
      (isSuper ? 'Grobaax Super Admin' : rawUser.email?.split('@')[0]),
    photoURL: rawUser.user_metadata?.avatar_url || rawUser.user_metadata?.picture || null,
    emailVerified: Boolean(rawUser.email_confirmed_at || rawUser.confirmed_at || isSuper),
    isAnonymous: false,
    providerData: [
      {
        providerId: 'supabase',
        email: rawUser.email,
        displayName: rawUser.user_metadata?.full_name || rawUser.email?.split('@')[0],
      },
    ],
    role: isSuper ? 'super_admin' : (rawUser.user_metadata?.role || 'student'),
    isSuperAdmin: isSuper,
    isPrimarySuperAdmin: isSuper,
    reload: async () => {},
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    },
  };

  authListeners.forEach((listener) => listener(cachedCurrentUser));
}

export const auth: any = {
  get currentUser() {
    return cachedCurrentUser;
  },
  onAuthStateChanged: (callback: (user: any) => void) => {
    authListeners.add(callback);
    // Fire immediately with cached current user if available
    callback(cachedCurrentUser);
    return () => {
      authListeners.delete(callback);
    };
  },
};

export const onAuthStateChanged = (
  authInstance: any,
  callback: (user: any) => void
): Unsubscribe => {
  return auth.onAuthStateChanged(callback);
};

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error) {
    throw new Error(error.message);
  }

  handleSupabaseUser(data.user);
  return { user: cachedCurrentUser };
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: pass,
  });

  if (error) {
    throw new Error(error.message);
  }

  handleSupabaseUser(data.user);
  return { user: cachedCurrentUser };
}

export async function sendPasswordResetEmail(authInstance: any, email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(authInstance?: any) {
  await supabase.auth.signOut();
  handleSupabaseUser(null);
}

export async function updateProfile(user: any, profile: { displayName?: string; photoURL?: string }) {
  await supabase.auth.updateUser({
    data: {
      full_name: profile.displayName,
      avatar_url: profile.photoURL,
    },
  });
  if (cachedCurrentUser) {
    if (profile.displayName) cachedCurrentUser.displayName = profile.displayName;
    if (profile.photoURL) cachedCurrentUser.photoURL = profile.photoURL;
    authListeners.forEach((l) => l(cachedCurrentUser));
  }
}

export async function deleteUser(_user: any): Promise<void> {
  await supabase.auth.signOut();
  handleSupabaseUser(null);
}

export async function updatePassword(_user: any, newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function reauthenticateWithCredential(_user: any, _cred: any): Promise<void> {}

export const EmailAuthProvider = {
  credential: (email: string, pass: string) => ({ email, pass }),
};

export async function sendEmailVerification(_user: any): Promise<void> {}

export const signInWithGoogle = async (): Promise<any> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return cachedCurrentUser;
};

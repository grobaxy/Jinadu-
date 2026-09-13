import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

// Safe environment variable resolution supporting Vite, browser, and Node.js
const safeGetEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process?.env && process.env[key]) {
    return process.env[key] as string;
  }
  try {
    const metaGetter = new Function('try { return import.meta.env; } catch(e) { return {}; }');
    const envObj = metaGetter();
    return (envObj && envObj[key]) || '';
  } catch {
    return '';
  }
};

const rawUrl =
  safeGetEnv('SUPABASE_URL') ||
  safeGetEnv('VITE_SUPABASE_URL') ||
  'https://rsnmxdyqrmkjsfxwypek.supabase.co';

// Normalize root supabase.co URL to the project instance
export const SUPABASE_URL =
  rawUrl === 'https://supabase.co' || rawUrl === 'https://supabase.co/'
    ? 'https://rsnmxdyqrmkjsfxwypek.supabase.co'
    : rawUrl;

export const SUPABASE_ANON_KEY =
  safeGetEnv('SUPABASE_ANON_KEY') ||
  safeGetEnv('VITE_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbm14ZHlxcm1ranNmeHd5cGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzI1NzYsImV4cCI6MjEwNDcwODU3Nn0.35_rPRhEbwfIpA5LlAKVueuxkLWjd4lyJphlNoVMaPc';

export const SUPABASE_SERVICE_ROLE_KEY =
  safeGetEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbm14ZHlxcm1ranNmeHd5cGVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEzMjU3NiwiZXhwIjoyMTA0NzA4NTc2fQ.W1Ue-ZlOPxA8vX2JihJnwEzfKjsnvhOx6gshYLBGFrs';

export const DATABASE_URL =
  safeGetEnv('DATABASE_URL') ||
  'postgresql://postgres:Mockfast1122@db.rsnmxdyqrmkjsfxwypek.supabase.co:5432/postgres';

// Strict Primary Super Admin credentials
export const PRIMARY_SUPER_ADMIN_UID = '4403bd2b-e385-479b-af16-058582fa4ee3';
export const SUPER_ADMIN_EMAIL = 'grobaxycompany@gmail.com';
export const LEGACY_SUPER_ADMIN_UID = 'iH02BTcB4B0BV2YLA60WwFAi50CJ3';

export function isSuperAdmin(uid?: string | null, email?: string | null): boolean {
  if (!uid && !email) return false;
  if (uid === PRIMARY_SUPER_ADMIN_UID || uid === '4403bd2b-e385-479b-af16-058582fa4ee3') return true;
  if (uid === LEGACY_SUPER_ADMIN_UID) return true;
  if (email && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (uid && uid.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

// Global Supabase Client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Privileged Service Role Supabase Client (for backend / admin operations)
export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Cache for in-flight real-time subscriptions
const activeChannels = new Map<string, any>();

/**
 * Normalizes table name for PostgreSQL query
 */
export function normalizeTableName(name: string): string {
  if (!name) return 'records';
  return name.trim();
}

/**
 * Fetch a single document from Supabase
 */
export async function getDocFromSupabase<T = any>(tableName: string, docId: string): Promise<T | null> {
  try {
    const table = normalizeTableName(tableName);
    const { data, error } = await supabase
      .from(table)
      .select('id, data')
      .eq('id', docId)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase] Error fetching ${table}/${docId}:`, error.message);
      return null;
    }

    if (!data) return null;
    return {
      ...(data.data || {}),
      id: data.id,
    } as T;
  } catch (err) {
    console.warn(`[Supabase] Exception in getDocFromSupabase ${tableName}/${docId}:`, err);
    return null;
  }
}

/**
 * Set or upsert a document in Supabase
 */
export async function setDocToSupabase<T = any>(
  tableName: string,
  docId: string,
  data: T,
  merge: boolean = true
): Promise<T> {
  const table = normalizeTableName(tableName);
  const now = new Date().toISOString();

  let finalPayload: any = {
    ...(data as any),
    id: docId,
    updatedAt: (data as any)?.updatedAt || now,
  };

  if (merge) {
    const existing = await getDocFromSupabase(tableName, docId);
    if (existing) {
      finalPayload = {
        ...existing,
        ...finalPayload,
        updatedAt: now,
      };
    }
  }

  const row = {
    id: docId,
    data: finalPayload,
    updated_at: now,
  };

  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });

  if (error) {
    console.error(`[Supabase] Upsert error in ${table}/${docId}:`, error.message);
    throw new Error(error.message);
  }

  return finalPayload as T;
}

/**
 * Update an existing document in Supabase
 */
export async function updateDocInSupabase<T = any>(
  tableName: string,
  docId: string,
  updates: Partial<T>
): Promise<T> {
  return setDocToSupabase<T>(tableName, docId, updates as any, true);
}

/**
 * Delete a document from Supabase
 */
export async function deleteDocFromSupabase(tableName: string, docId: string): Promise<boolean> {
  try {
    const table = normalizeTableName(tableName);
    const { error } = await supabase.from(table).delete().eq('id', docId);
    if (error) {
      console.error(`[Supabase] Delete error in ${table}/${docId}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase] Exception deleting ${tableName}/${docId}:`, err);
    return false;
  }
}

/**
 * Query multiple documents from Supabase
 */
export async function queryDocsFromSupabase<T = any>(
  tableName: string,
  options?: {
    where?: [string, any, any][];
    orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
    limit?: number;
  }
): Promise<T[]> {
  try {
    const table = normalizeTableName(tableName);
    let query = supabase.from(table).select('id, data, created_at, updated_at');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.warn(`[Supabase] Query error in ${table}:`, error.message);
      return [];
    }

    let items: T[] = (data || []).map((row: any) => ({
      ...(row.data || {}),
      id: row.id,
      createdAt: row.data?.createdAt || row.created_at,
      updatedAt: row.data?.updatedAt || row.updated_at,
    }));

    // Apply where filters in-memory for JSONB flexibilty
    if (options?.where && options.where.length > 0) {
      items = items.filter((item: any) => {
        return options.where!.every(([field, op, val]) => {
          const itemVal = item[field];
          switch (op) {
            case '==':
              return itemVal === val;
            case '!=':
              return itemVal !== val;
            case '>':
              return itemVal > val;
            case '>=':
              return itemVal >= val;
            case '<':
              return itemVal < val;
            case '<=':
              return itemVal <= val;
            case 'in':
              return Array.isArray(val) && val.includes(itemVal);
            case 'array-contains':
              return Array.isArray(itemVal) && itemVal.includes(val);
            default:
              return true;
          }
        });
      });
    }

    // Apply ordering
    if (options?.orderBy && options.orderBy.length > 0) {
      items.sort((a: any, b: any) => {
        for (const ord of options.orderBy!) {
          const aVal = a[ord.field];
          const bVal = b[ord.field];
          if (aVal === bVal) continue;
          const dir = ord.direction === 'desc' ? -1 : 1;
          if (aVal === undefined || aVal === null) return 1;
          if (bVal === undefined || bVal === null) return -1;
          return aVal > bVal ? dir : -dir;
        }
        return 0;
      });
    }

    return items;
  } catch (err) {
    console.warn(`[Supabase] Exception querying ${tableName}:`, err);
    return [];
  }
}

/**
 * Subscribe to real-time changes on a Supabase table
 */
export function subscribeToSupabase<T = any>(
  tableName: string,
  onData: (items: T[]) => void,
  options?: {
    filterDocId?: string;
    where?: [string, any, any][];
    orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
    limit?: number;
  }
): () => void {
  const table = normalizeTableName(tableName);
  const channelId = `realtime:${table}:${options?.filterDocId || 'all'}:${Math.random().toString(36).substring(7)}`;

  // Run initial fetch
  const fetchAndNotify = async () => {
    if (options?.filterDocId) {
      const single = await getDocFromSupabase<T>(tableName, options.filterDocId);
      if (single) onData([single]);
    } else {
      const list = await queryDocsFromSupabase<T>(tableName, options);
      onData(list);
    }
  };

  fetchAndNotify();

  // Create real-time channel
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
      },
      () => {
        // Debounced refetch on any change to ensure unified data
        fetchAndNotify();
      }
    )
    .subscribe();

  activeChannels.set(channelId, channel);

  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelId);
  };
}

// ---------------------------------------------------------------------------
// SUPABASE AUTH FLOW ADAPTER
// ---------------------------------------------------------------------------

export interface SupabaseAuthUser {
  id: string;
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

export function formatSupabaseUser(user: SupabaseUser | null): SupabaseAuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
  };
}

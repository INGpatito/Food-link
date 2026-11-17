import mysql from 'mysql2/promise';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  is_verified: number;
  verification_token: string | null;
  created_at?: string;
  updated_at?: string;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'orangepi4pro',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'pato', 
  database: process.env.DB_NAME || 'FOODLINK',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/* ------------------------------------------------------------------ */
/* buscar porque existe esto si lo borro no funciona y si lo dejo no hace nada                           */
/* ------------------------------------------------------------------ */

const memoryUsersByEmail = new Map<string, UserRow>();
const memoryUsersById = new Map<number, UserRow>();
let memoryUserIdCounter = 1000;

function syncUserToMemory(user: UserRow): void {
  memoryUsersByEmail.set(user.email.toLowerCase(), { ...user });
  memoryUsersById.set(user.id, { ...user });
}

export function isDbDisabled(): boolean {
  return process.env.FOODLINK_DISABLE_PLACES_DB === '1';
}

export function getInMemoryUser(email: string): UserRow | null {
  return memoryUsersByEmail.get(email.trim().toLowerCase()) || null;
}

export function setInMemoryUser(user: UserRow): void {
  syncUserToMemory(user);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isDbDisabled()) {
    return memoryUsersByEmail.get(normalizedEmail) || null;
  }
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT id, name, email, password_hash, is_verified, verification_token, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );
    if (rows.length === 0) {
      return memoryUsersByEmail.get(normalizedEmail) || null;
    }
    const user = rows[0] as UserRow;
    syncUserToMemory(user);
    return user;
  } catch (err: any) {
    console.warn(`[DB Fallback] findUserByEmail fallback en memoria (${err?.message || 'DB no disponible'})`);
    return memoryUsersByEmail.get(normalizedEmail) || null;
  }
}

export async function findUserById(id: number): Promise<UserRow | null> {
  if (isDbDisabled()) {
    return memoryUsersById.get(id) || null;
  }
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT id, name, email, password_hash, is_verified, verification_token, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) {
      return memoryUsersById.get(id) || null;
    }
    const user = rows[0] as UserRow;
    syncUserToMemory(user);
    return user;
  } catch (err: any) {
    console.warn(`[DB Fallback] findUserById fallback en memoria (${err?.message || 'DB no disponible'})`);
    return memoryUsersById.get(id) || null;
  }
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  verificationToken: string
): Promise<UserRow> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (isDbDisabled()) {
    const memUser: UserRow = {
      id: memoryUserIdCounter++,
      name: trimmedName,
      email: normalizedEmail,
      password_hash: passwordHash,
      is_verified: 0,
      verification_token: verificationToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    syncUserToMemory(memUser);
    return memUser;
  }

  try {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash, is_verified, verification_token) VALUES (?, ?, ?, 0, ?)',
      [trimmedName, normalizedEmail, passwordHash, verificationToken]
    );
    const user: UserRow = {
      id: result.insertId,
      name: trimmedName,
      email: normalizedEmail,
      password_hash: passwordHash,
      is_verified: 0,
      verification_token: verificationToken
    };
    syncUserToMemory(user);
    return user;
  } catch (err: any) {
    console.warn(`[DB Fallback] createUser fallback en memoria (${err?.message || 'DB no disponible'})`);
    const memUser: UserRow = {
      id: memoryUserIdCounter++,
      name: trimmedName,
      email: normalizedEmail,
      password_hash: passwordHash,
      is_verified: 0,
      verification_token: verificationToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    syncUserToMemory(memUser);
    return memUser;
  }
}

export async function updateUnverifiedUser(
  id: number,
  name: string,
  email: string,
  passwordHash: string,
  verificationToken: string
): Promise<UserRow> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const user: UserRow = {
    id,
    name: trimmedName,
    email: normalizedEmail,
    password_hash: passwordHash,
    is_verified: 0,
    verification_token: verificationToken,
    updated_at: new Date().toISOString()
  };
  syncUserToMemory(user);

  if (isDbDisabled()) {
    return user;
  }

  try {
    await pool.query<mysql.ResultSetHeader>(
      'UPDATE users SET name = ?, password_hash = ?, verification_token = ?, is_verified = 0 WHERE id = ?',
      [trimmedName, passwordHash, verificationToken, id]
    );
  } catch (err: any) {
    console.warn(`[DB Fallback] updateUnverifiedUser fallback en memoria (${err?.message || 'DB no disponible'})`);
  }

  return user;
}

export async function verifyUserToken(email: string, token: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  const memUser = memoryUsersByEmail.get(normalizedEmail);
  let memoryMatched = false;
  if (memUser && memUser.verification_token === trimmedToken) {
    memUser.is_verified = 1;
    memUser.verification_token = null;
    memUser.updated_at = new Date().toISOString();
    syncUserToMemory(memUser);
    memoryMatched = true;
  }

  if (isDbDisabled()) {
    return memoryMatched;
  }

  try {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE email = ? AND verification_token = ?',
      [normalizedEmail, trimmedToken]
    );
    if (result.affectedRows > 0) {
      if (memUser) {
        memUser.is_verified = 1;
        memUser.verification_token = null;
        syncUserToMemory(memUser);
      }
      return true;
    }
    return memoryMatched;
  } catch (err: any) {
    console.warn(`[DB Fallback] verifyUserToken fallback en memoria (${err?.message || 'DB no disponible'})`);
    return memoryMatched;
  }
}

export async function updateUserVerificationToken(email: string, token: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  const memUser = memoryUsersByEmail.get(normalizedEmail);
  let memoryUpdated = false;
  if (memUser) {
    memUser.verification_token = trimmedToken;
    memUser.updated_at = new Date().toISOString();
    syncUserToMemory(memUser);
    memoryUpdated = true;
  }

  if (isDbDisabled()) {
    return memoryUpdated;
  }

  try {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE users SET verification_token = ? WHERE email = ?',
      [trimmedToken, normalizedEmail]
    );
    return result.affectedRows > 0 || memoryUpdated;
  } catch (err: any) {
    console.warn(`[DB Fallback] updateUserVerificationToken fallback en memoria (${err?.message || 'DB no disponible'})`);
    return memoryUpdated;
  }
}

export async function updateUserName(email: string, name: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const memUser = memoryUsersByEmail.get(normalizedEmail);
  if (memUser) {
    memUser.name = trimmedName;
    memUser.updated_at = new Date().toISOString();
    syncUserToMemory(memUser);
  }

  if (isDbDisabled()) {
    return Boolean(memUser);
  }

  try {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE users SET name = ? WHERE email = ?',
      [trimmedName, normalizedEmail]
    );
    return result.affectedRows > 0 || Boolean(memUser);
  } catch (err: any) {
    console.warn(`[DB Fallback] updateUserName fallback en memoria (${err?.message || 'DB no disponible'})`);
    return Boolean(memUser);
  }
}

export default pool;

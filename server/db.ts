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

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, name, email, password_hash, is_verified, verification_token, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );
  if (rows.length === 0) return null;
  return rows[0] as UserRow;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, name, email, password_hash, is_verified, verification_token, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  if (rows.length === 0) return null;
  return rows[0] as UserRow;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  verificationToken: string
): Promise<UserRow> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const [result] = await pool.query<mysql.ResultSetHeader>(
    'INSERT INTO users (name, email, password_hash, is_verified, verification_token) VALUES (?, ?, ?, 0, ?)',
    [trimmedName, normalizedEmail, passwordHash, verificationToken]
  );

  return {
    id: result.insertId,
    name: trimmedName,
    email: normalizedEmail,
    password_hash: passwordHash,
    is_verified: 0,
    verification_token: verificationToken
  };
}

export async function verifyUserToken(email: string, token: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  const [result] = await pool.query<mysql.ResultSetHeader>(
    'UPDATE users SET is_verified = 1, verification_token = NULL WHERE email = ? AND verification_token = ?',
    [normalizedEmail, trimmedToken]
  );

  return result.affectedRows > 0;
}

export async function updateUserVerificationToken(email: string, token: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  const [result] = await pool.query<mysql.ResultSetHeader>(
    'UPDATE users SET verification_token = ? WHERE email = ?',
    [trimmedToken, normalizedEmail]
  );

  return result.affectedRows > 0;
}

export default pool;

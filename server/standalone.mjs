import http from 'node:http';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const PORT = Number(process.env.API_PORT || process.env.PORT || 3005);
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'pato';
const DB_NAME = process.env.DB_NAME || 'FOODLINK';

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method?.toUpperCase();

  try {
    // 1. Registro
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { name, email, password } = body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return sendJson(res, 400, { success: false, message: 'El nombre completo es requerido.' });
      }

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return sendJson(res, 400, { success: false, message: 'Ingresa un correo electronico valido.' });
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        return sendJson(res, 400, { success: false, message: 'La contrasena debe contener al menos 8 caracteres.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (existing.length > 0) {
        return sendJson(res, 409, { success: false, message: 'Este correo electronico ya se encuentra registrado.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, is_verified, verification_token) VALUES (?, ?, ?, 0, ?)',
        [name.trim(), normalizedEmail, passwordHash, verificationCode]
      );

      return sendJson(res, 201, {
        success: true,
        message: 'Registro exitoso.',
        user: {
          id: result.insertId,
          name: name.trim(),
          email: normalizedEmail,
          is_verified: false
        },
        verificationCode
      });
    }

    // 2. Inicio de sesion
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return sendJson(res, 400, { success: false, message: 'Debes ingresar correo y contrasena.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, is_verified FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );

      if (rows.length === 0) {
        return sendJson(res, 401, { success: false, message: 'Credenciales invalidas. Verifica tu correo y contrasena.' });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return sendJson(res, 401, { success: false, message: 'Credenciales invalidas. Verifica tu correo y contrasena.' });
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Inicio de sesion exitoso.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: Boolean(user.is_verified)
        }
      });
    }

    // 3. Verificacion
    if (pathname === '/api/auth/verify' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { email, code } = body;

      if (!email || !code) {
        return sendJson(res, 400, { success: false, message: 'Debes proporcionar correo y codigo.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const [rows] = await pool.query('SELECT id, name, email, is_verified, verification_token FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (rows.length === 0) {
        return sendJson(res, 404, { success: false, message: 'Usuario no encontrado.' });
      }

      const user = rows[0];
      if (user.is_verified) {
        return sendJson(res, 200, {
          success: true,
          message: 'La cuenta ya esta verificada.',
          user: { id: user.id, name: user.name, email: user.email, is_verified: true }
        });
      }

      if (user.verification_token !== String(code).trim()) {
        return sendJson(res, 400, { success: false, message: 'El codigo de verificacion es incorrecto.' });
      }

      await pool.query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

      return sendJson(res, 200, {
        success: true,
        message: 'Cuenta verificada exitosamente.',
        user: { id: user.id, name: user.name, email: user.email, is_verified: true }
      });
    }

    // 4. Reenvio
    if (pathname === '/api/auth/resend-code' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { email } = body;

      if (!email) {
        return sendJson(res, 400, { success: false, message: 'El correo es requerido.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const [rows] = await pool.query('SELECT id, is_verified FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (rows.length === 0) {
        return sendJson(res, 404, { success: false, message: 'Usuario no encontrado.' });
      }

      if (rows[0].is_verified) {
        return sendJson(res, 400, { success: false, message: 'Esta cuenta ya esta verificada.' });
      }

      const newCode = String(Math.floor(100000 + Math.random() * 900000));
      await pool.query('UPDATE users SET verification_token = ? WHERE id = ?', [newCode, rows[0].id]);

      return sendJson(res, 200, {
        success: true,
        message: 'Nuevo codigo generado.',
        verificationCode: newCode
      });
    }

    // 5. Estado actual
    if (pathname === '/api/auth/me' && method === 'GET') {
      const email = url.searchParams.get('email');
      if (!email) {
        return sendJson(res, 400, { success: false, message: 'Parametro email requerido.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const [rows] = await pool.query('SELECT id, name, email, is_verified FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (rows.length === 0) {
        return sendJson(res, 404, { success: false, message: 'Usuario no encontrado.' });
      }

      return sendJson(res, 200, {
        success: true,
        user: {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email,
          is_verified: Boolean(rows[0].is_verified)
        }
      });
    }

    return sendJson(res, 404, { success: false, message: 'Ruta no encontrada en el backend de Foodlink.' });
  } catch (error) {
    console.error('[API Error]:', error);
    return sendJson(res, 500, { success: false, message: 'Error interno: ' + (error?.message || 'Error en servidor') });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Foodlink Auth API corriendo en http://127.0.0.1:${PORT}`);
});

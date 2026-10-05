import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  createUser,
  verifyUserToken,
  updateUserVerificationToken
} from './db.ts';

function parseRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => { // 
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Formato JSON invalido'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function authPlugin(): Plugin {
  return {
    name: 'foodlink-auth-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost') : null;
        if (!url || !url.pathname.startsWith('/api/auth')) {
          return next();
        }

        const pathname = url.pathname;
        const method = req.method?.toUpperCase();

        try {
          // 1. Registro de usuario
          if (pathname === '/api/auth/register' && method === 'POST') {
            const body = await parseRequestBody(req);
            const { name, email, password } = body;

            if (!name || typeof name !== 'string' || name.trim().length === 0) {
              return sendJson(res, 400, {
                success: false,
                message: 'El nombre completo es requerido.'
              });
            }

            if (!email || typeof email !== 'string' || !email.includes('@')) {
              return sendJson(res, 400, {
                success: false,
                message: 'Ingresa un correo electronico valido.'
              });
            }

            if (!password || typeof password !== 'string' || password.length < 8) {
              return sendJson(res, 400, {
                success: false,
                message: 'La contrasena debe contener al menos 8 caracteres.'
              });
            }

            const existingUser = await findUserByEmail(email);
            if (existingUser) {
              return sendJson(res, 409, {
                success: false,
                message: 'Este correo electronico ya se encuentra registrado.'
              });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

            const newUser = await createUser(name, email, passwordHash, verificationCode);

            return sendJson(res, 201, {
              success: true,
              message: 'Registro exitoso. Se ha enviado un codigo de verificacion a tu correo.',
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                is_verified: false
              },
              verificationCode
            });
          }

          // 2. Inicio de sesion
          if (pathname === '/api/auth/login' && method === 'POST') {
            const body = await parseRequestBody(req);
            const { email, password } = body;

            if (!email || !password) {
              return sendJson(res, 400, {
                success: false,
                message: 'Debes ingresar correo y contrasena.'
              });
            }

            const user = await findUserByEmail(email);
            if (!user) {
              return sendJson(res, 401, {
                success: false,
                message: 'Credenciales invalidas. Verifica tu correo y contrasena.'
              });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
              return sendJson(res, 401, {
                success: false,
                message: 'Credenciales invalidas. Verifica tu correo y contrasena.'
              });
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

          // 3. Verificacion de codigo
          if (pathname === '/api/auth/verify' && method === 'POST') {
            const body = await parseRequestBody(req);
            const { email, code } = body;

            if (!email || !code) {
              return sendJson(res, 400, {
                success: false,
                message: 'Debes proporcionar el correo y el codigo de verificacion.'
              });
            }

            const user = await findUserByEmail(email);
            if (!user) {
              return sendJson(res, 404, {
                success: false,
                message: 'Usuario no encontrado.'
              });
            }

            if (user.is_verified) {
              return sendJson(res, 200, {
                success: true,
                message: 'La cuenta ya se encuentra verificada.',
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  is_verified: true
                }
              });
            }

            const ok = await verifyUserToken(email, code);
            if (!ok) {
              return sendJson(res, 400, {
                success: false,
                message: 'El codigo de verificacion ingresado es incorrecto.'
              });
            }

            return sendJson(res, 200, {
              success: true,
              message: 'Cuenta verificada exitosamente.',
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: true
              }
            });
          }

          // 4. Reenvio de codigo
          if (pathname === '/api/auth/resend-code' && method === 'POST') {
            const body = await parseRequestBody(req);
            const { email } = body;

            if (!email) {
              return sendJson(res, 400, {
                success: false,
                message: 'El correo electronico es requerido.'
              });
            }

            const user = await findUserByEmail(email);
            if (!user) {
              return sendJson(res, 404, {
                success: false,
                message: 'Usuario no encontrado.'
              });
            }

            if (user.is_verified) {
              return sendJson(res, 400, {
                success: false,
                message: 'Esta cuenta ya esta verificada.'
              });
            }

            const newCode = String(Math.floor(100000 + Math.random() * 900000));
            await updateUserVerificationToken(email, newCode);

            return sendJson(res, 200, {
              success: true,
              message: 'Nuevo codigo generado y enviado.',
              verificationCode: newCode
            });
          }

          // 5. Estado actual del usuario
          if (pathname === '/api/auth/me' && method === 'GET') {
            const email = url.searchParams.get('email');
            if (!email) {
              return sendJson(res, 400, {
                success: false,
                message: 'Parametro email requerido.'
              });
            }

            const user = await findUserByEmail(email);
            if (!user) {
              return sendJson(res, 404, {
                success: false,
                message: 'Usuario no encontrado.'
              });
            }

            return sendJson(res, 200, {
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: Boolean(user.is_verified)
              }
            });
          }

          return sendJson(res, 404, {
            success: false,
            message: 'Ruta no encontrada en el servicio de autenticacion.'
          });
        } catch (error: any) {
          console.error('[Auth Error]:', error);
          return sendJson(res, 500, {
            success: false,
            message: 'Error en el servidor de base de datos Orange Pi: ' + (error?.message || 'Error desconocido')
          });
        }
      });
    }
  };
}

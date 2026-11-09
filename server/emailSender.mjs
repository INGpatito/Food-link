/**
 * Envio de correos de verificacion desde el backend (Node.js) mediante EmailJS REST API.
 * Permite que tanto el registro desde la App Android como desde la Web envien el codigo
 * de 6 digitos directamente al Gmail del usuario.
 */

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

const DEFAULT_SERVICE_ID = 'service_hsjvuns';
const DEFAULT_TEMPLATE_ID = 'template_pu7i0mf';
const DEFAULT_PUBLIC_KEY = 'RgCYeiuLtXTQ4fF_9';

export async function sendVerificationEmailServer(toEmail, toName, code) {
  const serviceId = (process.env.VITE_EMAILJS_SERVICE_ID || DEFAULT_SERVICE_ID).trim();
  const templateId = (process.env.VITE_EMAILJS_TEMPLATE_ID || DEFAULT_TEMPLATE_ID).trim();
  const publicKey = (process.env.VITE_EMAILJS_PUBLIC_KEY || DEFAULT_PUBLIC_KEY).trim();

  if (!serviceId || !templateId || !publicKey) {
    console.warn(`[EmailJS Server] Sin credenciales. Codigo para ${toEmail}: ${code}`);
    return { sent: false, error: 'Credenciales EmailJS no configuradas' };
  }

  try {
    const payload = {
      lib_version: '4.4.1',
      user_id: publicKey,
      service_id: serviceId,
      template_id: templateId,
      template_params: {
        to_name: toName || 'Comensal Foodlink',
        to_email: toEmail.trim(),
        verification_code: String(code).trim(),
        app_name: 'Foodlink'
      }
    };

    const response = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://papoys.me',
        'Referer': 'https://papoys.me/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text().catch(() => '');
    if (response.ok) {
      console.log(`[EmailJS Server] Codigo de verificacion enviado a ${toEmail}`);
      return { sent: true };
    } else {
      console.error(`[EmailJS Server] Error HTTP ${response.status}: ${text}`);
      return { sent: false, error: `HTTP ${response.status}: ${text}` };
    }
  } catch (err) {
    console.error('[EmailJS Server] Excepcion al enviar correo:', err);
    return { sent: false, error: err?.message || 'Error de red' };
  }
}

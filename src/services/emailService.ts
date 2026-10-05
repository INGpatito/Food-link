import emailjs from '@emailjs/browser';

export interface SendEmailResult {
  success: boolean;
  simulated: boolean;
  code?: string;
  message: string;
}

export async function sendVerificationEmail(
  toEmail: string,
  toName: string,
  code: string
): Promise<SendEmailResult> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim();
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim();

  // Si las credenciales de EmailJS aun no han sido provistas, se activa el modo simulacion
  if (!serviceId || !templateId || !publicKey) {
    console.info(
      `[EmailJS / Modo Simulacion] Codigo para ${toEmail} (${toName}): ${code}. ` +
      `Para envio real por correo, asigna VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID y VITE_EMAILJS_PUBLIC_KEY en .env`
    );

    return {
      success: true,
      simulated: true,
      code,
      message: `Modo simulacion activo. Codigo generado: ${code}`
    };
  }

  try {
    const templateParams = {
      to_name: toName,
      to_email: toEmail,
      verification_code: code,
      app_name: 'Foodlink'
    };

    await emailjs.send(serviceId, templateId, templateParams, {
      publicKey
    });

    return {
      success: true,
      simulated: false,
      message: `Correo de verificacion enviado exitosamente a ${toEmail}.`
    };
  } catch (error: any) {
    console.error('[EmailJS Error]:', error);
    return {
      success: false,
      simulated: false,
      code,
      message: `No se pudo enviar el correo mediante EmailJS: ${error?.text || error?.message || 'Error en el servicio'}`
    };
  }
}

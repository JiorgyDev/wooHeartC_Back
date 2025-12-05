// utils/email.js - SOLUCIÓN DIRECTA
const { Resend } = require('resend');

const sendEmail = async (options) => {
  console.log('📧 [RESEND] Iniciando envío de email...');
  console.log('📧 [RESEND] Destinatario:', options.email);
  console.log('📧 [RESEND] Subject:', options.subject);

  try {
    // ⚠️ PEGA TU API KEY AQUÍ DIRECTAMENTE (entre las comillas)
    const resend = new Resend('re_Xr6qci3c_E2GtM6HJuNoq75aAGMWxqCfT');
    
    console.log('📧 [RESEND] Cliente Resend inicializado');
    console.log('📧 [RESEND] Preparando email...');

    const { data, error } = await resend.emails.send({
      from: 'WooHeart <onboarding@resend.dev>',
      to: [options.email],
      subject: options.subject,
      html: options.html || `<p>${options.message}</p>`,
    });

    if (error) {
      console.error('❌ [RESEND] Error de Resend:', error);
      throw new Error(error.message);
    }

    console.log('✅ [RESEND] ¡Email enviado exitosamente!');
    console.log('📧 [RESEND] ID del mensaje:', data.id);

    return {
      success: true,
      messageId: data.id,
    };

  } catch (error) {
    console.error('❌ [RESEND] Error completo:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
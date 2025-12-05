// utils/email.js - SOLUCIÓN TEMPORAL
const { Resend } = require('resend');

const sendEmail = async (options) => {
  console.log('📧 [RESEND] Iniciando envío de email...');
  console.log('📧 [RESEND] Destinatario:', options.email);
  console.log('📧 [RESEND] Subject:', options.subject);
  
  // SOLUCIÓN TEMPORAL: Hardcodear la API Key
  const RESEND_KEY = process.env.RESEND_API_KEY || 're_Xr6qci3c_E2GtM6HJuNoq75aAGMWxqCfT';
  
  if (!RESEND_KEY || RESEND_KEY === 're_Xr6qci3c_E2GtM6HJuNoq75aAGMWxqCfT') {
    console.error('❌ [RESEND] RESEND_API_KEY no configurada');
    throw new Error('RESEND_API_KEY no configurada');
  }

  try {
    const resend = new Resend(RESEND_KEY);
    
    console.log('📧 [RESEND] Cliente inicializado');

    const emailData = {
      from: process.env.EMAIL_FROM || 'WooHeart <onboarding@resend.dev>',
      to: [options.email],
      subject: options.subject,
      html: options.html || `<p>${options.message}</p>`,
    };

    console.log('📧 [RESEND] 🚀 Enviando email...');
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('❌ [RESEND] Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ [RESEND] Email enviado! ID:', data.id);

    return {
      success: true,
      messageId: data.id
    };

  } catch (error) {
    console.error('❌ [RESEND] Error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
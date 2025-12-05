// utils/email.js - CON RESEND
const { Resend } = require('resend');

const sendEmail = async (options) => {
  console.log('📧 [RESEND] Iniciando envío de email...');
  console.log('📧 [RESEND] Destinatario:', options.email);
  console.log('📧 [RESEND] Subject:', options.subject);
  
  // Verificar que la API Key esté configurada
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ [RESEND] RESEND_API_KEY no está configurada en .env');
    throw new Error('RESEND_API_KEY no está configurada');
  }

  try {
    // Inicializar Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('📧 [RESEND] Cliente inicializado');
    console.log('📧 [RESEND] Preparando mensaje...');

    // Preparar el email
    const emailData = {
      from: process.env.EMAIL_FROM || 'WooHeart <onboarding@resend.dev>',
      to: [options.email],
      subject: options.subject,
      html: options.html || `<p>${options.message}</p>`,
    };

    console.log('📧 [RESEND] Datos del email:');
    console.log('  - from:', emailData.from);
    console.log('  - to:', emailData.to);
    console.log('  - subject:', emailData.subject);

    // Enviar email
    console.log('📧 [RESEND] 🚀 Enviando email...');
    const { data, error } = await resend.emails.send(emailData);

    // Verificar si hubo error
    if (error) {
      console.error('❌ [RESEND] Error de Resend:', error);
      throw new Error(error.message || 'Error al enviar email con Resend');
    }

    // Éxito
    console.log('✅ [RESEND] ¡Email enviado exitosamente!');
    console.log('📧 [RESEND] ID del mensaje:', data.id);

    return {
      success: true,
      messageId: data.id,
      data: data
    };

  } catch (error) {
    console.error('❌ [RESEND] ==================== ERROR COMPLETO ====================');
    console.error('❌ [RESEND] Error name:', error.name);
    console.error('❌ [RESEND] Error message:', error.message);
    console.error('❌ [RESEND] Error stack:', error.stack);
    console.error('❌ [RESEND] =========================================================');
    throw error;
  }
};

module.exports = sendEmail;
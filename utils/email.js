// utils/email.js
const { Resend } = require('resend');

const sendEmail = async (options) => {
  console.log('📧 [EMAIL] Iniciando envío de email...');
  console.log('📧 [EMAIL] Destinatario:', options.email);
  console.log('📧 [EMAIL] Asunto:', options.subject);

  try {
    // Verificar que tenemos la API key
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no está configurada en las variables de entorno');
    }

    // Inicializar Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('📧 [EMAIL] Cliente Resend inicializado');

    // Preparar el email
    const emailData = {
      from: process.env.EMAIL_FROM || 'WooHeart <onboarding@resend.dev>',
      to: options.email,
      subject: options.subject,
      html: options.html || `<p>${options.message}</p>`,
    };

    // Si hay texto plano, agregarlo
    if (options.message && !options.html) {
      emailData.text = options.message;
    }

    console.log('📧 [EMAIL] Enviando email con Resend...');
    console.log('📧 [EMAIL] From:', emailData.from);
    console.log('📧 [EMAIL] To:', emailData.to);

    // Enviar el email
    const data = await resend.emails.send(emailData);

    console.log('✅ [EMAIL] Email enviado exitosamente');
    console.log('📧 [EMAIL] ID del email:', data.id);

    return {
      success: true,
      messageId: data.id
    };

  } catch (error) {
    console.error('❌ [EMAIL] Error enviando email:', error);
    console.error('❌ [EMAIL] Detalles del error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    throw error;
  }
};

module.exports = sendEmail;
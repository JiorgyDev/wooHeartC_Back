// utils/email.js - SendGrid
const sgMail = require('@sendgrid/mail');

const sendEmail = async (options) => {
  console.log('📧 [SENDGRID] Iniciando envío de email...');
  console.log('📧 [SENDGRID] Destinatario:', options.email);
  console.log('📧 [SENDGRID] Asunto:', options.subject);

  try {
    // Verificar que la API key existe
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY no está configurada en las variables de entorno');
    }

    console.log('📧 [SENDGRID] API Key encontrada');

    // Configurar SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    console.log('📧 [SENDGRID] Cliente configurado');

    // Preparar email
    const msg = {
      to: options.email,
      from: process.env.EMAIL_FROM || 'jorgewooheart@gmail.com',
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    };

    console.log('📧 [SENDGRID] Remitente:', msg.from);
    console.log('📧 [SENDGRID] Enviando email...');

    // Enviar email
    const response = await sgMail.send(msg);

    console.log('✅ [SENDGRID] Email enviado exitosamente!');
    console.log('📧 [SENDGRID] Status:', response[0].statusCode);
    console.log('📧 [SENDGRID] Message ID:', response[0].headers['x-message-id']);

    return {
      success: true,
      messageId: response[0].headers['x-message-id']
    };

  } catch (error) {
    console.error('❌ [SENDGRID] Error:', error.message);
    
    if (error.response) {
      console.error('❌ [SENDGRID] Status:', error.response.statusCode);
      console.error('❌ [SENDGRID] Body:', error.response.body);
    }
    
    throw error;
  }
};

module.exports = sendEmail;
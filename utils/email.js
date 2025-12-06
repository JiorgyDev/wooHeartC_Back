// utils/email.js - BREVO (ex-Sendinblue)
const brevo = require('@getbrevo/brevo');

const sendEmail = async (options) => {
  console.log('📧 [BREVO] Iniciando envío de email...');
  console.log('📧 [BREVO] Destinatario:', options.email);
  console.log('📧 [BREVO] Asunto:', options.subject);

  try {
    // Verificar que la API key existe
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    }

    console.log('📧 [BREVO] API Key encontrada');

    // Configurar cliente de Brevo
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    console.log('📧 [BREVO] Cliente inicializado');

    // Usar el remitente desde variable de entorno
    // IMPORTANTE: Este email DEBE estar verificado en Brevo
    const senderEmail = process.env.EMAIL_FROM || 'jorgewooheart@gmail.com';
    
    console.log('📧 [BREVO] Remitente:', senderEmail);

    // Preparar email
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { 
      email: senderEmail,
      name: 'WooHeart' 
    };
    sendSmtpEmail.to = [{ 
      email: options.email,
      name: options.name || '' 
    }];
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html || `<p>${options.message}</p>`;

    console.log('📧 [BREVO] Enviando email...');

    // Enviar email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ [BREVO] Email enviado exitosamente!');
    console.log('📧 [BREVO] Message ID:', data.messageId);

    return { 
      success: true, 
      messageId: data.messageId 
    };

  } catch (error) {
    console.error('❌ [BREVO] Error:', error.message);
    
    // Mostrar detalles completos del error
    if (error.response) {
      console.error('❌ [BREVO] Status:', error.response.status);
      console.error('❌ [BREVO] Body:', JSON.stringify(error.response.body, null, 2));
    }
    
    throw error;
  }
};

module.exports = sendEmail;
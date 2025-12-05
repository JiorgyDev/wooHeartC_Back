// utils/email.js - BREVO (ex-Sendinblue)
const brevo = require('@getbrevo/brevo');

const sendEmail = async (options) => {
  console.log('📧 [BREVO] Iniciando envío de email...');
  console.log('📧 [BREVO] Email destinatario:', options.email);
  console.log('📧 [BREVO] Subject:', options.subject);

  try {
    // Configurar cliente de Brevo - FORMA CORRECTA
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    console.log('📧 [BREVO] Cliente inicializado');

    // Preparar email
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { 
      email: 'noreply@wooheart.com', 
      name: 'WooHeart' 
    };
    sendSmtpEmail.to = [{ 
      email: options.email,
      name: options.name || '' 
    }];
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html || `<p>${options.message}</p>`;

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
    
    // Si hay más detalles del error, mostrarlos
    if (error.response && error.response.body) {
      console.error('❌ [BREVO] Detalles:', error.response.body);
    }
    
    throw error;
  }
};

module.exports = sendEmail;
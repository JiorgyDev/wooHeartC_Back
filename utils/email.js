// utils/email.js - BREVO (ex-Sendinblue)
const SibApiV3Sdk = require('@getbrevo/brevo');

const sendEmail = async (options) => {
  console.log('📧 [BREVO] Iniciando envío de email...');
  console.log('📧 [BREVO] Email destinatario:', options.email);
  console.log('📧 [BREVO] Subject:', options.subject);

  try {
    // Configurar cliente de Brevo
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    console.log('📧 [BREVO] Cliente inicializado');

    // Preparar email
    const sendSmtpEmail = {
      sender: { 
        email: 'noreply@wooheart.com', 
        name: 'WooHeart' 
      },
      to: [{ 
        email: options.email,
        name: options.name || '' 
      }],
      subject: options.subject,
      htmlContent: options.html || `<p>${options.message}</p>`
    };

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
    if (error.response) {
      console.error('❌ [BREVO] Detalles:', error.response.text);
    }
    
    throw error;
  }
};

module.exports = sendEmail;
const Brevo = require('@getbrevo/brevo');

const sendEmail = async (options) => {
  console.log('📧 [BREVO] Enviando a:', options.email);

  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY no está configurada');
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.to = [{ email: options.email }];
  sendSmtpEmail.sender = { 
    email: process.env.EMAIL_FROM || 'jorgewooheart@gmail.com',
    name: 'WooHeart'
  };
  sendSmtpEmail.subject = options.subject;
  sendSmtpEmail.textContent = options.message;
  sendSmtpEmail.htmlContent = options.html || `<p>${options.message}</p>`;

  const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
  
  console.log('✅ [BREVO] Enviado! ID:', response.messageId);
  return { success: true, messageId: response.messageId };
};

module.exports = sendEmail;
const { Resend } = require('resend');

const sendEmail = async (options) => {
  console.log('📧 [RESEND] Enviando a:', options.email);

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurada');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  });

  if (error) {
    console.error('❌ [RESEND] Error:', error);
    throw new Error(error.message);
  }

  console.log('✅ [RESEND] Enviado! ID:', data.id);
  return { success: true, messageId: data.id };
};

module.exports = sendEmail;
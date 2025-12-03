// utils/email.js
const sendEmail = async (options) => {
  console.log('📧 [EMAIL] Iniciando envío de email...');
  
  // Importar nodemailer dinámicamente
  const nodemailer = require('nodemailer');
  console.log('📧 [EMAIL] nodemailer tipo:', typeof nodemailer);
  console.log('📧 [EMAIL] nodemailer.default:', typeof nodemailer.default);
  
  // Intentar usar .default si existe (problema común de ES6/CommonJS)
  const mailer = nodemailer.default || nodemailer;
  console.log('📧 [EMAIL] mailer.createTransporter:', typeof mailer.createTransporter);

  // 1) Crear transportador
  const transporter = mailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  console.log('📧 [EMAIL] Transporter creado');

  // 2) Definir opciones del email
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  console.log('📧 [EMAIL] Enviando a:', options.email);

  // 3) Enviar el email
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ [EMAIL] Email enviado exitosamente:', info.messageId);
  
  return info;
};

module.exports = sendEmail;
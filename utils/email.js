// utils/email.js
console.log('🔍 [EMAIL] Iniciando carga de nodemailer...');

let nodemailer;
try {
  nodemailer = require('nodemailer');
  console.log('✅ [EMAIL] nodemailer cargado:', typeof nodemailer);
  console.log('✅ [EMAIL] nodemailer.createTransporter:', typeof nodemailer.createTransporter);
  console.log('✅ [EMAIL] nodemailer keys:', Object.keys(nodemailer));
} catch (error) {
  console.error('❌ [EMAIL] Error cargando nodemailer:', error);
}

const sendEmail = async (options) => {
  console.log('📧 [EMAIL] Función sendEmail ejecutada');
  console.log('📧 [EMAIL] nodemailer disponible:', typeof nodemailer);
  console.log('📧 [EMAIL] createTransporter disponible:', typeof nodemailer?.createTransporter);

  if (!nodemailer || typeof nodemailer.createTransporter !== 'function') {
    throw new Error('nodemailer.createTransporter no está disponible. nodemailer es: ' + typeof nodemailer);
  }

  // 1) Crear transportador
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // 2) Definir opciones del email
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // 3) Enviar el email
  await transporter.sendMail(mailOptions);
  console.log('✅ [EMAIL] Email enviado exitosamente a:', options.email);
};

module.exports = sendEmail;
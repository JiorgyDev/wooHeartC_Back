// utils/email.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Crear transportador
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true para 465, false para otros puertos
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
};

module.exports = sendEmail;
// utils/email.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  console.log('📧 [EMAIL] Iniciando envío de email...');
  console.log('📧 [EMAIL] Destinatario:', options.email);
  console.log('📧 [EMAIL] Subject:', options.subject);
  
  // Verificar variables de entorno
  console.log('📧 [EMAIL] Variables de entorno:');
  console.log('  - EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('  - EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('  - EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  - EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configurada***' : 'NO CONFIGURADA');
  console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM);

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Variables de entorno de email no configuradas correctamente');
  }

  try {
    // Crear transportador
    console.log('📧 [EMAIL] Creando transporter...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // true para 465, false para 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Activar debug
      logger: true  // Activar logs
    });

    console.log('📧 [EMAIL] Transporter creado correctamente');

    // Verificar conexión
    console.log('📧 [EMAIL] Verificando conexión SMTP...');
    await transporter.verify();
    console.log('✅ [EMAIL] Conexión SMTP verificada');

    // Preparar opciones del email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message
    };

    console.log('📧 [EMAIL] Opciones del email:');
    console.log('  - from:', mailOptions.from);
    console.log('  - to:', mailOptions.to);
    console.log('  - subject:', mailOptions.subject);

    // Enviar email
    console.log('📧 [EMAIL] Enviando email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ [EMAIL] Email enviado exitosamente!');
    console.log('📧 [EMAIL] Message ID:', info.messageId);
    console.log('📧 [EMAIL] Response:', info.response);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ [EMAIL] Error completo:', error);
    console.error('❌ [EMAIL] Error name:', error.name);
    console.error('❌ [EMAIL] Error message:', error.message);
    console.error('❌ [EMAIL] Error code:', error.code);
    console.error('❌ [EMAIL] Error stack:', error.stack);
    throw error;
  }
};

module.exports = sendEmail;
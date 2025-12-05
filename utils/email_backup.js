// // utils/email.js
// const nodemailer = require('nodemailer');

// const sendEmail = async (options) => {
//   console.log('📧 [EMAIL] Iniciando envío de email...');
//   console.log('📧 [EMAIL] Destinatario:', options.email);
//   console.log('📧 [EMAIL] Subject:', options.subject);
  
//   // Verificar variables de entorno
//   console.log('📧 [EMAIL] Variables de entorno:');
//   console.log('  - EMAIL_HOST:', process.env.EMAIL_HOST);
//   console.log('  - EMAIL_PORT:', process.env.EMAIL_PORT);
//   console.log('  - EMAIL_USER:', process.env.EMAIL_USER);
//   console.log('  - EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configurada***' : 'NO CONFIGURADA');
//   console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM);

//   if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
//     throw new Error('Variables de entorno de email no configuradas correctamente');
//   }

//   try {
//     // Crear transportador
//     console.log('📧 [EMAIL] Creando transporter...');
    
//     const transporter = nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: Number(process.env.EMAIL_PORT),
//       secure: false, // true para 465, false para 587
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD
//       },
//       tls: {
//         rejectUnauthorized: false
//       },
//       debug: true, // Activar debug
//       logger: true  // Activar logs
//     });

//     console.log('📧 [EMAIL] Transporter creado correctamente');

//     // Verificar conexión
//     console.log('📧 [EMAIL] Verificando conexión SMTP...');
//     await transporter.verify();
//     console.log('✅ [EMAIL] Conexión SMTP verificada');

//     // Preparar opciones del email
//     const mailOptions = {
//       from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
//       to: options.email,
//       subject: options.subject,
//       text: options.message,
//       html: options.html || options.message
//     };

//     console.log('📧 [EMAIL] Opciones del email:');
//     console.log('  - from:', mailOptions.from);
//     console.log('  - to:', mailOptions.to);
//     console.log('  - subject:', mailOptions.subject);

//     // Enviar email
//     console.log('📧 [EMAIL] Enviando email...');
//     const info = await transporter.sendMail(mailOptions);

//     console.log('✅ [EMAIL] Email enviado exitosamente!');
//     console.log('📧 [EMAIL] Message ID:', info.messageId);
//     console.log('📧 [EMAIL] Response:', info.response);

//     return {
//       success: true,
//       messageId: info.messageId
//     };

//   } catch (error) {
//     console.error('❌ [EMAIL] Error completo:', error);
//     console.error('❌ [EMAIL] Error name:', error.name);
//     console.error('❌ [EMAIL] Error message:', error.message);
//     console.error('❌ [EMAIL] Error code:', error.code);
//     console.error('❌ [EMAIL] Error stack:', error.stack);
//     throw error;
//   }
// };

// module.exports = sendEmail;


//resend 
//re_Xr6qci3c_E2GtM6HJuNoq75aAGMWxqCfT



// utils/email.js - ENVIAR A TU EMAIL REGISTRADO
const { Resend } = require('resend');

const sendEmail = async (options) => {
  console.log('📧 [RESEND] Iniciando envío de email...');
  console.log('📧 [RESEND] Email original:', options.email);
  console.log('📧 [RESEND] Subject:', options.subject);

  try {
    const resend = new Resend('re_Xr6qci3c_E2GtM6HJuNoq75aAGMWxqCfT');
    
    console.log('📧 [RESEND] Cliente Resend inicializado');

    // ⚠️ MIENTRAS NO VERIFIQUES DOMINIO, ENVIAR A TU EMAIL
    const emailDestino = 'giorgylezano@gmail.com'; // Tu email registrado en Resend
    
    console.log('📧 [RESEND] ⚠️ MODO DESARROLLO: Enviando a', emailDestino);
    console.log('📧 [RESEND] (Email original era:', options.email, ')');

    const { data, error } = await resend.emails.send({
      from: 'WooHeart <onboarding@resend.dev>',
      to: [emailDestino], // ← Siempre a tu email
      subject: `[PARA: ${options.email}] ${options.subject}`, // ← Indica para quién era
      html: `
        <div style="background: #fffbcc; padding: 10px; border: 2px solid #ffa500; margin-bottom: 20px;">
          <strong>⚠️ MODO DESARROLLO</strong><br>
          Este email debería ir a: <strong>${options.email}</strong><br>
          Pero se envía a tu email porque el dominio no está verificado.
        </div>
        ${options.html || `<p>${options.message}</p>`}
      `,
    });

    if (error) {
      console.error('❌ [RESEND] Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ [RESEND] ¡Email enviado a tu email de prueba!');
    console.log('📧 [RESEND] ID:', data.id);

    return { success: true, messageId: data.id };

  } catch (error) {
    console.error('❌ [RESEND] Error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;


//api brevo
//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

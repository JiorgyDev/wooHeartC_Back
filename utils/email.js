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
// test-resend.js
require('dotenv').config();
const sendEmail = require('./utils/email');

async function testResend() {
  console.log('🧪 ==========================================');
  console.log('🧪 PRUEBA DE EMAIL CON RESEND');
  console.log('🧪 ==========================================\n');
  
  // Verificar que la API Key esté configurada
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ ERROR: RESEND_API_KEY no está configurada en .env');
    console.error('❌ Por favor agrega: RESEND_API_KEY=re_tu_api_key\n');
    process.exit(1);
  }

  console.log('✅ RESEND_API_KEY encontrada');
  console.log('✅ EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('');
  
  try {
    console.log('📧 Enviando email de prueba...\n');
    
    const result = await sendEmail({
      email: 'jorpasante@gmail.com', // ← TU EMAIL AQUÍ
      subject: '🐾 Prueba de WooHeart con Resend',
      message: 'Este es un email de prueba simple',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #FE8043;">🐾 ¡Prueba Exitosa!</h1>
          <p>Hola,</p>
          <p>Si estás viendo este email, significa que <strong>Resend está funcionando correctamente</strong> con WooHeart.</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">✅ Conexión exitosa</p>
            <p style="margin: 5px 0;">✅ Email enviado correctamente</p>
            <p style="margin: 5px 0;">✅ Listo para producción</p>
          </div>
          <p>Saludos,<br><strong>El equipo de WooHeart</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">WooHeart - Conectando corazones con mascotas</p>
        </div>
      `
    });
    
    console.log('\n✅ ==========================================');
    console.log('✅ PRUEBA EXITOSA');
    console.log('✅ ==========================================');
    console.log('✅ Message ID:', result.messageId);
    console.log('✅ Revisa tu bandeja de entrada (o spam)');
    console.log('✅ Email enviado a: jorpasante@gmail.com\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ==========================================');
    console.error('❌ PRUEBA FALLIDA');
    console.error('❌ ==========================================');
    console.error('❌ Error:', error.message);
    console.error('❌ Revisa tu configuración\n');
    
    process.exit(1);
  }
}

testResend();
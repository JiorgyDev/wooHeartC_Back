// utils/email.js
const https = require('https');

const sendEmail = async (options) => {
  console.log('📧 [EMAIL] Iniciando envío de email...');
  console.log('📧 [EMAIL] Destinatario:', options.email);

  // Usaremos la API de SendGrid (gratuita) o SMTP2GO
  // Por ahora, vamos a usar una alternativa simple con axios que ya tienes instalado
  const axios = require('axios');

  // Preparar el mensaje para envío directo por SMTP
  const emailData = {
    to: options.email,
    from: process.env.EMAIL_FROM,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  console.log('📧 [EMAIL] Datos preparados:', {
    to: emailData.to,
    from: emailData.from,
    subject: emailData.subject
  });

  // OPCIÓN 1: Usar Brevo (ex-Sendinblue) API - GRATIS
  // Necesitarás crear una cuenta en https://www.brevo.com
  // y obtener una API key
  
  // OPCIÓN 2: Usar Resend (más simple) - GRATIS
  // https://resend.com
  
  // OPCIÓN 3: Implementar SMTP básico
  
  // Por ahora, vamos con una implementación SMTP básica usando net y tls
  const net = require('net');
  const tls = require('tls');

  return new Promise((resolve, reject) => {
    console.log('📧 [EMAIL] Conectando a SMTP...');
    
    const socket = net.connect(process.env.EMAIL_PORT, process.env.EMAIL_HOST, () => {
      console.log('📧 [EMAIL] Conectado a', process.env.EMAIL_HOST);
    });

    let buffer = '';
    let step = 0;

    socket.on('data', (data) => {
      buffer += data.toString();
      console.log('📧 [EMAIL] Respuesta SMTP:', buffer);

      if (buffer.includes('\r\n')) {
        const lines = buffer.split('\r\n');
        buffer = lines.pop();

        lines.forEach(line => {
          if (!line) return;

          const code = parseInt(line.substring(0, 3));
          
          switch(step) {
            case 0: // Conectado
              if (code === 220) {
                socket.write('EHLO ' + process.env.EMAIL_HOST + '\r\n');
                step = 1;
              }
              break;
            case 1: // EHLO enviado
              if (code === 250) {
                socket.write('STARTTLS\r\n');
                step = 2;
              }
              break;
            case 2: // STARTTLS enviado
              if (code === 220) {
                const secureSocket = tls.connect({
                  socket: socket,
                  servername: process.env.EMAIL_HOST
                }, () => {
                  console.log('📧 [EMAIL] Conexión TLS establecida');
                  secureSocket.write('EHLO ' + process.env.EMAIL_HOST + '\r\n');
                  step = 3;
                });

                let secureBuffer = '';
                secureSocket.on('data', (data) => {
                  secureBuffer += data.toString();
                  
                  if (secureBuffer.includes('\r\n')) {
                    const secureLines = secureBuffer.split('\r\n');
                    secureBuffer = secureLines.pop();

                    secureLines.forEach(secureLine => {
                      if (!secureLine) return;
                      const secureCode = parseInt(secureLine.substring(0, 3));

                      switch(step) {
                        case 3: // AUTH
                          if (secureCode === 250) {
                            secureSocket.write('AUTH LOGIN\r\n');
                            step = 4;
                          }
                          break;
                        case 4: // Username
                          if (secureCode === 334) {
                            const username = Buffer.from(process.env.EMAIL_USER).toString('base64');
                            secureSocket.write(username + '\r\n');
                            step = 5;
                          }
                          break;
                        case 5: // Password
                          if (secureCode === 334) {
                            const password = Buffer.from(process.env.EMAIL_PASSWORD).toString('base64');
                            secureSocket.write(password + '\r\n');
                            step = 6;
                          }
                          break;
                        case 6: // Autenticado
                          if (secureCode === 235) {
                            console.log('✅ [EMAIL] Autenticado correctamente');
                            secureSocket.write('MAIL FROM:<' + process.env.EMAIL_USER + '>\r\n');
                            step = 7;
                          }
                          break;
                        case 7: // MAIL FROM
                          if (secureCode === 250) {
                            secureSocket.write('RCPT TO:<' + options.email + '>\r\n');
                            step = 8;
                          }
                          break;
                        case 8: // RCPT TO
                          if (secureCode === 250) {
                            secureSocket.write('DATA\r\n');
                            step = 9;
                          }
                          break;
                        case 9: // DATA
                          if (secureCode === 354) {
                            const emailContent = [
                              'From: ' + process.env.EMAIL_FROM,
                              'To: ' + options.email,
                              'Subject: ' + options.subject,
                              'Content-Type: text/html; charset=UTF-8',
                              '',
                              options.html || options.message,
                              '.',
                              ''
                            ].join('\r\n');
                            
                            secureSocket.write(emailContent);
                            step = 10;
                          }
                          break;
                        case 10: // Email enviado
                          if (secureCode === 250) {
                            console.log('✅ [EMAIL] Email enviado exitosamente');
                            secureSocket.write('QUIT\r\n');
                            secureSocket.end();
                            resolve({ success: true });
                          }
                          break;
                      }
                    });
                  }
                });

                secureSocket.on('error', (err) => {
                  console.error('❌ [EMAIL] Error en conexión segura:', err);
                  reject(err);
                });
              }
              break;
          }
        });
      }
    });

    socket.on('error', (err) => {
      console.error('❌ [EMAIL] Error de conexión:', err);
      reject(err);
    });

    socket.setTimeout(30000, () => {
      console.error('❌ [EMAIL] Timeout');
      socket.destroy();
      reject(new Error('Timeout de conexión SMTP'));
    });
  });
};

module.exports = sendEmail;
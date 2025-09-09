// test-both.js - Probar auth + users juntas
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

async function testCompleteFlow() {
    console.log('🧪 INICIANDO PRUEBAS COMPLETAS...\n');
    
    try {
        // 1. Health Check
        console.log('1️⃣ PROBANDO HEALTH CHECK...');
        const healthResponse = await axios.get(`${API_BASE}/health`);
        console.log('✅ Health:', healthResponse.data);
        console.log('');

        // 2. Registro de usuario
        console.log('2️⃣ PROBANDO REGISTRO...');
        const registerData = {
            name: "Test User",
            email: "test@example.com",
            password: "Password123"
        };
        
        const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
        console.log('✅ Registro exitoso:', registerResponse.data);
        console.log('');

        // 3. Login
        console.log('3️⃣ PROBANDO LOGIN...');
        const loginData = {
            email: "test@example.com",
            password: "Password123"
        };
        
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
        console.log('✅ Login exitoso:', loginResponse.data);
        
        const token = loginResponse.data.token;
        console.log('🎫 Token obtenido:', token.substring(0, 20) + '...');
        console.log('');

        // 4. Obtener perfil del usuario
        console.log('4️⃣ PROBANDO OBTENER PERFIL...');
        const profileResponse = await axios.get(`${API_BASE}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Perfil obtenido:', profileResponse.data);
        console.log('');

        // 5. Actualizar perfil
        console.log('5️⃣ PROBANDO ACTUALIZAR PERFIL...');
        const updateData = {
            name: "Test User Updated",
            phone: "+1234567890"
        };
        
        const updateResponse = await axios.put(`${API_BASE}/users/profile`, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Perfil actualizado:', updateResponse.data);
        console.log('');

        // 6. Verificar actualización
        console.log('6️⃣ VERIFICANDO ACTUALIZACIÓN...');
        const verifyResponse = await axios.get(`${API_BASE}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Perfil verificado:', verifyResponse.data);
        console.log('');

        console.log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
        console.log('🏆 Tu backend está completamente funcional');

    } catch (error) {
        console.error('❌ ERROR EN LAS PRUEBAS:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Ejecutar las pruebas
testCompleteFlow();
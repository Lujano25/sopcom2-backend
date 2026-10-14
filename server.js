require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get('/', (req, res) => {
    res.json({ estatus: 'Online', mensaje: 'SOP&COM Backend y CRM funcionando al 100%' });
});

app.post('/api/contacto', async (req, res) => {
    const { nombre, empresa, correo, mensaje } = req.body;
    console.log(`🔔 Nuevo cliente detectado: ${empresa}. Iniciando IA...`);
    
let analisisIA = "Análisis pendiente.";
    try {
        // Táctica de diagnóstico: Extraer la lista oficial de modelos permitidos para tu llave
        const urlModelos = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const respuestaModelos = await fetch(urlModelos);
        const modelosPermitidos = await respuestaModelos.json();
        
        // Imprimimos la respuesta exacta de Google en la terminal de Render
        console.log("🔍 MODELOS AUTORIZADOS PARA ESTA LLAVE:", JSON.stringify(modelosPermitidos, null, 2));

    } catch (error) {
        console.error("⚠️ Error en diagnóstico:", error.message);
    }

    const { data, error: dbError } = await supabase
        .from('prospectos')
        .insert([{ 
            nombre: nombre, 
            empresa: empresa, 
            correo: correo, 
            mensaje: mensaje, 
            analisis_ia: analisisIA, 
            estatus: 'Nuevo Prospecto' 
        }]);

    if (dbError) console.error("❌ Error guardando en Supabase: ", dbError);
    else console.log("💾 Prospecto asegurado en el CRM.");

    // CORRECCIÓN 2: Puerto seguro 465 y SSL activado para cPanel
    const transporter = nodemailer.createTransport({
        host: 'mail.sopcom.com.mx', 
        port: 465,             
        secure: true,         
        auth: {
            user: 'oscar.lujano@sopcom.com.mx', 
            pass: process.env.EMAIL_PASS
        },
        tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
        from: 'oscar.lujano@sopcom.com.mx', 
        to: 'oscar.lujano@sopcom.com.mx',   
        subject: `🚨 [Nuevo Prospecto SOP&COM] ${empresa}`,
        text: `🤖 Análisis Comercial de IA:\n${analisisIA}\n\n=========================\n\nDATOS DEL CONTACTO:\nNombre: ${nombre}\nEmpresa: ${empresa}\nCorreo: ${correo}\n\nMensaje original:\n${mensaje}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Error enviando correo: ", error);
            return res.status(500).json({ estatus: 'Error', mensaje: 'Fallo interno.' });
        } 
        console.log("✅ Alerta enviada a tu correo.");
        res.json({ estatus: 'Éxito', mensaje: 'Mensaje enviado. Un consultor te contactará pronto.' });
    });
});

// ==========================================
// RUTA SECRETA PARA ALIMENTAR EL CRM
// ==========================================
app.get('/api/prospectos', async (req, res) => {
    try {
        console.log("📊 El CRM está solicitando los datos...");
        
        // Extraemos todos los registros de la tabla 'prospectos'
        const { data, error } = await supabase
            .from('prospectos')
            .select('*')
            .order('id', { ascending: false }); // Muestra los más nuevos primero

        if (error) {
            throw error;
        }

        // Enviamos el paquete de datos al frontend
        res.json({ estatus: 'Éxito', datos: data });

    } catch (error) {
        console.error("❌ Error extrayendo datos de Supabase:", error);
        res.status(500).json({ estatus: 'Error', mensaje: 'Fallo al conectar con la base de datos.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor CRM de SOP&COM encendido en el puerto ${PORT}`);
});
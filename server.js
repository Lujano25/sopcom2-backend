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
        // CORRECCIÓN 1: Actualizamos el nombre del modelo
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const prompt = `
        Eres el director comercial de SOP&COM. Analiza este mensaje de un prospecto: "${mensaje}"
        Devuelve el análisis en 3 líneas exactas:
        Categoría: (Infraestructura / Tecnología / Proyectos / Comercialización)
        Prioridad: (Alta / Media / Baja)
        Resumen: (Una oración muy breve sobre lo que necesita)
        `;
        const result = await model.generateContent(prompt);
        analisisIA = result.response.text();
        console.log("🧠 Análisis de IA completado.");
    } catch (error) {
        console.error("⚠️ Error en IA:", error);
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

app.listen(PORT, () => {
    console.log(`🚀 Servidor CRM de SOP&COM encendido en el puerto ${PORT}`);
});
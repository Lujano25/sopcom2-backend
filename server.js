require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración para permitir conexiones desde tu página web
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // Para entender formularios HTML

// Inicializamos la Inteligencia Artificial y la Base de Datos
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ estatus: 'Online', mensaje: 'SOP&COM Backend y CRM funcionando al 100%' });
});

// --- EL NÚCLEO DEL CRM: Ruta que recibe los formularios ---
app.post('/api/contacto', async (req, res) => {
    // 1. Recibimos los datos del cliente
    const { nombre, empresa, correo, mensaje } = req.body;
    console.log(`🔔 Nuevo cliente detectado: ${empresa}. Iniciando IA...`);
    
    // 2. Análisis con Gemini (Inteligencia Artificial)
    let analisisIA = "Análisis pendiente.";
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

    // 3. Guardar en Base de Datos (Supabase)
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

    // 4. Mandar Alerta por Correo a tu bandeja
    const transporter = nodemailer.createTransport({
        host: 'mail.sopcom.com.mx', 
        port: 2525,             
        secure: false,         
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
            // Si quieres redirigir a una página de error, cambia esta línea
            return res.status(500).send("Hubo un error. Por favor, intenta de nuevo."); 
        } 
        console.log("✅ Alerta enviada a tu correo.");
        // Redirigimos al usuario a la página de inicio o mostramos un mensaje
        res.send("<script>alert('Mensaje enviado con éxito. Un consultor te contactará pronto.'); window.location.href='/';</script>");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor CRM de SOP&COM encendido en el puerto ${PORT}`);
});
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. CONFIGURACIÓN DE SEGURIDAD Y TAMAÑO
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. CONEXIÓN A TU MONGODB (Usando tu variable de entorno)
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conexión MONGODB OK'))
    .catch(err => console.error('❌ Error conexión:', err));

// 3. ESQUEMA DE USUARIO (Con los campos nuevos para el perfil del chofer)
const usuarioSchema = new mongoose.Schema({
    telefono: String,
    rol: String,
    nombre: String,
    foto: String,
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    documentacion: Object,
    perfilCompleto: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    lat: Number,
    lng: Number,
    estado: String
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// 4. SERVIR ARCHIVOS ESTÁTICOS (Esto es lo que estaba fallando)
// Asegúrate de que tus archivos estén en una carpeta llamada "public"
app.use(express.static('public'));

// --- RUTAS DE API ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        let user = await Usuario.findOne({ telefono });
        if (!user) {
            user = new Usuario({ telefono, rol, perfilCompleto: false });
            await user.save();
        }
        res.json({ mensaje: "Ok", usuario: user });
    } catch (e) { res.status(500).json(e); }
});

app.post('/login', async (req, res) => {
    try {
        const { telefono } = req.body;
        const user = await Usuario.findOne({ telefono });
        if (!user) return res.status(404).json({ error: "No existe" });
        if (!user.activo) return res.status(403).json({ error: "Suspendido" });
        res.json(user);
    } catch (e) { res.status(500).json(e); }
});

// ESTA ES LA RUTA QUE RECIBE LAS FOTOS Y DATOS DEL AUTO
app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const { telefono, nombre, modelo, patente, color, fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta } = req.body;
        await Usuario.updateOne(
            { telefono },
            { $set: { 
                nombre, autoModelo: modelo, autoPatente: patente, autoColor: color, foto: fotoPerfil,
                documentacion: { carnet: fotoCarnet, seguro: fotoSeguro, tarjeta: fotoTarjeta },
                perfilCompleto: true
            }}
        );
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error al guardar" }); }
});

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    const { telefono, lat, lng, estado } = req.body;
    await Usuario.updateOne({ telefono }, { $set: { lat, lng, estado } });
    res.json({ mensaje: "Ok" });
});

// --- RUTA FINAL PARA EVITAR PANTALLA BLANCA ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. CONFIGURACIÓN DE TAMAÑO (Crucial para que las fotos no bloqueen el servidor)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// 2. CONEXIÓN A MONGODB (Usamos tu variable de entorno de Render)
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB'))
    .catch(err => console.error('❌ Error Mongo:', err));

// 3. ESQUEMA DE USUARIO AMPLIADO (Para guardar fotos y datos de auto)
const usuarioSchema = new mongoose.Schema({
    telefono: String,
    rol: String,
    nombre: String,
    foto: String,
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    documentacion: Object, // Aquí guardaremos las 4 fotos
    activo: { type: Boolean, default: true },
    perfilCompleto: { type: Boolean, default: false },
    lat: Number,
    lng: Number,
    estado: String
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// --- RUTAS DE LA API ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        let user = await Usuario.findOne({ telefono });
        if (!user) {
            user = new Usuario({ telefono, rol });
            await user.save();
        }
        res.json({ mensaje: "Ok", usuario: user });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/login', async (req, res) => {
    try {
        const { telefono } = req.body;
        const user = await Usuario.findOne({ telefono });
        if (!user) return res.status(404).json({ error: "No existe" });
        if (!user.activo) return res.status(403).json({ error: "Suspendido" });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// NUEVA RUTA: Recibe nombre, auto y las 4 fotos pesadas
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
    } catch (e) { res.status(500).json({ error: "Error al guardar perfil" }); }
});

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    const { telefono, lat, lng, estado } = req.body;
    await Usuario.updateOne({ telefono }, { $set: { lat, lng, estado } });
    res.json({ mensaje: "Ok" });
});

// --- MANEJO DE ARCHIVOS (PARA EVITAR PANTALLA BLANCA) ---

// Servir la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz: Envía el login.html del taxi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Puerto de Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Smart Server en puerto ${PORT}`));

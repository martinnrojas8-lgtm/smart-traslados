const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 1. CONFIGURACIÓN DE TAMAÑO (Para recibir las fotos pesadas del carnet/seguro)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// 2. SERVIR ARCHIVOS ESTÁTICOS (Carpeta public)
app.use(express.static(path.join(__dirname, 'public')));

// 3. CONEXIÓN A MONGODB ATLAS (Respetando tu configuración de env)
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB Atlas'))
    .catch(err => {
        console.error('❌ Error de conexión:', err.message);
    });

// --- ESQUEMA DE USUARIO (Para que Mongo sepa dónde guardar todo) ---
const usuarioSchema = new mongoose.Schema({
    telefono: String,
    rol: String,
    nombre: String,
    foto: String,
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    documentacion: Object,
    activo: { type: Boolean, default: true },
    lat: Number,
    lng: Number,
    estado: String,
    perfilCompleto: { type: Boolean, default: false }
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// --- RUTAS DE LÓGICA ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        let user = await Usuario.findOne({ telefono });
        if (!user) {
            user = new Usuario({ telefono, rol });
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

// NUEVA: RUTA DE PERFIL PESADO
app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const { 
            telefono, nombre, modelo, patente, color, 
            fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta 
        } = req.body;

        await Usuario.updateOne(
            { telefono: telefono },
            { 
                $set: { 
                    nombre: nombre,
                    autoModelo: modelo,
                    autoPatente: patente,
                    autoColor: color,
                    foto: fotoPerfil,
                    documentacion: {
                        carnet: fotoCarnet,
                        seguro: fotoSeguro,
                        tarjeta: fotoTarjeta
                    },
                    perfilCompleto: true
                } 
            }
        );
        res.json({ mensaje: "Ok" });
    } catch (e) {
        res.status(500).json({ error: "Error al guardar perfil" });
    }
});

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    const { telefono, lat, lng, estado } = req.body;
    await Usuario.updateOne({ telefono }, { $set: { lat, lng, estado } });
    res.json({ mensaje: "Ok" });
});

// --- RUTA PRINCIPAL (Para evitar el Cannot GET /) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- PUERTO ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

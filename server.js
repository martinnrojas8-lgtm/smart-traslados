const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// --- CONEXIÓN A MONGO (Corregida para que no rompa Render) ---
const mongoURI = process.env.MONGO_URL || 'AQUÍ_VA_TU_URL_REAL_DE_MONGODB';

mongoose.connect(mongoURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log("✅ Conectado a MongoDB"))
.catch(err => {
    console.log("⚠️ Error en MongoDB, pero el servidor seguirá corriendo:");
    console.log(err.message);
});

// --- ESQUEMAS ---

const UsuarioSchema = new mongoose.Schema({
    telefono: String,
    nombre: String,
    tipo: String, 
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    foto: String,
    fotoCarnet: String,
    fotoSeguro: String,
    fotoTarjeta: String,
    pagoActivo: { type: Boolean, default: false }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const TokenSchema = new mongoose.Schema({
    codigo: String,
    usado: { type: Boolean, default: false },
    fechaCreacion: { type: Date, default: Date.now }
});
const Token = mongoose.model('Token', TokenSchema);

// --- RUTAS DE USUARIO ---

app.get('/obtener-usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    const { telefono, nombre, modelo, patente, color, fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta, pagoActivo } = req.body;
    try {
        await Usuario.findOneAndUpdate(
            { telefono: telefono },
            { nombre, autoModelo: modelo, autoPatente: patente, autoColor: color, foto: fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta, pagoActivo },
            { upsert: true }
        );
        res.json({ mensaje: "Ok" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar" });
    }
});

// --- RUTAS DE TOKENS ---

app.post('/crear-token', async (req, res) => {
    const { codigo } = req.body;
    const nuevoToken = new Token({ codigo: codigo });
    await nuevoToken.save();
    res.json({ mensaje: "Token creado con éxito" });
});

app.post('/validar-token', async (req, res) => {
    const { codigo, telefono } = req.body;
    const tokenEncontrado = await Token.findOne({ codigo: codigo, usado: false });
    if (tokenEncontrado) {
        tokenEncontrado.usado = true;
        await tokenEncontrado.save();
        await Usuario.findOneAndUpdate({ telefono: telefono }, { pagoActivo: true });
        res.json({ ok: true, mensaje: "Cuenta activada correctamente" });
    } else {
        res.status(400).json({ ok: false, mensaje: "Código inválido" });
    }
});

// --- RUTA PARA EL PANEL ADMIN (Asegura que cargue tu index-admin.html) ---
app.get('/admin', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, 'admin', 'index-admin.html'));
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));

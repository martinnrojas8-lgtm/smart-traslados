const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// CONEXIÓN A MONGO (Restaurada para que Render conecte correctamente)
// Si tenés la URL en las variables de entorno de Render, la tomará de ahí.
const mongoURI = process.env.MONGO_URL || 'mongodb+srv://martinnrojas8:martin123@cluster0.v7z8x.mongodb.net/smart-traslados?retryWrites=true&w=majority';

mongoose.connect(mongoURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log("✅ Conexión exitosa a MongoDB"))
.catch(err => console.log("⚠️ Error de conexión:", err.message));

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

// --- RUTAS ---
app.get('/obtener-usuarios', async (req, res) => {
    const usuarios = await Usuario.find();
    res.json(usuarios);
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    const { telefono, nombre, modelo, patente, color, fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta, pagoActivo } = req.body;
    await Usuario.findOneAndUpdate(
        { telefono: telefono },
        { nombre, autoModelo: modelo, autoPatente: patente, autoColor: color, foto: fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta, pagoActivo },
        { upsert: true }
    );
    res.json({ mensaje: "Ok" });
});

app.post('/crear-token', async (req, res) => {
    const { codigo } = req.body;
    const nuevoToken = new Token({ codigo: codigo });
    await nuevoToken.save();
    res.json({ mensaje: "Token creado" });
});

app.post('/validar-token', async (req, res) => {
    const { codigo, telefono } = req.body;
    const tokenEncontrado = await Token.findOne({ codigo: codigo, usado: false });
    if (tokenEncontrado) {
        tokenEncontrado.usado = true;
        await tokenEncontrado.save();
        await Usuario.findOneAndUpdate({ telefono: telefono }, { pagoActivo: true });
        res.json({ ok: true });
    } else {
        res.status(400).json({ ok: false });
    }
});

// Ruta para asegurar que cargue tu panel admin corregido
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index-admin.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor funcionando en puerto ${PORT}`));

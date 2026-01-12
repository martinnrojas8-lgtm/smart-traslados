const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// CONEXIÓN MONGO
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error Mongo ❌:", err));

// ESQUEMA (Tu versión del mediodía)
const UsuarioSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    rol: String,
    nombre: String,
    foto: String,
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    fotoCarnet: String,
    fotoSeguro: String,
    fotoTarjeta: String,
    estadoRevision: { type: String, default: "pendiente" }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// --- EL TRUCO PARA QUE NADA DE "NOT FOUND" ---

// 1. Servimos la carpeta raíz primero
app.use(express.static(path.join(__dirname, 'public')));
// 2. Por si las dudas, también servimos las subcarpetas explícitamente
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// --- RUTAS DE API ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        const existe = await Usuario.findOne({ telefono: telefono.trim() });
        if(existe) return res.json({ mensaje: "Ok" }); 
        const nuevoUsuario = new Usuario({ telefono: telefono.trim(), rol: rol.toLowerCase().trim() });
        await nuevoUsuario.save();
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/login', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ telefono: req.body.telefono.trim() });
        if (usuario) res.json(usuario);
        else res.status(404).json({ error: "No registrado" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        await Usuario.findOneAndUpdate({ telefono: d.telefono.trim() }, { 
            nombre: d.nombre, autoModelo: d.modelo, autoPatente: d.patente, 
            autoColor: d.color, foto: d.fotoPerfil, fotoCarnet: d.fotoCarnet,
            fotoSeguro: d.fotoSeguro, fotoTarjeta: d.fotoTarjeta 
        });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- EL SALVAVIDAS FINAL ---
// Si nada de lo anterior funcionó, mandalo siempre al Login
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Servidor Smart estable en puerto " + PORT));

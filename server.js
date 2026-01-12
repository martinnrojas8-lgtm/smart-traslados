const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- CONEXIÓN COMPATIBLE CON RENDER (FORMATO LEGACY) ---
// Cambiamos 'mongodb+srv' por 'mongodb' para forzar a Render a encontrar el cluster
const MONGO_URI = 'mongodb://martinnrojas8:martin123@cluster0-shard-00-00.v7z8x.mongodb.net:27017,cluster0-shard-00-01.v7z8x.mongodb.net:27017,cluster0-shard-00-02.v7z8x.mongodb.net:27017/smart-traslados?ssl=true&replicaSet=atlas-139q8l-shard-0&authSource=admin&retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => {
      console.error("Error Mongo ❌:", err.message);
      // Reintento automático si falla
      setTimeout(() => {
          mongoose.connect(MONGO_URI);
      }, 5000);
  });

// --- ESQUEMAS (Tus datos intactos) ---
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
    pagoActivo: { type: Boolean, default: false }, 
    estadoRevision: { type: String, default: "pendiente" },
    fechaRegistro: { type: Date, default: Date.now }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const TokenSchema = new mongoose.Schema({
    codigo: String,
    usado: { type: Boolean, default: false }
});
const Token = mongoose.model('Token', TokenSchema);

// --- RUTAS ESTÁTICAS ---
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- API LOGIN Y REGISTRO ---
app.post('/login', async (req, res) => {
    try {
        const tel = req.body.telefono.trim();
        const rolElegido = req.body.rol.toLowerCase().trim();
        const usuario = await Usuario.findOne({ telefono: tel, rol: rolElegido });
        if (usuario) return res.json({ mensaje: "Ok", usuario });
        res.status(404).json({ mensaje: "Usuario no encontrado" });
    } catch (e) { res.status(500).json({ error: "Error de DB" }); }
});

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        const existe = await Usuario.findOne({ telefono });
        if(existe) return res.json({ mensaje: "Ok", usuario: existe });
        const nuevo = new Usuario({ telefono, rol: rol.toLowerCase() });
        await nuevo.save();
        res.json({ mensaje: "Ok", usuario: nuevo });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// Rutas de administración
app.get('/obtener-usuarios', async (req, res) => {
    const usuarios = await Usuario.find().sort({ fechaRegistro: -1 });
    res.json(usuarios);
});

app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index-admin.html'));
});

app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'Public', 'login.html')); 
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Smart Online 🚀`));

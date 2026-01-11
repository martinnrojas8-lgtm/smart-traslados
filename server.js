const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); // Agregamos cors por seguridad
const app = express();

app.use(cors());

// Aumentamos el límite al máximo posible para fotos de alta resolución de iPhone
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

let viajesActivos = [];

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error Mongo ❌:", err));

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

// Servir carpetas
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- RUTAS DE REGISTRO Y LOGIN (MEJORADAS PARA IPHONE) ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        if(!telefono || !rol) return res.status(400).json({ error: "Datos incompletos" });

        // Verificamos si ya existe para evitar error de duplicado en Mongo
        const existe = await Usuario.findOne({ telefono: telefono.trim() });
        if(existe) return res.json({ mensaje: "Ok" }); // Si ya existe, lo dejamos pasar como si fuera nuevo

        const nuevoUsuario = new Usuario({ 
            telefono: telefono.trim(), 
            rol: rol.toLowerCase().trim() 
        });
        await nuevoUsuario.save();
        res.json({ mensaje: "Ok" });
    } catch (e) {
        console.log("Error Registro:", e);
        res.status(500).json({ error: "Error al registrar" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { telefono } = req.body;
        const usuario = await Usuario.findOne({ telefono: telefono.trim() });
        if (usuario) {
            res.json({
                telefono: usuario.telefono,
                rol: usuario.rol,
                nombre: usuario.nombre || null,
                foto: usuario.foto || null
            });
        } else {
            res.status(404).json({ error: "Número no registrado" });
        }
    } catch (e) {
        res.status(500).json({ error: "Error en servidor" });
    }
});

// Rutas de perfil y viajes (Se mantienen igual pero con el nuevo límite de 100mb)
app.post('/actualizar-perfil', async (req, res) => {
    try {
        await Usuario.findOneAndUpdate({ telefono: req.body.telefono.trim() }, { nombre: req.body.nombre, foto: req.body.foto });
        res.json({ mensaje: "Ok" });
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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'Public', 'login.html')); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor Smart en marcha 🚀"));

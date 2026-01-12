const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const app = express();

app.use(cors());

// Aumentamos el límite para fotos de alta resolución
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

let viajesActivos = [];

// Conexión a Base de Datos
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error Mongo ❌:", err));

// Modelo de Usuario
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
    estadoRevision: { type: String, default: "pendiente" } // pendiente, aprobado, suspendido
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Servir carpetas estáticas
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- RUTAS DE REGISTRO Y LOGIN ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        if(!telefono || !rol) return res.status(400).json({ error: "Datos incompletos" });

        const existe = await Usuario.findOne({ telefono: telefono.trim() });
        if(existe) return res.json({ mensaje: "Ok" });

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
            // Bloqueo de seguridad si está suspendido
            if (usuario.estadoRevision === "suspendido") {
                return res.status(403).json({ error: "Cuenta suspendida. Contacte al administrador." });
            }

            res.json({
                telefono: usuario.telefono,
                rol: usuario.rol,
                nombre: usuario.nombre || null,
                foto: usuario.foto || null,
                estado: usuario.estadoRevision
            });
        } else {
            res.status(404).json({ error: "Número no registrado" });
        }
    } catch (e) {
        res.status(500).json({ error: "Error en servidor" });
    }
});

// --- RUTAS DE PERFIL ---

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

// --- NUEVAS RUTAS DE ADMINISTRACIÓN ---

// Listar todos los usuarios
app.get('/admin/obtener-usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, 'nombre telefono rol estadoRevision');
        res.json(usuarios);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener lista" });
    }
});

// Cambiar estado (Activar/Suspender)
app.post('/admin/cambiar-estado', async (req, res) => {
    try {
        const { telefono, nuevoEstado } = req.body;
        await Usuario.findOneAndUpdate({ telefono: telefono.trim() }, { estadoRevision: nuevoEstado });
        res.json({ mensaje: "Ok" });
    } catch (e) {
        res.status(500).json({ error: "Error al cambiar estado" });
    }
});

// Eliminar usuario
app.delete('/admin/eliminar-usuario/:telefono', async (req, res) => {
    try {
        await Usuario.findOneAndDelete({ telefono: req.params.telefono.trim() });
        res.json({ mensaje: "Ok" });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar" });
    }
});

// Ruta inicial
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'Public', 'login.html')); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor Smart en marcha 🚀"));

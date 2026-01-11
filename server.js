const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();

// Aumentamos el límite para recibir fotos (Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// BASE DE DATOS TEMPORAL DE VIAJES (Para que sea rápido)
let viajesActivos = [];

// CONEXIÓN A MONGODB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error conectando a Mongo ❌:", err));

// ESQUEMA DE USUARIO
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

// SERVIR CARPETAS (Ajustado a tu estructura de raíz)
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- SISTEMA DE VIAJES EN TIEMPO REAL ---

// 1. El Pasajero publica un viaje
app.post('/solicitar-viaje', (req, res) => {
    const nuevoViaje = {
        id: Date.now(),
        pasajero: req.body.nombre,
        telefono: req.body.telefono,
        foto: req.body.foto,
        origen: req.body.origen,
        destino: req.body.destino,
        precio: req.body.precio,
        estado: 'pendiente'
    };
    viajesActivos.push(nuevoViaje);
    console.log("Nuevo viaje solicitado:", nuevoViaje.id);
    res.json({ mensaje: "Viaje publicado", idViaje: nuevoViaje.id });
});

// 2. El Chofer consulta si hay viajes
app.get('/buscar-viajes', (req, res) => {
    const pendientes = viajesActivos.filter(v => v.estado === 'pendiente');
    res.json(pendientes);
});

// 3. El Chofer acepta un viaje
app.post('/aceptar-viaje', (req, res) => {
    const { idViaje, telefonoChofer } = req.body;
    const viaje = viajesActivos.find(v => v.id == idViaje);
    if(viaje && viaje.estado === 'pendiente') {
        viaje.estado = 'aceptado';
        viaje.chofer = telefonoChofer;
        res.json({ mensaje: "Ok", viaje: viaje });
    } else {
        res.json({ error: "Viaje ya no disponible" });
    }
});

// --- RUTAS DE PERFIL ---

app.post('/actualizar-perfil', async (req, res) => {
    try {
        const { telefono, nombre, foto } = req.body;
        await Usuario.findOneAndUpdate({ telefono: telefono.trim() }, { nombre, foto });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        await Usuario.findOneAndUpdate(
            { telefono: d.telefono.trim() },
            { 
                nombre: d.nombre, autoModelo: d.modelo, autoPatente: d.patente, 
                autoColor: d.color, foto: d.fotoPerfil, fotoCarnet: d.fotoCarnet,
                fotoSeguro: d.fotoSeguro, fotoTarjeta: d.fotoTarjeta 
            }
        );
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- LOGIN Y REGISTRO ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        const nuevoUsuario = new Usuario({ telefono: telefono.trim(), rol: rol.toLowerCase().trim() });
        await nuevoUsuario.save();
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/login', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ telefono: req.body.telefono.trim() });
        if (usuario) {
            res.json({
                telefono: usuario.telefono,
                rol: usuario.rol,
                nombre: usuario.nombre || null,
                foto: usuario.foto || null,
                autoModelo: usuario.autoModelo || null,
                autoPatente: usuario.autoPatente || null,
                autoColor: usuario.autoColor || null
            });
        } else { res.json({ error: "No encontrado" }); }
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'Public', 'login.html')); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor Smart Traslados en marcha 🚀"));

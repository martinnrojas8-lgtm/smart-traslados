const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const app = express();

app.use(cors());

// Configuración para recibir fotos pesadas
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- CONEXIÓN A MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://martinnrojas8:martin123@cluster0.v7z8x.mongodb.net/smart-traslados?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error Mongo ❌:", err));

// --- ESQUEMAS ---
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
    vencimientoPago: { type: Date, default: null },
    estadoRevision: { type: String, default: "pendiente" },
    aprobado: { type: Boolean, default: false }, // Para el tilde verde
    bloqueado: { type: Boolean, default: false }, // Para el candado rojo
    fechaRegistro: { type: Date, default: Date.now }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const TokenSchema = new mongoose.Schema({
    codigo: { type: String, unique: true },
    usado: { type: Boolean, default: false },
    usadoPor: { type: String, default: null },
    fechaUso: { type: Date, default: null },
    fechaCreacion: { type: Date, default: Date.now }
});
const Token = mongoose.model('Token', TokenSchema);

const TarifaSchema = new mongoose.Schema({
    precioBase: { type: Number, default: 3500 },
    precioKm: { type: Number, default: 900 }
});
const Tarifa = mongoose.model('Tarifa', TarifaSchema);

// --- RUTAS DE ARCHIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- API PANEL ADMIN (NUEVAS FUNCIONES) ---

app.post('/aprobar-chofer', async (req, res) => {
    try {
        await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { aprobado: true, estadoRevision: "aprobado" });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/eliminar-usuario', async (req, res) => {
    try {
        await Usuario.findOneAndDelete({ telefono: req.body.telefono });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/bloquear-usuario', async (req, res) => {
    try {
        await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { bloqueado: true });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- API EXISTENTE ---

app.post('/actualizar-tarifas', async (req, res) => {
    try {
        const { precioBase, precioKm } = req.body;
        await Tarifa.findOneAndUpdate({}, { precioBase, precioKm }, { upsert: true });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error al guardar" }); }
});

app.get('/obtener-tarifas', async (req, res) => {
    try {
        const tarifas = await Tarifa.findOne();
        if (tarifas) {
            res.json(tarifas);
        } else {
            res.json({ precioBase: 3500, precioKm: 900 });
        }
    } catch (e) { res.status(500).json({ error: "Error al leer" }); }
});

app.post('/login', async (req, res) => {
    try {
        const tel = req.body.telefono.trim();
        const rolElegido = req.body.rol.toLowerCase().trim();
        const usuario = await Usuario.findOne({ telefono: tel, rol: rolElegido });
        
        if (usuario) {
            if (usuario.bloqueado) return res.status(403).json({ mensaje: "Usuario bloqueado" });
            
            let pagoActivo = false;
            if (usuario.vencimientoPago && usuario.vencimientoPago > new Date()) {
                pagoActivo = true;
            }
            usuario.pagoActivo = pagoActivo;
            await usuario.save();
            res.json({ mensaje: "Ok", usuario: usuario });
        } else {
            res.status(404).json({ mensaje: "Usuario no encontrado" });
        }
    } catch (e) { res.status(500).json({ error: "Error en servidor" }); }
});

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        const existe = await Usuario.findOne({ telefono });
        if(existe) {
            if (existe.bloqueado) return res.status(403).json({ mensaje: "Número bloqueado" });
            return res.json({ mensaje: "Ok", usuario: existe });
        }
        const nuevo = new Usuario({ telefono, rol: rol.toLowerCase() });
        await nuevo.save();
        res.json({ mensaje: "Ok", usuario: nuevo });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/obtener-usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find().sort({ fechaRegistro: -1 });
        res.json(usuarios);
    } catch (e) { res.status(500).send(e); }
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        await Usuario.findOneAndUpdate({ telefono: d.telefono }, { 
            nombre: d.nombre, autoModelo: d.modelo, autoPatente: d.patente, 
            autoColor: d.color, foto: d.fotoPerfil, fotoCarnet: d.fotoCarnet,
            fotoSeguro: d.fotoSeguro, fotoTarjeta: d.fotoTarjeta 
        });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/crear-token', async (req, res) => {
    try {
        const nuevoToken = new Token({ codigo: req.body.codigo });
        await nuevoToken.save();
        res.json({ mensaje: "Token creado" });
    } catch (e) { res.status(500).json({ error: "Error al crear token" }); }
});

app.post('/validar-token', async (req, res) => {
    try {
        const { codigo, telefono } = req.body;
        const t = await Token.findOne({ codigo: codigo.trim(), usado: false });
        if (t) {
            const ahora = new Date();
            const vencimiento = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
            t.usado = true;
            t.usadoPor = telefono;
            t.fechaUso = ahora;
            await t.save();
            await Usuario.findOneAndUpdate({ telefono }, { pagoActivo: true, vencimientoPago: vencimiento });
            res.json({ ok: true, vencimiento: vencimiento });
        } else { 
            res.status(400).json({ ok: false, mensaje: "Código inválido o ya usado" }); 
        }
    } catch (e) { res.status(500).json({ error: "Error al validar" }); }
});

app.get('/estado-suscripcion/:telefono', async (req, res) => {
    try {
        const u = await Usuario.findOne({ telefono: req.params.telefono });
        if (!u) return res.status(404).send();
        res.json({ 
            pagoActivo: u.vencimientoPago > new Date(),
            vencimiento: u.vencimientoPago 
        });
    } catch (e) { res.status(500).send(); }
});

app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index-admin.html'));
});

app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'Public', 'login.html')); 
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Smart Online en puerto ${PORT} 🚀`));

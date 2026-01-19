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
    aprobado: { type: Boolean, default: false },
    bloqueado: { type: Boolean, default: false },
    fechaRegistro: { type: Date, default: Date.now }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const ViajeSchema = new mongoose.Schema({
    fecha: { type: String, default: () => new Date().toLocaleDateString() },
    hora: { type: String, default: () => new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
    chofer: { type: String, default: "Pendiente" },
    choferTel: { type: String, default: null },
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    pasajero: String,
    pasajeroTel: String,
    origen: String,
    destino: String,
    precio: String,
    distancia: String,
    estado: { type: String, default: "pendiente" }, 
    timestamp: { type: Date, default: Date.now }
});
const Viaje = mongoose.model('Viaje', ViajeSchema);

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

const UbicacionSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    lat: Number,
    lng: Number,
    estado: String,
    ultimaAct: { type: Date, default: Date.now }
});
const Ubicacion = mongoose.model('Ubicacion', UbicacionSchema);

// --- NUEVO ESQUEMA PARA MENSAJES REALES ---
const MensajeSchema = new mongoose.Schema({
    destino: String, // 'choferes' o 'pasajeros'
    texto: String,
    fecha: { type: Date, default: Date.now }
});
const Mensaje = mongoose.model('Mensaje', MensajeSchema);

// --- ESQUEMA DE CONFIGURACIÓN ADMIN (AGREGADO) ---
const ConfigSchema = new mongoose.Schema({
    app: String,
    tel: String,
    mail: String,
    alias: String
});
const Config = mongoose.model('Config', ConfigSchema);

// --- RUTAS ---
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- RUTA AGREGADA PARA GUARDAR CONFIGURACIÓN ADMIN ---
app.post('/actualizar-config-admin', async (req, res) => {
    try {
        const { app, tel, mail, alias } = req.body;
        await Config.findOneAndUpdate({}, { app, tel, mail, alias }, { upsert: true });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error al guardar config" }); }
});

app.get('/obtener-config-admin', async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json(config || {});
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/enviar-mensaje-masivo', async (req, res) => {
    try {
        const { destino, texto } = req.body;
        const nuevoMsg = new Mensaje({ destino, texto });
        await nuevoMsg.save();
        res.json({ mensaje: "Mensaje guardado en base de datos" });
    } catch (e) { res.status(500).json({ error: "Error al guardar mensaje" }); }
});

app.get('/obtener-ultimo-mensaje/:rol', async (req, res) => {
    try {
        const msg = await Mensaje.findOne({ destino: req.params.rol }).sort({ fecha: -1 });
        res.json(msg || { texto: "" });
    } catch (e) { res.status(500).json({ error: "Error al obtener mensaje" }); }
});

// --- RUTAS DE VIAJES ---
app.post('/solicitar-viaje', async (req, res) => {
    try {
        const d = req.body;
        const nuevoViaje = new Viaje({
            pasajero: d.pasajeroNombre,
            pasajeroTel: d.pasajeroTel,
            origen: d.origen,
            destino: d.destino,
            precio: d.precio,
            distancia: d.distancia,
            estado: "pendiente"
        });
        await nuevoViaje.save();
        res.json({ mensaje: "Viaje solicitado con éxito", id: nuevoViaje._id });
    } catch (e) { res.status(500).json({ error: "Error al solicitar viaje" }); }
});

app.get('/viajes-pendientes', async (req, res) => {
    try {
        const viajes = await Viaje.find({ estado: "pendiente" }).sort({ timestamp: -1 });
        res.json(viajes);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/aceptar-viaje', async (req, res) => {
    try {
        const { viajeId, choferNombre, choferTel, autoModelo, autoPatente, autoColor } = req.body;
        const viaje = await Viaje.findOneAndUpdate({ _id: viajeId, estado: "pendiente" }, {
            chofer: choferNombre,
            choferTel: choferTel,
            autoModelo: autoModelo,
            autoPatente: autoPatente,
            autoColor: autoColor,
            estado: "aceptado"
        }, { new: true });
        res.json({ mensaje: "Viaje aceptado", viaje });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/finalizar-viaje', async (req, res) => {
    try {
        const { id } = req.body;
        const viaje = await Viaje.findByIdAndUpdate(id, { estado: "finalizado" }, { new: true });
        if (viaje) {
            res.json({ ok: true, mensaje: "Viaje finalizado con éxito" });
        } else {
            res.status(404).json({ ok: false, mensaje: "Viaje no encontrado" });
        }
    } catch (e) { 
        res.status(500).json({ ok: false, error: "Error al finalizar viaje" }); 
    }
});

app.post('/rechazar-viaje', async (req, res) => {
    try {
        const { viajeId } = req.body;
        await Viaje.findByIdAndUpdate(viajeId, { estado: "cancelado" });
        res.json({ mensaje: "Viaje rechazado" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/eliminar-viaje', async (req, res) => {
    try {
        const { id } = req.body;
        await Viaje.findByIdAndDelete(id);
        res.json({ mensaje: "Viaje eliminado del historial" });
    } catch (e) { res.status(500).json({ error: "Error al eliminar registro" }); }
});

app.get('/obtener-viajes', async (req, res) => {
    try {
        const viajes = await Viaje.find().sort({ timestamp: -1 }).limit(50);
        res.json(viajes);
    } catch (e) { res.status(500).send(e); }
});

app.post('/aprobar-chofer', async (req, res) => {
    try {
        const nuevoEstado = req.body.aprobado !== undefined ? req.body.aprobado : true;
        await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { aprobado: nuevoEstado, estadoRevision: nuevoEstado ? "aprobado" : "pendiente" });
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
        const { telefono, bloqueado } = req.body;
        await Usuario.findOneAndUpdate({ telefono: telefono }, { bloqueado: bloqueado });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/actualizar-tarifas', async (req, res) => {
    try {
        const { precioBase, precioKm } = req.body;
        await Tarifa.findOneAndUpdate({}, { precioBase, precioKm }, { upsert: true });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/obtener-tarifas', async (req, res) => {
    try {
        const tarifas = await Tarifa.findOne();
        res.json(tarifas || { precioBase: 3500, precioKm: 900 });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/login', async (req, res) => {
    try {
        const tel = req.body.telefono.trim();
        const rolElegido = req.body.rol.toLowerCase().trim();
        const usuario = await Usuario.findOne({ telefono: tel, rol: rolElegido });
        if (usuario) {
            if (usuario.bloqueado) return res.status(403).json({ mensaje: "Usuario bloqueado" });
            usuario.pagoActivo = usuario.vencimientoPago && usuario.vencimientoPago > new Date();
            await usuario.save();
            res.json({ mensaje: "Ok", usuario: usuario });
        } else { res.status(404).json({ mensaje: "Usuario no encontrado" }); }
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol, nombre } = req.body; 
        const existe = await Usuario.findOne({ telefono });
        if(existe) {
            if (existe.bloqueado) return res.status(403).json({ mensaje: "Número bloqueado" });
            return res.json({ mensaje: "Ok", usuario: existe });
        }
        const nuevo = new Usuario({ 
            telefono, 
            rol: rol.toLowerCase(),
            nombre: nombre || "" 
        });
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

// --- RUTA ACTUALIZADA (SOLO ESTO SE TOCÓ) ---
app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        await Usuario.findOneAndUpdate({ telefono: d.telefono }, { 
            nombre: d.nombre, 
            autoModelo: d.autoModelo || d.modelo, 
            autoPatente: d.autoPatente || d.patente, 
            autoColor: d.autoColor || d.color, 
            foto: d.foto || d.fotoPerfil, 
            fotoCarnet: d.fotoCarnet,
            fotoSeguro: d.fotoSeguro, 
            fotoTarjeta: d.fotoTarjeta 
        });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/crear-token', async (req, res) => {
    try {
        const nuevoToken = new Token({ codigo: req.body.codigo });
        await nuevoToken.save();
        res.json({ mensaje: "Token creado" });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/validar-token', async (req, res) => {
    try {
        const { codigo, telefono } = req.body;
        const t = await Token.findOne({ codigo: codigo.trim(), usado: false });
        if (t) {
            const vencimiento = new Date(Date.now() + (24 * 60 * 60 * 1000));
            t.usado = true; t.usadoPor = telefono; t.fechaUso = new Date();
            await t.save();
            await Usuario.findOneAndUpdate({ telefono }, { pagoActivo: true, vencimientoPago: vencimiento });
            res.json({ ok: true, vencimiento: vencimiento });
        } else { res.status(400).json({ ok: false, mensaje: "Inválido" }); }
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/estado-suscripcion/:telefono', async (req, res) => {
    try {
        const u = await Usuario.findOne({ telefono: req.params.telefono });
        if (!u) return res.status(404).send();
        res.json({ pagoActivo: u.vencimientoPago > new Date(), vencimiento: u.vencimientoPago });
    } catch (e) { res.status(500).send(); }
});

app.get('/obtener-choferes-activos', async (req, res) => {
    try {
        const choferes = await Ubicacion.find({}); 
        res.json(choferes);
    } catch (e) { res.status(500).send(); }
});

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    try {
        const { telefono, lat, lng, estado } = req.body;
        await Ubicacion.findOneAndUpdate(
            { telefono }, 
            { lat, lng, estado, ultimaAct: new Date() }, 
            { upsert: true }
        );
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error GPS" }); }
});

app.get('/admin-panel', (req, res) => { res.sendFile(path.join(__dirname, 'admin', 'index-admin.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'Public', 'login.html')); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Smart Online en puerto ${PORT} 🚀`));

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const http = require('http'); 
const { Server } = require('socket.io'); 
const https = require('https'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } }); 

app.use(cors());

// Configuración para recibir fotos pesadas (Base64)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- CONFIGURACIÓN TELEGRAM ---
const TELEGRAM_TOKEN = '8579157525:AAF15oAwFpQWbcjcGDWRX6drcxhwN1l3GGE';
const TELEGRAM_CHAT_ID = '-5185887027';

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
    fotoPerfil: String, // Campo extra para asegurar compatibilidad
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
    estrellasPasajero: { type: Number, default: 0 },
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
    socketId: String, 
    ultimaAct: { type: Date, default: Date.now }
});
const Ubicacion = mongoose.model('Ubicacion', UbicacionSchema);

const MensajeSchema = new mongoose.Schema({
    destino: String, 
    texto: String,
    fecha: { type: Date, default: Date.now }
});
const Mensaje = mongoose.model('Mensaje', MensajeSchema);

const ConfigSchema = new mongoose.Schema({
    app: String,
    tel: String,
    mail: String,
    alias: String
});
const Config = mongoose.model('Config', ConfigSchema);

// --- LÓGICA DE SOCKETS ---
io.on('connection', (socket) => {
    socket.on('registrar-chofer', async (telefono) => {
        await Ubicacion.findOneAndUpdate({ telefono }, { socketId: socket.id });
    });

    socket.on('disconnect', async () => {
        await Ubicacion.findOneAndDelete({ socketId: socket.id });
        io.emit('actualizar-mapa'); 
    });
});

// --- RUTAS ---
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

app.post('/calificar-pasajero', async (req, res) => {
    try {
        const { viajeId, estrellas } = req.body;
        await Viaje.findByIdAndUpdate(viajeId, { estrellasPasajero: estrellas });
        res.json({ mensaje: "Calificación guardada" });
    } catch (e) { res.status(500).json({ error: "Error al calificar" }); }
});

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
        enviarNotificacionTelegram(nuevoViaje);
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
        if (viaje) res.json({ ok: true });
        else res.status(404).send();
    } catch (e) { res.status(500).send(); }
});

app.post('/finalizar-viaje-admin', async (req, res) => {
    try {
        const { viajeId, monto } = req.body;
        await Viaje.findByIdAndUpdate(viajeId, { estado: "finalizado", precio: monto });
        res.json({ ok: true });
    } catch (e) { res.status(500).send(); }
});

app.post('/eliminar-viaje', async (req, res) => {
    try {
        await Viaje.findByIdAndDelete(req.body.id);
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).send(); }
});

app.get('/obtener-viajes', async (req, res) => {
    try {
        const viajes = await Viaje.find().sort({ timestamp: -1 }).limit(100); 
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
        await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { bloqueado: req.body.bloqueado });
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
        const usuario = await Usuario.findOne({ 
            telefono: tel, 
            rol: { $regex: new RegExp("^" + req.body.rol.toLowerCase().trim() + "$", "i") } 
        });
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
            existe.rol = rol.toLowerCase().trim();
            await existe.save();
            return res.json({ mensaje: "Ok", usuario: existe });
        }
        const nuevo = new Usuario({ telefono, rol: rol.toLowerCase().trim(), nombre: nombre || "" });
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

// --- RUTA ACTUALIZAR PERFIL CHOFER (MEJORADA) ---
app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        const actualizacion = {
            nombre: d.nombre,
            autoModelo: d.autoModelo || d.modelo,
            autoPatente: d.autoPatente || d.patente,
            autoColor: d.autoColor || d.color,
            foto: d.foto || d.fotoPerfil,
            fotoPerfil: d.foto || d.fotoPerfil,
            fotoCarnet: d.fotoCarnet,
            fotoSeguro: d.fotoSeguro,
            fotoTarjeta: d.fotoTarjeta,
            rol: 'chofer',
            estadoRevision: 'pendiente' 
        };

        // Eliminar valores undefined para no pisar datos con nulos
        Object.keys(actualizacion).forEach(key => actualizacion[key] === undefined && delete actualizacion[key]);

        await Usuario.findOneAndUpdate(
            { telefono: d.telefono }, 
            { $set: actualizacion }, 
            { upsert: true }
        );
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error al guardar perfil" }); }
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
        const limiteTiempo = new Date(Date.now() - 5 * 60 * 1000);
        const choferes = await Ubicacion.find({ ultimaAct: { $gte: limiteTiempo } }); 
        res.json(choferes);
    } catch (e) { res.status(500).send([]); }
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

function enviarNotificacionTelegram(viaje) {
    const texto = `🚨 *NUEVO VIAJE SOLICITADO*\n\n` +
                  `👤 *Pasajero:* ${viaje.pasajero}\n` +
                  `📍 *Origen:* ${viaje.origen}\n` +
                  `🏁 *Destino:* ${viaje.destino}\n` +
                  `💰 *Precio:* ${viaje.precio}\n` +
                  `📞 *Tel:* ${viaje.pasajeroTel}\n\n` +
                  `🚕 _Revisar Panel de Control_`;

    const data = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: 'Markdown' });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => { res.on('data', () => {}); });
    req.on('error', (error) => { console.error("Error Telegram:", error); });
    req.write(data);
    req.end();
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor Smart Online en puerto ${PORT} 🚀`));

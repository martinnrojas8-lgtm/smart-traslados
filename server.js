const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// Soporte para imágenes Base64 del perfil y admin
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Servir archivos de todas las carpetas
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN A MONGODB
mongoose.connect('mongodb+srv://traslados:traslados@cluster0.z5i6p.mongodb.net/smart-traslados?retryWrites=true&w=majority')
    .then(() => console.log("✅ MongoDB Conectado"))
    .catch(err => console.error("❌ Error Mongo:", err));

// --- MODELOS DE DATOS ---
const UsuarioSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    nombre: String, rol: String, foto: String,
    autoModelo: String, autoPatente: String, autoColor: String,
    fotoCarnet: String, fotoSeguro: String, fotoTarjeta: String,
    aprobado: { type: Boolean, default: false },
    bloqueado: { type: Boolean, default: false },
    vencimientoPago: Date
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const ViajeSchema = new mongoose.Schema({
    pasajero: String, pasajeroTel: String, origen: String, destino: String,
    precio: String, distancia: String, estado: { type: String, default: "pendiente" },
    chofer: String, choferTel: String, 
    autoModelo: String, autoPatente: String, autoColor: String, // Campos para el seguimiento
    fecha: String, hora: String, timestamp: { type: Date, default: Date.now }
});
const Viaje = mongoose.model('Viaje', ViajeSchema);

const UbicacionSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    lat: Number, lng: Number, estado: String, ultimaAct: { type: Date, default: Date.now }
});
const Ubicacion = mongoose.model('Ubicacion', UbicacionSchema);

const TarifaSchema = new mongoose.Schema({
    precioBase: Number, precioKm: Number
});
const Tarifa = mongoose.model('Tarifa', TarifaSchema);

const TokenSchema = new mongoose.Schema({
    codigo: String, usado: { type: Boolean, default: false }, fecha: { type: Date, default: Date.now }
});
const Token = mongoose.model('Token', TokenSchema);

const SuscripcionSchema = new mongoose.Schema({
    telefono: { type: String, unique: true }, pagoActivo: Boolean, vencimiento: Date
});
const Suscripcion = mongoose.model('Suscripcion', SuscripcionSchema);

// --- RUTAS DE LOGIN Y PERFIL ---
app.post('/login', async (req, res) => {
    const { telefono } = req.body;
    try {
        let user = await Usuario.findOne({ telefono });
        if (!user) { user = new Usuario({ telefono, rol: 'pasajero' }); await user.save(); }
        res.json(user);
    } catch (e) { res.status(500).json({ error: "Error login" }); }
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const { telefono, nombre, modelo, patente, color, fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta } = req.body;
        await Usuario.findOneAndUpdate({ telefono }, {
            nombre, autoModelo: modelo, autoPatente: patente, autoColor: color,
            foto: fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta, rol: "chofer"
        }, { upsert: true });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error perfil" }); }
});

app.get('/obtener-usuarios', async (req, res) => {
    const u = await Usuario.find(); res.json(u);
});

// --- RUTAS EXCLUSIVAS DEL ADMIN ---
app.post('/aprobar-chofer', async (req, res) => {
    await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { aprobado: req.body.aprobado });
    res.json({ mensaje: "Ok" });
});

app.post('/bloquear-usuario', async (req, res) => {
    await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { bloqueado: true });
    res.json({ mensaje: "Ok" });
});

app.post('/eliminar-usuario', async (req, res) => {
    await Usuario.findOneAndDelete({ telefono: req.body.telefono });
    res.json({ mensaje: "Ok" });
});

app.get('/obtener-tarifas', async (req, res) => {
    let t = await Tarifa.findOne();
    if (!t) t = { precioBase: 0, precioKm: 0 };
    res.json(t);
});

app.post('/actualizar-tarifas', async (req, res) => {
    await Tarifa.findOneAndUpdate({}, req.body, { upsert: true });
    res.json({ mensaje: "Ok" });
});

app.post('/crear-token', async (req, res) => {
    const t = new Token({ codigo: req.body.codigo });
    await t.save();
    res.json({ mensaje: "Ok" });
});

// --- RUTAS DE VIAJES Y SEGUIMIENTO ---
app.post('/solicitar-viaje', async (req, res) => {
    const ahora = new Date();
    const v = new Viaje({
        ...req.body,
        fecha: ahora.toLocaleDateString('es-AR'),
        hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    });
    await v.save();
    res.json({ id: v._id });
});

app.get('/viajes-pendientes', async (req, res) => {
    const v = await Viaje.find({ estado: "pendiente" }).sort({ timestamp: -1 });
    res.json(v);
});

app.get('/obtener-viajes', async (req, res) => {
    const v = await Viaje.find().sort({ timestamp: -1 });
    res.json(v);
});

app.post('/aceptar-viaje', async (req, res) => {
    const { viajeId, choferNombre, choferTel, autoModelo, autoPatente, autoColor } = req.body;
    await Viaje.findByIdAndUpdate(viajeId, {
        chofer: choferNombre, 
        choferTel: choferTel, 
        autoModelo: autoModelo, 
        autoPatente: autoPatente, 
        autoColor: autoColor, 
        estado: "aceptado"
    });
    res.json({ mensaje: "Ok" });
});

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    const { telefono, lat, lng, estado } = req.body;
    await Ubicacion.findOneAndUpdate({ telefono }, { lat, lng, estado, ultimaAct: Date.now() }, { upsert: true });
    res.json({ mensaje: "Ok" });
});

app.get('/obtener-choferes-activos', async (req, res) => {
    const cincoMin = new Date(Date.now() - 5 * 60 * 1000);
    const c = await Ubicacion.find({ ultimaAct: { $gt: cincoMin } });
    res.json(c);
});

app.get('/estado-suscripcion/:tel', async (req, res) => {
    const s = await Suscripcion.findOne({ telefono: req.params.tel });
    if (s && s.vencimiento > new Date()) res.json({ pagoActivo: true, vencimiento: s.vencimiento });
    else res.json({ pagoActivo: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Smart Traslados listo en puerto ${PORT}`));

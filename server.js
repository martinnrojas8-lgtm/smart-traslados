const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// VOLVEMOS A TU CONFIGURACIÓN DE CARPETAS ORIGINAL
app.use(express.static(path.join(__dirname, 'Public'))); 

mongoose.connect('mongodb+srv://traslados:traslados@cluster0.z5i6p.mongodb.net/smart-traslados?retryWrites=true&w=majority')
    .then(() => console.log("✅ MongoDB Conectado"))
    .catch(err => console.error("❌ Error Mongo:", err));

// --- MODELOS (Tu versión original con los 3 campos de auto agregados) ---
const UsuarioSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    nombre: String, rol: String, foto: String,
    autoModelo: String, autoPatente: String, autoColor: String,
    fotoCarnet: String, fotoSeguro: String, fotoTarjeta: String,
    aprobado: { type: Boolean, default: false },
    bloqueado: { type: Boolean, default: false }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const ViajeSchema = new mongoose.Schema({
    pasajero: String, pasajeroTel: String, origen: String, destino: String,
    precio: String, distancia: String, estado: { type: String, default: "pendiente" },
    chofer: String, choferTel: String, 
    autoModelo: String, autoPatente: String, autoColor: String, // Agregados para el seguimiento
    fecha: String, hora: String, timestamp: { type: Date, default: Date.now }
});
const Viaje = mongoose.model('Viaje', ViajeSchema);

const UbicacionSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    lat: Number, lng: Number, estado: String, ultimaAct: { type: Date, default: Date.now }
});
const Ubicacion = mongoose.model('Ubicacion', UbicacionSchema);

const TarifaSchema = new mongoose.Schema({ precioBase: Number, precioKm: Number });
const Tarifa = mongoose.model('Tarifa', TarifaSchema);

const TokenSchema = new mongoose.Schema({ codigo: String, usado: { type: Boolean, default: false } });
const Token = mongoose.model('Token', TokenSchema);

const SuscripcionSchema = new mongoose.Schema({ telefono: String, pagoActivo: Boolean, vencimiento: Date });
const Suscripcion = mongoose.model('Suscripcion', SuscripcionSchema);

// --- RUTAS (Exactamente como las tenías en la versión estable) ---

app.post('/login', async (req, res) => {
    const { telefono } = req.body;
    let user = await Usuario.findOne({ telefono });
    if (!user) { user = new Usuario({ telefono, rol: 'pasajero' }); await user.save(); }
    res.json(user);
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    const { telefono, nombre, modelo, patente, color, fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta } = req.body;
    await Usuario.findOneAndUpdate({ telefono }, {
        nombre, autoModelo: modelo, autoPatente: patente, autoColor: color,
        foto: fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta, rol: "chofer"
    }, { upsert: true });
    res.json({ mensaje: "Ok" });
});

app.get('/obtener-usuarios', async (req, res) => { res.json(await Usuario.find()); });

app.post('/aprobar-chofer', async (req, res) => {
    await Usuario.findOneAndUpdate({ telefono: req.body.telefono }, { aprobado: req.body.aprobado });
    res.json({ mensaje: "Ok" });
});

app.post('/eliminar-usuario', async (req, res) => {
    await Usuario.findOneAndDelete({ telefono: req.body.telefono });
    res.json({ mensaje: "Ok" });
});

app.get('/obtener-tarifas', async (req, res) => { res.json(await Tarifa.findOne() || {precioBase:0, precioKm:0}); });

app.post('/actualizar-tarifas', async (req, res) => {
    await Tarifa.findOneAndUpdate({}, req.body, { upsert: true });
    res.json({ mensaje: "Ok" });
});

app.post('/crear-token', async (req, res) => {
    await new Token({ codigo: req.body.codigo }).save();
    res.json({ mensaje: "Ok" });
});

app.post('/solicitar-viaje', async (req, res) => {
    const v = new Viaje({...req.body, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString()});
    await v.save();
    res.json({ id: v._id });
});

app.get('/viajes-pendientes', async (req, res) => { res.json(await Viaje.find({ estado: "pendiente" })); });

app.get('/obtener-viajes', async (req, res) => { res.json(await Viaje.find()); });

app.post('/aceptar-viaje', async (req, res) => {
    const { viajeId, choferNombre, choferTel, autoModelo, autoPatente, autoColor } = req.body;
    await Viaje.findByIdAndUpdate(viajeId, { chofer: choferNombre, choferTel, autoModelo, autoPatente, autoColor, estado: "aceptado" });
    res.json({ mensaje: "Ok" });
});

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    await Ubicacion.findOneAndUpdate({ telefono: req.body.telefono }, { ...req.body, ultimaAct: Date.now() }, { upsert: true });
    res.json({ mensaje: "Ok" });
});

app.get('/obtener-choferes-activos', async (req, res) => {
    const c = await Ubicacion.find({ ultimaAct: { $gt: new Date(Date.now() - 5*60*1000) } });
    res.json(c);
});

app.get('/estado-suscripcion/:tel', async (req, res) => {
    const s = await Suscripcion.findOne({ telefono: req.params.tel });
    if (s && s.vencimiento > new Date()) res.json({ pagoActivo: true, vencimiento: s.vencimiento });
    else res.json({ pagoActivo: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server estable en puerto ${PORT}`));

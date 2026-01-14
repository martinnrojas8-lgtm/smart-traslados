const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// Configuración para permitir imágenes pesadas (Base64)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN A MONGODB
mongoose.connect('mongodb+srv://traslados:traslados@cluster0.z5i6p.mongodb.net/smart-traslados?retryWrites=true&w=majority')
    .then(() => console.log("✅ MongoDB Conectado"))
    .catch(err => console.error("❌ Error Mongo:", err));

// --- MODELOS DE DATOS ---

const UsuarioSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    nombre: String,
    rol: String, // 'pasajero' o 'chofer'
    foto: String,
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    fotoCarnet: String,
    fotoSeguro: String,
    fotoTarjeta: String,
    fechaRegistro: { type: Date, default: Date.now }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const ViajeSchema = new mongoose.Schema({
    pasajero: String,
    pasajeroTel: String,
    origen: String,
    destino: String,
    paradas: Array,
    precio: String,
    distancia: String,
    estado: { type: String, default: "pendiente" }, // pendiente, aceptado, terminado
    chofer: String,
    choferTel: String,
    autoModelo: String,
    autoPatente: String,
    autoColor: String,
    timestamp: { type: Date, default: Date.now }
});
const Viaje = mongoose.model('Viaje', ViajeSchema);

const UbicacionSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    lat: Number,
    lng: Number,
    estado: String, // disponible u ocupado
    ultimaAct: { type: Date, default: Date.now }
});
const Ubicacion = mongoose.model('Ubicacion', UbicacionSchema);

const SuscripcionSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    pagoActivo: { type: Boolean, default: false },
    vencimiento: Date
});
const Suscripcion = mongoose.model('Suscripcion', SuscripcionSchema);

// --- RUTAS DE USUARIOS Y LOGIN ---

app.post('/login', async (req, res) => {
    const { telefono } = req.body;
    try {
        let user = await Usuario.findOne({ telefono });
        if (!user) {
            user = new Usuario({ telefono, rol: 'pasajero' });
            await user.save();
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: "Error en login" }); }
});

app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const { telefono, nombre, modelo, patente, color, fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta } = req.body;
        await Usuario.findOneAndUpdate({ telefono }, {
            nombre,
            autoModelo: modelo,
            autoPatente: patente,
            autoColor: color,
            foto: fotoPerfil,
            fotoCarnet,
            fotoSeguro,
            fotoTarjeta,
            rol: "chofer"
        }, { upsert: true });
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error al actualizar perfil" }); }
});

app.get('/obtener-usuarios', async (req, res) => {
    try {
        const u = await Usuario.find();
        res.json(u);
    } catch (e) { res.status(500).send(e); }
});

// --- RUTAS DE VIAJES ---

app.post('/solicitar-viaje', async (req, res) => {
    try {
        const v = new Viaje(req.body);
        await v.save();
        res.json({ id: v._id });
    } catch (e) { res.status(500).json({ error: "Error al solicitar" }); }
});

app.get('/viajes-pendientes', async (req, res) => {
    try {
        const v = await Viaje.find({ estado: "pendiente" }).sort({ timestamp: -1 });
        res.json(v);
    } catch (e) { res.status(500).send(e); }
});

app.get('/obtener-viajes', async (req, res) => {
    try {
        const v = await Viaje.find();
        res.json(v);
    } catch (e) { res.status(500).send(e); }
});

app.post('/aceptar-viaje', async (req, res) => {
    try {
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
    } catch (e) { res.status(500).json({ error: "Error al aceptar viaje" }); }
});

app.post('/rechazar-viaje', async (req, res) => {
    try {
        await Viaje.findByIdAndDelete(req.body.viajeId);
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).json({ error: "Error al rechazar" }); }
});

// --- RUTAS DE UBICACIÓN Y MAPA ---

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    const { telefono, lat, lng, estado } = req.body;
    try {
        await Ubicacion.findOneAndUpdate(
            { telefono }, 
            { lat, lng, estado, ultimaAct: Date.now() }, 
            { upsert: true }
        );
        res.json({ mensaje: "Ok" });
    } catch (e) { res.status(500).send(e); }
});

app.get('/obtener-choferes-activos', async (req, res) => {
    try {
        const cincoMin = new Date(Date.now() - 5 * 60 * 1000);
        const c = await Ubicacion.find({ ultimaAct: { $gt: cincoMin } });
        res.json(c);
    } catch (e) { res.status(500).send(e); }
});

// --- RUTAS DE ADMINISTRACIÓN Y PAGOS ---

app.get('/estado-suscripcion/:tel', async (req, res) => {
    try {
        const s = await Suscripcion.findOne({ telefono: req.params.tel });
        if (s && s.vencimiento > new Date()) {
            res.json({ pagoActivo: true, vencimiento: s.vencimiento });
        } else {
            res.json({ pagoActivo: false });
        }
    } catch (e) { res.status(500).send(e); }
});

// Ruta para que el Admin active choferes manualmente o por sistema
app.post('/activar-chofer', async (req, res) => {
    const { telefono, dias } = req.body;
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + parseInt(dias));
    try {
        await Suscripcion.findOneAndUpdate(
            { telefono }, 
            { pagoActivo: true, vencimiento }, 
            { upsert: true }
        );
        res.json({ mensaje: "Chofer activado correctamente" });
    } catch (e) { res.status(500).send(e); }
});

// --- INICIO DEL SERVIDOR ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Smart Traslados corriendo en puerto ${PORT}`);
});

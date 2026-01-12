const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE TAMAÑO (Para que no rebote las fotos del perfil)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static('public'));

// 2. CONEXIÓN A MONGODB (Usamos tu configuración actual)
const uri = process.env.MONGO_URI || "mongodb+srv://tu_usuario:tu_clave@cluster.mongodb.net/smart_traslados"; 
const client = new MongoClient(uri);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('smart_traslados');
        console.log("Conectado a MongoDB");
    } catch (e) {
        console.error("Error en conexión:", e);
    }
}
connectDB();

// --- RUTAS DE LOGIN Y REGISTRO ---

app.post('/register', async (req, res) => {
    try {
        const { telefono, rol } = req.body;
        const usuarios = db.collection('usuarios');
        const existe = await usuarios.findOne({ telefono });
        if (existe) return res.json({ mensaje: "Ok", usuario: existe });

        const nuevo = { 
            telefono, 
            rol, 
            nombre: "", 
            activo: true, 
            fecha: new Date(),
            perfilCompleto: false 
        };
        await usuarios.insertOne(nuevo);
        res.json({ mensaje: "Ok", usuario: nuevo });
    } catch (e) { res.status(500).send(e); }
});

app.post('/login', async (req, res) => {
    try {
        const { telefono } = req.body;
        const user = await db.collection('usuarios').findOne({ telefono });
        if (!user) return res.status(404).json({ error: "No existe" });
        if (!user.activo) return res.status(403).json({ error: "Suspendido" });
        res.json(user);
    } catch (e) { res.status(500).send(e); }
});

// --- RUTA NUEVA: ACTUALIZAR PERFIL COMPLETO ---

app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const { 
            telefono, nombre, modelo, patente, color, 
            fotoPerfil, fotoCarnet, fotoSeguro, fotoTarjeta 
        } = req.body;

        const resultado = await db.collection('usuarios').updateOne(
            { telefono: telefono },
            { 
                $set: { 
                    nombre: nombre,
                    autoModelo: modelo,
                    autoPatente: patente,
                    autoColor: color,
                    foto: fotoPerfil,
                    documentacion: {
                        carnet: fotoCarnet,
                        seguro: fotoSeguro,
                        tarjeta: fotoTarjeta
                    },
                    perfilCompleto: true,
                    ultimaActualizacion: new Date()
                } 
            }
        );
        res.json({ mensaje: "Ok" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al guardar perfil" });
    }
});

// --- UBICACIÓN Y VIAJES ---

app.post('/actualizar-ubicacion-chofer', async (req, res) => {
    const { telefono, lat, lng, estado } = req.body;
    await db.collection('usuarios').updateOne(
        { telefono },
        { $set: { lat, lng, estado, lastUpdate: new Date() } }
    );
    res.json({ mensaje: "Ok" });
});

app.get('/verificar-pedidos', async (req, res) => {
    // Aquí iría tu lógica de búsqueda de viajes activos
    // Por ahora enviamos un objeto vacío o el último pedido
    const viaje = await db.collection('pedidos').findOne({ activo: true });
    res.json(viaje);
});

// --- PANEL ADMIN ---

app.get('/admin/usuarios', async (req, res) => {
    const lista = await db.collection('usuarios').find().toArray();
    res.json(lista);
});

app.post('/admin/toggle-usuario', async (req, res) => {
    const { telefono, activo } = req.body;
    await db.collection('usuarios').updateOne({ telefono }, { $set: { activo } });
    res.json({ mensaje: "Ok" });
});

app.listen(port, () => console.log("Servidor Smart en puerto " + port));

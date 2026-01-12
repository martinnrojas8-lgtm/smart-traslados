const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const app = express();

app.use(cors());

// Configuración para recibir fotos pesadas de iPhone
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// CONEXIÓN A MONGODB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error Mongo ❌:", err));

// ESQUEMA DE USUARIO (Actualizado para incluir todos los campos necesarios)
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
    estadoRevision: { type: String, default: "pendiente" },
    fechaRegistro: { type: Date, default: Date.now }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// --- RUTAS DE ARCHIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/chofer', express.static(path.join(__dirname, 'chofer')));
app.use('/pasajero', express.static(path.join(__dirname, 'pasajero')));

// --- RUTAS DE API ---

// REGISTRO: Guarda en MongoDB para que el Admin lo vea
app.post('/register', async (req, res) => {
    try {
        const tel = req.body.telefono.trim();
        const rolElegido = req.body.rol.toLowerCase().trim();
        
        const existe = await Usuario.findOne({ telefono: tel });
        if(existe) {
            return res.json({ mensaje: "Ok", usuario: existe }); 
        }

        const nuevoUsuario = new Usuario({ 
            telefono: tel, 
            rol: rolElegido 
        });
        
        await nuevoUsuario.save();
        console.log(`Nuevo usuario registrado en DB: ${tel}`);
        res.json({ mensaje: "Ok" });
    } catch (e) { 
        console.error("Error en registro:", e);
        res.status(500).json({ error: "Error en registro" }); 
    }
});

// LOGIN: Verifica si ya existe para permitir el ingreso
app.post('/login', async (req, res) => {
    try {
        const tel = req.body.telefono.trim();
        const rolElegido = req.body.rol.toLowerCase().trim();
        
        const usuario = await Usuario.findOne({ telefono: tel, rol: rolElegido });
        
        if (usuario) {
            console.log(`Login exitoso: ${tel}`);
            res.json({ mensaje: "Ok", usuario: usuario });
        } else {
            res.status(404).json({ mensaje: "Usuario no encontrado con ese rol" });
        }
    } catch (e) { 
        console.error("Error en login:", e);
        res.status(500).json({ error: "Error en servidor" }); 
    }
});

// ACTUALIZAR PERFIL
app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        const tel = d.telefono.trim();
        
        await Usuario.findOneAndUpdate({ telefono: tel }, { 
            nombre: d.nombre, 
            autoModelo: d.modelo, 
            autoPatente: d.patente, 
            autoColor: d.color, 
            foto: d.fotoPerfil, 
            fotoCarnet: d.fotoCarnet,
            fotoSeguro: d.fotoSeguro, 
            fotoTarjeta: d.fotoTarjeta 
        });
        res.json({ mensaje: "Ok" });
    } catch (e) { 
        res.status(500).json({ error: "Error al guardar perfil" }); 
    }
});

// OBTENER TODOS LOS USUARIOS (Para tu Panel de Admin)
app.get('/obtener-usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find().sort({ fechaRegistro: -1 });
        res.json(usuarios);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener lista" });
    }
});

// --- RUTA RAIZ / SALVAVIDAS ---
app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'Public', 'login.html')); 
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Smart Online en puerto ${PORT} 🚀`));

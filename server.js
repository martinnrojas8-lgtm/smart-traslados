const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 
const app = express();

app.use(cors());

// Configuración para recibir fotos pesadas de iPhone y Android
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// CONEXIÓN A MONGODB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB ✅"))
  .catch(err => console.error("Error Mongo ❌:", err));

// ESQUEMA DE USUARIO
const UsuarioSchema = new mongoose.Schema({
    telefono: { type: String, unique: true },
    rol: String,
    nombre: String,
    foto: String, // Foto de perfil/conductor
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

// REGISTRO
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

// LOGIN
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

// ACTUALIZAR PERFIL (MODIFICADO PARA ASEGURAR EL GUARDADO)
app.post('/actualizar-perfil-chofer', async (req, res) => {
    try {
        const d = req.body;
        const tel = d.telefono ? d.telefono.toString().trim() : null;

        if (!tel) {
            return res.status(400).json({ error: "Teléfono no recibido" });
        }

        console.log("Actualizando perfil completo para:", tel);

        // Mapeamos los datos del formulario a los campos de la base de datos
        const datosAActualizar = { 
            nombre: d.nombre, 
            autoModelo: d.modelo, 
            autoPatente: d.patente, 
            autoColor: d.color, 
            foto: d.fotoPerfil, 
            fotoCarnet: d.fotoCarnet,
            fotoSeguro: d.fotoSeguro, 
            fotoTarjeta: d.fotoTarjeta,
            estadoRevision: "pendiente" // Vuelve a pendiente al actualizar datos
        };

        // findOneAndUpdate con upsert actualiza si existe o crea si no
        const resultado = await Usuario.findOneAndUpdate(
            { telefono: tel }, 
            { $set: datosAActualizar }, 
            { new: true, upsert: true }
        );

        if (resultado) {
            console.log("✅ Perfil guardado correctamente en MongoDB");
            res.json({ mensaje: "Ok" });
        } else {
            res.status(500).json({ error: "No se pudo actualizar el documento" });
        }

    } catch (e) { 
        console.error("❌ Error en actualizar-perfil-chofer:", e.message);
        res.status(500).json({ error: "Error en servidor: " + e.message }); 
    }
});

// OBTENER TODOS LOS USUARIOS
app.get('/obtener-usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find().sort({ fechaRegistro: -1 });
        res.json(usuarios);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener lista" });
    }
});

// --- RUTA RAIZ ---
app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'Public', 'login.html')); 
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Smart Online en puerto ${PORT} 🚀`));

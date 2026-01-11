const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- SERVIR ARCHIVOS ESTÁTICOS ---
// Esto le dice al servidor que busque TODO (incluyendo carpetas admin, chofer, etc) dentro de 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- CONEXIÓN A MONGODB ---
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB Atlas'))
    .catch(err => {
        console.error('❌ Error de conexión:', err.message);
        process.exit(1);
    });

// --- RUTA PRINCIPAL: MOSTRAR TU LOGIN ---
// Como moviste el login a 'public', esta línea lo encontrará ahí:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- CONFIGURACIÓN DEL PUERTO ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

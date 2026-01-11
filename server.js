const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json()); // Permite que tu app entienda JSON

// --- CONEXIÓN A MONGODB ---
// Render usará la variable MONGO_URI que configures en su panel
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB Atlas'))
    .catch(err => {
        console.error('❌ Error de conexión a MongoDB:', err.message);
        process.exit(1); // Detiene el servidor si no hay conexión
    });

// --- RUTAS (Ejemplos básicos, ajusta según tus módulos) ---
app.get('/', (req, res) => {
    res.send('Servidor de Smart-Traslados funcionando correctamente 🚀');
});

// Aquí irían tus rutas de módulos, por ejemplo:
// app.use('/api/usuarios', require('./routes/usuarios'));
// app.use('/api/traslados', require('./routes/traslados'));

// --- CONFIGURACIÓN DEL PUERTO ---
// Render asigna un puerto dinámico, por eso usamos process.env.PORT
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

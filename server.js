const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// --- Conexión a Mongo Atlas ---
const mongoUser = "martinnrojas8_db_user";
const mongoPass = "ZafcReO11kyEXap";
const mongoCluster = "cluster0.mongodb.net";
const dbName = "smartApp";

const mongoURI = `mongodb+srv://${mongoUser}:${mongoPass}@${mongoCluster}/${dbName}?retryWrites=true&w=majority`;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error("Error de conexión MongoDB:", err));

// --- Modelo de usuario ---
const usuarioSchema = new mongoose.Schema({
  telefono: { type: String, required: true, unique: true },
  rol: { type: String, required: true }
});

const Usuario = mongoose.model("Usuario", usuarioSchema);

// --- Rutas de API ---
app.post("/register", async (req, res) => {
  const { telefono, rol } = req.body;
  if (!telefono || !rol) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const existe = await Usuario.findOne({ telefono });
    if (existe) return res.status(400).json({ error: "Usuario ya existe" });

    const nuevoUsuario = new Usuario({ telefono, rol });
    await nuevoUsuario.save();
    res.json(nuevoUsuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

app.post("/login", async (req, res) => {
  const { telefono } = req.body;
  if (!telefono) return res.status(400).json({ error: "Ingresá tu teléfono" });

  try {
    const usuario = await Usuario.findOne({ telefono });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

// --- Servir frontend ---
const frontendPath = path.join(__dirname); // si login.html, chofer, admin, pasajeros están en la misma carpeta que server.js
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html")); // página de inicio central
});

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});

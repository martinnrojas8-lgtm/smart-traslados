const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// --- Almacenamiento temporal de usuarios ---
const usuarios = [];

// --- Rutas ---
app.post("/register", (req, res) => {
  const { telefono, rol } = req.body;
  if (!telefono || !rol) return res.status(400).json({ error: "Datos incompletos" });

  const existe = usuarios.find(u => u.telefono === telefono);
  if (existe) return res.status(400).json({ error: "Usuario ya existe" });

  const nuevoUsuario = { telefono, rol };
  usuarios.push(nuevoUsuario);
  res.json(nuevoUsuario);
});

app.post("/login", (req, res) => {
  const { telefono } = req.body;
  if (!telefono) return res.status(400).json({ error: "Ingresá tu teléfono" });

  const usuario = usuarios.find(u => u.telefono === telefono);
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

  res.json(usuario);
});

app.get("/", (req, res) => {
  res.send("Backend Smart funcionando sin Mongo");
});

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});

const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  app: { type: String, required: true },
  apm: { type: String, required: true },
  telefono: { type: String, required: true },
  correo: { type: String, required: true },
  contrasena: { type: String, required: true },
  tipo: { type: String, default: '1' },
  fechaRegistro: { type: Date, default: Date.now },
  verificado: { type: Boolean, default: false }, 
  verificationToken: String,                     
  tokenExpiracion: Date
});

// Registrar el modelo
const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;

const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  nombreActividad: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  importancia: { type: String, enum: ['Alta', 'Media', 'Baja'], required: true },
  urgencia: { type: String, enum: ['Alta', 'Media', 'Baja'], required: true },
  cuadrante: { type: String, enum: ['I', 'II', 'III', 'IV'], required: true },
  descripcion: { type: String },
  estado: { type: String, enum: ['Pendiente', 'Enproceso', 'Nocompletadas', 'Terminada'], required: true },
  fechaCreacion: { type: Date, default: Date.now },
  fechaTermino: { type: Date },
  dificultad: { type: Number, min: 1, max: 5 }
}, {
    collection: 'actividades'  
  });

module.exports = mongoose.model('Actividad', actividadSchema);

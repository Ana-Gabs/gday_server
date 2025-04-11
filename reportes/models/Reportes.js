const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    semana: { type: String, required: true },
    actividadesTotales: { type: Number, required: true },
    actividadesTerminadas: { type: Number, required: true },
    actividadesNoTerminadas: { type: Number, required: true },
    promedioDificultad: { type: Number, required: true },
    tiempoTotal: { type: Number, required: true }, // en minutos
    cuadrantes: {
        I: { type: Number, default: 0 },
        II: { type: Number, default: 0 },
        III: { type: Number, default: 0 },
        IV: { type: Number, default: 0 }
    },
    fechaCreacion: { type: Date, default: Date.now }
});

const Reporte = mongoose.model('Reporte', reporteSchema);

module.exports = Reporte;

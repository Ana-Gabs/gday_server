require('dotenv').config({ path: '../gateway/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

app.use(cors()); 
app.use(express.json());
app.use(helmet()); 

// Configuración de conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));

// Definir el esquema y modelo de actividades
const actividadSchema = new mongoose.Schema({
  usuarioId: mongoose.Schema.Types.ObjectId,
  nombreActividad: String,
  fechaInicio: Date,
  fechaFin: Date,
  importancia: String,
  urgencia: String,
  cuadrante: String,
  descripcion: String,
  estado: String,
  fechaCreacion: Date,
});

const Actividad = mongoose.model('actividades', actividadSchema);

// Endpoints de los reportes

// Obtener el conteo de actividades entregadas y no entregadas por semana
app.get('/reportes/conteo-actividades-semanal', async (req, res) => {
    try {
      const actividadesPorSemana = await Actividad.aggregate([
        {
          $addFields: {
            semana: { $isoWeek: { $toDate: "$fechaInicio" } }
          }
        },
        {
          $group: {
            _id: "$semana",
            entregadas: { 
              $sum: { $cond: [{ $eq: ["$estado", "Terminada"] }, 1, 0] } 
            },
            noEntregadas: { 
              $sum: { $cond: [{ $ne: ["$estado", "Terminada"] }, 1, 0] } 
            }
          }
        },
        { $sort: { _id: 1 } } // Ordenar por número de semana
      ]);
  
      res.json(actividadesPorSemana);
    } catch (error) {
      console.error('Error al obtener el conteo semanal:', error);
      res.status(500).json({ error: 'Error al agrupar actividades por semana' });
    }
  });
  

// Obtener las semanas disponibles
app.get('/reportes/semanas-disponibles', async (req, res) => {
    try {
      const semanasDisponibles = await Actividad.aggregate([
        {
          $addFields: {
            semana: { $isoWeek: { $toDate: "$fechaInicio" } }
          }
        },
        {
          $group: {
            _id: "$semana"
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: { _id: 0, semana: "$_id" }
        }
      ]);
  
      res.json(semanasDisponibles);
    } catch (error) {
      console.error('Error al obtener las semanas disponibles:', error);
      res.status(500).json({ error: 'Error al obtener las semanas disponibles' });
    }
  });  

// Obtener actividades por estado semanal
app.get('/reportes/actividades-por-estado-semanal', async (req, res) => {
    try {
      const actividadesPorEstadoSemanal = await Actividad.aggregate([
        {
          $addFields: {
            semana: { $isoWeek: { $toDate: "$fechaInicio" } }
          }
        },
        {
          $group: {
            _id: { estado: "$estado", semana: "$semana" },
            total: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.semana": 1, "_id.estado": 1 }
        }
      ]);
  
      res.json(actividadesPorEstadoSemanal);
    } catch (error) {
      console.error('Error al obtener las actividades por estado y semana:', error);
      res.status(500).json({ error: 'Error al obtener las actividades por estado y semana' });
    }
  });
  

// Iniciar el servidor
const PORT = process.env.PORT_REPORTES || 3005;
app.listen(PORT, () => {
  console.log(`Servidor de reportes corriendo en el puerto ${PORT}`);
});

require('dotenv').config({ path: '../../gateway/.env' });
const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const { connectToMongo, getDb } = require('./config/db');
const cron = require('node-cron');

const app = express();

// Configuración mejorada de CORS
app.use(cors({
  origin: 'http://localhost:3000', // Asegúrate de que coincida con tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = process.env.PORT_HORARIO_SUENO || 3008; // Usar un puerto diferente

// Conexión a MongoDB
connectToMongo().then(() => {
  console.log('Conectado a MongoDB para Horario de Sueño');
}).catch(err => {
  console.error('Error conectando a MongoDB:', err);
});

// Middleware para validar ObjectId
const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};

// Modelo de datos implícito (usando la colección directamente)
const sleepCollection = () => getDb().collection('horario_sueno');

/**
 * @swagger
 * /horario_sueno:
 *   post:
 *     summary: Crear un nuevo horario de sueño
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuarioId:
 *                 type: string
 *               horaAcostarse:
 *                 type: string
 *               horaDespertarse:
 *                 type: string
 *               dias:
 *                 type: array
 *                 items:
 *                   type: string
 *               recordatorioMinutos:
 *                 type: number
 *     responses:
 *       201:
 *         description: Horario creado exitosamente
 */
// Ruta POST corregida
app.post('/horario_sueno', async (req, res) => {
  const { usuarioId, horaAcostarse, horaDespertarse, dias, recordatorioMinutos } = req.body;
  console.log('Datos recibidos:', req.body);

  if (!isValidObjectId(usuarioId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaAcostarse) || 
      !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaDespertarse)) {
    return res.status(400).json({ message: 'Formato de hora inválido. Use HH:MM' });
  }

  try {
    const result = await sleepCollection().insertOne({
      usuarioId: new ObjectId(usuarioId),
      horaAcostarse,
      horaDespertarse,
      dias, // Corregido: se quitó el punto después de dias
      recordatorioMinutos: recordatorioMinutos || 30, // Valor por defecto
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      message: 'Horario de sueño creado',
      id: result.insertedId
    });
  } catch (error) {
    console.error('Error al crear horario de sueño:', error);
    res.status(500).json({ 
      message: 'Error al crear horario de sueño',
      error: error.message 
    });
  }
});
/**
 * @swagger
 * /horario_sueno/usuario/{usuarioId}:
 *   get:
 *     summary: Obtener horarios de sueño por usuario
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de horarios de sueño
 */
app.get('/horario_sueno/usuario/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;

  if (!isValidObjectId(usuarioId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  try {
    const horarios = await sleepCollection()
      .find({ usuarioId: new ObjectId(usuarioId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(horarios);
  } catch (error) {
    console.error('Error al obtener horarios de sueño:', error);
    res.status(500).json({ message: 'Error al obtener horarios de sueño' });
  }
});

/**
 * @swagger
 * /horario_sueno/{id}:
 *   put:
 *     summary: Actualizar horario de sueño
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               horaAcostarse:
 *                 type: string
 *               horaDespertarse:
 *                 type: string
 *               dias:
 *                 type: array
 *                 items:
 *                   type: string
 *               recordatorioMinutos:
 *                 type: number
 *     responses:
 *       200:
 *         description: Horario actualizado
 */
app.put('/horario_sueno/:id', async (req, res) => {
  const { id } = req.params;
  const { horaAcostarse, horaDespertarse, dias, recordatorioMinutos } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID de horario inválido' });
  }

  try {
    const updateData = { 
      updatedAt: new Date(),
      ...(horaAcostarse && { horaAcostarse }),
      ...(horaDespertarse && { horaDespertarse }),
      ...(dias && { dias }),
      ...(recordatorioMinutos && { recordatorioMinutos })
    };

    const result = await sleepCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    res.status(200).json({ message: 'Horario actualizado' });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({ message: 'Error al actualizar horario' });
  }
});

/**
 * @swagger
 * /horario_sueno/{id}:
 *   delete:
 *     summary: Eliminar horario de sueño
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Horario eliminado
 */
app.delete('/horario_sueno/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID de horario inválido' });
  }

  try {
    const result = await sleepCollection().deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    res.status(200).json({ message: 'Horario eliminado' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ message: 'Error al eliminar horario' });
  }
});

// Sistema de notificaciones para horario de sueño
// Tarea cron corregida
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()];

    const horarios = await sleepCollection().find().toArray();

    for (const horario of horarios) {
      if (horario.dias.includes(currentDay)) {
        const [hora, minuto] = horario.horaAcostarse.split(':').map(Number);
        
        const notifDate = new Date();
        notifDate.setHours(hora);
        notifDate.setMinutes(minuto);
        notifDate.setSeconds(0);
        notifDate.setMilliseconds(0);
        notifDate.setMinutes(notifDate.getMinutes() - (horario.recordatorioMinutos || 30));
        
        if (currentHour === notifDate.getHours() && currentMinute === notifDate.getMinutes()) {
          const db = getDb();
          await db.collection('notificaciones').insertOne({
            mensaje: `Recordatorio: Es hora de prepararse para dormir. Tu horario indica acostarte a ${horario.horaAcostarse}`,
            usuarioId: horario.usuarioId,
            horarioSuenoId: horario._id,
            fecha: new Date(),
            tipo: 4,
            leida: false
          });
        }
      }
    }
  } catch (error) {
    console.error('Error en cron job de horario sueño:', error);
  }
});
// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de Horario de Sueño corriendo en puerto ${PORT}`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: err.message
  });
});
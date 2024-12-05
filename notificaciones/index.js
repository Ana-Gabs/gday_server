const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
{/*require('dotenv').config({ path: '../gateway/.env' });*/}
const { connectToMongo, getDb } = require('./config/db');
const validarNotificacion = require('./middlewares/validarNotificacion');

const app = express();

app.use(express.json());
app.use(cors());

// Función para validar ObjectId
function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

// Crear notificaciones automáticamente
cron.schedule('*/5 * * * *', async () => {  // Ejecutar cada 5 minutos
    {/*console.log('Ejecutando verificación de tareas para notificaciones...');*/}
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // Asegurarnos de comparar solo la fecha sin la hora
    const db = getDb();

    try {
        const actividades = await db.collection('actividades').find().toArray();
        
        // Recorremos las actividades
        actividades.forEach(async (actividad) => {
            const startDate = new Date(actividad.fechaInicio);
            const endDate = new Date(actividad.fechaFin);  
            startDate.setHours(0, 0, 0, 0);  // Comparar solo las fechas

            // Verificar si la actividad comienza hoy (Tipo 3)
            if (startDate.toDateString() === today.toDateString()) {
                //console.log(`Verificando notificación: La actividad "${actividad.nombreActividad}" comienza hoy.`);

                // Verificar si ya existe una notificación del mismo tipo y actividad
                const existeNotificacion = await db.collection('notificaciones')
                    .findOne({
                        usuarioId: actividad.usuarioId,
                        actividadId: actividad._id,
                        tipo: 3
                    });

                if (!existeNotificacion) {
                    // Crear la notificación solo si no existe una
                    //console.log(`Creando notificación: La actividad "${actividad.nombreActividad}" comienza hoy.`);
                    await db.collection('notificaciones').insertOne({
                        mensaje: `La actividad "${actividad.nombreActividad}" comienza hoy.`,
                        usuarioId: actividad.usuarioId,
                        actividadId: actividad._id,
                        fecha: today,
                        tipo: 3,
                        leida: false
                    });
                } else {
                    //console.log(`Ya existe una notificación para la actividad "${actividad.nombreActividad}" que comienza hoy.`);
                }
            }

            // Verificar si la actividad está próxima a vencerse en 2 días (Tipo 2)
            const dosDiasAntes = new Date(today);
            dosDiasAntes.setDate(today.getDate() + 2);
            if (endDate <= dosDiasAntes && endDate >= today) {
                //console.log(`Verificando notificación: La actividad "${actividad.nombreActividad}" está próxima a vencer.`);

                // Verificar si ya existe una notificación del mismo tipo y actividad
                const existeNotificacion = await db.collection('notificaciones')
                    .findOne({
                        usuarioId: actividad.usuarioId,
                        actividadId: actividad._id,
                        tipo: 2
                    });

                if (!existeNotificacion) {
                    // Crear la notificación solo si no existe una
                    //console.log(`Creando notificación: La actividad "${actividad.nombreActividad}" está próxima a vencer.`);
                    await db.collection('notificaciones').insertOne({
                        mensaje: `La actividad "${actividad.nombreActividad}" está próxima a vencer.`,
                        usuarioId: actividad.usuarioId,
                        actividadId: actividad._id,
                        fecha: today,
                        tipo: 2,
                        leida: false
                    });
                } else {
                    //console.log(`Ya existe una notificación para la actividad "${actividad.nombreActividad}" próxima a vencer.`);
                }
            }

            // Verificar si la actividad está completada (Tipo 1)
            if (actividad.completada) {
                //console.log(`Verificando notificación: La actividad "${actividad.nombreActividad}" ha sido completada.`);

                // Verificar si ya existe una notificación del mismo tipo y actividad
                const existeNotificacion = await db.collection('notificaciones')
                    .findOne({
                        usuarioId: actividad.usuarioId,
                        actividadId: actividad._id,
                        tipo: 1
                    });

                if (!existeNotificacion) {
                    // Crear la notificación solo si no existe una
                    //console.log(`Creando notificación: La actividad "${actividad.nombreActividad}" ha sido completada.`);
                    await db.collection('notificaciones').insertOne({
                        mensaje: `La actividad "${actividad.nombreActividad}" ha sido completada.`,
                        usuarioId: actividad.usuarioId,
                        actividadId: actividad._id,
                        fecha: today,
                        tipo: 1,
                        leida: false
                    });
                } else {
                    //console.log(`Ya existe una notificación para la actividad "${actividad.nombreActividad}" completada.`);
                }
            }
        });

        //console.log('Notificaciones generadas exitosamente.');
    } catch (error) {
        console.error('Error al generar notificaciones:', error);
    }
});

// Obtener notificaciones por usuarioId
app.get('/notificaciones/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || isNaN(limitNum)) {
        return res.status(400).json({ message: 'Parámetros de paginación inválidos' });
    }

    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    try {
        const db = getDb();
        const notificaciones = await db.collection('notificaciones')
            .find({ usuarioId: new ObjectId(usuarioId) })
            .sort({ fecha: -1 }) // Ordenar por la fecha en orden descendente (más reciente primero)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .toArray();
        
        res.status(200).json(notificaciones);
    } catch (error) {
        console.error('Error al obtener las notificaciones:', error);
        res.status(500).json({ message: 'Error al obtener las notificaciones' });
    }
});

// Obtener notificaciones no leídas por usuarioId
app.get('/notificaciones/noleidas/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;

    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
        const db = getDb();
        const notificaciones = await db.collection('notificaciones')
            .find({ usuarioId: new ObjectId(usuarioId), leida: false })  
            .toArray();

        res.status(200).json(notificaciones);
    } catch (error) {
        console.error('Error al obtener las notificaciones:', error);
        res.status(500).json({ message: 'Error al obtener las notificaciones' });
    }
});

// Obtener notificaciones por usuario y estado de lectura
app.get('/notificaciones/:usuarioId/estado', async (req, res) => {
    const { usuarioId } = req.params;
    const { leida } = req.query; // "leida" será un parámetro query: true o false

    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const estadoLeida = leida === 'true'; // Convertir a booleano

    try {
        const db = getDb();
        const notificaciones = await db.collection('notificaciones')
            .find({ usuarioId: new ObjectId(usuarioId), leida: estadoLeida })
            .toArray();

        if (notificaciones.length === 0) {
            return res.status(404).json({ message: 'No se encontraron notificaciones' });
        }

        res.status(200).json(notificaciones);
    } catch (error) {
        console.error('Error al obtener las notificaciones por estado:', error);
        res.status(500).json({ message: 'Error al obtener las notificaciones por estado' });
    }
});

// Marcar notificación como leída
app.put('/notificaciones/marcar-leida/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de notificación inválido' });
    }
    try {
        const db = getDb();
        const result = await db.collection('notificaciones').updateOne(
            { _id: new ObjectId(id) },
            { $set: { leida: true } }
        );
        res.status(200).json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error al marcar la notificación como leída:', error);
        res.status(500).json({ message: 'Error al marcar la notificación como leída' });
    }
});

// Eliminar una notificación por ID
app.delete('/notificaciones/eliminar/:id', async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de notificación inválido' });
    }
    try {
        const db = getDb();
        const result = await db.collection('notificaciones').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No se encontró la notificación con el ID proporcionado' });
        }

        res.status(200).json({ message: 'Notificación eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar la notificación:', error);
        res.status(500).json({ message: 'Error al eliminar la notificación' });
    }
});

// Conectar a MongoDB y arrancar el servidor
const PORT = process.env.PORT_NOTIFICACIONES || 3004; 
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log('Servidor de Notificaciones corriendo en el puerto:', PORT);
    });
}).catch((error) => {
    console.error('Error al conectar con la base de datos:', error);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        message: 'Hubo un problema en el servidor. Inténtalo más tarde.',
        error: err.message || err
    });
});

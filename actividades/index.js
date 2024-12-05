const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const app = express();
app.use(express.json());
app.use(cors());
require('dotenv').config({ path: '../gateway/.env' });
const { connectToMongo, getDb } = require('./config/db');
const validarActividad = require('./middlewares/validarActividad');

// Función para validar ObjectId
function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

// Obtener una actividad por id
app.get('/actividades/:id', async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de actividad inválido' });
    }
    try {
        const db = getDb();
        const actividad = await db.collection('actividades').findOne({ _id: new ObjectId(id) });
        if (actividad) {
            res.status(200).json(actividad);
        } else {
            res.status(404).json({ message: 'Actividad no encontrada' });
        }
    } catch (error) {
        console.error('Error al obtener la actividad:', error);
        res.status(500).json({ message: 'Error al obtener la actividad' });
    }
});

// Listar actividades por usuarioId
app.get('/actividades/usuario/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    try {
        const db = getDb();
        const actividades = await db.collection('actividades').find({ usuarioId: new ObjectId(usuarioId) }).toArray();
        res.status(200).json(actividades);
    } catch (error) {
        console.error('Error al listar actividades:', error);
        res.status(500).json({ message: 'Error al obtener las actividades' });
    }
});

// Servicio: Listar actividades no completadas (Pendientes y En proceso)
app.get('/actividades/nocompletadas/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;

    // Validar ID del usuario
    if (!ObjectId.isValid(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
        const db = getDb();

        // Obtener actividades no completadas
        const actividadesNoCompletadas = await db.collection('actividades')
            .find({
                usuarioId: new ObjectId(usuarioId),
                estado: { $in: ['Pendiente', 'En proceso'] } // Estados no completados
            })
            .sort({ fechaFin: 1 }) // Ordenar por fecha de fin más próxima (ascendente)
            .toArray();

        // Responder con las actividades
        res.status(200).json(actividadesNoCompletadas);

    } catch (error) {
        console.error('Error al obtener actividades no completadas:', error);
        res.status(500).json({ message: 'Error al obtener actividades no completadas' });
    }
});

// Listar actividades pendientes por fechaFin más próxima
app.get('/actividades/pendientes/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    try {
        const db = getDb();
        const actividadesPendientes = await db.collection('actividades')
            .find({
                usuarioId: new ObjectId(usuarioId),
                estado: 'Pendiente'
            })
            .sort({ fechaFin: 1 })
            .toArray();

        res.status(200).json(actividadesPendientes);
    } catch (error) {
        console.error('Error al obtener actividades pendientes:', error);
        res.status(500).json({ message: 'Error al obtener actividades pendientes' });
    }
});

// Listar actividades en proceso ordenadas por fechaInicio más cercana
app.get('/actividades/enproceso/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    try {
        const db = getDb();
        const actividadesEnProceso = await db.collection('actividades')
            .find({
                usuarioId: new ObjectId(usuarioId),
                estado: 'En proceso'
            })
            .sort({ fechaInicio: 1 })
            .toArray();

        res.status(200).json(actividadesEnProceso);
    } catch (error) {
        console.error('Error al obtener actividades en proceso:', error);
        res.status(500).json({ message: 'Error al obtener actividades en proceso' });
    }
});

// Listar actividades terminadas por fechaTermino más reciente
app.get('/actividades/terminadas/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    try {
        const db = getDb();
        const actividadesTerminadas = await db.collection('actividades')
            .find({
                usuarioId: new ObjectId(usuarioId),
                estado: 'Terminada'
            })
            .sort({ fechaTermino: -1 })
            .toArray();

        res.status(200).json(actividadesTerminadas);
    } catch (error) {
        console.error('Error al obtener actividades terminadas:', error);
        res.status(500).json({ message: 'Error al obtener actividades terminadas' });
    }
});

// Marcar una actividad como terminada
app.put('/actividades/terminar/:id', async (req, res) => {
    const { id } = req.params;
    const { fechaTermino } = req.body; // Fecha opcional desde el cuerpo de la solicitud

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de actividad inválido' });
    }

    try {
        const db = getDb();
        const actividadExistente = await db.collection('actividades').findOne({ _id: new ObjectId(id) });
        if (!actividadExistente) {
            return res.status(404).json({ message: 'Actividad no encontrada' });
        }

        // Validar la fecha de término opcional y convertir a cadena ISO
        const fecha = fechaTermino
            ? new Date(fechaTermino).toISOString()
            : new Date().toISOString();

        if (isNaN(new Date(fecha))) {
            return res.status(400).json({ message: 'Fecha de término inválida' });
        }

        const resultado = await db.collection('actividades').findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    estado: 'Terminada',
                    fechaTermino: fecha, // Guardar como cadena ISO
                },
            },
            { returnDocument: 'after' }
        );

        if (resultado && resultado.value) {
            return res.status(200).json({
                message: 'Actividad marcada como terminada',
                actividad: resultado.value,
            });
        }
    } catch (error) {
        console.error('Error al marcar la actividad como terminada:', error);
        res.status(500).json({ message: 'Error al marcar la actividad como terminada' });
    }
});

// Marcar una actividad nuevamente como pendiente
app.put('/actividades/pendiente/:id', async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de actividad inválido' });
    }
    try {
        const db = getDb();
        const actividadExistente = await db.collection('actividades').findOne({ _id: new ObjectId(id) });
        if (!actividadExistente) {
            return res.status(404).json({ message: 'Actividad no encontrada' });
        }
        const resultado = await db.collection('actividades').findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    estado: 'Pendiente',
                    fechaTermino: null,
                }
            },
            { returnDocument: 'after' }
        );
        if (resultado && resultado.value) {
            return res.status(200).json({
                message: 'Actividad marcada como pendiente',
                actividad: resultado.value
            });
        }
    } catch (error) {
        console.error('Error al marcar la actividad como pendiente:', error);
        res.status(500).json({ message: 'Error al marcar la actividad como pendiente' });
    }
});

// Crear una actividad
app.post('/actividades/crear', validarActividad, async (req, res) => {
    const nuevaActividad = req.body;
    try {
        const db = getDb();
        if (nuevaActividad.usuarioId) nuevaActividad.usuarioId = new ObjectId(nuevaActividad.usuarioId);
        const result = await db.collection('actividades').insertOne(nuevaActividad);
        res.status(201).json({ _id: result.insertedId, ...nuevaActividad });
    } catch (error) {
        console.error('Error al crear actividad:', error);
        res.status(500).json({ message: 'Error al crear la actividad' });
    }
});

// Editar una actividad por id
app.put('/actividades/editar/:id', async (req, res) => {
    const { id } = req.params;
    const {
        nombreActividad,
        fechaInicio,
        fechaFin,
        importancia,
        urgencia,
        cuadrante,
        descripcion,
        estado,
        dificultad
    } = req.body;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de actividad inválido' });
    }

    const camposPermitidos = {
        ...(nombreActividad && { nombreActividad }),
        ...(fechaInicio && { fechaInicio }),
        ...(fechaFin && { fechaFin }),
        ...(importancia && { importancia }),
        ...(urgencia && { urgencia }),
        ...(cuadrante && { cuadrante }),
        ...(descripcion && { descripcion }),
        ...(estado && { estado }),
        ...(dificultad !== undefined && { dificultad }),
    };

    if (Object.keys(camposPermitidos).length === 0) {
        return res.status(400).json({ message: "No se enviaron campos válidos para actualizar." });
    }

    try {
        const db = getDb();

        console.log("Intentando encontrar actividad con ID:", id);
        const actividadExistente = await db.collection('actividades').findOne({ _id: new ObjectId(id) });
        console.log("Resultado de búsqueda previa a la actualización:", actividadExistente);

        if (!actividadExistente) {
            return res.status(404).json({ message: "Actividad no encontrada antes de actualizar." });
        }

        console.log("Intentando actualizar actividad con los campos:", camposPermitidos);
        const result = await db.collection('actividades').findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: camposPermitidos },
            { returnDocument: 'after' } // Cambia esto a `returnNewDocument: true` si lo necesitas
        );

        console.log("Detalles completos de result:", result);

        // Verifica si result tiene un valor o es el documento actualizado directamente
        if (result && result.value) {
            console.log("Actualización exitosa:", result.value);
            return res.status(200).json(result.value);
        }

        // Si no se encuentra el documento después de la actualización, lo buscamos explícitamente
        const actividadActualizada = await db.collection('actividades').findOne({ _id: new ObjectId(id) });

        if (actividadActualizada) {
            console.log("Actividad actualizada (verificada con findOne):", actividadActualizada);
            return res.status(200).json(actividadActualizada);
        }

        return res.status(404).json({ message: "Actividad no encontrada después de actualizar." });

    } catch (error) {
        console.error("Error al actualizar actividad:", error);
        res.status(500).json({ message: "Error al actualizar la actividad" });
    }
});

// Eliminar una actividad por id
app.delete('/actividades/eliminar/:id', async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de actividad inválido' });
    }
    try {
        const db = getDb();
        const result = await db.collection('actividades').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Actividad eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Actividad no encontrada' });
        }
    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({ message: 'Error al eliminar la actividad' });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT_ACTIVIDADES || 3003; 
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log('Servidor de Actividades corriendo en el puerto:', PORT);
    });
}).catch(error => {
    console.error('No se pudo iniciar el servidor de Actividades:', error);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Hubo un problema en el servidor. Inténtalo más tarde.' });
});

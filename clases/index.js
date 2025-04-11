const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const app = express();
app.use(express.json());
app.use(cors());
require('dotenv').config({ path: '../gateway/.env' });
const { connectToMongo, getDb } = require('./config/db');

<<<<<<< HEAD
const { 
    validarUsuario, 
    validarClase, 
    validarClaseDatos,
    isValidObjectId 
} = require('./middlewares/validacionClases');


// Obtener todas las clases de un usuario
app.get('/clases/:usuarioId', validarUsuario, async (req, res) => {
    const { usuarioId } = req.params;

    try {
        const db = getDb();
        const usuario = await db.collection('clases').findOne({ 
            _id: new ObjectId(usuarioId) 
        });

        res.status(200).json(usuario?.clases || []);
    } catch (error) {
        console.error('Error al obtener clases:', error);
        res.status(500).json({ message: 'Error al obtener las clases' });
    }
});

app.post('/clases/agregar', validarUsuario, validarClaseDatos, async (req, res) => {
    const { materia, horario, fechaInicio, fechaFin, usuarioId } = req.body;

    try {
        const db = getDb();
        
        const nuevaClase = {
            _id: new ObjectId(), // Generamos un nuevo ID para la clase
            materia,
            horario,
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
            creadoEn: new Date(),
            actualizadoEn: new Date()
        };

        const result = await db.collection('clases').updateOne(
            { _id: new ObjectId(usuarioId) },
            { 
                $push: { 
                    clases: nuevaClase 
                } 
            },
            { upsert: true }
        );

        res.status(201).json({ 
            message: 'Clase agregada correctamente',
            clase: nuevaClase,
            usuarioId
        });
    } catch (error) {
        console.error('Error al agregar clase:', error);
        res.status(500).json({ message: 'Error al agregar la clase' });
    }
});

// Eliminar una clase específica
app.delete('/clases/eliminar/:usuarioId/:claseId', validarUsuario, validarClase, async (req, res) => {
    const { usuarioId, claseId } = req.params;

    try {
        const db = getDb();
        const result = await db.collection('clases').updateOne(
            { _id: new ObjectId(usuarioId) },
            { 
                $pull: { 
                    clases: { _id: new ObjectId(claseId) } 
                } 
            }
        );

        res.status(200).json({ 
            message: 'Clase eliminada correctamente',
            claseId
        });
    } catch (error) {
        console.error('Error al eliminar clase:', error);
        res.status(500).json({ message: 'Error al eliminar la clase' });
    }
});

// Actualizar una clase específica
app.put('/clases/actualizar/:usuarioId/:claseId', validarUsuario, validarClase, validarClaseDatos, async (req, res) => {
    const { usuarioId, claseId } = req.params;
    const { materia, horario, fechaInicio, fechaFin } = req.body;

    try {
        const db = getDb();
        
        const actualizacion = {
            $set: {
                'clases.$[elem].materia': materia,
                'clases.$[elem].horario': horario,
                'clases.$[elem].fechaInicio': new Date(fechaInicio),
                'clases.$[elem].fechaFin': new Date(fechaFin),
                'clases.$[elem].actualizadoEn': new Date()
            }
        };

        const result = await db.collection('clases').updateOne(
            { 
                _id: new ObjectId(usuarioId),
                'clases._id': new ObjectId(claseId)
            },
            actualizacion,
            { 
                arrayFilters: [{ 'elem._id': new ObjectId(claseId) }]
            }
        );

        res.status(200).json({ 
            message: 'Clase actualizada correctamente',
            claseId,
            materia,
            horario
        });
    } catch (error) {
        console.error('Error al actualizar clase:', error);
        res.status(500).json({ message: 'Error al actualizar la clase' });
=======
// Función para validar ObjectId
function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

// Obtener una actividad por id
app.get('/clases/:id', async (req, res) => {
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
>>>>>>> b47b9989c6b38067b4cfafec141c20be63e510b3
    }
});

// Iniciar el servidor
<<<<<<< HEAD
const PORT = process.env.PORT_CLASES || 3007;
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log('Servicio de Clases corriendo en puerto:', PORT);
    });
}).catch(error => {
    console.error('No se pudo iniciar el servicio de Clases:', error);
=======
const PORT = process.env.PORT_CLASES || 3007; 
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log('Servidor de Clases corriendo en el puerto:', PORT);
    });
}).catch(error => {
    console.error('No se pudo iniciar el servidor de Clases:', error);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Hubo un problema en el servidor. Inténtalo más tarde.' });
>>>>>>> b47b9989c6b38067b4cfafec141c20be63e510b3
});
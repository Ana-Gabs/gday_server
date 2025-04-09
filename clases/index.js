const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const app = express();
app.use(express.json());
app.use(cors());
require('dotenv').config({ path: '../gateway/.env' });
const { connectToMongo, getDb } = require('./config/db');

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
    }
});

// Iniciar el servidor
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
});
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
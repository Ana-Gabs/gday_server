const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');


async function existeUsuario(usuarioId) {
    const db = getDb();
    try {
        const count = await db.collection('usuarios').countDocuments({ 
            _id: new ObjectId(usuarioId) 
        });
        return count > 0;
    } catch (error) {
        console.error('Error al verificar usuario:', error);
        return false;
    }
}
// Verifica si una clase existe para un usuario
async function existeClase(usuarioId, claseId) {
    const db = getDb();
    const count = await db.collection('clases').countDocuments({
        _id: new ObjectId(usuarioId),
        'clases._id': new ObjectId(claseId)
    });
    return count > 0;
}

// Valida formato de ObjectId
function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

// Valida formato de fecha
function isValidDate(dateString) {
    return !isNaN(Date.parse(dateString));
}

// Middleware para validar usuario
async function validarUsuario(req, res, next) {
    const usuarioId = req.params.usuarioId || req.body.usuarioId;
    
    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    if (!await existeUsuario(usuarioId)) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    next();
}

// Middleware para validar existencia de clase
async function validarClase(req, res, next) {
    const { claseId } = req.params;
    const usuarioId = req.params.usuarioId || req.body.usuarioId;
    
    if (!isValidObjectId(claseId)) {
        return res.status(400).json({ message: 'ID de clase inválido' });
    }

    if (!await existeClase(usuarioId, claseId)) {
        return res.status(404).json({ message: 'Clase no encontrada para este usuario' });
    }

    next();
}

// Middleware para validar datos de clase
function validarClaseDatos(req, res, next) {
    const { materia, horario, fechaInicio, fechaFin } = req.body;
    
    if (!materia || !horario || !fechaInicio || !fechaFin) {
        return res.status(400).json({ 
            message: 'Faltan campos requeridos: materia, horario, fechaInicio, fechaFin' 
        });
    }

    if (!isValidDate(fechaInicio) || !isValidDate(fechaFin)) {
        return res.status(400).json({ message: 'Formato de fecha inválido' });
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
        return res.status(400).json({ 
            message: 'La fecha de fin no puede ser anterior a la fecha de inicio' 
        });
    }

    if (typeof horario !== 'object' || Object.keys(horario).length === 0) {
        return res.status(400).json({ 
            message: 'El horario debe ser un objeto con los días y horarios' 
        });
    }

    next();
}

module.exports = {
    isValidObjectId,
    validarUsuario,
    validarClase,
    validarClaseDatos
};
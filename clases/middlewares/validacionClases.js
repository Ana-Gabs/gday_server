const { ObjectId } = require('mongodb');

function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

function validarFecha(fecha) {
    return !isNaN(Date.parse(fecha));
}

function validarClase(req, res, next) {
    const { materia, horario, fechaInicio, fechaFin, usuarioId } = req.body;
    
    if (!materia || !horario || !fechaInicio || !fechaFin || !usuarioId) {
        return res.status(400).json({ message: 'Faltan datos necesarios: materia, horario, fechaInicio, fechaFin, usuarioId' });
    }

    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    if (!validarFecha(fechaInicio) || !validarFecha(fechaFin)) {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use formato ISO (YYYY-MM-DD)' });
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
        return res.status(400).json({ message: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
    }

    if (typeof horario !== 'object' || Object.keys(horario).length === 0) {
        return res.status(400).json({ message: 'El horario debe ser un objeto con días y horas' });
    }

    next();
}

module.exports = { validarClase, isValidObjectId, validarFecha };
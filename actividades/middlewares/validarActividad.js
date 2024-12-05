const { ObjectId } = require('mongodb');

// Función para validar ObjectId
function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

// Middleware para validar los datos de la actividad
function validarActividad(req, res, next) {
    const { nombreActividad, descripcion, fechaInicio, fechaFin, estado, usuarioId, importancia, urgencia, cuadrante, dificultad } = req.body;
    
    // Verificar que todos los campos necesarios estén presentes
    if (!nombreActividad || !descripcion || !fechaInicio || !fechaFin || !estado || !usuarioId || !importancia || !urgencia || !cuadrante || dificultad === undefined) {
        return res.status(400).json({ message: 'Faltan datos necesarios para crear o actualizar la actividad.' });
    }

    // Validar ObjectId de usuario
    if (!isValidObjectId(usuarioId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    // Verificar que el estado sea válido
    const estadosValidos = ['Pendiente', 'En progreso', 'Completada'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ message: 'Estado no válido. Los valores permitidos son: Pendiente, En progreso, Completada.' });
    }

    // Verificar que la importancia y urgencia sean válidas
    const importanciasValidas = ['Alta', 'Media', 'Baja'];
    const urgenciasValidas = ['Alta', 'Media', 'Baja'];
    if (!importanciasValidas.includes(importancia)) {
        return res.status(400).json({ message: 'Importancia no válida. Los valores permitidos son: Alta, Media, Baja.' });
    }
    if (!urgenciasValidas.includes(urgencia)) {
        return res.status(400).json({ message: 'Urgencia no válida. Los valores permitidos son: Alta, Media, Baja.' });
    }

    // Verificar que el cuadrante sea válido
    const cuadrantesValidos = ['I', 'II', 'III', 'IV'];
    if (cuadrante && !cuadrantesValidos.includes(cuadrante)) {
        return res.status(400).json({ message: 'Cuadrante no válido. Los valores permitidos son: I, II, III, IV.' });
    }

    // Validar y mantener dificultad como número entero
    if (dificultad !== undefined && dificultad !== '') {
        const dificultadNum = parseInt(dificultad, 10);
        if (isNaN(dificultadNum) || dificultadNum < 1 || dificultadNum > 5) {
            return res.status(400).json({ message: 'La dificultad debe ser un número entre 1 y 5.' });
        }
        req.body.dificultad = dificultadNum; 
    } else {
        return res.status(400).json({ message: 'El campo "dificultad" es obligatorio.' });
    }

    // Validar fechas: la fecha de fin no puede ser anterior a la fecha de inicio
    if (new Date(fechaFin) < new Date(fechaInicio)) {
        return res.status(400).json({ message: 'La fecha de finalización no puede ser anterior a la fecha de inicio.' });
    }

    next();
}

module.exports = validarActividad;

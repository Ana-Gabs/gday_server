// middleware/validarNotificacion.js
function validarNotificacion(req, res, next) {
    const { mensaje, usuarioId, actividadId } = req.body;
    
    if (!mensaje || !usuarioId || !actividadId) {
        return res.status(400).json({ message: 'Faltan datos requeridos' });
    }
    
    // Verificar si los ObjectIds son válidos
    if (!isValidObjectId(usuarioId) || !isValidObjectId(actividadId)) {
        return res.status(400).json({ message: 'ID de usuario o actividad inválido' });
    }
    
    next();
}

module.exports = validarNotificacion;

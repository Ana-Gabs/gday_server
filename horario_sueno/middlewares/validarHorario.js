const { ObjectId } = require('mongodb');

function validarHorario(req, res, next) {
  const { horaAcostarse, horaDespertar, dias } = req.body;
  
  // Validar formato de horas
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(horaAcostarse) || !timeRegex.test(horaDespertar)) {
    return res.status(400).json({ message: 'Formato de hora inválido. Use HH:MM' });
  }
  
  // Validar días
  const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  if (!Array.isArray(dias)) {
    return res.status(400).json({ message: 'Los días deben ser un array' });
  }
  
  for (const dia of dias) {
    if (!diasValidos.includes(dia)) {
      return res.status(400).json({ message: `Día inválido: ${dia}` });
    }
  }
  
  next();
}

module.exports = validarHorario;
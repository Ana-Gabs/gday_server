require('dotenv').config({path:'../gateway/.env'});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();
app.use(cors()); // Habilitar CORS para tu frontend
app.use(express.json()); 
const helmet = require('helmet');

app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://code.jquery.com"],
      styleSrc: [
        "'self'",
        "https://stackpath.bootstrapcdn.com",
        "https://fonts.googleapis.com",
        "https://www.gstatic.com"
      ],
      styleSrcElem: [
        "'self'",
        "https://www.gstatic.com"
      ],
      imgSrc: ["'self'", "https://images.com"],
      connectSrc: ["'self'", "https://api.com"],
    },
  })
);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

  const SuscripcionSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tipoSuscripcion: { type: String, required: true },
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    activa: { type: Boolean, required: true },
});
const Suscripcion = mongoose.model('Suscripcion', SuscripcionSchema);

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  app: { type: String, required: true },
  apm: { type: String, required: true },
  telefono: { type: String, required: true },
  correo: { type: String, required: true },
  contrasena: { type: String, required: true },
  tipo: { type: String, default: '1' },
  fechaRegistro: { type: Date, default: Date.now },
  verificado: { type: Boolean, default: false }, // Estado de verificación
  verificationToken: String,                     // Token de verificación
  tokenExpiracion: Date
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

//////////////////Suscripcion/////////////////////////////////////
app.post('/subscripciones/suscripciones', async (req, res) => {
  try {
      console.log('Datos recibidos:', req.body);

      const { usuarioId, tipoSuscripcion, fechaInicio, fechaFin, activa } = req.body;

      if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
          return res.status(400).json({ error: 'El usuarioId no es válido.' });
      }

      const nuevaSuscripcion = new Suscripcion({
          usuarioId,
          tipoSuscripcion,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          activa,
      });

      const resultado = await nuevaSuscripcion.save();
      console.log('Suscripción guardada:', resultado);

      res.status(201).json({ message: 'Suscripción registrada exitosamente.', data: resultado });
  } catch (error) {
      console.error('Error al guardar la suscripción:', error.message);
      res.status(500).json({ error: 'Error interno del servidor.', detalle: error.message });
  }
});

app.get('/subscripciones/suscripcion/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ error: 'El usuarioId no es válido.' });
    }
    const suscripcion = await Suscripcion.findOne({
      usuarioId: new mongoose.Types.ObjectId(usuarioId), // Asegúrate de convertirlo
      activa: true,
      fechaFin: { $gte: new Date() },
    });
    if (suscripcion) {
      const usuario = await Usuario.findById(suscripcion.usuarioId);
      let costo = 0;
      if (suscripcion.tipoSuscripcion === 'Premium') {
        costo = 500; 
      }
      return res.json({
        suscrito: true,
        tipoSuscripcion: suscripcion.tipoSuscripcion,
        costo: costo,
        fechaInicio: suscripcion.fechaInicio,
        fechaFin: suscripcion.fechaFin,
        nombre: usuario ? `${usuario.nombre} ${usuario.app} ${usuario.apm}` : 'Usuario no encontrado',
      });
    }
    res.json({ suscrito: false });
  } catch (error) {
    console.error('Error al verificar la suscripción:', error.message);
    res.status(500).json({ error: 'Error al verificar la suscripción' });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/subscripciones/enviar-correo-suscripcion', async (req, res) => {
  const { usuarioId } = req.body;

  if (!usuarioId) {
    return res.status(400).json({ mensaje: 'Usuario no identificado.' });
  }

  try {
    // Buscar al usuario en la base de datos
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario || !usuario.correo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado o correo no disponible.' });
    }

    // Configurar el transporte de correo
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'gdayg123@gmail.com',
        pass: 'ieodfoiqabigfbjq', // Usa variables de entorno para proteger estas credenciales
      },
    });

    // Enviar el correo
    await transporter.sendMail({
      from: 'gdayg123@gmail.com',
      to: usuario.correo, // Usa el correo recuperado
      subject: 'Bienvenido a G-Day',
      text: 'Bienvenido ${usuario.nombre},\n\nUsted acaba de suscribirse a G-Day por el periodo de un año. Gracias por unirse.',
    });

    res.json({ mensaje: 'Correo enviado con éxito.' });
  } catch (error) {
    console.error('Error al enviar correo:', error.message);
    res.status(500).json({ mensaje: 'Error al enviar el correo.', error: error.message });
  }
});

const PORT = process.env.PORT_SUBSCRIPCIONES || 3006;
app.listen(PORT, () => {
  console.log(`Servidor de suscripciones corriendo en el puerto ${PORT}`);
});

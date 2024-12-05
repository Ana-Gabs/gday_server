{/*require('dotenv').config({ path: '../gateway/.env' });*/}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({
  allowedHeaders: 'Content-Type, Authorization'
}));
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

app.get('/usuario/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID de usuario inválido.' });
  }

  try {
    const usuario = await Usuario.findById(id);  // Buscar usuario en la base de datos
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const { contrasena, ...datosUsuario } = usuario.toObject();  // Excluir contraseña de la respuesta
    return res.status(200).json(datosUsuario);  // Responder con los datos del usuario
  } catch (error) {
    console.error('Error obteniendo el usuario por ID:', error);
    return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
});


app.put('/usuario/actualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, app, apm, correo, telefono } = req.body; // Agregar teléfono
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID de usuario inválido.' });
  }
  try {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      {
        nombre,
        app,
        apm,
        correo,
        telefono, // Actualizar el campo teléfono
      },
      { new: true }
    );

    if (usuarioActualizado) {
      const { contrasena, ...datosUsuario } = usuarioActualizado.toObject();
      res.json(datosUsuario);
    } else {
      res.status(404).json({ message: 'Usuario no encontrado.' });
    }
  } catch (error) {
    console.error('Error actualizando el usuario:', error);
    res.status(500).json({ message: `Error actualizando el usuario: ${error.message}` });
  }
});

///////////////////////Inicio de sesion/////////////////////////////////////////

app.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  const hasConsecutiveNumbers = (password) => {
    for (let i = 0; i < password.length - 1; i++) {
      const currentChar = parseInt(password[i]);
      const nextChar = parseInt(password[i + 1]);

      if (!isNaN(currentChar) && !isNaN(nextChar) && nextChar === currentChar + 1) {
        return true;
      }
    }
    return false;
  };


  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



  try {
    // Validar el formato del correo
    if (!correoRegex.test(correo)) {
      return res.status(400).json({ message: 'El formato del correo es inválido.' });
    }

    // Validar el formato de la contraseña
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.',
      });
    }

    if (hasConsecutiveNumbers(password)) {
      return res.status(400).json({
        message: 'La contraseña no debe contener números consecutivos.',
      });
    }



    // Buscar usuario por correo
    const usuario = await Usuario.findOne({ correo: correo });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Comparar la contraseña ingresada con la encriptada en la base de datos
    const isPasswordValid = await bcrypt.compare(password, usuario.contrasena);



    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }


    // Validar el tipo de usuario
    if (usuario.tipo !== '1') {
      return res.status(403).json({ message: 'Acceso denegado. Tipo de usuario no autorizado.' });
    }

    if (usuario.sesion_activa) {
      return res.status(403).json({ message: 'La sesión ya está activa en otro dispositivo.' });
    }

    // Activar la sesión
    usuario.sesion_activa = true;
    await usuario.save();


    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      tipo: usuario.tipo,
      nombre: usuario.nombre,
      id_us: usuario._id,
    });
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

/////////////////////////Recuperar contraseña/////////////////////
///Mika1l2l/////

app.post('/solicitar-recuperacion', async (req, res) => {
  const { correo } = req.body;

  const correoRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!correo || !correoRegex.test(correo)) {
    return res.status(400).json({ mensaje: 'Correo inválido.' });
  }

  try {
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // Usamos process.env.JWT_SECRET directamente
    const token = jwt.sign({ userId: usuario._id, type: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'gdayg123@gmail.com',
        pass: 'ieodfoiqabigfbjq',
      },
    });

    const url = `http://localhost:3000/restablecer/${token}`;
    await transporter.sendMail({
      from: 'gdayg123@gmail.com',
      to: correo,
      subject: 'Recuperación de contraseña',
      text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${url}`,
    });

    res.json({ mensaje: 'Enlace de recuperación enviado a tu correo.' });
  } catch (error) {
    console.error('Error al enviar correo:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
  }
});

const secretKey = process.env.JWT_SECRET;

app.post('/restablecer', async (req, res) => {
  console.log('Authorization:', req.headers.authorization); // Esto es para depurar y ver si el token llega correctamente
  const token = req.headers.authorization?.split(' ')[1]; // Extraemos el token de la cabecera

  if (!token) {
    return res.status(400).json({ mensaje: 'Token no proporcionado o inválido.' });
  }

  try {
    const decoded = jwt.verify(token, secretKey); // Verificamos el token
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ mensaje: 'Token inválido.' });
    }

    const { nuevaContrasena } = req.body;
    if (!nuevaContrasena || nuevaContrasena.length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const hashedPassword = bcrypt.hashSync(nuevaContrasena, 10); // Encriptamos la nueva contraseña
    const user = await Usuario.findByIdAndUpdate(decoded.userId, { contrasena: hashedPassword });

    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    res.json({ mensaje: 'Contraseña restablecida con éxito.' });
  } catch (error) {
    console.error('Error al procesar el token:', error.message);
    res.status(400).json({ mensaje: 'Token inválido o expirado.', error: error.message });
  }
});

///////////////////////////////////Registro////////////////////////

const crypto = require('crypto');
const bcrypt = require('bcrypt'); // Importa bcrypt
const path = require('path');
const SALT_ROUNDS = 10;

const hasConsecutiveNumbers = (password) => {
  for (let i = 0; i < password.length - 1; i++) {
    const currentChar = parseInt(password[i]);
    const nextChar = parseInt(password[i + 1]);

    if (!isNaN(currentChar) && !isNaN(nextChar) && nextChar === currentChar + 1) {
      return true;
    }
  }

  return false;
};

app.post('/register', async (req, res) => {
  const { nombre, app, apm, telefono, correo, password } = req.body;

  // Validaciones
  const telefonoRegex = /^\d{10}$/;
  if (!telefonoRegex.test(telefono)) {
    return res.status(400).json({ message: 'El teléfono debe tener 10 dígitos.' });
  }

  const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correoRegex.test(correo)) {
    return res.status(400).json({ message: 'El correo debe contener un "@" y un dominio válido.' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.' });
  }

  try {
    const usuarioExistente = await Usuario.findOne({
      $or: [{ correo }, { telefono }]
    });

    if (usuarioExistente) {
      return res.status(409).json({ message: 'El usuario ya está registrado con este correo o teléfono.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(16).toString("hex");
    const tokenExpiracion = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const nuevoUsuario = new Usuario({
      nombre,
      app,
      apm,
      telefono,
      correo,
      contrasena: hashedPassword,
      tipo: '1',
      verificado: false,
      verificationToken,
      tokenExpiracion,
      fechaRegistro: new Date()
    });

    await nuevoUsuario.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'gdayg123@gmail.com',
        pass: 'ieodfoiqabigfbjq',
      }
    });

    const mailOptions = {
      from: 'gdayg123@gmail.com',
      to: correo,
      subject: 'Verificación de correo',
      text: `Haz clic en el siguiente enlace para verificar tu correo: http://localhost:3000/verificar/${verificationToken}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error al enviar el correo:', error);
        return res.status(500).json({ message: 'Error al enviar el correo de verificación.' });
      }
      console.log(`Correo enviado: ${info.response}`);
      res.status(200).json({ message: 'Registro exitoso. Correo de verificación enviado.' });
    });

  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    res.status(500).json({ message: 'Error al registrar el usuario.' });
  }
});

app.get('/verificar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log("Token recibido en el backend:", token);

    const usuario = await Usuario.findOne({ verificationToken: token });

    if (!usuario) {
      console.log("Token no encontrado en la base de datos:", token);
      return res.status(400).json({ message: 'Token inválido o no encontrado.' });
    }

    console.log("Usuario encontrado:", usuario);

    const now = new Date();
    if (usuario.tokenExpiracion < now) {
      return res.status(400).json({ message: 'El token ha expirado. Solicita uno nuevo.' });
    }

    usuario.verificado = true;
    usuario.verificationToken = null;
    usuario.tokenExpiracion = null;

    await usuario.save();

    res.status(200).json({ message: 'Correo verificado exitosamente. Ahora puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al verificar el token:', error);
    res.status(500).json({ message: 'Error al verificar el correo. Inténtalo de nuevo.' });
  }
});

app.post('/solicitar-verificacion', async (req, res) => {
  const { correo } = req.body;
  try {
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Correo electrónico no encontrado.' });
    }
    // Si ya está verificado
    if (usuario.verificado) {
      return res.status(400).json({ mensaje: 'El correo ya está verificado.' });
    }
    usuario.verificationToken = crypto.randomBytes(16).toString('hex');
    usuario.tokenExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await usuario.save();

    console.log(`Correo de verificación enviado a ${correo} con token: ${usuario.verificationToken}`);
    res.status(200).json({ mensaje: 'Correo de verificación enviado.', success: true });
  } catch (err) {
    console.error('Error al enviar el correo de verificación:', err);
    res.status(500).json({ mensaje: 'Hubo un error al enviar el correo. Intenta más tarde.' });
  }
});

// Función para generar un token
function generarToken() {
  return crypto.randomBytes(16).toString('hex');
}

const PORT = process.env.PORT_USUARIOS || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

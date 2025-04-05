// ./gateway/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { spawn } = require('child_process');
const cors = require('cors');
const app = express();
app.use(cors()); 
app.use(express.json()); 


function startMicroservice(name, scriptPath) {
  console.log(`Iniciando ${name}...`);
  const service = spawn('node', [scriptPath]);

  service.stdout.on('data', (data) => {
    console.log(`[${name}] ${data}`);
  });

  service.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data}`);
  });

  service.on('close', (code) => {
    console.log(`[${name}] Proceso finalizó con código ${code}`);
  });

  return service;
}

// Inicia todos los microservicios
const microservices = [
  { name: 'Usuarios', path: '../usuarios/index.js' },
  { name: 'Actividades', path: '../actividades/index.js' },
  { name: 'Notificaciones', path: '../notificaciones/index.js' },
  { name: 'Reportes', path: '../reportes/index.js' },
  { name: 'Suscripciones', path: '../suscripciones/index.js' },
  { name: 'Clases', path: '../clases/index.js' }
];

microservices.forEach((service) =>
  startMicroservice(service.name, service.path)
);

// Rutas del Gateway
app.use('/usuarios', async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${process.env.USUARIOS_SERVICE_URL}${req.path}`,
      data: req.body,
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || 'Error en el Gateway');
  }
});

app.use('/actividades', async (req, res) => {
    try {
      const targetURL = `${process.env.ACTIVIDADES_SERVICE_URL}${req.originalUrl}`;
      console.log(`Reenviando solicitud a: ${targetURL}`);
      const response = await axios({
        method: req.method,
        url: targetURL,
        data: req.body,
        params: req.query,
      });
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error al reenviar solicitud:', error.message);
      res.status(error.response?.status || 500).json(error.response?.data || 'Error en el Gateway');
    }
  });

  app.use('/subscripciones', async (req, res) => {
    try {
      const targetURL = `${process.env.SUBSCRIPCIONES_SERVICE_URL}${req.originalUrl}`;
      console.log(`Reenviando solicitud a: ${targetURL}`);
      const response = await axios({
        method: req.method,
        url: targetURL,
        data: req.body,
        params: req.query,
      });
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error al reenviar solicitud:', error.message);
      res.status(error.response?.status || 500).json(error.response?.data || 'Error en el Gateway');
    }
  });

  app.use('/reportes', async (req, res) => {
    try {
      const targetURL = `${process.env.REPORTES_SERVICE_URL}${req.originalUrl}`;
      console.log(`Reenviando solicitud a: ${targetURL}`);
      const response = await axios({
        method: req.method,
        url: targetURL,
        data: req.body,
        params: req.query,
      });
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error al reenviar solicitud:', error.message);
      res.status(error.response?.status || 500).json(error.response?.data || 'Error en el Gateway');
    }
  });

  app.use('/notificaciones', async (req, res) => {
    try {
      const targetURL = `${process.env.NOTIFICACIONES_SERVICE_URL}${req.originalUrl}`;
      console.log(`Reenviando solicitud a: ${targetURL}`);
      const response = await axios({
        method: req.method,
        url: targetURL,
        data: req.body,
        params: req.query,
      });
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Error al reenviar solicitud:', error.message);
      res.status(error.response?.status || 500).json(error.response?.data || 'Error en el Gateway');
    }
  });
  
  app.use('/clases', async (req, res) => {
    try {
      const response = await axios({
        method: req.method,
        url: `${process.env.CLASES_SERVICE_URL}${req.originalUrl}`,
        data: req.body,
        params: req.query,
      });
      res.status(response.status).json(response.data);
    } catch (error) {
      res.status(error.response?.status || 500).json(error.response?.data || 'Error en el Gateway');
    }
  });
// Puerto del Gateway
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor gateway corriendo en el puerto ${PORT}`);
});

require('dotenv').config({ path: '../gateway/.env' });
const express = require('express');
const { connectToMongo, getDb } = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const moment = require('moment');
const cron = require('node-cron');
const { ObjectId } = require('mongodb');
const chartJS = require('chart.js');
const { createCanvas } = require('canvas');
const app = express();


app.use(cors());
app.use(express.json());
app.use(helmet());

// Cron para generar reportes semanales (Domingos a las 00:00)
cron.schedule('21 21 * * 0', async () => {
  console.log('[CRON] Generando reportes semanales...');

  const db = getDb();

  // Convierte las fechas a formato ISO como cadena
  const inicioSemana = moment().startOf('isoWeek').toISOString();  // Lunes en formato ISO
  const finSemana = moment().endOf('isoWeek').toISOString();      // Domingo en formato ISO
  const semana = moment().format('YYYY-[W]WW');

  try {
    const usuarios = await db.collection('usuarios').find().toArray();
    console.log(`[CRON] Usuarios encontrados: ${usuarios.length}`);

    for (const usuario of usuarios) {
      console.log(`[CRON] Procesando usuario: ${usuario._id} - ${usuario.nombre || 'Sin nombre'}`);

      console.log("Rango evaluado:", inicioSemana, finSemana);

      // Agregación de actividades filtradas por usuario y rango de fechas
      const actividadesPorCuadrante = await db.collection('actividades').aggregate([
        {
          $match: {
            usuarioId: new ObjectId(usuario._id),
            fechaFin: {
              '$gte': inicioSemana,
              '$lte': finSemana
            }
          }
        },
        {
          $group: {
            _id: "$cuadrante",  // Agrupar por cuadrante
            totalActividades: { $sum: 1 }  // Contar el número de actividades por cuadrante
          }
        }
      ]).toArray();

      console.log("[CRON] Actividades por cuadrante:", actividadesPorCuadrante);

      // Contar las terminadas
      const actividades = await db.collection('actividades').find({
        usuarioId: usuario._id,
        fechaFin: { $gte: inicioSemana, $lte: finSemana }
      }).toArray();

      const total = actividades.length;
      const terminadas = actividades.filter(a => a.estado === 'Terminada').length;
      const Nocompletadas = total - terminadas;
      // Calcular el promedio de dificultad, asignar 0 si no hay actividades
      const dificultadProm = total > 0 ? actividades.reduce((sum, a) => sum + (a.dificultad || 0), 0) / total : 0;

      const tiempoTotal = actividades.reduce((sum, a) => {
        const start = new Date(a.fechaInicio);
        const end = new Date(a.fechaFin);
        return sum + ((end - start) / 60000);  // en minutos
      }, 0);

      // Inicializar cuadrantes
      const cuadrantes = { I: 0, II: 0, III: 0, IV: 0 };

      // Asignar los resultados de la agregación al contador de cuadrantes
      actividadesPorCuadrante.forEach(item => {
        if (cuadrantes[item._id] !== undefined) {
          cuadrantes[item._id] = item.totalActividades;
        }
      });

      console.log('[CRON] Cuadrantes:', cuadrantes);

      // Insertar reporte en la colección "reportes"
      await db.collection('reportes').insertOne({
        usuarioId: String(usuario._id), // Asegura que el usuarioId es un string
        semana: String(semana), // Convierte la semana en un string
        actividadesTotales: String(total), // Convierte el total a string
        actividadesTerminadas: String(terminadas), // Convierte el número de actividades terminadas a string
        actividadesNoTerminadas: String(Nocompletadas), // Convierte el número de actividades no terminadas a string
        promedioDificultad: String(parseFloat(dificultadProm.toFixed(2))), // Convierte el promedio de dificultad a string
        tiempoTotal: String(Math.round(tiempoTotal)), // Convierte el tiempo total a string
        cuadrantes: {
          I: String(cuadrantes.I),
          II: String(cuadrantes.II),
          III: String(cuadrantes.III),
          IV: String(cuadrantes.IV),
        },
        fechaCreacion: new Date().toISOString()  // Fecha de creación convertida a formato ISO como cadena
      });

      console.log(`[CRON] Reporte generado para el usuario ${usuario._id} (${usuario.nombre || 'Sin nombre'}) para la semana ${semana}`);
    }

    console.log('[CRON] Todos los reportes generados.');
  } catch (error) {
    console.error('[CRON] Error generando los reportes:', error);
  }
});

// Endpoint para obtener datos y generar gráfico de radar (de araña) de la dificultad promedio
app.get('/grafica/analisis-actividad/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const db = getDb();

  try {
    // Obtener los reportes del usuario
    const reportes = await db.collection('reportes').find({
      usuarioId: usuarioId,
    }).toArray();

    if (reportes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reportes para este usuario.' });
    }

    // Preparar los datos para la gráfica de radar
    const semanas = reportes.map((reporte) => reporte.semana);
    const dificultades = reportes.map((reporte) => parseFloat(reporte.promedioDificultad));

    // Calcular la tasa de cambio de la dificultad (dificultad en t+1 - dificultad en t)
    const tasaCambioDificultad = [];
    for (let i = 1; i < dificultades.length; i++) {
      tasaCambioDificultad.push(dificultades[i] - dificultades[i - 1]);
    }

    // Cálculo de la predicción para la próxima semana basado en la tasa de cambio promedio
    const tasaPromedio = tasaCambioDificultad.reduce((sum, valor) => sum + valor, 0) / tasaCambioDificultad.length;
    const prediccionDificultad = dificultades[dificultades.length - 1] + tasaPromedio;

    // Enviar los datos al frontend
    res.json({
      semanas,
      dificultades,
      tasaCambioDificultad,
      prediccionDificultad
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Hubo un problema al generar la gráfica.' });
  }
});

app.get('/grafica/cuadrantes-por-semana/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const db = getDb();

  try {
    const reportes = await db.collection('reportes').find({
      usuarioId: usuarioId
    }).sort({ semana: 1 }).toArray();

    if (reportes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reportes para este usuario.' });
    }

    const semanasUnicas = [];
    const cuadrantes = { I: [], II: [], III: [], IV: [] };

    for (const reporte of reportes) {
      if (!semanasUnicas.includes(reporte.semana)) {
        semanasUnicas.push(reporte.semana);
        cuadrantes.I.push(parseInt(reporte.cuadrantes.I));
        cuadrantes.II.push(parseInt(reporte.cuadrantes.II));
        cuadrantes.III.push(parseInt(reporte.cuadrantes.III));
        cuadrantes.IV.push(parseInt(reporte.cuadrantes.IV));
      }
    }

    res.json({
      semanas: semanasUnicas,
      cuadrantes
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los datos de cuadrantes por semana.' });
  }
});

app.get('/grafica/tiempo-por-semana/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const db = getDb();

  try {
    const reportes = await db.collection('reportes')
      .find({ usuarioId: usuarioId })
      .sort({ semana: 1 })
      .toArray();

    if (reportes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reportes para este usuario.' });
    }

    const semanasUnicas = [];
    const tiempos = [];

    for (const reporte of reportes) {
      if (!semanasUnicas.includes(reporte.semana)) {
        semanasUnicas.push(reporte.semana);
        tiempos.push(parseInt(reporte.tiempoTotal)); // tiempo en minutos
      }
    }

    res.json({
      semanas: semanasUnicas,
      tiempos
    });

  } catch (error) {
    console.error('[ERROR] Tiempo por semana:', error);
    res.status(500).json({ message: 'Error al obtener el tiempo por semana.' });
  }
});

app.get('/grafica/dificultad-por-semana/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const db = getDb();

  try {
    const reportes = await db.collection('reportes')
      .find({ usuarioId: usuarioId })
      .sort({ semana: 1 })
      .toArray();

    if (reportes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reportes para este usuario.' });
    }

    const semanas = [];
    const dificultades = [];

    // Evita semanas repetidas
    for (const r of reportes) {
      if (!semanas.includes(r.semana)) {
        semanas.push(r.semana);
        dificultades.push(parseFloat(r.promedioDificultad));
      }
    }

    // Calcular derivada discreta (tasa de cambio)
    const tasaCambio = [];
    for (let i = 0; i < dificultades.length - 1; i++) {
      const delta = dificultades[i + 1] - dificultades[i];
      tasaCambio.push(parseFloat(delta.toFixed(2)));
    }

    res.json({
      semanas,
      dificultades,
      tasaCambio
    });

  } catch (error) {
    console.error('[ERROR] Dificultad por semana:', error);
    res.status(500).json({ message: 'Error al obtener la dificultad por semana.' });
  }
});




// Iniciar el servidor
const PORT = process.env.PORT_REPORTES || 3005;
connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log('Servidor de Actividades corriendo en el puerto:', PORT);
  });
}).catch(error => {
  console.error('No se pudo iniciar el servidor de Actividades:', error);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Hubo un problema en el servidor. Inténtalo más tarde.' });
});

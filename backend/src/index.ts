import dotenv from 'dotenv'; dotenv.config({ override: true });
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDatabase, getDatabase, flushDatabase, reclassifyAllScenarios } from './database';
import { startModelCache } from './services/modelCache';
import { authMiddleware, loginHandler } from './middleware/auth';
import { ensureQueueTable, enqueueAllFiles, enqueueGlobalStages } from './queue';
import { startWorker } from './queueWorker';
import { logger } from './lib/logger';
import { startScannerCron, runScan } from './scanner';
import filesRouter from './routes/files';
import dashboardRouter from './routes/dashboard';
import documentsRouter from './routes/documents';
import graphRouter from './routes/graph';
import planRouter from './routes/plan';
import searchRouter from './routes/search';
import timelineRouter from './routes/timeline';
import reportsRouter from './routes/reports';
import operationalRouter from './routes/operational';
import consultRouter from './routes/consult';
import crisisRouter from './routes/crisis';
import healthRouter from './routes/health';
import annualReportRouter from './routes/annualReport';
import contactsRouter from './routes/contacts';
import generatorRouter from './routes/generator';
import simulatorRouter from './routes/simulator';
import settingsRouter from './routes/settings';
import structuredDataRouter from './routes/structuredData';
import knowledgeRouter from './routes/knowledge';
import metricsRouter from './routes/metrics';
import photosRouter from './routes/photos';
import queueRouter from './routes/queue';
import dataSourcesRouter from './routes/dataSources';
import importRouter from './routes/import';
import calendarRouter from './routes/calendar';
import advisorRouter from './routes/advisor';
import talkingPointsRouter from './routes/talkingPoints';
import scannerRouter from './routes/scanner';

const app = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(limiter);
app.get('/api/ping', (_req, res) => res.json({ ok: true, time: Date.now() }));
app.post('/api/auth/login', loginHandler);
app.use('/api', authMiddleware);

app.use(filesRouter);
app.use(dashboardRouter);
app.use(documentsRouter);
app.use(graphRouter);
app.use(planRouter);
app.use(searchRouter);
app.use(timelineRouter);
app.use(reportsRouter);
app.use(operationalRouter);
app.use(consultRouter);
app.use(crisisRouter);
app.use(healthRouter);
app.use(annualReportRouter);
app.use(contactsRouter);
app.use(generatorRouter);
app.use(simulatorRouter);
app.use(settingsRouter);
app.use(structuredDataRouter);
app.use(knowledgeRouter);
app.use(metricsRouter);
app.use(photosRouter);
app.use(queueRouter);
app.use(dataSourcesRouter);
app.use(importRouter);
app.use(calendarRouter);
app.use(advisorRouter);
app.use(talkingPointsRouter);
app.use(scannerRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack?.substring(0, 200) });
  res.status(500).json({ error: err.message || 'Erro interno' });
});

async function main() {
  await initDatabase();
  ensureQueueTable();

  // Auto-reclassify simulator scenarios on startup
  try {
    const reclassResult = reclassifyAllScenarios();
    if (reclassResult.updated > 0) {
      logger.info('Cenários do simulador reclassificados no startup', reclassResult);
    }
  } catch (e: any) {
    logger.warn('Falha ao reclassificar cenários', { error: e.message });
  }

  // Enfileira documentos não processados e estágios globais
  const total = enqueueAllFiles();
  if (total.total > 0) {
    enqueueGlobalStages();
    flushDatabase();
    logger.info(`Documentos enfileirados para processamento`, { count: total.total });
  }

  startModelCache();
  startWorker(5000);

  app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`Servidor rodando em http://0.0.0.0:${PORT} (rede)`);
  });

  // Inicia o cron job do scanner a cada 5 minutos
  startScannerCron(5 * 60 * 1000);

  // Executa o primeiro scan 5 segundos após ligar o servidor
  setTimeout(() => {
    runScan().catch(err => logger.error('Falha no escaneamento inicial', err));
  }, 5000);
}

main().catch((err) => logger.error('Falha ao iniciar servidor', err));

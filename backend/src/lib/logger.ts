import fs from 'fs';
import path from 'path';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_LOG_FILES = 7;

function getCurrentLogPath(): string {
  if (!fs.existsSync(LOG_DIR)) {
    try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
  }
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${date}.log`);
}

function rotateLogs(): void {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.log'))
      .map(f => ({ name: f, time: fs.statSync(path.join(LOG_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    while (files.length >= MAX_LOG_FILES) {
      const old = files.pop()!;
      fs.unlinkSync(path.join(LOG_DIR, old.name));
    }
  } catch {}
}

function serializeError(obj: any): any {
  if (obj instanceof Error) {
    return { message: obj.message, stack: obj.stack?.split('\n').slice(0, 3).join('|') };
  }
  return obj;
}

function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    const maxLen = level === 'error' ? 2000 : 500;
    const dataStr = typeof data === 'object' ? JSON.stringify(serializeError(data), null, 0).substring(0, maxLen) : String(data);
    return `${prefix} ${message} ${dataStr}`;
  }
  return `${prefix} ${message}`;
}

function writeLog(level: LogLevel, message: string, data?: any): void {
  try {
    const logPath = getCurrentLogPath();
    rotateLogs();
    const line = formatMessage(level, message, data);
    fs.appendFileSync(logPath, line + '\n', 'utf-8');
  } catch {
    // Silently ignore file write errors (no recursive logging)
  }
}

export const logger = {
  debug: (message: string, data?: any) => {
    if (LOG_LEVELS[CURRENT_LEVEL] > LOG_LEVELS.debug) return;
    const line = formatMessage('debug', message, data);
    console.debug(line);
    writeLog('debug', message, data);
  },
  info: (message: string, data?: any) => {
    if (LOG_LEVELS[CURRENT_LEVEL] > LOG_LEVELS.info) return;
    const line = formatMessage('info', message, data);
    console.log(line);
    writeLog('info', message, data);
  },
  warn: (message: string, data?: any) => {
    if (LOG_LEVELS[CURRENT_LEVEL] > LOG_LEVELS.warn) return;
    const line = formatMessage('warn', message, data);
    console.warn(line);
    writeLog('warn', message, data);
  },
  error: (message: string, data?: any) => {
    if (LOG_LEVELS[CURRENT_LEVEL] > LOG_LEVELS.error) return;
    const line = formatMessage('error', message, data);
    console.error(line);
    writeLog('error', message, data);
  },
};

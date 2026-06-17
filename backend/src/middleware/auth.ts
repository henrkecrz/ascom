import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const crypto = require('crypto');
  const secret = crypto.randomBytes(32).toString('hex');
  console.warn('[AVISO] JWT_SECRET não definido via env. Usando chave temporária gerada. Defina JWT_SECRET no .env');
  return secret;
})();

const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '24h';
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24h em segundos

const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
if (!MASTER_PASSWORD) {
  console.error('[CRÍTICO] MASTER_PASSWORD não definida via env. O servidor NÃO iniciará sem esta variável.');
}

interface AuthenticatedRequest extends Request {
  authenticated?: boolean;
}

interface JwtPayload {
  role: string;
  iat?: number;
  exp?: number;
}

function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY_SECONDS });
}

function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/settings/models',
  '/api/settings/test-model',
  '/api/health',
];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestPath = req.originalUrl || req.path;

  if (PUBLIC_ROUTES.some(r => requestPath.startsWith(r))) {
    return next();
  }


  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação necessário' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }

  (req as AuthenticatedRequest).authenticated = true;
  next();
}

export function loginHandler(req: Request, res: Response): void {
  const { password } = req.body;
  const masterPassword = process.env.MASTER_PASSWORD;

  if (!masterPassword) {
    res.status(500).json({ error: 'Sistema não configurado: MASTER_PASSWORD não definida' });
    return;
  }

  if (!password || password !== masterPassword) {
    res.status(401).json({ error: 'Senha incorreta' });
    return;
  }

  const token = signToken({ role: 'admin' });
  res.json({ token, expiresIn: TOKEN_EXPIRY });
}

export { AuthenticatedRequest, signToken };

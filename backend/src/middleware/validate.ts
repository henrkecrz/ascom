import { Request, Response, NextFunction } from 'express';

type ValidationRule = {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message?: string;
};

export function validateBody(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        res.status(400).json({ error: rule.message || `Campo '${rule.field}' é obrigatório` });
        return;
      }

      if (value === undefined || value === null) continue;

      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          res.status(400).json({ error: rule.message || `Campo '${rule.field}' deve ser um número` });
          return;
        }
        if (rule.min !== undefined && num < rule.min) {
          res.status(400).json({ error: rule.message || `Campo '${rule.field}' deve ser >= ${rule.min}` });
          return;
        }
        if (rule.max !== undefined && num > rule.max) {
          res.status(400).json({ error: rule.message || `Campo '${rule.field}' deve ser <= ${rule.max}` });
          return;
        }
      }

      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          res.status(400).json({ error: rule.message || `Campo '${rule.field}' deve ter no mínimo ${rule.min} caracteres` });
          return;
        }
        if (rule.max !== undefined && value.length > rule.max) {
          res.status(400).json({ error: rule.message || `Campo '${rule.field}' deve ter no máximo ${rule.max} caracteres` });
          return;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          res.status(400).json({ error: rule.message || `Campo '${rule.field}' contém caracteres inválidos` });
          return;
        }
      }

      if (rule.type === 'string' && typeof value !== 'string') {
        res.status(400).json({ error: rule.message || `Campo '${rule.field}' deve ser texto` });
        return;
      }
    }
    next();
  };
}

export function validateQueryParams(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const rule of rules) {
      const value = req.query[rule.field];

      if (rule.required && (value === undefined || value === '')) {
        res.status(400).json({ error: rule.message || `Parâmetro '${rule.field}' é obrigatório` });
        return;
      }

      if (value === undefined) continue;

      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          res.status(400).json({ error: rule.message || `Parâmetro '${rule.field}' deve ser um número` });
          return;
        }
      }

      if (rule.type === 'string' && rule.pattern && !rule.pattern.test(String(value))) {
        res.status(400).json({ error: rule.message || `Parâmetro '${rule.field}' contém caracteres inválidos` });
        return;
      }
    }
    next();
  };
}

export function sanitizePath(input: string): string {
  return input.replace(/[<>"'|?*;`$(){}\n\r]/g, '').trim();
}

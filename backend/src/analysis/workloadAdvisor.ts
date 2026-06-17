import { getDatabase } from '../database';
import { logger } from '../lib/logger';

export interface AdvisorRecommendation {
  type: 'priority' | 'warning' | 'insight' | 'tip';
  title: string;
  description: string;
  action?: string;
  icon: string;
  priority: number;
  targetMonth?: string;
  targetYear?: number;
}

export interface WorkloadSummary {
  totalDocuments: number;
  extracted: number;
  remaining: number;
  daysWithDocs: number;
  daysChecked: number;
  completionRate: number;
  avgDocsPerDay: number;
  estimatedDaysToFinish: number;
  topPriorityMonth: string;
  months: { name: string; total: number; checked: number; remaining: number; density: number }[];
  recommendations: AdvisorRecommendation[];
}

export function generateWorkloadSummary(year?: number): WorkloadSummary {
  const db = getDatabase();
  if (!db) return emptySummary();

  const targetYear = year || new Date().getFullYear();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const totalStmt = db.prepare(`SELECT COUNT(*) as c FROM files WHERE last_modified LIKE ?`);
  totalStmt.bind([`${targetYear}%`]);
  totalStmt.step();
  const totalDocuments = Number(totalStmt.getAsObject().c);
  totalStmt.free();

  const extStmt = db.prepare(`SELECT COUNT(*) as c FROM document_text dt JOIN files f ON f.id = dt.file_id WHERE dt.status = 'done' AND f.last_modified LIKE ?`);
  extStmt.bind([`${targetYear}%`]);
  extStmt.step();
  const extracted = Number(extStmt.getAsObject().c);
  extStmt.free();

  const daysStmt = db.prepare(`SELECT COUNT(DISTINCT strftime('%Y-%m-%d', last_modified)) as c FROM files WHERE last_modified LIKE ?`);
  daysStmt.bind([`${targetYear}%`]);
  daysStmt.step();
  const daysWithDocs = Number(daysStmt.getAsObject().c);
  daysStmt.free();

  const checkedStmt = db.prepare('SELECT COUNT(*) as c FROM calendar_checks WHERE year = ?');
  checkedStmt.bind([targetYear]);
  checkedStmt.step();
  const daysChecked = Number(checkedStmt.getAsObject().c);
  checkedStmt.free();

  const monthData: { name: string; total: number; checked: number; remaining: number; density: number }[] = [];

  for (let m = 1; m <= 12; m++) {
    const mStr = String(m).padStart(2, '0');
    const docStmt = db.prepare(`SELECT COUNT(*) as c FROM files WHERE last_modified LIKE ?`);
    docStmt.bind([`${targetYear}-${mStr}%`]);
    docStmt.step();
    const total = Number(docStmt.getAsObject().c);
    docStmt.free();

    const checkStmt = db.prepare('SELECT COUNT(*) as c FROM calendar_checks WHERE year = ? AND month = ?');
    checkStmt.bind([targetYear, m]);
    checkStmt.step();
    const checked = Number(checkStmt.getAsObject().c);
    checkStmt.free();

    const daysStmt2 = db.prepare(`SELECT COUNT(DISTINCT strftime('%d', last_modified)) as c FROM files WHERE last_modified LIKE ?`);
    daysStmt2.bind([`${targetYear}-${mStr}%`]);
    daysStmt2.step();
    const monthDays = Number(daysStmt2.getAsObject().c);
    daysStmt2.free();

    monthData.push({
      name: months[m - 1],
      total,
      checked: Math.min(checked, monthDays),
      remaining: total > 0 ? monthDays - checked : 0,
      density: monthDays > 0 ? Math.round(total / monthDays) : 0,
    });
  }

  const monthsWithDocs = monthData.filter(m => m.total > 0);
  const sortedMonths = [...monthsWithDocs].sort((a, b) => b.total - a.total);
  const topMonth = sortedMonths[0];

  const recommendations: AdvisorRecommendation[] = [];

  if (topMonth && topMonth.remaining > 0) {
    recommendations.push({
      type: 'priority',
      title: `Foco prioritário: ${topMonth.name}`,
      description: `${topMonth.name} tem ${topMonth.total} documentos — é o mês mais carregado. Restam ${topMonth.remaining} dias para processar.`,
      action: `${topMonth.remaining} dias pendentes`,
      icon: '🎯',
      priority: 10,
      targetMonth: topMonth.name,
      targetYear,
    });
  }

  const avgDocsPerDay = daysWithDocs > 0 ? Math.round(totalDocuments / daysWithDocs) : 0;
  const highDensityMonths = monthData.filter(m => m.density > avgDocsPerDay * 1.5 && m.total > 0);
  if (highDensityMonths.length > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Picos de demanda detectados',
      description: `${highDensityMonths.map(m => m.name).join(', ')} têm densidade acima da média (${highDensityMonths.map(m => m.density).join(', ')} docs/dia)`,
      icon: '⚠️',
      priority: 8,
    });
  }

  recommendations.push({
    type: 'tip',
    title: 'Estratégia de lote',
    description: 'Processe documentos do mesmo tipo em sequência — a IA classificadora aproveita o contexto.',
    icon: '💡',
    priority: 3,
  });

  const rate = daysWithDocs > 0 ? daysChecked / daysWithDocs : 0;
  if (rate < 0.2 && daysWithDocs > 5) {
    recommendations.push({
      type: 'warning',
      title: 'Progresso lento',
      description: `Apenas ${Math.round(rate * 100)}% dos dias com documentos foram processados. Considere aumentar o ritmo.`,
      icon: '🐢',
      priority: 7,
    });
  }

  const remaining = totalDocuments - extracted;
  const avgPerDay = daysChecked > 0 ? Math.round(extracted / daysChecked) : 0;
  const estimatedDays = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : remaining;

  return {
    totalDocuments,
    extracted,
    remaining,
    daysWithDocs,
    daysChecked,
    completionRate: daysWithDocs > 0 ? Math.round((daysChecked / daysWithDocs) * 100) : 0,
    avgDocsPerDay: avgPerDay,
    estimatedDaysToFinish: estimatedDays,
    topPriorityMonth: topMonth?.name || 'Nenhum',
    months: monthData,
    recommendations: recommendations.sort((a, b) => b.priority - a.priority),
  };
}

function emptySummary(): WorkloadSummary {
  return {
    totalDocuments: 0, extracted: 0, remaining: 0, daysWithDocs: 0,
    daysChecked: 0, completionRate: 0, avgDocsPerDay: 0,
    estimatedDaysToFinish: 0, topPriorityMonth: 'Nenhum',
    months: [], recommendations: [],
  };
}

import { getDatabase, getScenarioCategories, getTalkingPoints } from '../database';
import { QueueAgentHandler } from './types';

function countScenarios(): number {
  try {
    return getScenarioCategories().reduce((sum, item) => sum + Number(item.count || 0), 0);
  } catch {
    return 0;
  }
}

export const simulatorQueueAgent: QueueAgentHandler = async (_job, _context, executor) => {
  const beforeScenarios = countScenarios();
  const beforeTalkingPoints = getTalkingPoints().length;
  await executor();
  const afterScenarios = countScenarios();
  const afterTalkingPoints = getTalkingPoints().length;
  const db = getDatabase();

  return [{
    agent: 'simulatorQueueAgent',
    stage: 'simulator',
    status: 'done',
    confidence: afterScenarios > beforeScenarios || afterTalkingPoints > beforeTalkingPoints ? 0.82 : 0.5,
    summary: `Simulador processado. Cenários: ${beforeScenarios} → ${afterScenarios}. Talking points: ${beforeTalkingPoints} → ${afterTalkingPoints}.`,
    recommendedAction: afterScenarios > beforeScenarios ? 'Revisar novos cenários gerados automaticamente.' : 'Verificar se há documentos de crise suficientes para novos cenários.',
    metadata: {
      databaseAvailable: Boolean(db),
      scenariosBefore: beforeScenarios,
      scenariosAfter: afterScenarios,
      talkingPointsBefore: beforeTalkingPoints,
      talkingPointsAfter: afterTalkingPoints,
    },
  }];
};

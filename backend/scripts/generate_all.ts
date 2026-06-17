import { initDatabase, flushDatabase } from '../src/db/connection';
import { generateScenarios, generateTalkingPoints } from '../src/services/simulatorAi';
import { insertScenario } from '../src/db/simulator';
import { insertTalkingPoint, ensureTalkingPointsTable } from '../src/db/talkingPoints';

async function main() {
  console.log('Inicializando DB...');
  await initDatabase();

  // === GERAR CENÁRIOS DO SIMULADOR ===
  console.log('\n=== Gerando cenários para o Simulador de Crise ===');
  try {
    const scenarios = await generateScenarios(5);
    console.log(`Gerados ${scenarios.length} cenários via IA`);
    for (const s of scenarios) {
      if (s.title && s.description) {
        insertScenario({
          title: s.title,
          description: s.description,
          difficulty: s.difficulty || 'medio',
          category: 'geral',
          options: s.options || [],
          source: 'ai_generated',
        });
        console.log(`  ✅ ${s.title} (${s.difficulty})`);
      }
    }
  } catch (err: any) {
    console.error('Erro ao gerar cenários:', err.message);
  }

  // === GERAR MATRIZ DE TALKING POINTS ===
  console.log('\n=== Gerando Matriz de Talking Points ===');
  ensureTalkingPointsTable();
  try {
    // generateTalkingPoints retorna UM ponto por vez, chama 6x para ter mais
    for (let i = 0; i < 6; i++) {
      const p = await generateTalkingPoints('');
      if (p && p.title) {
        insertTalkingPoint({
          title: p.title,
          category: p.category || 'geral',
          approved: p.approved || [],
          restricted: p.restricted || [],
          source: 'ai_generated',
        });
        console.log(`  ✅ ${p.title} (${p.category})`);
      }
    }
  } catch (err: any) {
    console.error('Erro ao gerar talking points:', err.message);
  }

  flushDatabase();
  console.log('\n=== Geração concluída! ===');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

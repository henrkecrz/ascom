import { Router, Request, Response } from 'express';
import { getFileById } from '../database';

const router = Router();

router.post('/api/generator/press-release', (req: Request, res: Response) => {
  const { docId, title, facts, location, date, actions } = req.body;

  let docName = 'Geral';
  if (docId) {
    const doc = getFileById(parseInt(docId, 10));
    if (doc) docName = doc.name;
  }

  const cleanTitle = title || 'NOTA OFICIAL';
  const cleanFacts = facts || 'Informamos ocorrência sob apuração.';
  const cleanLocation = location || 'Brasília - DF';
  const cleanDate = date || new Date().toLocaleDateString('pt-BR');
  const cleanActions = actions || 'A equipe da Novacap está no local adotando todas as providências cabíveis.';

  const isCrisis = docName.toLowerCase().includes('crise') || cleanTitle.toLowerCase().includes('crise');

  let template = '';
  if (isCrisis) {
    template = `
🚨 **${cleanTitle.toUpperCase()}**

**${cleanLocation}, ${cleanDate}** — A Companhia de Urbanização da Nova Capital do Brasil (Novacap) esclarece que, em relação ao fato ocorrido (${cleanFacts.toLowerCase()}), todas as medidas do Protocolo de Crises foram prontamente acionadas.

A assessoria de comunicação informa que a presidência e as diretorias competentes foram notificadas de imediato para acompanhar o desdobramento do ocorrido. 

Como ação de resposta imediata: ${cleanActions}

Reforçamos que a Novacap preza pela transparência e segurança de suas operações, e manterá a imprensa e a comunidade informadas conforme o avanço das apurações.

---
**ASSESSORIA DE COMUNICAÇÃO (ASCOM)**
*Companhia de Urbanização da Nova Capital do Brasil (Novacap) · Governo do Distrito Federal*
`.trim();
  } else {
    template = `
📢 **${cleanTitle.toUpperCase()}**

**${cleanLocation}, ${cleanDate}** — A Novacap informa que:

${cleanFacts}

Em linha com o Planejamento de Comunicação e Relacionamento com a Comunidade: ${cleanActions}

A Companhia permanece à disposição para eventuais esclarecimentos por meio de seus canais oficiais de comunicação.

---
**ASSESSORIA DE COMUNICAÇÃO (ASCOM)**
*Companhia de Urbanização da Nova Capital do Brasil (Novacap) · Governo do Distrito Federal*
`.trim();
  }

  res.json({
    success: true,
    docName,
    pressRelease: template,
    generatedAt: new Date().toISOString()
  });
});

export default router;

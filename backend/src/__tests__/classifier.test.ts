import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyDocument, getDocTypeLabel, DOC_TYPES } from '../analysis/classifier';

void describe('classifier', () => {
  void it('classifyDocument - protocolo de crise', () => {
    const result = classifyDocument('protocolo_crise.pdf', 'procedimento para crise emergencial', 'crise');
    assert.strictEqual(result.docType, 'protocolo_crise');
    assert.ok(result.confidence > 0);
    assert.strictEqual(result.planSection, 'Gerenciamento de Crises');
  });

  void it('classifyDocument - fluxo de trabalho', () => {
    const result = classifyDocument('fluxo_atendimento.docx', 'fluxo de atendimento ao publico', 'fluxo');
    assert.strictEqual(result.docType, 'fluxo_trabalho');
    assert.ok(result.confidence > 0);
  });

  void it('classifyDocument - relatorio', () => {
    const result = classifyDocument('relatorio_2024.pdf', 'resultados do periodo', 'relat');
    assert.strictEqual(result.docType, 'relatorio_atuacao');
    assert.ok(result.confidence > 0);
  });

  void it('classifyDocument - fallback to outro', () => {
    const result = classifyDocument('foto.jpg', 'imagem aleatoria sem contexto', 'fotos');
    assert.strictEqual(result.docType, 'outro');
  });

  void it('getDocTypeLabel returns correct labels', () => {
    assert.strictEqual(getDocTypeLabel('protocolo_crise'), 'Protocolo de Crise');
    assert.strictEqual(getDocTypeLabel('fluxo_trabalho'), 'Fluxo de Trabalho');
    assert.strictEqual(getDocTypeLabel('outro'), 'Outro');
  });

  void it('DOC_TYPES contains all rule-based types', () => {
    assert.ok(Array.isArray(DOC_TYPES));
    assert.ok(DOC_TYPES.includes('protocolo_crise'));
    assert.ok(DOC_TYPES.includes('fluxo_trabalho'));
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractEntities, serializeEntities, parseEntities } from '../analysis/entityExtractor';

void describe('entityExtractor', () => {
  void it('extractEntities - organizations', () => {
    const result = extractEntities('A Novacap e a Secretaria de Obras firmaram parceria');
    assert.ok(result.organizations.includes('Novacap'));
    assert.ok(result.organizations.some(o => o.includes('Secretaria')));
  });

  void it('extractEntities - values', () => {
    const result = extractEntities('investimento de R$ 1.5 milhao');
    assert.ok(result.values.length > 0);
  });

  void it('extractEntities - dates', () => {
    const result = extractEntities('evento realizado em 15/03/2024 e 2024-03-15');
    assert.ok(result.dates.some(d => d.text === '15/03/2024'));
    assert.ok(result.dates.some(d => d.text === '2024-03-15'));
  });

  void it('extractEntities - persons', () => {
    const result = extractEntities('O Dr. Silva e a Diretora Maria participaram');
    assert.ok(result.persons.some(p => p.includes('Dr')));
    assert.ok(result.persons.some(p => p.includes('Diretora')));
  });

  void it('extractEntities - locations', () => {
    const result = extractEntities('Reuniao em Brasília-DF');
    assert.ok(result.locations.includes('Brasília'));
    assert.ok(result.locations.includes('DF'));
  });

  void it('extractEntities - empty text', () => {
    const result = extractEntities('');
    assert.deepStrictEqual(result.persons, []);
    assert.deepStrictEqual(result.organizations, []);
  });

  void it('serializeEntities and parseEntities roundtrip', () => {
    const entities = { persons: ['João'], organizations: ['Novacap'], dates: [], values: [], programs: [], mediaVehicles: [], locations: [] };
    const serialized = serializeEntities(entities);
    const parsed = parseEntities(serialized);
    assert.deepStrictEqual(parsed, entities);
  });

  void it('parseEntities handles invalid JSON', () => {
    const result = parseEntities('invalid');
    assert.deepStrictEqual(result.persons, []);
    assert.deepStrictEqual(result.organizations, []);
  });
});

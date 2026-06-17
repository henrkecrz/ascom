import fs from 'fs';
import { insertDocumentSection, insertKnowledgeRelation, insertStructuredData, insertContact, getDatabase } from '../database';
import { extractEntities, serializeEntities } from '../analysis/entityExtractor';

interface DocSection {
  title: string;
  level: number;
  content: string;
  tables: string[][][];
}

interface ExtractedStructure {
  sections: DocSection[];
  metadata: {
    title: string;
    author: string;
    created: string;
    wordCount: number;
  };
  allText: string;
}

async function extractDocxXml(filePath: string): Promise<string | null> {
  try {
    const JSZip = require('jszip');
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const doc = zip.file('word/document.xml');
    if (!doc) return null;
    const xmlStr = await doc.async('string');
    return xmlStr;
  } catch {
    return null;
  }
}

function extractSectionsFromDocxXml(xmlContent: string): DocSection[] {
  const sections: DocSection[] = [];
  const paragraphs: { style?: string; text: string }[] = [];
  const paragraphRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const styleRegex = /<w:pStyle\s+w:val="([^"]*)"/;
  let match;
  while ((match = paragraphRegex.exec(xmlContent)) !== null) {
    const p = match[0];
    const styleMatch = p.match(styleRegex);
    const style = styleMatch ? styleMatch[1] : undefined;
    const texts: string[] = [];
    let tMatch;
    while ((tMatch = textRegex.exec(p)) !== null) {
      texts.push(tMatch[1]);
    }
    paragraphs.push({ style, text: texts.join('') });
  }
  let currentSection: DocSection | null = null;
  for (const p of paragraphs) {
    const isHeading = p.style && /heading|título|titulo/i.test(p.style);
    const level = isHeading ? parseInt(p.style?.replace(/\D/g, '') || '1', 10) || 1 : 0;
    if (level > 0) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: p.text, level, content: '', tables: [] };
    } else if (currentSection) {
      if (currentSection.content) currentSection.content += '\n';
      currentSection.content += p.text;
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

function extractTablesFromDocxXml(xmlContent: string): string[][][] {
  const tables: string[][][] = [];
  const tableRegex = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
  const rowRegex = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
  const cellRegex = /<w:tc[ >][\s\S]*?<\/w:tc>/g;
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(xmlContent)) !== null) {
    const tableXml = tableMatch[0];
    const table: string[][] = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableXml)) !== null) {
      const rowXml = rowMatch[0];
      const row: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
        const cellXml = cellMatch[0];
        const texts: string[] = [];
        let tMatch;
        while ((tMatch = textRegex.exec(cellXml)) !== null) {
          texts.push(tMatch[1].trim());
        }
        row.push(texts.join(' ').trim());
      }
      if (row.some(c => c.length > 0)) table.push(row);
    }
    if (table.length > 0) tables.push(table);
  }
  return tables;
}

async function extractDocxMetadata(xmlContent: string): Promise<{ title: string; author: string; created: string }> {
  const titleMatch = /<dc:title[^>]*>([^<]*)<\/dc:title>/.exec(xmlContent);
  const creatorMatch = /<dc:creator[^>]*>([^<]*)<\/dc:creator>/.exec(xmlContent);
  const dateMatch = /<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/.exec(xmlContent);
  return {
    title: titleMatch ? titleMatch[1] : '',
    author: creatorMatch ? creatorMatch[1] : '',
    created: dateMatch ? dateMatch[1] : '',
  };
}

function extractProtocolSteps(sections: DocSection[]): { order: number; action: string; responsible?: string }[] {
  const steps: { order: number; action: string; responsible?: string }[] = [];
  const stepRegex = /(\d+)[.)\s]+([A-ZÀ-Ÿa-zà-ÿ][^.\n]*?)(?:[.-]\s*([A-ZÀ-Ÿa-zà-ÿ][^.\n]*?))?(?=\.|$|\n)/g;
  const allText = sections.map(s => s.content).join('\n');
  let match;
  while ((match = stepRegex.exec(allText)) !== null) {
    steps.push({
      order: steps.length + 1,
      action: (match[2] || match[1]).trim(),
      responsible: match[3] ? match[3].trim() : undefined,
    });
  }
  return steps;
}

function extractChecklist(sections: DocSection[]): string[] {
  const items: string[] = [];
  const checklistRegex = /[\[\]✓✗]\s*([A-ZÀ-Ÿa-zà-ÿ][^.\n]*?)(?=\.|\n|$)/g;
  const allText = sections.map(s => s.content).join('\n');
  let match;
  while ((match = checklistRegex.exec(allText)) !== null) {
    items.push(match[1].trim());
  }
  return items;
}

function extractWorkflowSteps(sections: DocSection[]): { order: number; action: string; area?: string; criteria?: string }[] {
  const steps: { order: number; action: string; area?: string; criteria?: string }[] = [];
  const allText = sections.map(s => s.content).join('\n');
  const stepRegex = /(?:^|\n)\s*(\d+)[.)\s]+([A-ZÀ-Ÿa-zà-ÿ].*?)(?:$|\.\s)/gm;
  let match;
  while ((match = stepRegex.exec(allText)) !== null) {
    const text = match[2].trim();
    const areaMatch = text.match(/(?:respons[aá]vel|rea|setor|departamento):\s*([A-ZÀ-Ÿa-zà-ÿ\s]+?)(?:,|\s*;|\s*$)/i);
    steps.push({
      order: Number(match[1]),
      action: text,
      area: areaMatch ? areaMatch[1].trim() : undefined,
    });
  }
  return steps;
}

export async function extractDocxStructure(filePath: string): Promise<ExtractedStructure | null> {
  try {
    const mammoth = require('mammoth');
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const allText = (result.value || '').trim();
    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    const xmlContent = await extractDocxXml(filePath);
    let sections: DocSection[] = [];
    let meta = { title: '', author: '', created: '' };
    if (xmlContent) {
      sections = extractSectionsFromDocxXml(xmlContent);
      if (sections.length === 0) {
        sections = [{ title: 'Conteúdo', level: 1, content: allText, tables: [] }];
      }
      const tables = extractTablesFromDocxXml(xmlContent);
      if (tables.length > 0 && sections.length > 0) {
        sections[sections.length - 1].tables = tables;
      }
      meta = await extractDocxMetadata(xmlContent);
    } else {
      sections = [{ title: 'Conteúdo', level: 1, content: allText, tables: [] }];
    }
    const metadata = { ...meta, wordCount };
    return { sections, metadata, allText };
  } catch (e) {
    return null;
  }
}

export async function processDocxIntelligently(
  filePath: string,
  fileId: number,
  docType: string
): Promise<{ sectionsCount: number; tablesImported: number; contactsCreated: number; steps?: any[]; checklist?: string[] }> {
  const structure = await extractDocxStructure(filePath);
  if (!structure) return { sectionsCount: 0, tablesImported: 0, contactsCreated: 0 };
  let tablesImported = 0;
  let contactsCreated = 0;
  const allEntities: any[] = [];
  for (const section of structure.sections) {
    const entities = extractEntities(section.content);
    allEntities.push(entities);
    insertDocumentSection({
      file_id: fileId,
      section_title: section.title,
      section_level: section.level,
      content: section.content,
      has_table: section.tables.length > 0,
      table_data: section.tables.length > 0 ? section.tables : undefined,
      extracted_entities: entities,
    });
    if (section.tables.length > 0) {
      for (const table of section.tables) {
        if (table.length > 1) {
          const headers = table[0];
          const rows = table.slice(1);
          for (const row of rows) {
            const rowObj: Record<string, string> = {};
            headers.forEach((h, i) => {
              rowObj[h.toLowerCase().replace(/[^a-z0-9]/g, '_')] = row[i] || '';
            });
            insertStructuredData({
              source_file_id: fileId,
              schema_type: 'tabela_docx',
              data: rowObj,
              theme: docType,
              confidence: 0.8,
            });
            tablesImported++;
          }
        }
      }
    }
    if (entities.persons.length > 0) {
      const db = getDatabase();
      if (db) {
        for (const person of entities.persons.slice(0, 5)) {
          const existsStmt = db.prepare('SELECT id FROM contacts WHERE name LIKE ?');
          const searchName = `%${person.split(' ').slice(0, 2).join(' ')}%`;
          existsStmt.bind([searchName]);
          if (!existsStmt.step()) {
            existsStmt.free();
            insertContact({
              name: person,
              role: '',
              organization: entities.organizations[0] || '',
              phone: '',
              email: '',
              notes: `Importado automaticamente de documento ID ${fileId}`,
            });
            contactsCreated++;
          } else {
            existsStmt.free();
          }
        }
      }
    }
    insertKnowledgeRelation({
      source_type: 'file',
      source_id: fileId,
      target_type: 'document_section',
      target_id: 0,
      relation_type: 'contem_secao',
      confidence: 1.0,
      metadata: { section_title: section.title },
    });
  }
  let steps: any[] | undefined;
  let checklist: string[] | undefined;
  if (docType === 'protocolo_crise') {
    steps = extractProtocolSteps(structure.sections);
    checklist = extractChecklist(structure.sections);
  } else if (docType === 'fluxo_trabalho') {
    steps = extractWorkflowSteps(structure.sections);
  }
  return {
    sectionsCount: structure.sections.length,
    tablesImported,
    contactsCreated,
    steps,
    checklist,
  };
}

export { extractProtocolSteps, extractChecklist, extractWorkflowSteps };

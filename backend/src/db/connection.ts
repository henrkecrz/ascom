import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { logger } from '../lib/logger';

const DB_DIR = 'data';
const DB_FILENAME = 'files.db';
const DB_PATH = path.join(process.cwd(), DB_DIR, DB_FILENAME);

const SAVE_DEBOUNCE_MS = 5000;

export const MAX_QUERY_LIMIT = 100;
export const DEFAULT_QUERY_LIMIT = 50;
const MAX_RELATIONS_LIMIT = 100;
const MAX_GRAPH_RELATIONS = 500;

let db: any = null;
let SQL: any = null;
let lastLoadedTime: number = 0;
let saveTimeout: any = null;
let saveQueued = false;
let isSaving = false;
let pendingSave = false;

export function scheduleSave(): void {
  if (saveQueued) return;
  saveQueued = true;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
    saveQueued = false;
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
}

export async function initDatabase(): Promise<void> {
  if (db) return;

  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    lastLoadedTime = fs.statSync(DB_PATH).mtimeMs;
  } else {
    db = new SQL.Database();
    lastLoadedTime = Date.now();
  }

  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    full_path TEXT NOT NULL UNIQUE,
    relative_path TEXT NOT NULL,
    extension TEXT,
    size_bytes INTEGER DEFAULT 0,
    size_formatted TEXT,
    last_modified TEXT,
    category TEXT,
    parent_folder TEXT,
    depth INTEGER DEFAULT 0,
    doc_type TEXT DEFAULT 'outro',
    doc_type_confidence REAL DEFAULT 0,
    plan_section TEXT DEFAULT '',
    entities TEXT DEFAULT '{}',
    needs_review INTEGER DEFAULT 0,
    talking_points TEXT DEFAULT '{}',
    md5_hash TEXT DEFAULT '',
    relations_computed BOOLEAN DEFAULT 0,
    graph_computed BOOLEAN DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_text (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL UNIQUE,
    raw_text TEXT,
    extracted_at TEXT,
    status TEXT DEFAULT 'pending'
  )`);

  // Migrate document_text_fts to standard FTS4 table if needed (to avoid Wasm sql.js FTS4 external content UPDATE/DELETE SQL logic error)
  let needsFtsMigration = false;
  try {
    const stmt = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='document_text_fts'");
    if (stmt.step()) {
      const sqlText = stmt.getAsObject().sql || '';
      if (sqlText.includes("content=")) {
        needsFtsMigration = true;
      }
    }
    stmt.free();
  } catch (e) {
    // ignore
  }

  if (needsFtsMigration) {
    try {
      db.run("DROP TRIGGER IF EXISTS dt_ai");
      db.run("DROP TRIGGER IF EXISTS dt_ad");
      db.run("DROP TRIGGER IF EXISTS dt_au");
      db.run("DROP TABLE IF EXISTS document_text_fts");
    } catch (e) {
      console.error("Erro ao limpar FTS antigo:", e);
    }
  }

  db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS document_text_fts USING fts4(raw_text)`);

  if (needsFtsMigration) {
    try {
      db.run(`INSERT INTO document_text_fts(docid, raw_text) SELECT id, raw_text FROM document_text`);
    } catch (e) {
      console.error("Erro ao repopular FTS:", e);
    }
  }

  db.run(`DROP TRIGGER IF EXISTS dt_ai`);
  db.run(`DROP TRIGGER IF EXISTS dt_ad`);
  db.run(`DROP TRIGGER IF EXISTS dt_au`);

  db.run(`CREATE TRIGGER dt_ai AFTER INSERT ON document_text BEGIN
    INSERT INTO document_text_fts(docid, raw_text) VALUES (new.id, new.raw_text);
  END`);

  db.run(`CREATE TRIGGER dt_ad AFTER DELETE ON document_text BEGIN
    DELETE FROM document_text_fts WHERE docid = old.id;
  END`);

  db.run(`CREATE TRIGGER dt_au AFTER UPDATE ON document_text BEGIN
    DELETE FROM document_text_fts WHERE docid = old.id;
    INSERT INTO document_text_fts(docid, raw_text) VALUES (new.id, new.raw_text);
  END`);

  db.run(`CREATE TABLE IF NOT EXISTS document_embeddings (
    file_id INTEGER PRIMARY KEY,
    embedding_json TEXT NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL UNIQUE,
    summary TEXT,
    keywords TEXT,
    topics TEXT,
    word_count INTEGER DEFAULT 0
  )`);

  try { db.run('ALTER TABLE files ADD COLUMN relations_computed BOOLEAN DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE files ADD COLUMN graph_computed BOOLEAN DEFAULT 0'); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS document_vectors (
    file_id INTEGER NOT NULL,
    term TEXT NOT NULL,
    tfidf_score REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (file_id, term)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id_1 INTEGER NOT NULL,
    file_id_2 INTEGER NOT NULL,
    similarity_score REAL DEFAULT 0,
    shared_keywords TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    file_ids TEXT,
    theme_words TEXT
  )`);

  const addColumnIfMissing = (table: string, col: string, def: string) => {
    try { db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch {}
  };

  addColumnIfMissing('files', 'doc_type', "TEXT DEFAULT 'outro'");
  addColumnIfMissing('files', 'doc_type_confidence', 'REAL DEFAULT 0');
  addColumnIfMissing('files', 'plan_section', "TEXT DEFAULT ''");
  addColumnIfMissing('files', 'entities', "TEXT DEFAULT '{}'");
  addColumnIfMissing('files', 'needs_review', 'INTEGER DEFAULT 0');
  addColumnIfMissing('files', 'talking_points', "TEXT DEFAULT '{}'");
  addColumnIfMissing('files', 'md5_hash', "TEXT DEFAULT ''");
  addColumnIfMissing('files', 'source_id', 'INTEGER DEFAULT 0');
  addColumnIfMissing('files', 'scanned_count', 'INTEGER DEFAULT 0');
  addColumnIfMissing('structured_data', 'row_hash', 'TEXT');
  try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_structured_data_row_hash ON structured_data (row_hash)'); } catch (e) {}

  db.run(`CREATE TABLE IF NOT EXISTS scan_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    source_label TEXT NOT NULL,
    source_path TEXT NOT NULL,
    new_count INTEGER DEFAULT 0,
    modified_count INTEGER DEFAULT 0,
    removed_count INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    online INTEGER DEFAULT 1,
    scanned_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS structured_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file_id INTEGER NOT NULL,
    schema_type TEXT NOT NULL,
    data JSON NOT NULL,
    theme TEXT,
    confidence REAL DEFAULT 0,
    imported_at TEXT,
    row_hash TEXT UNIQUE,
    FOREIGN KEY (source_file_id) REFERENCES files(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS import_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    rows_inserted INTEGER NOT NULL,
    imported_at TEXT NOT NULL,
    status TEXT DEFAULT 'active'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    section_title TEXT,
    section_level INTEGER DEFAULT 1,
    content TEXT,
    has_table INTEGER DEFAULT 0,
    table_data TEXT,
    extracted_entities TEXT,
    FOREIGN KEY (file_id) REFERENCES files(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS schema_cache (
    hash TEXT PRIMARY KEY,
    schema_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS knowledge_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    metadata TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS classification_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    original_type TEXT,
    corrected_type TEXT,
    corrected_by TEXT DEFAULT 'user',
    created_at TEXT
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sd_schema_type ON structured_data(schema_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sd_theme ON structured_data(theme)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sd_source_file ON structured_data(source_file_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dsect_file_id ON document_sections(file_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_kr_source ON knowledge_relations(source_type, source_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_kr_target ON knowledge_relations(target_type, target_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_kr_type ON knowledge_relations(relation_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cf_file_id ON classification_feedback(file_id)`);

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    organization TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photo_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT,
    event_name TEXT NOT NULL,
    source_path TEXT NOT NULL UNIQUE,
    month_folder TEXT,
    thumbnail_path TEXT,
    photo_count INTEGER DEFAULT 0,
    indexed_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    source_path TEXT NOT NULL UNIQUE,
    thumbnail_path TEXT,
    file_size INTEGER DEFAULT 0,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    indexed_at TEXT,
    FOREIGN KEY (event_id) REFERENCES photo_events(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photo_document_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_event_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    match_type TEXT DEFAULT 'auto',
    confidence REAL DEFAULT 0,
    FOREIGN KEY (photo_event_id) REFERENCES photo_events(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES files(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pdl_event ON photo_document_links(photo_event_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pdl_doc ON photo_document_links(document_id)`);

  db.run(`CREATE TABLE IF NOT EXISTS file_blobs (
    file_id INTEGER PRIMARY KEY,
    data BLOB,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'documentos',
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  has_photos INTEGER NOT NULL DEFAULT 0,
  last_scanned TEXT
)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_ds_type ON data_sources(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ds_active ON data_sources(active)`);

  // Seed data sources padrão se vazio
  const dsCount = db.prepare('SELECT COUNT(*) as c FROM data_sources');
  dsCount.step();
  const dscVal = Number(dsCount.getAsObject().c);
  dsCount.free();
  if (dscVal === 0) {
    const defaultSources = [
      { path: 'N:\\ASCOM\\2026\\ADM', label: 'Administrativo', type: 'documentos' },
      { path: 'N:\\ASCOM\\2026\\ARQUIVO DEMANDAS DE IMPRENSA', label: 'Demandas de Imprensa', type: 'documentos' },
      { path: 'N:\\ASCOM\\2026\\MATERIAIS DE APOIO', label: 'Materiais de Apoio', type: 'documentos' },
      { path: 'N:\\ASCOM\\2026\\PAUTAS', label: 'Pautas', type: 'documentos' },
      { path: 'N:\\ASCOM\\FOTOS\\2026', label: 'Fotos 2026', type: 'fotos', has_photos: 1 },
    ];
    for (const s of defaultSources) {
      db.run('INSERT INTO data_sources (path, type, label, active, has_photos) VALUES (?, ?, ?, 1, ?)',
        [s.path, s.type, s.label, s.has_photos || 0]);
    }
  }

  db.run(`CREATE TABLE IF NOT EXISTS calendar_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_date TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  documents_count INTEGER DEFAULT 0,
  docs_analyzed INTEGER DEFAULT 0,
  notes TEXT,
  completed_at TEXT
)`);

  db.run(`CREATE TABLE IF NOT EXISTS simulator_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    options TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medio',
    category TEXT DEFAULT 'geral',
    source TEXT DEFAULT 'ai',
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS talking_points_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'geral',
    approved TEXT NOT NULL,
    restricted TEXT NOT NULL,
    source TEXT DEFAULT 'ai',
    created_at TEXT
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_cc_year_month ON calendar_checks(year, month)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cc_date ON calendar_checks(check_date)`);

  const contactsCount = db.prepare('SELECT COUNT(*) as c FROM contacts');
  contactsCount.step();
  const countVal = Number(contactsCount.getAsObject().c);
  contactsCount.free();

  if (countVal === 0) {
    db.run("INSERT INTO contacts (name, role, organization, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)",
      ['Rodrigo Ramos', 'Repórter de Política', 'Metrópoles', '+55 (61) 99999-1111', 'rodrigo.ramos@metropoles.com', 'Cobre obras e licitações de Brasília.']);
    db.run("INSERT INTO contacts (name, role, organization, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)",
      ['Amanda Silva', 'Produtora de Cidade', 'TV Globo Brasília', '+55 (61) 98888-2222', 'amanda.silva@tvglobo.com.br', 'Contato para pautas de trânsito e saneamento.']);
    db.run("INSERT INTO contacts (name, role, organization, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)",
      ['Bruno Souza', 'Editor-Chefe', 'Correio Braziliense', '+55 (61) 97777-3333', 'bruno.souza@correiobraziliense.com.br', 'Pautas gerais de infraestrutura e parcerias público-privadas.']);
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings');
  settingsCount.step();
  const scVal = Number(settingsCount.getAsObject().c);
  settingsCount.free();

  if (scVal === 0) {
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['ai_provider', 'opencode']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['ai_api_key', '']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['ai_base_url', 'https://opencode.ai/zen/v1']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['ai_model', 'opencode/deepseek-v4-flash-free']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['ai_potency', '0.7']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['store_original_files', 'true']);
  } else {
    try {
      db.run("UPDATE settings SET value = 'https://opencode.ai/zen/v1' WHERE key = 'ai_base_url' AND value = 'https://openrouter.ai/api/v1'");
      db.run("UPDATE settings SET value = 'opencode/deepseek-v4-flash-free' WHERE key = 'ai_model' AND value = 'meta-llama/llama-3.2-3b-instruct:free'");
      const existing = db.prepare("SELECT 1 FROM settings WHERE key = 'store_original_files'");
      if (!existing.step()) {
        db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['store_original_files', 'true']);
      }
      existing.free();
    } catch {}
  }

  db.run(`CREATE INDEX IF NOT EXISTS idx_files_category ON files(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_parent_folder ON files(parent_folder)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dt_file_id ON document_text(file_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ds_file_id ON document_summary(file_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dr_file_id_1 ON document_relations(file_id_1)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dr_file_id_2 ON document_relations(file_id_2)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_files_cat_name ON files(category, name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_ext_name ON files(extension, name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_doc_type_mod ON files(doc_type, last_modified)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_parent_name ON files(parent_folder, name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dt_status ON document_text(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dv_file_id ON document_vectors(file_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sl_source_id ON scan_log(source_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sl_scanned_at ON scan_log(scanned_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_source_id ON files(source_id)`);
  // Unique constraint via index (sql.js não suporta CREATE UNIQUE INDEX com IF NOT EXISTS)
  try { db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_path_unique ON data_sources(path)`); } catch {}

  // Limpa configurações de timeout corrompidas de 5000ms para usar os valores padrão reais
  try {
    db.run("DELETE FROM settings WHERE key IN ('ai_interactive_timeout_ms', 'ai_queue_timeout_ms', 'ai_site_timeout_ms') AND value = '5000'");
  } catch (e) {}

  flushDatabase();
}

export function saveDatabase(immediate: boolean = false): void {
  if (!db) return;

  if (immediate) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const tempPath = DB_PATH + '.tmp';
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, DB_PATH);
      lastLoadedTime = fs.statSync(DB_PATH).mtimeMs;
      pendingSave = false;
    } catch (err) {
      console.error('Erro ao salvar banco de dados (imediato):', err);
    }
    return;
  }

  pendingSave = true;
  if (saveTimeout) return;

  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    if (isSaving) {
      saveDatabase();
      return;
    }

    isSaving = true;
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const tempPath = DB_PATH + '.tmp';
      fs.writeFile(tempPath, buffer, (err) => {
        if (err) {
          isSaving = false;
          console.error('Erro ao escrever banco de dados temporário:', err);
        } else {
          fs.rename(tempPath, DB_PATH, (renameErr) => {
            isSaving = false;
            if (renameErr) {
              console.error('Erro ao renomear banco de dados temporário:', renameErr);
            } else {
              try { lastLoadedTime = fs.statSync(DB_PATH).mtimeMs; } catch {}
              pendingSave = false;
            }
          });
        }
      });
    } catch (err) {
      isSaving = false;
      console.error('Erro ao exportar banco de dados:', err);
    }
  }, 1000);
}

export function getDatabase(): any {
  return db;
}

export function clearDatabase(): void {
  if (!db) return;
  const tables = ['files', 'document_text', 'document_summary', 'document_relations', 'document_clusters', 'simulator_scenarios', 'talking_points_matrix', 'processing_queue'];
  for (const t of tables) {
    try {
      db.run(`DELETE FROM ${t}`);
    } catch (e: any) {
      console.error(`Erro ao limpar tabela ${t}:`, e.message);
    }
  }
  flushDatabase();
}

export function flushDatabase(): void {
  saveDatabase(true);
}

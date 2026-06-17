export {
  scheduleSave,
  initDatabase,
  saveDatabase,
  getDatabase,
  clearDatabase,
  flushDatabase
} from './db/connection';

export {
  FileQuery,
  FileResult,
  insertFile,
  queryFiles,
  getFileById,
  getCategories,
  getFileTypes,
  getAllDocuments,
  getRelatedDocuments,
  getGraphData,
  getClusters,
  getDocumentsWithoutText,
  storeFileBlob,
  getFileBlob,
  hasFileBlob,
  deleteFileBlob,
  deleteFile,
  getFilesBySource,
  updateFileSource
} from './db/files';

export {
  updateDocumentText,
  updateDocumentSummary,
  insertRelation,
  insertCluster,
  clearClusters,
  updateFileClassification,
  updateFileEntities,
  updateFileTalkingPoints,
  getDocumentsByType,
  getDocumentsNeedingReview,
  getStatsByType,
  reclassifyFile
} from './db/documents';

export {
  insertStructuredData,
  queryStructuredData,
  deleteStructuredData
} from './db/structuredData';

export {
  insertDocumentSection,
  insertDocumentSectionSync,
  getDocumentSections
} from './db/sections';

export {
  insertKnowledgeRelation,
  queryKnowledgeRelations,
  clearKnowledgeRelations,
  insertClassificationFeedback,
  getClassificationFeedback
} from './db/knowledge';

export {
  getAllContacts,
  insertContact,
  deleteContact
} from './db/contacts';

export {
  getSetting,
  setSetting,
  setSettingNoSave
} from './db/settings';

export {
  insertPhotoEvent,
  updatePhotoEvent,
  insertPhoto,
  getAllPhotoEvents,
  getPhotoEventById,
  getPhotosByEvent,
  insertPhotoDocumentLink,
  getDocumentsForPhotoEvent,
  getPhotosForDocument,
  clearPhotoIndex
} from './db/photos';

export {
  updateLastScanned,
  DataSource
} from './db/dataSources';

export {
  ensureSimulatorTable,
  insertScenario,
  getScenarios,
  getScenarioCategories,
  deleteScenario,
  reclassifyAllScenarios,
  classifyScenarioText,
  Scenario,
  ScenarioOption
} from './db/simulator';

export {
  ensureTalkingPointsTable,
  insertTalkingPoint,
  getTalkingPoints,
  getTalkingPointCategories,
  TalkingPoint
} from './db/talkingPoints';

export {
  insertImportHistory,
  getImportHistory,
  markImportUndone,
  getImportHistoryById,
  ImportHistoryRecord
} from './db/importHistory';

export {
  ensureIntelligenceTables,
  createDocumentVersion,
  createChangeEventFromVersions,
  getLatestDocumentVersion,
  listDocumentVersions,
  getDocumentVersion,
  getVersionDiff,
  listDocumentChanges,
  listDocumentChangesByFile,
  getDocumentChange,
  updateDocumentChangeStatus,
  listDocumentChangeAlerts,
  resolveDocumentChangeAlert,
  upsertSourceFileState,
  createCalendarEvent,
  listCalendarEvents,
  createCalendarOpportunity,
  listCalendarOpportunities,
  addPhotoTag,
  listPhotoTags,
  deletePhotoTag,
  recordPhotoUsage,
  listPhotoUsage,
  listUnusedPhotos,
  createPhotoHighlight,
  listPhotoHighlights,
  getDayIntelligence,
  DocumentVersion,
  DocumentChangeEvent
} from './db/intelligence';

import { SiteSnapshotInput, SiteAgentRunContext } from './types';
import { queryRows, scalarNumber } from './dbUtils';

export async function galleryContextAgent(_context: SiteAgentRunContext): Promise<SiteSnapshotInput[]> {
  const totalEvents = scalarNumber('SELECT COUNT(*) FROM photo_events');
  const totalPhotos = scalarNumber('SELECT COUNT(*) FROM photos');
  const usageCount = scalarNumber('SELECT COUNT(*) FROM photo_usage');
  const highlightsCount = scalarNumber('SELECT COUNT(*) FROM photo_highlights');
  const tagsCount = scalarNumber('SELECT COUNT(*) FROM photo_tags');
  const eventsWithoutDocuments = queryRows<any>(`
    SELECT pe.*
    FROM photo_events pe
    LEFT JOIN photo_document_links pdl ON pdl.photo_event_id = pe.id
    WHERE pdl.id IS NULL
    ORDER BY pe.indexed_at DESC
    LIMIT 10
  `);
  const contentReadyEvents = queryRows<any>(`
    SELECT pe.*, COUNT(p.id) as photos, COUNT(pdl.id) as documents
    FROM photo_events pe
    LEFT JOIN photos p ON p.event_id = pe.id
    LEFT JOIN photo_document_links pdl ON pdl.photo_event_id = pe.id
    GROUP BY pe.id
    HAVING photos > 0 AND documents > 0
    ORDER BY photos DESC
    LIMIT 10
  `);
  const unusedPhotoEvents = queryRows<any>(`
    SELECT pe.*, COUNT(p.id) as photos
    FROM photo_events pe
    JOIN photos p ON p.event_id = pe.id
    LEFT JOIN photo_usage pu ON pu.photo_id = p.id
    WHERE pu.id IS NULL
    GROUP BY pe.id
    ORDER BY photos DESC
    LIMIT 10
  `);

  const status = totalEvents === 0 ? 'vazio' : eventsWithoutDocuments.length > 0 ? 'atencao' : 'ok';

  return [{
    area: 'dados',
    page: 'galeria',
    agent: 'galleryContextAgent',
    title: 'Galeria inteligente',
    summary: `${totalEvents} evento(s), ${totalPhotos} foto(s), ${usageCount} uso(s), ${highlightsCount} destaque(s) e ${tagsCount} tag(s).`,
    status,
    priority: eventsWithoutDocuments.length > 0 ? 60 : totalEvents > 0 ? 20 : 0,
    riskLevel: eventsWithoutDocuments.length > 0 ? 'medio' : 'baixo',
    sourceCount: totalPhotos,
    payload: {
      totalEvents,
      totalPhotos,
      usageCount,
      highlightsCount,
      tagsCount,
      eventsWithoutDocuments,
      contentReadyEvents,
      unusedPhotoEvents,
      recommendedActions: [
        eventsWithoutDocuments.length > 0 ? 'Associar contexto/documentos a eventos fotográficos sem vínculo.' : 'Manter vínculos foto-documento atualizados.',
        unusedPhotoEvents.length > 0 ? 'Avaliar eventos com fotos não utilizadas para conteúdos e relatórios.' : 'Registrar uso das fotos publicadas.',
        highlightsCount === 0 && totalPhotos > 0 ? 'Gerar destaques visuais para eventos com maior acervo.' : 'Revisar destaques aprovados periodicamente.',
      ],
    },
  }];
}

import { api } from './api';

export const intelligenceApi = {
  documentChanges: {
    list: (params?: Record<string, string>) =>
      api.get<any>(`/api/document-changes?${new URLSearchParams(params || '').toString()}`),
    get: (id: number) => api.get<any>(`/api/document-changes/${id}`),
    byFile: (fileId: number) => api.get<any>(`/api/document-changes/by-file/${fileId}`),
    review: (id: number, data?: any) => api.post<any>(`/api/document-changes/${id}/review`, data || {}),
    resolve: (id: number, data?: any) => api.post<any>(`/api/document-changes/${id}/resolve`, data || {}),
    alerts: (resolved?: boolean) => api.get<any>(`/api/document-changes/alerts${resolved === undefined ? '' : `?resolved=${resolved ? 'true' : 'false'}`}`),
    resolveAlert: (id: number) => api.post<any>(`/api/document-changes/alerts/${id}/resolve`, {}),
  },
  documentVersions: {
    list: (fileId: number) => api.get<any>(`/api/documents/${fileId}/versions`),
    get: (fileId: number, versionId: number) => api.get<any>(`/api/documents/${fileId}/versions/${versionId}`),
    diff: (fileId: number, oldVersionId: number, newVersionId: number) =>
      api.get<any>(`/api/documents/${fileId}/diff/${oldVersionId}/${newVersionId}`),
    reprocess: (fileId: number) => api.post<any>(`/api/documents/${fileId}/reprocess`, {}),
  },
  calendar: {
    events: (params?: Record<string, string>) =>
      api.get<any>(`/api/calendar/events?${new URLSearchParams(params || '').toString()}`),
    createEvent: (data: any) => api.post<any>('/api/calendar/events', data),
    opportunities: (params?: Record<string, string>) =>
      api.get<any>(`/api/calendar/opportunities?${new URLSearchParams(params || '').toString()}`),
    generateOpportunities: (data: { date?: string }) => api.post<any>('/api/calendar/opportunities/generate', data),
    day: (date: string) => api.get<any>(`/api/calendar/day/${encodeURIComponent(date)}`),
    month: (year: number, month: number) => api.get<any>(`/api/calendar/month/${year}/${month}`),
    changes: (date: string) => api.get<any>(`/api/calendar/changes/${encodeURIComponent(date)}`),
  },
  photos: {
    search: (q: string) => api.get<any>(`/api/photos/search?q=${encodeURIComponent(q)}`),
    tags: (photoId?: number) => api.get<any>(`/api/photos/tags${photoId ? `?photoId=${photoId}` : ''}`),
    addTag: (photoId: number, tag: string, source = 'manual') => api.post<any>(`/api/photos/${photoId}/tags`, { tag, source }),
    usage: (params?: Record<string, string>) => api.get<any>(`/api/photos/usage?${new URLSearchParams(params || '').toString()}`),
    markUsed: (photoId: number, data: any) => api.post<any>(`/api/photos/${photoId}/use`, data),
    unused: (limit = 200) => api.get<any>(`/api/photos/unused?limit=${limit}`),
    highlights: (params?: Record<string, string>) => api.get<any>(`/api/photos/highlights?${new URLSearchParams(params || '').toString()}`),
    generateHighlights: (data?: any) => api.post<any>('/api/photos/highlights/generate', data || {}),
    contentSuggestions: (eventId: number) => api.get<any>(`/api/photos/events/${eventId}/content-suggestions`),
    relatedTimeline: (eventId: number) => api.get<any>(`/api/photos/events/${eventId}/related-timeline`),
    relatedChanges: (eventId: number) => api.get<any>(`/api/photos/events/${eventId}/related-changes`),
  },
};

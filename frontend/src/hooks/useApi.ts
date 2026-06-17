import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, DashboardData, QueueStatus, Protocol, Spokesperson, ChecklistItem, QuickQuestion } from '../api'

export function useDashboardStats() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'stats'],
    queryFn: ({ signal }) => api.dashboard.stats(signal),
    staleTime: 30_000,
  })
}

export function useQueueStatus(pollInterval = 5000) {
  return useQuery<QueueStatus>({
    queryKey: ['queue', 'status'],
    queryFn: ({ signal }) => api.queue.status(signal),
    refetchInterval: pollInterval,
  })
}

export function useProtocols() {
  return useQuery<{ protocols: Protocol[] }>({
    queryKey: ['crisis', 'protocols'],
    queryFn: ({ signal }) => api.crisis.protocols(signal),
    staleTime: 60_000,
  })
}

export function useSpokespersons() {
  return useQuery<{ spokespersons: Spokesperson[] }>({
    queryKey: ['crisis', 'spokespersons'],
    queryFn: ({ signal }) => api.crisis.spokespersons(signal),
    staleTime: 60_000,
  })
}

export function useChecklist() {
  return useQuery<{ checklist: ChecklistItem[]; readiness: { hasProtocols: boolean; hasSpokespersons: boolean; score: number } }>({
    queryKey: ['crisis', 'checklist'],
    queryFn: ({ signal }) => api.get('/api/crisis/checklist', signal),
    staleTime: 60_000,
  })
}

export function useChecklistProgress() {
  return useQuery<{ progress: Record<string, boolean> }>({
    queryKey: ['crisis', 'checklist-progress'],
    queryFn: ({ signal }) => api.crisis.checklistProgress(signal),
    staleTime: 30_000,
  })
}

export function useSaveChecklistProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (progress: Record<string, boolean>) => api.crisis.saveChecklistProgress(progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crisis', 'checklist-progress'] })
    },
  })
}

export function useQuickQuestions() {
  return useQuery<{ questions: QuickQuestion[] }>({
    queryKey: ['consult', 'quick-questions'],
    queryFn: ({ signal }) => api.consult.quickQuestions(signal),
    staleTime: 5 * 60_000,
  })
}

export function useAdvisorSummary() {
  return useQuery<any>({
    queryKey: ['advisor', 'summary'],
    queryFn: ({ signal }) => api.advisor.summary(undefined, signal),
    staleTime: 60_000,
  })
}

export function useCalendarKpi() {
  return useQuery<any>({
    queryKey: ['calendar', 'kpi'],
    queryFn: ({ signal }) => api.calendar.kpi(undefined, signal),
    staleTime: 60_000,
  })
}

export function useFileDetails(id: number) {
  return useQuery<any>({
    queryKey: ['files', id],
    queryFn: ({ signal }) => api.files.get(id, signal),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useAskQuestion() {
  return useMutation({
    mutationFn: (question: string) => api.consult.ask(question),
  })
}

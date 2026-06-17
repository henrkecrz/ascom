import { ThemeProvider } from './ThemeContext'
import { HashRouter } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HashRouter>
          <AppLayout />
        </HashRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App

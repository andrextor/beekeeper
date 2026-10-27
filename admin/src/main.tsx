import './styles/theme.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { isNotPlatformAdmin } from './lib/admin-api'
import { trackPointerGlow } from './lib/pointer-glow'
import { initTheme } from './lib/theme'
import { router } from './routes'

initTheme()
trackPointerGlow()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failures, error) => failures < 1 && !isNotPlatformAdmin(error),
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

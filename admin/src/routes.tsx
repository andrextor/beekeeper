import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { PagePlaceholder } from './components/layout/PagePlaceholder'
import { NoAccessPage } from './features/auth/NoAccessPage'
import { RequireAdmin } from './features/auth/RequireAdmin'
import { SignInPage } from './features/auth/SignInPage'
import { DashboardPage } from './features/dashboard/DashboardPage'

// import.meta.env.DEV is replaced at build time, so the gallery and its import never reach production.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/_design',
        HydrateFallback: () => null,
        lazy: () =>
          import('./features/design/DesignPage').then(({ DesignPage }) => ({
            Component: DesignPage,
          })),
      },
    ]
  : []

export const router = createBrowserRouter([
  { path: '/ingresar', Component: SignInPage },
  { path: '/sin-acceso', Component: NoAccessPage },
  {
    path: '/',
    element: (
      <RequireAdmin>
        <AppShell />
      </RequireAdmin>
    ),
    children: [
      { index: true, Component: DashboardPage },
      { path: 'apicultores', element: <PagePlaceholder title="Apicultores" module="A3 y A4" /> },
      { path: 'usuarios', element: <PagePlaceholder title="Usuarios" module="A3" /> },
    ],
  },
  ...devRoutes,
])

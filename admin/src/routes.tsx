import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { PagePlaceholder } from './components/layout/PagePlaceholder'

// import.meta.env.DEV is replaced at build time, so the gallery and its import never reach production.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/_design',
        lazy: () =>
          import('./features/design/DesignPage').then(({ DesignPage }) => ({
            Component: DesignPage,
          })),
      },
    ]
  : []

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, element: <PagePlaceholder title="Resumen" module="A3" /> },
      { path: 'apicultores', element: <PagePlaceholder title="Apicultores" module="A3 y A4" /> },
      { path: 'usuarios', element: <PagePlaceholder title="Usuarios" module="A3" /> },
    ],
  },
  ...devRoutes,
])

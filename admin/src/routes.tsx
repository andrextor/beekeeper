import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ApiaryPage } from './features/apiaries/ApiaryPage'
import { NoAccessPage } from './features/auth/NoAccessPage'
import { RequireAdmin } from './features/auth/RequireAdmin'
import { SignInPage } from './features/auth/SignInPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { HivePage } from './features/hives/HivePage'
import { OrganizationPage } from './features/organizations/OrganizationPage'
import { OrganizationsPage } from './features/organizations/OrganizationsPage'
import { UsersPage } from './features/users/UsersPage'

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
      { path: 'apicultores', Component: OrganizationsPage },
      { path: 'apicultores/:id', Component: OrganizationPage },
      { path: 'apicultores/:id/apiarios/:apiaryId', Component: ApiaryPage },
      { path: 'apicultores/:id/colmenas/:hiveId', Component: HivePage },
      { path: 'usuarios', Component: UsersPage },
    ],
  },
  ...devRoutes,
])

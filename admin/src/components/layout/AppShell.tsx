import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="min-h-dvh lg:pl-62 print:pl-0">
      <aside className="fixed inset-y-0 left-0 hidden w-62 animate-slide-in lg:block print:hidden">
        <Sidebar />
      </aside>
      <TopBar />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  )
}

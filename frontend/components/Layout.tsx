import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar'
import { HeaderDesktop, HeaderMobile } from './Header'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'

export function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const { pathname } = useLocation()
  const isSportsBook = ['/sports', '/sports/live', '/sports/my-bets', '/sports/favorites', '/sports/search'].includes(pathname)
  const isAccountRoute = pathname === '/account' || pathname.startsWith('/account/')

  return (
    <div className="cb-content min-h-screen text-foreground">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((e) => !e)} />
      <div
        className="flex min-h-screen flex-col transition-[padding] duration-200 ease-out md:pl-[var(--sbw)]"
        style={{ ['--sbw' as string]: `${sidebarExpanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed}px` }}
      >
        <HeaderDesktop />
        <HeaderMobile />
        <main className={isAccountRoute ? "flex w-full min-w-0 flex-1 flex-col min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)] pb-0" : isSportsBook ? "flex-1 pb-0" : "flex-1 pb-20 md:pb-0"}>
          <Outlet />
        </main>
        {!isSportsBook && !isAccountRoute ? <Footer /> : null}
      </div>
      {!isAccountRoute ? <BottomNav /> : null}
    </div>
  )
}

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
  const isCasinoPlay = pathname.startsWith('/casino/play/')

  return (
    <div className="cb-content min-h-screen text-foreground">
      {!isCasinoPlay ? <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((e) => !e)} /> : null}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ease-out ${isCasinoPlay ? 'md:pl-0' : 'md:pl-[var(--sbw)]'}`}
        style={{ ['--sbw' as string]: `${sidebarExpanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed}px` }}
      >
        {!isCasinoPlay ? <><HeaderDesktop /><HeaderMobile /></> : null}
        <main className={isCasinoPlay ? 'flex min-w-0 flex-1 p-0' : isAccountRoute ? 'flex min-w-0 flex-1 min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)] pb-0' : isSportsBook ? 'flex-1 pb-0' : 'flex-1 pb-20 md:pb-0'}>
          <Outlet />
        </main>
        {!isSportsBook && !isAccountRoute && !isCasinoPlay ? (
          <div className="pb-14 md:pb-0">
            <Footer />
          </div>
        ) : null}
      </div>
      {!isAccountRoute && !isCasinoPlay ? <BottomNav /> : null}
    </div>
  )
}

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar'
import { HeaderDesktop, HeaderMobile } from './Header'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'

/* Homepage uses the reference site's full-width top header, without a desktop rail. */
export function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="cb-content min-h-screen text-foreground">
      {!isHome ? (
        <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((e) => !e)} />
      ) : null}
      <div
        className="flex min-h-screen flex-col transition-[padding] duration-200 ease-out md:pl-[var(--sbw)]"
        style={{
          ['--sbw' as string]: `${isHome ? 0 : sidebarExpanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed}px`,
        }}
      >
        <HeaderDesktop />
        <HeaderMobile />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <div className="pb-14 md:pb-0">
          <Footer />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

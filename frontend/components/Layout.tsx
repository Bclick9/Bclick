import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar'
import { HeaderDesktop, HeaderMobile } from './Header'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'

export function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const { pathname } = useLocation()
  const isSportsBook = pathname === '/sports'

  return (
    <div className="cb-content min-h-screen text-foreground">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((e) => !e)} />
      <div
        className="flex min-h-screen flex-col transition-[padding] duration-200 ease-out md:pl-[var(--sbw)]"
        style={{ ['--sbw' as string]: `${sidebarExpanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed}px` }}
      >
        <HeaderDesktop />
        <HeaderMobile />
        <main className={isSportsBook ? "flex-1 pb-0" : "flex-1 pb-20 md:pb-0"}>
          <Outlet />
        </main>
        {!isSportsBook ? (
          <div className="pb-14 md:pb-0">
            <Footer />
          </div>
        ) : null}
      </div>
      {!isSportsBook ? <BottomNav /> : null}
    </div>
  )
}

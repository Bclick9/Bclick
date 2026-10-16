import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar'
import { HeaderDesktop, HeaderMobile } from './Header'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'

/* Shared page shell: expandable desktop sidebar + header, mobile header,
   bottom nav + menu sheet, footer. */
export function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="cb-content min-h-screen text-foreground">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((e) => !e)} />
      <div
        className="flex flex-col min-h-screen transition-[padding] duration-200 ease-out md:pl-[var(--sbw)]"
        style={{ ['--sbw' as string]: `${sidebarExpanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed}px` }}
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

import { useState, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from '../../components/ui'
import { SectionHeading } from '../../components/DashboardUI'

type CmsContentPage = { id: string; title: string; slug: string; language: string; status: 'Published' | 'Draft'; updated: string; content: string }
const INITIAL_CMS_PAGES: CmsContentPage[] = [
  { id: 'PAGE-001', title: 'About Us', slug: '/about-us', language: 'English', status: 'Published', updated: '15 Oct 2026', content: 'Learn more about Bclick and the services provided to players.' },
  { id: 'PAGE-002', title: 'Responsible Gaming', slug: '/responsible-gaming', language: 'English', status: 'Published', updated: '14 Oct 2026', content: 'Information about safe play, limits, and support resources.' },
  { id: 'PAGE-003', title: 'Terms & Conditions', slug: '/terms-and-conditions', language: 'English', status: 'Published', updated: '10 Oct 2026', content: 'The terms that govern use of the platform.' },
  { id: 'PAGE-004', title: 'Privacy Policy', slug: '/privacy-policy', language: 'English', status: 'Draft', updated: '09 Oct 2026', content: 'How player information is handled in this demo copy.' },
  { id: 'PAGE-005', title: 'FAQ', slug: '/faq', language: 'English', status: 'Published', updated: '08 Oct 2026', content: 'Answers to common player questions.' },
]
export function CmsPagesPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [pages, setPages] = useState<CmsContentPage[]>(INITIAL_CMS_PAGES)
  const [search, setSearch] = useState('')
  const [activePage, setActivePage] = useState<CmsContentPage | null>(null)
  const [draft, setDraft] = useState({ title: '', slug: '', language: 'English', content: '' })
  const [creating, setCreating] = useState(false)
  const shown = pages.filter((item) => (item.title + ' ' + item.slug + ' ' + item.content).toLowerCase().includes(search.toLowerCase()))
  const savePage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.slug.trim() || !draft.content.trim()) return
    const created: CmsContentPage = { id: 'PAGE-' + String(pages.length + 1).padStart(3, '0'), title: draft.title.trim(), slug: draft.slug.startsWith('/') ? draft.slug : '/' + draft.slug, language: draft.language, status: 'Draft', updated: '19 Oct 2026', content: draft.content.trim() }
    setPages((current) => [created, ...current])
    setDraft({ title: '', slug: '', language: 'English', content: '' })
    setCreating(false)
    onNotify('Content page saved as a local draft.')
  }
  const toggleStatus = (id: string) => setPages((current) => current.map((item) => item.id === id ? { ...item, status: item.status === 'Published' ? 'Draft' : 'Published', updated: '19 Oct 2026' } : item))
  return <div className="page-enter space-y-5">
    <SectionHeading title="Pages" description="Manage the static information pages shown to players." actions={<Button onClick={() => setCreating((current) => !current)}><Plus className="h-4 w-4" /> New page</Button>} />
    {creating ? <Card><CardHeader><CardTitle>Create content page</CardTitle><CardDescription>Draft a new player-facing information page.</CardDescription></CardHeader><CardContent><form onSubmit={savePage} className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">Title</span><Input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Page title" /></label>
      <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">URL slug</span><Input required value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="/page-name" /></label>
      <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">Language</span><select value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs"><option>English</option><option>French</option><option>Arabic</option></select></label>
      <label className="space-y-1.5 md:col-span-2"><span className="block text-xs font-medium text-slate-600">Content</span><textarea rows={4} required value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Page content…" className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100" /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><Button variant="outline" type="button" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit">Save draft</Button></div>
    </form></CardContent></Card> : null}
    <Card><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-slate-800">{shown.length} content pages</p><div className="relative sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages…" className="pl-9" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] table-fixed text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-[29%] px-4 py-2.5 font-medium">Page</th><th className="w-[22%] px-4 py-2.5 font-medium">Slug</th><th className="w-[15%] px-4 py-2.5 font-medium">Language</th><th className="w-[14%] px-4 py-2.5 font-medium">Updated</th><th className="w-[10%] px-4 py-2.5 font-medium">Status</th><th className="w-[10%] px-4 py-2.5" /></tr></thead><tbody>{shown.map((item) => <tr key={item.id} className="border-b border-slate-100 text-xs hover:bg-slate-50"><td className="px-4 py-3"><button type="button" onClick={() => setActivePage(item)} className="text-left font-medium text-slate-800 hover:underline">{item.title}</button><p className="mt-1 font-mono text-[9px] text-slate-400">{item.id}</p></td><td className="truncate px-4 py-3 font-mono text-[11px] text-slate-500">{item.slug}</td><td className="px-4 py-3 text-slate-600">{item.language}</td><td className="px-4 py-3 text-slate-500">{item.updated}</td><td className="px-4 py-3"><Badge variant={item.status === 'Published' ? 'success' : 'outline'}>{item.status}</Badge></td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => toggleStatus(item.id)}>{item.status === 'Published' ? 'Unpublish' : 'Publish'}</Button></td></tr>)}</tbody></table></div></CardContent></Card>
    <Modal open={!!activePage} onOpenChange={(open) => { if (!open) setActivePage(null) }} title={activePage ? activePage.title : 'Page preview'} description={activePage ? activePage.slug + ' · ' + activePage.language : undefined}><div className="space-y-3"><div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">{activePage?.content}</div><div className="flex justify-end"><Button variant="outline" onClick={() => setActivePage(null)}>Close</Button></div></div></Modal>
    <p className="text-[10px] text-slate-400">Content editing and publication states are local preview data.</p>
  </div>
}

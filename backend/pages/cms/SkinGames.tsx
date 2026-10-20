import { useState, type FormEvent } from 'react'
import { ChevronDown, Filter, Search, X, Check, Play, Pencil, RotateCcw, GripVertical } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'

export type CmsSkinGame = {
  id: string
  title: string
  provider: string
  category: string
  rtp: string
  players: string
  categories: string[]
  categoryExpirations: Record<string, string>
  showOnPage: string[]
  gameParameters: string[]
  badge: string
  active: boolean
  description: string
  iconImage: string
  backgroundImage: string
  certificateNumber: string
  betLimitCurrency: string
  betLimitMin: string
  betLimitMax: string
  skin: string
  status: 'Active' | 'Draft' | 'Paused'
  art: string
  updated: string
}
export const INITIAL_CMS_SKIN_GAMES: CmsSkinGame[] = [
  { id: 'GM-001', title: 'Zeus vs Hades', provider: 'Demo Studio', category: 'Slots', rtp: '96.40%', players: '1,248', categories: ['Video Slots', 'New', 'Popular Games'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: 'new', active: true, description: 'A mythology-themed slot adventure.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Mythology Gold', status: 'Active', art: 'from-indigo-950 via-violet-800 to-amber-500', updated: '18 Oct 2026' },
  { id: 'GM-002', title: 'Wild Clusters', provider: 'Play’n GO', category: 'Slots', rtp: '96.10%', players: '982', categories: ['Video Slots', 'Megaways'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: '', active: true, description: 'A cascading reel slot game.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Emerald Reels', status: 'Active', art: 'from-emerald-950 via-green-800 to-lime-500', updated: '17 Oct 2026' },
  { id: 'GM-003', title: 'Roulette Royale', provider: 'Evolution', category: 'Live casino', rtp: '97.30%', players: '764', categories: ['Live Dealer', 'Table Games'], categoryExpirations: {}, showOnPage: [], gameParameters: ['Play Now'], badge: 'top', active: true, description: 'Live roulette from a royal gaming table.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Royal Table', status: 'Active', art: 'from-slate-950 via-red-950 to-amber-600', updated: '16 Oct 2026' },
  { id: 'GM-004', title: 'Lightning Blackjack', provider: 'Evolution', category: 'Live casino', rtp: '99.10%', players: '538', categories: ['Live Dealer', 'Table Games'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now'], badge: '', active: true, description: 'Live blackjack with fast-paced rounds.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Royal Table', status: 'Active', art: 'from-slate-950 via-red-950 to-amber-600', updated: '16 Oct 2026' },
  { id: 'GM-005', title: 'Rocket Rush', provider: 'Demo Studio', category: 'Crash', rtp: '97.00%', players: '1,105', categories: ['Crash Games', 'New'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: 'promo', active: false, description: 'A fast-paced crash-style game.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Neon Rush', status: 'Paused', art: 'from-blue-950 via-cyan-800 to-fuchsia-500', updated: '14 Oct 2026' },
  { id: 'GM-006', title: 'Golden Pharaoh', provider: 'Pragmatic Play', category: 'Slots', rtp: '96.50%', players: '416', categories: ['Video Slots', 'Jackpots'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: 'jackpot', active: true, description: 'An Egyptian-themed slot adventure.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Mythology Gold', status: 'Active', art: 'from-amber-950 via-yellow-800 to-orange-500', updated: '15 Oct 2026' },
]
const SKIN_GAME_CATEGORY_OPTIONS = [
  'Achievements Slots', 'Age of the Gods', 'All', 'All Games', 'Arcade Games', 'Autumn Slots',
  'Award Winners', 'Betting Games', 'BFTH Casino', 'BFTH Live Casino', 'BFTH Live Dealer', 'BFTH Slots',
  'Buy Bonus', 'Choice', 'Crash Games', 'Drops & Wins Slots', 'EGT Black Friday', 'Exclusive', 'Finished',
  'Fire Blaze Jackpots', 'Fishing & Hunting', 'From R$0,01', 'Halloween', 'Hidden', 'Highest Multiplier',
  'Instant Game', 'Jackpot Mania', 'Jackpots', 'LAUNCH GAMES', 'Live Dealer', 'Lottery Games', 'Mega jackpot',
  'Megaways', 'Mini Games', 'Must Drop Jackpots', 'New', 'Olimpiada Sloturilor', 'Ongoing', 'PG Soft',
  'Popular Games', 'Prize and Drops', 'Scratch Games', 'Skill Games', 'SLOTS FOR BONUSES', 'Table Games',
  'Tiki Ques', 'Tv Games', 'Upcoming', 'Video Bingo', 'Video Poker', 'Video Slots', 'Virtual Betting',
]
const SKIN_GAME_PROVIDER_OPTIONS = [
  '7777 Gaming', '77GAMING', 'Aardvark', 'AGT', 'AMAtic', 'AVIATRIX', 'AbraCadabra', 'Arcadem',
  'CT INTERACTIVE', 'Armadillo Studios', 'Advant Play', 'FBastard', 'Thunderspin', 'AGTsoftware',
  'Air Dice', 'Amigo Gaming', 'MASCOT', 'Apollo Games', 'Apparat', 'Suprema Games', 'BETCONSTRUCT',
  'Spinoro', 'Aspect Gaming', 'SYnot', 'Amatic', 'TomHorn', 'Atlas-V', 'Aura Gaming', 'AvatarUX',
  'Aviator Studio', 'Aviatrix', 'Babylon', 'Banana Games', 'BETgames', 'Barbara Bang', 'BOOMing Games',
  'Big Daddy', 'Endorphina', 'Betora', 'Netent', 'EVOlution', 'EZugi', 'BF GAMES', 'Big Time Gaming',
  'Bragg', 'BGaming', '3 Oaks Gaming', 'GreenTube', 'BIG TIME GAMING', 'Bahatika', 'F*Bastards',
  'KAGaming', 'National Lottery', 'Lagio Studio', 'Blueprint', 'Belatra', 'BOOMING Games', '3 Oaks GAMING',
  'Play’n Go', 'PLAYTECH', 'PLAYTECH LIVE', 'Bitville Roulette', 'BetRadarLotto', 'RED TIGER', 'Kiron',
  'Smartsoft', 'Betradar', 'Slot Builder', 'SPribe', 'BETSOFT', 'BetGames BetShop', 'SA Gaming',
  'Superlotto', 'Splitthepot', 'TV BET', 'BETGAMES', 'ICONIC21', 'Betsolutions', 'Lucky Numbers',
  'VIVO Gaming', 'Bally Wulff', 'Betxpro', 'Caleta', 'CandleBets', 'Comtrade Gaming', 'Champion',
  'Kiss Live Casino', 'Celestar', 'Spinexis', 'Capecod', 'CP Games', 'COLOSSUS', 'CT Interactive',
  'Clawbuster', 'CasinoWM', 'Cozmo Play', 'Dubibet', 'DLV', 'Dream Gaming', 'Dream Play',
  'Darpha Studios', 'Player Bets', 'EURASIAN Gaming', 'Eclipse', 'EYECON', 'Merkur games',
  'ENDORPHINA', 'EZUGI', 'EVOLUTION', 'The Better Platform', 'EGT Digital', 'E-Gaming', 'AMUSNET',
  'ELA Games', 'Elbet', 'ELK Studios', 'Spearhead', 'EvoPersia', 'Esa Gaming', 'Demo Studio',
  'Play’n GO', 'Evolution', 'Pragmatic Play', 'NetEnt',
]
const SKIN_GAME_ART_PRESETS = [
  { label: 'Mythology Gold', art: 'from-indigo-950 via-violet-800 to-amber-500' },
  { label: 'Emerald Reels', art: 'from-emerald-950 via-green-800 to-lime-500' },
  { label: 'Royal Table', art: 'from-slate-950 via-red-950 to-amber-600' },
  { label: 'Neon Rush', art: 'from-blue-950 via-cyan-800 to-fuchsia-500' },
  { label: 'Midnight Gold', art: 'from-slate-950 via-slate-800 to-yellow-600' },
  { label: 'Minimal Light', art: 'from-slate-100 via-slate-200 to-slate-400' },
]
const SKIN_GAME_BADGES = [
  { value: '', label: 'None' }, { value: 'new', label: 'New' }, { value: 'promo', label: 'Promo' },
  { value: 'jackpot', label: 'Jackpot' }, { value: 'top', label: 'Top' }, { value: 'exclusive', label: 'Exclusive' },
  { value: 'vpn', label: 'VPN' }, { value: 'tournament', label: 'Tournament' }, { value: 'hot', label: 'Hot' },
  { value: 'ortak', label: 'Ortak' }, { value: 'trending', label: 'Trending' },
]
export function CmsSkinGamesPage({ games, onSaveGame, onMoveGame, onNotify }: { games: CmsSkinGame[]; onSaveGame: (game: CmsSkinGame) => void; onMoveGame: (draggedId: string, targetId: string) => void; onNotify: (message: string) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | CmsSkinGame['status']>('All')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [openFilter, setOpenFilter] = useState<'categories' | 'providers' | null>(null)
  const [categorySearch, setCategorySearch] = useState('')
  const [providerSearch, setProviderSearch] = useState('')
  const [draggedGameId, setDraggedGameId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CmsSkinGame | null>(null)
  const [editCategorySearch, setEditCategorySearch] = useState('')
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false)
  const [showBetLimits, setShowBetLimits] = useState(false)
  const [showRegulationInfo, setShowRegulationInfo] = useState(false)
  const categoryOptions = SKIN_GAME_CATEGORY_OPTIONS.filter((item) => item.toLowerCase().includes(categorySearch.toLowerCase()))
  const providerOptions = SKIN_GAME_PROVIDER_OPTIONS.filter((item, index, all) => all.indexOf(item) === index).filter((item) => item.toLowerCase().includes(providerSearch.toLowerCase()))
  const editCategoryOptions = SKIN_GAME_CATEGORY_OPTIONS.filter((item) => item.toLowerCase().includes(editCategorySearch.toLowerCase()))
  const shown = games.filter((item) =>
    (statusFilter === 'All' || item.status === statusFilter)
    && (selectedCategories.length === 0 || item.categories.some((category) => selectedCategories.includes(category)))
    && (selectedProviders.length === 0 || selectedProviders.includes(item.provider))
    && (item.title + ' ' + item.provider + ' ' + item.category + ' ' + item.categories.join(' ') + ' ' + item.skin).toLowerCase().includes(search.toLowerCase())
  )
  const toggleCategory = (category: string) => setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])
  const toggleProvider = (provider: string) => setSelectedProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider])
  const openEditor = (game: CmsSkinGame) => {
    setEditDraft({ ...game, categories: [...game.categories], categoryExpirations: { ...game.categoryExpirations }, showOnPage: [...game.showOnPage], gameParameters: [...game.gameParameters] })
    setEditCategorySearch('')
    setShowEditCategoryPicker(false)
    setShowBetLimits(false)
    setShowRegulationInfo(false)
  }
  const patchDraft = (patch: Partial<CmsSkinGame>) => setEditDraft((current) => current ? { ...current, ...patch } : current)
  const toggleDraftArray = (key: 'categories' | 'showOnPage' | 'gameParameters', value: string) => setEditDraft((current) => {
    if (!current) return current
    const currentValues = current[key]
    const nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value]
    if (key === 'categories') {
      const categoryExpirations = { ...current.categoryExpirations }
      if (currentValues.includes(value)) delete categoryExpirations[value]
      return { ...current, categories: nextValues, category: nextValues[0] || '', categoryExpirations }
    }
    return { ...current, [key]: nextValues }
  })
  const saveEditedGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editDraft) return
    const saved: CmsSkinGame = { ...editDraft, category: editDraft.categories[0] || '', status: !editDraft.active ? 'Paused' : (editDraft.status === 'Paused' ? 'Active' : editDraft.status), updated: '19 Oct 2026' }
    onSaveGame(saved)
    setEditDraft(null)
    setShowEditCategoryPicker(false)
    onNotify('Game details saved in this local CMS preview. Publishing is not connected.')
  }
  const resetFilters = () => {
    setSelectedCategories([])
    setSelectedProviders([])
    setCategorySearch('')
    setProviderSearch('')
    setSearch('')
    setStatusFilter('All')
    setOpenFilter(null)
  }
  const multiSelectButtonClass = 'flex h-10 w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-left text-xs text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200'
  const fieldClass = 'h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-100'
  const labelClass = 'mb-1.5 block text-[11px] font-medium text-slate-600'
  const sectionClass = 'rounded-lg border border-slate-200 bg-white p-4'
  const inlineCheckClass = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-600 hover:bg-slate-50'
  return <div className="page-enter space-y-5">
    <Card>
      <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><div><CardTitle>Game filters</CardTitle><CardDescription className="mt-1">Filter the website game catalogue by category and provider.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" /> Reset filters</Button></div></CardHeader>
      <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
        <div className="relative min-w-0">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Categories</label>
          <button type="button" aria-expanded={openFilter === 'categories'} onClick={() => setOpenFilter((current) => current === 'categories' ? null : 'categories')} className={multiSelectButtonClass}>
            <span className="truncate">{selectedCategories.length === 0 ? '0 selected' : selectedCategories.length + ' selected'}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', openFilter === 'categories' && 'rotate-180')} />
          </button>
          {openFilter === 'categories' ? <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2.5"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search categories…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400" /></div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={categoryOptions.length > 0 && categoryOptions.every((item) => selectedCategories.includes(item))} onChange={() => setSelectedCategories((current) => categoryOptions.every((item) => current.includes(item)) ? current.filter((item) => !categoryOptions.includes(item)) : [...new Set([...current, ...categoryOptions])])} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-800" /> Select All</label>
            </div>
            <ul className="max-h-56 overflow-y-auto p-1.5">{categoryOptions.map((category) => <li key={category}><label className={inlineCheckClass}><input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} className="h-3.5 w-3.5 accent-slate-800" /><span>{category}</span></label></li>)}{categoryOptions.length === 0 ? <li className="px-2 py-5 text-center text-xs text-slate-400">No categories match your search.</li> : null}</ul>
          </div> : null}
        </div>
        <div className="relative min-w-0">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Providers</label>
          <button type="button" aria-expanded={openFilter === 'providers'} onClick={() => setOpenFilter((current) => current === 'providers' ? null : 'providers')} className={multiSelectButtonClass}>
            <span className="truncate">{selectedProviders.length === 0 ? '0 selected' : selectedProviders.length + ' selected'}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', openFilter === 'providers' && 'rotate-180')} />
          </button>
          {openFilter === 'providers' ? <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2.5"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder="Search providers…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400" /></div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={providerOptions.length > 0 && providerOptions.every((item) => selectedProviders.includes(item))} onChange={() => setSelectedProviders((current) => providerOptions.every((item) => current.includes(item)) ? current.filter((item) => !providerOptions.includes(item)) : [...new Set([...current, ...providerOptions])])} className="h-3.5 w-3.5 accent-slate-800" /> Select All</label>
            </div>
            <ul className="max-h-56 overflow-y-auto p-1.5">{providerOptions.map((provider) => <li key={provider}><label className={inlineCheckClass}><input type="checkbox" checked={selectedProviders.includes(provider)} onChange={() => toggleProvider(provider)} className="h-3.5 w-3.5 accent-slate-800" /><span>{provider}</span></label></li>)}{providerOptions.length === 0 ? <li className="px-2 py-5 text-center text-xs text-slate-400">No providers match your search.</li> : null}</ul>
          </div> : null}
        </div>
      </CardContent>
    </Card>
    <Card><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search games by name, provider, category…" className="pl-9" /></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={fieldClass}><option>All</option><option>Active</option><option>Draft</option><option>Paused</option></select></div></div><p className="mt-3 text-[11px] text-slate-400">Showing {shown.length} of {games.length} games</p>
       <div className="mt-4 overflow-x-auto">
         <table className="w-full min-w-[860px] table-fixed text-left">
           <thead><tr className="border-y border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-10 px-2 py-2.5" aria-label="Reorder games"></th><th className="w-[26%] px-3 py-2.5 font-medium">Game</th><th className="w-[15%] px-3 py-2.5 font-medium">Provider</th><th className="w-[17%] px-3 py-2.5 font-medium">Categories</th><th className="w-[15%] px-3 py-2.5 font-medium">Skin</th><th className="w-[10%] px-3 py-2.5 font-medium">Status</th><th className="w-[14%] px-3 py-2.5 text-right">Action</th></tr></thead>
           <tbody>{shown.map((game) => <tr key={game.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move" }} onDrop={(event) => { event.preventDefault(); const movingId = event.dataTransfer.getData("text/plain") || draggedGameId; if (movingId && movingId !== game.id) { onMoveGame(movingId, game.id); onNotify("Game order updated in the local CMS preview.") } setDraggedGameId(null) }} className={cn("group/game-row border-b border-slate-100 text-xs transition-colors hover:bg-slate-50/80", draggedGameId === game.id && "opacity-40")}>
             <td className="px-2 py-3"><span draggable role="button" tabIndex={0} aria-label={"Drag to reorder " + game.title} title="Drag to reorder" onDragStart={(event) => { event.dataTransfer.setData("text/plain", game.id); event.dataTransfer.effectAllowed = "move"; setDraggedGameId(game.id) }} onDragEnd={() => setDraggedGameId(null)} className="inline-flex cursor-grab items-center justify-center rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span></td>
             <td className="px-3 py-3"><div className="flex items-center gap-3"><div className={cn("h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br", game.art)}>{game.iconImage ? <img src={game.iconImage} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{game.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{game.id}</p></div></div></td>
             <td className="px-3 py-3 text-slate-600">{game.provider}</td>
             <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{game.categories.slice(0, 2).map((category) => <span key={category} className="rounded bg-slate-100 px-1.5 py-1 text-[9px] text-slate-600">{category}</span>)}{game.categories.length > 2 ? <span className="text-[9px] text-slate-400">+{game.categories.length - 2}</span> : null}</div></td>
             <td className="px-3 py-3 text-slate-600">{game.skin}</td>
             <td className="px-3 py-3"><Badge variant={game.status === "Active" ? "success" : game.status === "Draft" ? "warning" : "outline"}>{game.status}</Badge><p className="mt-1 text-[9px] text-slate-400">{game.active ? "Enabled" : "Inactive"}</p></td>
             <td className="px-3 py-3 text-right"><Button size="sm" variant="outline" onClick={() => openEditor(game)}><Pencil className="h-3.5 w-3.5" /> Edit Game</Button></td>
           </tr>)}</tbody>
         </table>
         {shown.length === 0 ? <div className="py-12 text-center text-xs text-slate-400">No games match these filters.</div> : null}
         <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag the grip beside a game to change its order. Game ordering remains local to this preview.</p>
       </div>
     </CardContent></Card>

    <Modal open={!!editDraft} onOpenChange={(open) => { if (!open) { setEditDraft(null); setShowEditCategoryPicker(false) } }} title={editDraft ? 'Edit Game - ' + editDraft.title : 'Edit Game'} description={editDraft ? editDraft.provider + ' · ' + editDraft.id : undefined} size="full" footer={editDraft ? <><Button type="button" variant="outline" onClick={() => { setEditDraft(null); setShowEditCategoryPicker(false) }}>Cancel</Button><Button type="submit" form="skin-game-edit-form"><Check className="h-4 w-4" /> Save</Button></> : null}>
      {editDraft ? <form id="skin-game-edit-form" onSubmit={saveEditedGame} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900">Categories</h3>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Assign categories and optional expiration dates.</p>
            <button type="button" onClick={() => setShowEditCategoryPicker((open) => !open)} className={cn(fieldClass, 'mt-3 flex items-center justify-between text-left')}><span>Add categories</span><ChevronDown className={cn('h-4 w-4 transition-transform', showEditCategoryPicker && 'rotate-180')} /></button>
            {showEditCategoryPicker ? <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
              <div className="border-b border-slate-100 p-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={editCategorySearch} onChange={(event) => setEditCategorySearch(event.target.value)} placeholder="Search categories…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400" /></div>
                <label className={cn(inlineCheckClass, 'mt-1 font-medium')}><input type="checkbox" checked={editCategoryOptions.length > 0 && editCategoryOptions.every((item) => editDraft.categories.includes(item))} onChange={() => setEditDraft((current) => { if (!current) return current; const addAll = !editCategoryOptions.every((item) => current.categories.includes(item)); const categories = addAll ? [...new Set([...current.categories, ...editCategoryOptions])] : current.categories.filter((item) => !editCategoryOptions.includes(item)); return { ...current, categories, category: categories[0] || '', categoryExpirations: Object.fromEntries(Object.entries(current.categoryExpirations).filter(([key]) => categories.includes(key))) } })} className="h-3.5 w-3.5 accent-slate-800" /> Select All</label>
              </div>
              <div className="max-h-44 overflow-y-auto p-1">{editCategoryOptions.map((category) => <label key={category} className={inlineCheckClass}><input type="checkbox" checked={editDraft.categories.includes(category)} onChange={() => toggleDraftArray('categories', category)} className="h-3.5 w-3.5 accent-slate-800" /><span>{category}</span></label>)}{editCategoryOptions.length === 0 ? <p className="px-2 py-4 text-center text-xs text-slate-400">No categories match.</p> : null}</div>
            </div> : null}
            <div className="mt-3 space-y-2">{editDraft.categories.map((category) => <div key={category} className="rounded-md border border-slate-200 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-700">{category}</span><button type="button" aria-label={'Remove ' + category} onClick={() => toggleDraftArray('categories', category)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button></div><label className="mt-2 block"><span className="mb-1 block text-[10px] text-slate-500">Expiration date (optional)</span><input type="date" value={editDraft.categoryExpirations[category] || ''} onChange={(event) => patchDraft({ categoryExpirations: { ...editDraft.categoryExpirations, [category]: event.target.value } })} className={fieldClass} /></label></div>)}{editDraft.categories.length === 0 ? <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">No categories assigned.</p> : null}</div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900">Display settings</h3>
            <div className="mt-3"><p className={labelClass}>Show on Page</p><div className="space-y-1 rounded-md border border-slate-200 p-2">{['Home'].map((pageName) => <label key={pageName} className={inlineCheckClass}><input type="checkbox" checked={editDraft.showOnPage.includes(pageName)} onChange={() => toggleDraftArray('showOnPage', pageName)} className="h-3.5 w-3.5 accent-slate-800" /><span>{pageName}</span></label>)}</div></div>
            <div className="mt-4"><p className={labelClass}>Game Parameters</p><div className="space-y-1 rounded-md border border-slate-200 p-2">{['Play Now', 'For Fun', 'View Mode'].map((parameter) => <label key={parameter} className={cn(inlineCheckClass, parameter === 'View Mode' && 'cursor-not-allowed opacity-50')}><input type="checkbox" disabled={parameter === 'View Mode'} checked={editDraft.gameParameters.includes(parameter)} onChange={() => toggleDraftArray('gameParameters', parameter)} className="h-3.5 w-3.5 accent-slate-800" /><span>{parameter}</span>{parameter === 'View Mode' ? <span className="ml-auto text-[9px]">Unavailable</span> : null}</label>)}</div></div>
            <div className="mt-4"><label className="block"><span className={labelClass}>Badge</span><select value={editDraft.badge} onChange={(event) => patchDraft({ badge: event.target.value })} className={fieldClass}>{SKIN_GAME_BADGES.map((badge) => <option key={badge.value || 'none'} value={badge.value}>{badge.label}</option>)}</select></label></div>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-md border border-slate-200 px-3 py-3"><span><span className="block text-xs font-semibold text-slate-800">Active</span><span className="mt-1 block text-[10px] text-slate-500">Make this game available on the website.</span></span><input type="checkbox" checked={editDraft.active} onChange={(event) => patchDraft({ active: event.target.checked })} className="h-4 w-4 accent-slate-900" /></label>
            <div className="mt-4"><label className="block"><span className={labelClass}>Skin preset</span><select value={editDraft.skin} onChange={(event) => { const preset = SKIN_GAME_ART_PRESETS.find((item) => item.label === event.target.value); patchDraft({ skin: event.target.value, art: preset?.art || editDraft.art }) }} className={fieldClass}>{[editDraft.skin, ...SKIN_GAME_ART_PRESETS.map((item) => item.label)].filter((item, index, all) => all.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}</select></label></div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900">Game details</h3>
            <div className="mt-3"><p className={labelClass}>Game</p><p className="rounded-md bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800">{editDraft.title}</p><p className="mt-1 text-[10px] text-slate-400">ID: {editDraft.id} · Provider: {editDraft.provider}</p></div>
            <label className="mt-4 block"><span className={labelClass}>Description</span><textarea rows={7} value={editDraft.description} onChange={(event) => patchDraft({ description: event.target.value })} placeholder="Game description…" className="w-full resize-y rounded-md border border-input bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:ring-2 focus:ring-slate-100" /></label>
            <div className="mt-4"><button type="button" aria-expanded={showBetLimits} onClick={() => setShowBetLimits((open) => !open)} className="flex w-full items-center justify-between border-t border-slate-200 py-3 text-left text-xs font-semibold text-slate-700"><span>Bet Limits</span><ChevronDown className={cn('h-4 w-4 transition-transform', showBetLimits && 'rotate-180')} /></button>{showBetLimits ? <div className="grid gap-2 sm:grid-cols-3"><label><span className={labelClass}>Currency</span><select value={editDraft.betLimitCurrency} onChange={(event) => patchDraft({ betLimitCurrency: event.target.value })} className={fieldClass}>{['EUR','USD','GBP','BRL'].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label><span className={labelClass}>Minimum</span><Input type="number" min="0" value={editDraft.betLimitMin} onChange={(event) => patchDraft({ betLimitMin: event.target.value })} placeholder="Min bet" className="h-9 text-xs" /></label><label><span className={labelClass}>Maximum</span><Input type="number" min="0" value={editDraft.betLimitMax} onChange={(event) => patchDraft({ betLimitMax: event.target.value })} placeholder="Max bet" className="h-9 text-xs" /></label></div> : null}</div>
            <div><button type="button" aria-expanded={showRegulationInfo} onClick={() => setShowRegulationInfo((open) => !open)} className="flex w-full items-center justify-between border-t border-slate-200 py-3 text-left text-xs font-semibold text-slate-700"><span>Regulation Info</span><ChevronDown className={cn('h-4 w-4 transition-transform', showRegulationInfo && 'rotate-180')} /></button>{showRegulationInfo ? <label className="block"><span className={labelClass}>Certification Report Number</span><Input value={editDraft.certificateNumber} onChange={(event) => patchDraft({ certificateNumber: event.target.value })} placeholder="Certification report number" className="h-9 text-xs" /></label> : null}</div>
          </section>
        </div>

        <section className={sectionClass}>
          <h3 className="text-sm font-semibold text-slate-900">Images</h3>
          <p className="mt-1 text-[10px] text-slate-500">Choose a preview style or upload an image (440 × 310).</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div><p className={labelClass}>Game icon (440 × 310)</p><div className="grid grid-cols-3 gap-2">{SKIN_GAME_ART_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => patchDraft({ iconImage: '', art: preset.art })} className={cn('overflow-hidden rounded-md border p-1.5 text-left', editDraft.art === preset.art && !editDraft.iconImage ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400')}><div className={cn('h-14 rounded bg-gradient-to-br', preset.art)} /><span className="mt-1 block truncate text-[9px] text-slate-600">{preset.label}</span></button>)}</div><label className="mt-3 block"><span className="sr-only">Upload game icon</span><input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) patchDraft({ iconImage: URL.createObjectURL(file) }) }} className="block w-full text-[10px] text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700" /></label>{editDraft.iconImage ? <img src={editDraft.iconImage} alt="Game icon preview" className="mt-2 h-20 w-28 rounded-md border border-slate-200 object-cover" /> : null}</div>
            <div><p className={labelClass}>Background</p><div className="grid grid-cols-3 gap-2">{SKIN_GAME_ART_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => patchDraft({ backgroundImage: preset.art })} className={cn('overflow-hidden rounded-md border p-1.5 text-left', editDraft.backgroundImage === preset.art ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400')}><div className={cn('h-14 rounded bg-gradient-to-br', preset.art)} /><span className="mt-1 block truncate text-[9px] text-slate-600">{preset.label}</span></button>)}</div><label className="mt-3 block"><span className="sr-only">Upload background image</span><input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) patchDraft({ backgroundImage: URL.createObjectURL(file) }) }} className="block w-full text-[10px] text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700" /></label>{editDraft.backgroundImage && editDraft.backgroundImage.startsWith('blob:') ? <img src={editDraft.backgroundImage} alt="Background preview" className="mt-2 h-20 w-full rounded-md border border-slate-200 object-cover" /> : null}</div>
          </div>
        </section>
      </form> : null}
    </Modal>
    <p className="text-[10px] text-slate-400">The game editor saves changes to this browser session's local CMS preview. A live catalogue API or publishing endpoint is not connected here.</p>
  </div>
}

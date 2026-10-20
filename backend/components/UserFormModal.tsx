import { type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Input, Modal } from '../components/ui'

export function UserFormModal({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal open={open} onOpenChange={onOpenChange} title="Add player" description="Add a sample row to preview the user-management flow." footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="user-form"><UserPlus className="h-4 w-4" /> Add player</Button></>}>
    <form id="user-form" className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Full name</span><Input name="name" required placeholder="Player name" /></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Email address</span><Input name="email" required type="email" placeholder="player@example.com" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Country</span><select name="country" defaultValue="Tunisia" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Tunisia</option><option>France</option><option>Italy</option><option>Germany</option><option>United Kingdom</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Segment</span><select name="tier" defaultValue="Standard" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Standard</option><option>Gold</option><option>VIP</option></select></label></div>
      <p className="text-[11px] text-slate-400">No invitation email is sent and no user account is created in a server.</p>
    </form>
  </Modal>
}

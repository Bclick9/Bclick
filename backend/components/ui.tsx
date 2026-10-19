import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const buttonVariants: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  outline: 'border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
  ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
}

const buttonSizes: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-11 rounded-md px-6',
  icon: 'h-9 w-9',
}

export function Button({
  variant = 'default',
  size = 'default',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', buttonVariants[variant], buttonSizes[size], className)} {...props} />
}

const badgeVariants: Record<string, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  success: 'border-transparent bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
  warning: 'border-transparent bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15',
  danger: 'border-transparent bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/15',
  info: 'border-transparent bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15',
  outline: 'border-border text-foreground',
}

export function Badge({ variant = 'secondary', className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-4', badgeVariants[variant], className)} {...props} />
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-none', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold tracking-tight text-slate-900', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs leading-5 text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'default',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'default' | 'wide' | 'full'
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-2xl outline-none sm:p-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", size === 'default' && 'max-w-lg', size === 'wide' && 'max-w-4xl', size === 'full' && 'w-[96vw] max-w-[1500px]')}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-slate-900">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</DialogPrimitive.Description> : null}
            </div>
            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="Close dialog" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </DialogPrimitive.Close>
          </div>
          <div>{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

import { DEMO_DEPOSIT_REQUESTS } from '../../data/paymentRequests'
import { PaymentRequestQueue } from '../../components/PaymentRequestQueue'

export function DepositsPage({ onNotify }: { onNotify: (message: string) => void }) {
  return <PaymentRequestQueue kind="Deposit" initialRequests={DEMO_DEPOSIT_REQUESTS} onNotify={onNotify} />
}

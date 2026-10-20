import { DEMO_WITHDRAWAL_REQUESTS } from '../../data/paymentRequests'
import { PaymentRequestQueue } from '../../components/PaymentRequestQueue'

export function WithdrawalsPage({ onNotify }: { onNotify: (message: string) => void }) {
  return <PaymentRequestQueue kind="Withdrawal" initialRequests={DEMO_WITHDRAWAL_REQUESTS} onNotify={onNotify} />
}

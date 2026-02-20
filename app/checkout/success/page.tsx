import { getServiceClient } from '@/lib/supabase'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ordine Confermato | Kitwer26',
}

interface PageProps {
  searchParams: Promise<{ order_id?: string }>
}

async function getOrder(orderId: string) {
  const db = getServiceClient()
  const { data } = await db
    .from('orders')
    .select('*, products(title)')
    .eq('id', orderId)
    .single()
  return data
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { order_id } = await searchParams
  const order = order_id ? await getOrder(order_id) : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-dark px-4">
      <div className="mx-auto max-w-md text-center">
        {order?.payment_status === 'paid' ? (
          <>
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-badge-green/20 text-4xl">
              <svg className="h-10 w-10 text-badge-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-text-primary">Ordine Confermato!</h1>
            <p className="mb-2 text-text-secondary">
              Grazie per il tuo acquisto di <span className="font-semibold text-accent">{order.products?.title}</span>.
            </p>
            <p className="mb-8 text-sm text-text-secondary">
              Riceverai una conferma a <span className="text-text-primary">{order.customer_email}</span>.
            </p>
          </>
        ) : order?.payment_status === 'failed' ? (
          <>
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-badge-red/20 text-4xl">
              <svg className="h-10 w-10 text-badge-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-text-primary">Pagamento non riuscito</h1>
            <p className="mb-8 text-text-secondary">
              Il pagamento non è andato a buon fine. Puoi riprovare quando vuoi.
            </p>
          </>
        ) : (
          <>
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-accent/20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-text-primary">Elaborazione in corso...</h1>
            <p className="mb-8 text-text-secondary">
              Il tuo pagamento è in fase di verifica. Questa pagina si aggiornerà automaticamente.
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block rounded-xl bg-accent px-8 py-3 text-sm font-bold text-bg-dark transition-all hover:bg-accent-hover"
        >
          Torna alla Home
        </Link>
      </div>
    </main>
  )
}

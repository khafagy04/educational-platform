'use client';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type Wallet = { id: string; balance: string; currency: string };
type Tx = {
  id: string;
  type: string;
  amount: string;
  status: string;
  description: string;
  createdAt: string;
};
export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tx, setTx] = useState<Tx[]>([]);
  useEffect(() => {
    void Promise.all([
      clientApi<{ data: { wallet: Wallet } }>('/wallet'),
      clientApi<{ data: { transactions: Tx[] } }>('/wallet/transactions?page=1&pageSize=20'),
    ]).then(([a, b]) => {
      setWallet(a.data.wallet);
      setTx(b.data.transactions);
    });
  }, []);
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">الرصيد والمدفوعات</p>
        <h1>المحفظة</h1>
      </header>
      <section className="wallet-balance">
        <small>الرصيد المتاح</small>
        <strong>
          {wallet?.balance ?? '—'} <span>{wallet?.currency}</span>
        </strong>
        <p>شحن الرصيد عبر Fawaterk سيُفعّل عند إضافة بيانات الاعتماد.</p>
      </section>
      <section className="dashboard-section">
        <h2>سجل المعاملات</h2>
        <div className="data-list">
          {tx.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.description}</strong>
                <small>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</small>
              </div>
              <b>{item.amount} EGP</b>
              <span>{item.status}</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type Cert = {
  id: string;
  certificateNumber: string;
  status: string;
  issuedAt: string | null;
  course: { title: string };
};
export default function CertificatesPage() {
  const [items, setItems] = useState<Cert[]>([]);
  useEffect(() => {
    void clientApi<{ data: { certificates: Cert[] } }>('/me/certificates').then((x) =>
      setItems(x.data.certificates),
    );
  }, []);
  async function download(id: string) {
    const x = await clientApi<{ data: { download: { url: string } } }>(
      `/me/certificates/${id}/download`,
    );
    window.open(x.data.download.url, '_blank', 'noopener,noreferrer');
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">إنجازات موثّقة</p>
        <h1>الشهادات</h1>
      </header>
      <div className="dashboard-cards">
        {items.map((x) => (
          <article key={x.id}>
            <small>{x.certificateNumber}</small>
            <h3>{x.course.title}</h3>
            <p>{x.issuedAt ? new Date(x.issuedAt).toLocaleDateString('ar-EG') : 'قيد التجهيز'}</p>
            <button
              className="text-button"
              disabled={x.status !== 'GENERATED'}
              onClick={() => void download(x.id)}
            >
              تنزيل PDF
            </button>
          </article>
        ))}
      </div>
      {items.length === 0 && (
        <div className="dashboard-empty">ستظهر شهاداتك هنا بعد إكمال المساق.</div>
      )}
    </>
  );
}

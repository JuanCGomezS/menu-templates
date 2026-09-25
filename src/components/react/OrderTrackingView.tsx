import { useEffect, useState } from 'react';
import { getPublicOrderTracking, type OrderStatus, type PublicOrderTracking } from '../../lib/orders';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Solicitado', accepted: 'Confirmado', preparing: 'En preparación', ready: 'Listo', out_for_delivery: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado',
};

export default function OrderTrackingView({ storeId, trackingCode }: { storeId: string; trackingCode: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [tracking, setTracking] = useState<PublicOrderTracking | null>(null);
  useEffect(() => {
    getPublicOrderTracking(storeId, trackingCode).then((result) => { setTracking(result); setState(result ? 'ready' : 'missing'); }).catch(() => setState('error'));
  }, [storeId, trackingCode]);
  if (state === 'loading') return <div className="rounded-2xl bg-white p-6 text-center shadow" role="status">Consultando estado del pedido…</div>;
  if (state === 'missing') return <div className="rounded-2xl bg-white p-6 text-center shadow">No encontramos ese código de seguimiento.</div>;
  if (state === 'error') return <div className="rounded-2xl bg-red-50 p-6 text-center text-red-700">No fue posible consultar el pedido. Intenta nuevamente.</div>;
  const updated = tracking?.updatedAt?.toDate?.();
  return <section className="rounded-2xl bg-white p-6 text-center shadow" aria-live="polite"><p className="text-sm font-bold uppercase tracking-[.2em] text-orange-600">Seguimiento de pedido</p><h1 className="mt-3 text-3xl font-black text-gray-950">{tracking && STATUS_LABELS[tracking.status]}</h1><p className="mt-3 text-gray-600">{tracking?.type === 'delivery' ? 'Tu pedido a domicilio está siendo atendido.' : 'Tu pedido para mesa o recogida está siendo atendido.'}</p>{updated && <p className="mt-4 text-xs text-gray-500">Actualizado: {updated.toLocaleString()}</p>}<button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full border border-gray-300 px-4 py-2 text-sm font-bold">Actualizar estado</button></section>;
}

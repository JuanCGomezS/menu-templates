import { createContext, useContext, useMemo, useState } from 'react';
import type React from 'react';
import { createPublicOrder, validatePublicOrder, type OrderMode } from '../../lib/orders';
import type { PublicItem, PublicStore } from '../../lib/store-helpers';
import { formatPrice } from '../../lib/utils';
import { withBasePath } from '../../lib/base-path';

type CartLine = { item: PublicItem; quantity: number };
type CartContextValue = { addItem: (item: PublicItem) => void };
const CartContext = createContext<CartContextValue>({ addItem: () => undefined });

export function usePublicOrderCart() { return useContext(CartContext); }

export function PublicOrderCartProvider({ store, children }: { store: PublicStore; children: React.ReactNode }) {
  const [mode, setMode] = useState<OrderMode | null>(store.capabilities?.inStoreOrdering ? 'in_store' : store.capabilities?.deliveryOrdering ? 'delivery' : null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [trackingCode, setTrackingCode] = useState('');

  const addItem = (item: PublicItem) => {
    const available = mode === 'delivery' ? item.availableForDelivery !== false : mode === 'in_store' ? item.availableInStore !== false : false;
    if (!mode) { setNotice('Selecciona una modalidad antes de agregar productos.'); setMinimized(false); return; }
    if (!available) { setNotice(`Este producto no está disponible para ${mode === 'delivery' ? 'domicilio' : 'mesa'}.`); setMinimized(false); return; }
    if (item.trackStock && typeof item.stock === 'number' && item.stock < 1) { setNotice('Este producto está agotado.'); return; }
    setLines((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) return current.map((line) => line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { item, quantity: 1 }];
    });
    setNotice('Producto agregado al pedido.');
  };

  const total = useMemo(() => lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0), [lines]);
  const updateQuantity = (itemId: string, quantity: number) => setLines((current) => quantity < 1 ? current.filter((line) => line.item.id !== itemId) : current.map((line) => line.item.id === itemId ? { ...line, quantity } : line));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode || submitting) return;
    const unavailable = lines.find((line) => (mode === 'delivery' ? line.item.availableForDelivery === false : line.item.availableInStore === false) || (line.item.trackStock && typeof line.item.stock === 'number' && line.quantity > line.item.stock));
    if (unavailable) { setNotice(`${unavailable.item.name} ya no está disponible para esta modalidad o cantidad.`); return; }
    const validation = validatePublicOrder({ customerName, type: mode, items: lines.map((line) => ({ itemId: line.item.id, name: line.item.name, quantity: line.quantity, price: line.item.price })), total, notes, ...(mode === 'in_store' ? { tableNumber: Number(tableNumber) } : { customerPhone, deliveryAddress }) }, store.capabilities || {});
    if (!validation.valid) { setNotice(validation.message); return; }
    try {
      setSubmitting(true); setNotice('Enviando pedido…');
      const requestId = crypto.randomUUID().replace(/-/g, '');
      const code = await createPublicOrder(store.id, validation.value, requestId);
      setTrackingCode(code);
      setLines([]); setCustomerName(''); setTableNumber(''); setCustomerPhone(''); setDeliveryAddress(''); setNotes(''); setNotice('Pedido enviado correctamente. La tienda lo confirmará pronto.');
    } catch (error) {
      console.error('No se pudo crear el pedido:', error);
      setNotice('No se pudo enviar. Reintenta; tu carrito se conserva.');
    } finally { setSubmitting(false); }
  };

  const trackingUrl = trackingCode && typeof window !== 'undefined' ? `${window.location.origin}${withBasePath(`/t/${store.slug}?pedido=${trackingCode}`)}` : '';
  const shareTracking = async () => { if (navigator.share) await navigator.share({ title: 'Seguimiento de pedido', url: trackingUrl }); else await navigator.clipboard.writeText(trackingUrl); };

  return <CartContext.Provider value={{ addItem }}><>{children}</><aside className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-orange-200 bg-white p-4 shadow-2xl" aria-label="Carrito de pedido"><button type="button" onClick={() => setMinimized((value) => !value)} className="flex w-full items-center justify-between text-left font-black text-gray-950"><span>🛒 Pedido ({lines.reduce((sum, line) => sum + line.quantity, 0)})</span><span className="text-sm text-orange-700">{minimized ? 'Abrir' : 'Minimizar'}</span></button>{!minimized && <form onSubmit={submit} className="mt-3 space-y-3"><div className="grid grid-cols-2 gap-2"><button type="button" disabled={!store.capabilities?.inStoreOrdering} onClick={() => { setMode('in_store'); setLines([]); }} className={`rounded-lg p-2 text-sm font-bold ${mode === 'in_store' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>En mesa</button><button type="button" disabled={!store.capabilities?.deliveryOrdering} onClick={() => { setMode('delivery'); setLines([]); }} className={`rounded-lg p-2 text-sm font-bold ${mode === 'delivery' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Domicilio</button></div>{lines.length ? <ul className="max-h-32 space-y-1 overflow-auto text-sm">{lines.map((line) => <li key={line.item.id} className="flex items-center justify-between gap-2"><span>{line.item.name} × {line.quantity}</span><span className="flex items-center gap-1"><button type="button" onClick={() => updateQuantity(line.item.id, line.quantity - 1)} aria-label={`Quitar ${line.item.name}`}>−</button><button type="button" onClick={() => updateQuantity(line.item.id, line.quantity + 1)} aria-label={`Agregar ${line.item.name}`}>+</button></span></li>)}</ul> : <p className="text-sm text-gray-500">Agrega productos del menú.</p>}<p className="text-right text-sm font-black">Total: {formatPrice(total, store.currency)}</p><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Tu nombre" className="w-full rounded-lg border p-2 text-sm" required />{mode === 'in_store' ? <input value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} type="number" min="1" max="999" placeholder="Número de mesa" className="w-full rounded-lg border p-2 text-sm" required /> : <><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} type="tel" placeholder="Teléfono" className="w-full rounded-lg border p-2 text-sm" required /><input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Dirección" className="w-full rounded-lg border p-2 text-sm" required /></>}<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas (opcional)" className="w-full rounded-lg border p-2 text-sm" /><button disabled={!lines.length || !mode || submitting} className="w-full rounded-lg bg-gray-950 p-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Enviando…' : 'Confirmar pedido'}</button>{trackingCode && <div className="rounded-xl bg-green-50 p-3 text-xs text-green-900"><p className="font-bold">Código: {trackingCode}</p><a className="mt-1 block break-all underline" href={trackingUrl}>Ver seguimiento</a><div className="mt-2 flex gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(trackingUrl)} className="font-bold underline">Copiar enlace</button><button type="button" onClick={() => void shareTracking()} className="font-bold underline">Compartir</button></div></div>}{notice && <p aria-live="polite" className="text-center text-xs text-gray-600">{notice}</p>}</form>}</aside></CartContext.Provider>;
}

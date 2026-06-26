import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, writeBatch, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { auth, db } from '../../lib/firebase';
import { getUserProfile, ROLES } from '../../lib/auth';
import { getAllTemplates, getAllThemes } from '../../lib/templates';
import { withBasePath } from '../../lib/base-path';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import Messaging, { type MessageTone } from './Messaging';

type StoreType = 'restaurant' | 'food_business' | 'product_store';
type PlanType = 'free_trial' | 'standard' | 'plus' | 'premium';
type Currency = 'COP' | 'USD' | 'EUR';
type EditorMode = 'create' | 'edit';
type TabId = 'general' | 'design' | 'operation' | 'products' | 'superadmin';

interface StoreData {
  id: string;
  name?: string;
  slug?: string;
  active?: boolean;
  type?: StoreType;
  ownerUid?: string;
  templateId?: string;
  themeId?: string;
  currency?: Currency;
  plan?: PlanType;
  limits?: {
    maxProducts?: number;
    maxCategories?: number;
    maxImages?: number;
  };
  contact?: {
    whatsapp?: string;
    instagram?: string;
    address?: string;
    deliveryNotes?: string;
  };
  schedule?: Record<string, { open?: string; close?: string; closed?: boolean }>;
}

interface StoreFormState {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  type: StoreType;
  templateId: string;
  themeId: string;
  currency: Currency;
  plan: PlanType;
  maxProducts: string;
  maxCategories: string;
  maxImages: string;
  whatsapp: string;
  instagram: string;
  address: string;
  deliveryNotes: string;
  storeAdminEmail: string;
  ownerUid: string;
  schedule: Record<string, { open: string; close: string; closed: boolean }>;
}

const STORE_TYPES: Array<{ value: StoreType; label: string }> = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'food_business', label: 'Emprendimiento de comida' },
  { value: 'product_store', label: 'Catálogo de productos' },
];

const PLANS: Array<{ value: PlanType; label: string }> = [
  { value: 'free_trial', label: 'Prueba gratis' },
  { value: 'standard', label: 'Standard' },
  { value: 'plus', label: 'Plus' },
  { value: 'premium', label: 'Premium' },
];

const CURRENCIES: Currency[] = ['COP', 'USD', 'EUR'];

const TABS: Array<{ id: TabId; label: string; description: string }> = [
  { id: 'general', label: 'Datos principales', description: 'Información editable por la tienda.' },
  { id: 'design', label: 'Diseño', description: 'Template y apariencia pública.' },
  { id: 'operation', label: 'Operación', description: 'Contacto, domicilio y horarios.' },
  { id: 'products', label: 'Productos', description: 'Categorías, productos y stock.' },
  { id: 'superadmin', label: 'Superadmin', description: 'Plan, límites, slug y control interno.' },
];

const WEEK_DAYS = [
  ['monday', 'Lunes'],
  ['tuesday', 'Martes'],
  ['wednesday', 'Miércoles'],
  ['thursday', 'Jueves'],
  ['friday', 'Viernes'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
] as const;

const INPUT_CLASS = 'w-full rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';

function createDefaultSchedule(): StoreFormState['schedule'] {
  return Object.fromEntries(
    WEEK_DAYS.map(([day]) => [day, { open: '08:00', close: '18:00', closed: false }])
  ) as StoreFormState['schedule'];
}

function emptyForm(): StoreFormState {
  return {
    id: '',
    name: '',
    slug: '',
    active: true,
    type: 'restaurant',
    templateId: 'restaurant-classic',
    themeId: 'theme-default',
    currency: 'COP',
    plan: 'free_trial',
    maxProducts: '100',
    maxCategories: '20',
    maxImages: '30',
    whatsapp: '',
    instagram: '',
    address: '',
    deliveryNotes: '',
    storeAdminEmail: '',
    ownerUid: '',
    schedule: createDefaultSchedule(),
  };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formFromStore(store: StoreData): StoreFormState {
  const defaults = emptyForm();

  return {
    ...defaults,
    id: store.id,
    name: store.name || '',
    slug: store.slug || '',
    active: store.active !== false,
    type: store.type || defaults.type,
    templateId: store.templateId || defaults.templateId,
    themeId: store.themeId || defaults.themeId,
    currency: store.currency || defaults.currency,
    plan: store.plan || defaults.plan,
    maxProducts: String(store.limits?.maxProducts ?? defaults.maxProducts),
    maxCategories: String(store.limits?.maxCategories ?? defaults.maxCategories),
    maxImages: String(store.limits?.maxImages ?? defaults.maxImages),
    whatsapp: store.contact?.whatsapp || '',
    instagram: store.contact?.instagram || '',
    address: store.contact?.address || '',
    deliveryNotes: store.contact?.deliveryNotes || '',
    ownerUid: store.ownerUid || '',
    schedule: Object.fromEntries(
      WEEK_DAYS.map(([day]) => [
        day,
        {
          open: store.schedule?.[day]?.open || defaults.schedule[day].open,
          close: store.schedule?.[day]?.close || defaults.schedule[day].close,
          closed: store.schedule?.[day]?.closed ?? defaults.schedule[day].closed,
        },
      ])
    ) as StoreFormState['schedule'],
  };
}

function toPositiveNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function makeStorePayload(form: StoreFormState) {
  return {
    name: form.name.trim(),
    slug: normalizeSlug(form.slug),
    active: form.active,
    type: form.type,
    templateId: form.templateId,
    themeId: form.themeId,
    currency: form.currency,
    plan: form.plan,
    limits: {
      maxProducts: toPositiveNumber(form.maxProducts, 100),
      maxCategories: toPositiveNumber(form.maxCategories, 20),
      maxImages: toPositiveNumber(form.maxImages, 30),
    },
    contact: {
      whatsapp: form.whatsapp.trim(),
      instagram: form.instagram.trim(),
      address: form.address.trim(),
      deliveryNotes: form.deliveryNotes.trim(),
    },
    schedule: form.schedule,
    updatedAt: serverTimestamp(),
  };
}

export default function StoreEditorPage() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [mode, setMode] = useState<EditorMode>('create');
  const [form, setForm] = useState<StoreFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const templates = useMemo(() => getAllTemplates(), []);
  const themes = useMemo(() => getAllThemes(), []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.assign(withBasePath('/login'));
        return;
      }

      const profile = await getUserProfile(user);

      if (profile?.role !== ROLES.SUPERADMIN) {
        setStatus('denied');
        return;
      }

      const storeId = new URLSearchParams(window.location.search).get('storeId');

      if (!storeId) {
        setMode('create');
        setForm(emptyForm());
        setStatus('allowed');
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'stores', storeId));

        if (!snapshot.exists()) {
          setError('No encontramos esa tienda.');
          setStatus('allowed');
          return;
        }

        setMode('edit');
        setForm(formFromStore({ id: snapshot.id, ...snapshot.data() } as StoreData));
        setStatus('allowed');
      } catch (err) {
        console.error('Error al cargar tienda:', err);
        setError('No pudimos cargar la tienda.');
        setStatus('allowed');
      }
    });
  }, []);

  const updateForm = <K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateSchedule = (day: string, key: 'open' | 'close' | 'closed', value: string | boolean) => {
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [day]: {
          ...current.schedule[day],
          [key]: value,
        },
      },
    }));
  };

  const getStoreAdminUserId = async (email: string) => {
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    if (!trimmedEmail) return null;

    for (const emailCandidate of Array.from(new Set([trimmedEmail, normalizedEmail]))) {
      const usersQuery = query(collection(db, 'users'), where('email', '==', emailCandidate), limit(1));
      const snapshot = await getDocs(usersQuery);

      if (!snapshot.empty) {
        return { userId: snapshot.docs[0].id, email: normalizedEmail };
      }
    }

    throw new Error('Ese usuario debe registrarse primero desde /login para quedar como customer.');
  };

  const assertUniqueSlug = async (slug: string, currentStoreId?: string) => {
    const storesQuery = query(collection(db, 'stores'), where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(storesQuery);

    if (!snapshot.empty && snapshot.docs[0].id !== currentStoreId) {
      throw new Error('Ya existe una tienda con ese slug. Usa otro slug antes de guardar.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const slug = normalizeSlug(form.slug || form.name);

    if (!form.name.trim() || !slug || !form.type || !form.templateId) {
      setError('Nombre, slug, tipo y plantilla son obligatorios.');
      return;
    }

    setSaving(true);

    try {
      const payload = makeStorePayload({ ...form, slug });
      const storeAdmin = await getStoreAdminUserId(form.storeAdminEmail);
      const storeRef = mode === 'edit' && form.id ? doc(db, 'stores', form.id) : doc(collection(db, 'stores'));
      const storeId = storeRef.id;
      const previousOwnerRef = storeAdmin && mode === 'edit' && form.ownerUid && form.ownerUid !== storeAdmin.userId
        ? doc(db, 'users', form.ownerUid)
        : null;
      const previousOwnerSnapshot = previousOwnerRef ? await getDoc(previousOwnerRef) : null;

      await assertUniqueSlug(slug, mode === 'edit' ? storeId : undefined);

      const batch = writeBatch(db);
      batch.set(storeRef, mode === 'create' ? { ...payload, createdAt: serverTimestamp() } : payload, { merge: true });

      if (storeAdmin) {
        const previousOwnerData = previousOwnerSnapshot?.data();

        if (previousOwnerRef && previousOwnerData?.role === ROLES.STOREADMIN && previousOwnerData.storeId === storeId) {
          batch.update(previousOwnerRef, {
            role: ROLES.CUSTOMER,
            storeId: null,
            storeSlug: null,
            updatedAt: serverTimestamp(),
          });
        }

        batch.update(doc(db, 'users', storeAdmin.userId), {
          role: ROLES.STOREADMIN,
          storeId,
          storeSlug: slug,
          updatedAt: serverTimestamp(),
        });
        batch.set(storeRef, { ownerUid: storeAdmin.userId, updatedAt: serverTimestamp() }, { merge: true });
      } else if (mode === 'edit' && form.ownerUid) {
        batch.update(doc(db, 'users', form.ownerUid), {
          storeId,
          storeSlug: slug,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      setMode('edit');
      setForm({ ...form, id: storeId, slug, storeAdminEmail: '', ownerUid: storeAdmin?.userId || form.ownerUid });
      window.history.replaceState(null, '', withBasePath(`/admin/store/?storeId=${storeId}`));
      setMessageTone('done');
      setMessage(mode === 'create' ? 'Tienda creada correctamente.' : 'Tienda actualizada correctamente.');
    } catch (err) {
      console.error('Error al guardar tienda:', err);
      setError(err instanceof Error ? err.message : 'No pudimos guardar la tienda. Revisa permisos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return <EditorShell title="Configurar tienda" />;
  }

  if (status === 'denied') {
    return <EditorShell title="No tienes permiso para configurar tiendas." />;
  }

  return (
    <EditorShell title={mode === 'create' ? 'Crear tienda' : `Editar ${form.name || 'tienda'}`}>
      <Messaging message={message} tone={messageTone} onClose={() => setMessage(null)} />
      {error && <Messaging message={error} tone="error" onClose={() => setError(null)} />}

      <div className="mt-6 flex flex-wrap gap-3">
        <a href={withBasePath('/admin')} className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-700 transition hover:border-gray-950">
          Volver al listado
        </a>
        {mode === 'edit' && (
          <>
            {form.slug && (
              <a href={withBasePath(`/t/${form.slug}`)} target="_blank" rel="noreferrer" className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-700 transition hover:border-gray-950">
                Ver tienda
              </a>
            )}
            <a href={withBasePath('/admin/store/')} className="rounded-xl bg-gray-950 px-4 py-2 font-bold text-white transition hover:bg-gray-800">
              Crear otra tienda
            </a>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-950'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">{TABS.find((tab) => tab.id === activeTab)?.description}</p>
        </div>

        <div className="p-5">
          {activeTab === 'general' && (
            <div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Nombre"><input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={INPUT_CLASS} required /></Field>
                <Field label="Tipo de tienda"><select value={form.type} onChange={(event) => updateForm('type', event.target.value as StoreType)} className={INPUT_CLASS} required>{STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
                <Field label="Moneda"><select value={form.currency} onChange={(event) => updateForm('currency', event.target.value as Currency)} className={INPUT_CLASS}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></Field>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Plantilla"><select value={form.templateId} onChange={(event) => updateForm('templateId', event.target.value)} className={INPUT_CLASS} required>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
                <Field label="Tema"><select value={form.themeId} onChange={(event) => updateForm('themeId', event.target.value)} className={INPUT_CLASS}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></Field>
              </div>
            </div>
          )}

          {activeTab === 'operation' && (
            <div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="WhatsApp"><input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} className={INPUT_CLASS} placeholder="+57 300 123 4567" /></Field>
                <Field label="Instagram"><input value={form.instagram} onChange={(event) => updateForm('instagram', event.target.value)} className={INPUT_CLASS} placeholder="@mitienda" /></Field>
                <Field label="Dirección"><input value={form.address} onChange={(event) => updateForm('address', event.target.value)} className={INPUT_CLASS} /></Field>
                <Field label="Notas de domicilio"><input value={form.deliveryNotes} onChange={(event) => updateForm('deliveryNotes', event.target.value)} className={INPUT_CLASS} /></Field>
              </div>

              <SectionTitle title="Horario" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {WEEK_DAYS.map(([day, label]) => (
                  <div key={day} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm">
                    <label className="flex items-center gap-2 font-semibold text-gray-700">
                      <input type="checkbox" checked={form.schedule[day].closed} onChange={(event) => updateSchedule(day, 'closed', event.target.checked)} className="h-4 w-4 accent-orange-600" />
                      {label}
                    </label>
                    <input type="time" value={form.schedule[day].open} disabled={form.schedule[day].closed} onChange={(event) => updateSchedule(day, 'open', event.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40" />
                    <input type="time" value={form.schedule[day].close} disabled={form.schedule[day].closed} onChange={(event) => updateSchedule(day, 'close', event.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
                <p className="font-bold text-gray-950">Este módulo queda preparado para la siguiente etapa.</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Acá vamos a manejar categorías, productos, disponibilidad, variantes y stock. No lo mezclo todavía con la configuración general porque sería una trampa: productos necesita su propio flujo de CRUD y validaciones.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'superadmin' && (
            <div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Slug público"><input value={form.slug} onChange={(event) => updateForm('slug', normalizeSlug(event.target.value))} className={INPUT_CLASS} placeholder="mi-tienda" required /></Field>
                <Field label="Plan"><select value={form.plan} onChange={(event) => updateForm('plan', event.target.value as PlanType)} className={INPUT_CLASS}>{PLANS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}</select></Field>
                <Field label="Asignar storeadmin por correo"><input type="email" value={form.storeAdminEmail} onChange={(event) => updateForm('storeAdminEmail', event.target.value)} className={INPUT_CLASS} placeholder="correo@ejemplo.com" /></Field>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700">
                  <input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} className="h-4 w-4 accent-orange-600" />
                  Tienda activa
                </label>
              </div>

              <SectionTitle title="Límites comerciales" />
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Máx. productos"><input type="number" min="1" value={form.maxProducts} onChange={(event) => updateForm('maxProducts', event.target.value)} className={INPUT_CLASS} /></Field>
                <Field label="Máx. categorías"><input type="number" min="1" value={form.maxCategories} onChange={(event) => updateForm('maxCategories', event.target.value)} className={INPUT_CLASS} /></Field>
                <Field label="Máx. imágenes"><input type="number" min="1" value={form.maxImages} onChange={(event) => updateForm('maxImages', event.target.value)} className={INPUT_CLASS} /></Field>
              </div>
            </div>
          )}
        </div>

        <div className="m-6 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Guardando...' : mode === 'create' ? 'Crear tienda' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </EditorShell>
  );
}

function SectionTitle({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div className="mt-8 first:mt-0">
      {eyebrow && <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">{eyebrow}</p>}
      <h2 className="mt-1 text-lg font-black text-gray-950">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function EditorShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fff8ef] text-gray-950">
      <AppHeader />
      <section className="mx-auto min-h-[calc(100vh-9rem)] max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        {children}
      </section>
      <AppFooter />
    </main>
  );
}

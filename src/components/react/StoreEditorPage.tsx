import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, writeBatch, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { auth, db } from '../../lib/firebase';
import { getUserProfile, ROLES } from '../../lib/auth';
import { clearPublicStoreCache } from '../../lib/public-store-data';
import type { PublicStore } from '../../lib/store-helpers';
import { getAllTemplates, getAllThemes, resolveStoreTheme, resolveTemplate } from '../../lib/templates';
import { withBasePath } from '../../lib/base-path';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import Messaging, { type MessageTone } from './Messaging';
import { PublicStoreTemplateView } from './RestaurantMenuView';

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
  capabilities?: StoreCapabilities;
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
  inStoreOrdering: boolean;
  deliveryOrdering: boolean;
  stockControl: boolean;
  whatsapp: string;
  instagram: string;
  address: string;
  deliveryNotes: string;
  storeAdminEmail: string;
  ownerUid: string;
  schedule: Record<string, { open: string; close: string; closed: boolean }>;
}

interface StoreCapabilities {
  inStoreOrdering?: boolean;
  deliveryOrdering?: boolean;
  stockControl?: boolean;
  [key: string]: boolean | undefined;
}

interface CategoryDraft {
  id: string;
  name: string;
  active: boolean;
  order: string;
}

interface ProductDraft {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  active: boolean;
  order: string;
  trackStock: boolean;
  stock: string;
  availableInStore: boolean;
  availableForDelivery: boolean;
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

const INPUT_CLASS = 'w-full rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-100';
const COMPACT_INPUT_CLASS = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-100';

type PreviewItem = {
  name: string;
  description: string;
  price: number;
};

type PreviewCategory = {
  name: string;
  items: PreviewItem[];
};

const PREVIEW_CATEGORIES: Record<StoreType, PreviewCategory[]> = {
  restaurant: [
    {
      name: 'Entradas y platos fuertes',
      items: [
        { name: 'Sopa de temporada', description: 'Preparación de la casa con ingredientes frescos.', price: 18000 },
        { name: 'Plato especial', description: 'Proteína, acompañamiento y ensalada del día.', price: 34000 },
      ],
    },
    {
      name: 'Bebidas',
      items: [
        { name: 'Limonada natural', description: 'Fría, cítrica y preparada al momento.', price: 9000 },
      ],
    },
  ],
  food_business: [
    {
      name: 'Favoritos',
      items: [
        { name: 'Combo de la casa', description: 'Producto principal, acompañante y bebida.', price: 26000 },
        { name: 'Postre artesanal', description: 'Porción individual lista para compartir.', price: 12000 },
      ],
    },
    {
      name: 'Promos',
      items: [
        { name: 'Dúo especial', description: 'Dos unidades seleccionadas por temporada.', price: 22000 },
      ],
    },
  ],
  product_store: [
    {
      name: 'Colección destacada',
      items: [
        { name: 'Producto esencial', description: 'Referencia principal con alta rotación.', price: 45000 },
        { name: 'Set de regalo', description: 'Presentación lista para entregar.', price: 78000 },
      ],
    },
    {
      name: 'Novedades',
      items: [
        { name: 'Edición limitada', description: 'Disponible por temporada.', price: 59000 },
      ],
    },
  ],
};

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
    templateId: 'layout-minimal',
    themeId: 'theme-default',
    currency: 'COP',
    plan: 'free_trial',
    maxProducts: '100',
    maxCategories: '20',
    maxImages: '30',
    inStoreOrdering: false,
    deliveryOrdering: false,
    stockControl: false,
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
  const resolvedTemplate = resolveTemplate(store.templateId || defaults.templateId);
  const resolvedTheme = resolveStoreTheme(store.templateId || defaults.templateId, store.themeId);

  return {
    ...defaults,
    id: store.id,
    name: store.name || '',
    slug: store.slug || '',
    active: store.active !== false,
    type: store.type || defaults.type,
    templateId: resolvedTemplate.id,
    themeId: resolvedTheme.id,
    currency: store.currency || defaults.currency,
    plan: store.plan || defaults.plan,
    maxProducts: String(store.limits?.maxProducts ?? defaults.maxProducts),
    maxCategories: String(store.limits?.maxCategories ?? defaults.maxCategories),
    maxImages: String(store.limits?.maxImages ?? defaults.maxImages),
    inStoreOrdering: store.capabilities?.inStoreOrdering === true,
    deliveryOrdering: store.capabilities?.deliveryOrdering === true,
    stockControl: store.capabilities?.stockControl === true,
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

function toOptionalNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDraftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCategoryDraft(order: number): CategoryDraft {
  return {
    id: createDraftId('category'),
    name: '',
    active: true,
    order: String(order),
  };
}

function createProductDraft(categoryId: string, order: number): ProductDraft {
  return {
    id: createDraftId('item'),
    categoryId,
    name: '',
    description: '',
    price: '',
    active: true,
    order: String(order),
    trackStock: false,
    stock: '0',
    availableInStore: true,
    availableForDelivery: true,
  };
}

function makeStorePayload(form: StoreFormState) {
  return {
    name: form.name.trim(),
    slug: normalizeSlug(form.slug),
    active: form.active,
    isActive: form.active,
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
    capabilities: {
      inStoreOrdering: form.inStoreOrdering,
      deliveryOrdering: form.deliveryOrdering,
      stockControl: form.stockControl,
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
  const [isDirty, setIsDirty] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>([]);
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([]);

  const templates = useMemo(() => getAllTemplates(), []);
  const themes = useMemo(() => getAllThemes(), []);
  const designPreviewStore = useMemo(() => makePreviewStore(form, categoryDrafts, productDrafts), [form, categoryDrafts, productDrafts]);

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
        setCategoryDrafts([]);
        setProductDrafts([]);
        setIsDirty(false);
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
        await loadStoreProducts(snapshot.id);
        setIsDirty(false);
        setStatus('allowed');
      } catch (err) {
        console.error('Error al cargar tienda:', err);
        setError('No pudimos cargar la tienda.');
        setStatus('allowed');
      }
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || saving) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  const updateForm = <K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const loadStoreProducts = async (storeId: string) => {
    const [categoriesSnapshot, itemsSnapshot] = await Promise.all([
      getDocs(collection(db, 'stores', storeId, 'categories')),
      getDocs(collection(db, 'stores', storeId, 'items')),
    ]);

    setCategoryDrafts(categoriesSnapshot.docs.map((categoryDoc) => {
      const data = categoryDoc.data();
      return {
        id: categoryDoc.id,
        name: typeof data.name === 'string' ? data.name : '',
        active: data.active !== false,
        order: String(data.order ?? 0),
      };
    }).sort((a, b) => toOptionalNumber(a.order) - toOptionalNumber(b.order)));

    setProductDrafts(itemsSnapshot.docs.map((itemDoc) => {
      const data = itemDoc.data();
      return {
        id: itemDoc.id,
        categoryId: typeof data.categoryId === 'string' ? data.categoryId : '',
        name: typeof data.name === 'string' ? data.name : '',
        description: typeof data.description === 'string' ? data.description : '',
        price: String(data.price ?? ''),
        active: data.active !== false,
        order: String(data.order ?? 0),
        trackStock: data.trackStock === true,
        stock: String(data.stock ?? 0),
        availableInStore: data.availableInStore !== false,
        availableForDelivery: data.availableForDelivery !== false,
      };
    }).sort((a, b) => toOptionalNumber(a.order) - toOptionalNumber(b.order)));
  };

  const addCategory = () => {
    setCategoryDrafts((current) => [...current, createCategoryDraft(current.length)]);
    setIsDirty(true);
  };

  const updateCategory = <K extends keyof CategoryDraft>(id: string, key: K, value: CategoryDraft[K]) => {
    setCategoryDrafts((current) => current.map((category) => category.id === id ? { ...category, [key]: value } : category));
    setIsDirty(true);
  };

  const removeCategory = (id: string) => {
    setCategoryDrafts((current) => current.filter((category) => category.id !== id));
    setProductDrafts((current) => current.filter((product) => product.categoryId !== id));
    setIsDirty(true);
  };

  const addProduct = (categoryId: string) => {
    setProductDrafts((current) => [
      ...current,
      createProductDraft(categoryId, current.filter((product) => product.categoryId === categoryId).length),
    ]);
    setIsDirty(true);
  };

  const updateProduct = <K extends keyof ProductDraft>(id: string, key: K, value: ProductDraft[K]) => {
    setProductDrafts((current) => current.map((product) => product.id === id ? { ...product, [key]: value } : product));
    setIsDirty(true);
  };

  const removeProduct = (id: string) => {
    setProductDrafts((current) => current.filter((product) => product.id !== id));
    setIsDirty(true);
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

    const categoriesToSave = categoryDrafts
      .map((category, index) => ({
        ...category,
        name: category.name.trim(),
        order: toOptionalNumber(category.order || String(index)),
      }))
      .filter((category) => category.name);
    const categoryIds = new Set(categoriesToSave.map((category) => category.id));
    const productsToSave = productDrafts
      .map((product, index) => ({
        ...product,
        name: product.name.trim(),
        description: product.description.trim(),
        price: toOptionalNumber(product.price),
        order: toOptionalNumber(product.order || String(index)),
        stock: toOptionalNumber(product.stock),
      }))
      .filter((product) => product.name && categoryIds.has(product.categoryId));

    if (categoriesToSave.length > toPositiveNumber(form.maxCategories, 20)) {
      setError('La tienda supera el límite de categorías configurado.');
      return;
    }

    if (productsToSave.length > toPositiveNumber(form.maxProducts, 100)) {
      setError('La tienda supera el límite de productos configurado.');
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

      const [existingCategoriesSnapshot, existingItemsSnapshot] = await Promise.all([
        getDocs(collection(db, 'stores', storeId, 'categories')),
        getDocs(collection(db, 'stores', storeId, 'items')),
      ]);

      const batch = writeBatch(db);
      batch.set(storeRef, mode === 'create' ? { ...payload, createdAt: serverTimestamp() } : payload, { merge: true });

      const savedCategoryIds = new Set(categoriesToSave.map((category) => category.id));
      const savedProductIds = new Set(productsToSave.map((product) => product.id));

      existingCategoriesSnapshot.docs.forEach((categoryDoc) => {
        if (!savedCategoryIds.has(categoryDoc.id)) {
          batch.delete(categoryDoc.ref);
        }
      });

      existingItemsSnapshot.docs.forEach((itemDoc) => {
        if (!savedProductIds.has(itemDoc.id)) {
          batch.delete(itemDoc.ref);
        }
      });

      categoriesToSave.forEach((category) => {
        batch.set(doc(db, 'stores', storeId, 'categories', category.id), {
          name: category.name,
          active: category.active,
          order: category.order,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      productsToSave.forEach((product) => {
        batch.set(doc(db, 'stores', storeId, 'items', product.id), {
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          active: product.active,
          order: product.order,
          ...(form.stockControl ? { trackStock: product.trackStock, stock: product.trackStock ? product.stock : 0 } : {}),
          ...(form.inStoreOrdering ? { availableInStore: product.availableInStore } : {}),
          ...(form.deliveryOrdering ? { availableForDelivery: product.availableForDelivery } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

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

      clearPublicStoreCache(slug, storeId);
      if (mode === 'edit' && form.slug && form.slug !== slug) {
        clearPublicStoreCache(form.slug, storeId);
      }

      setMode('edit');
      setForm({ ...form, id: storeId, slug, storeAdminEmail: '', ownerUid: storeAdmin?.userId || form.ownerUid });
      setCategoryDrafts(categoriesToSave.map((category) => ({ ...category, order: String(category.order) })));
      setProductDrafts(productsToSave.map((product) => ({ ...product, price: String(product.price), order: String(product.order), stock: String(product.stock) })));
      setIsDirty(false);
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
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Secciones de configuración de tienda">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`store-editor-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${activeTab === tab.id ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-950'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">{TABS.find((tab) => tab.id === activeTab)?.description}</p>
        </div>

        <div className="p-5">
          {activeTab === 'general' && (
            <div id="store-editor-general" role="tabpanel">
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Nombre"><input name="storeName" autoComplete="organization" value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={INPUT_CLASS} required /></Field>
                <Field label="Tipo de tienda"><select name="storeType" value={form.type} onChange={(event) => updateForm('type', event.target.value as StoreType)} className={INPUT_CLASS} required>{STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
                <Field label="Moneda"><select name="currency" value={form.currency} onChange={(event) => updateForm('currency', event.target.value as Currency)} className={INPUT_CLASS}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></Field>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div id="store-editor-design" role="tabpanel">
              <div className="mt-4 space-y-5">
                <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(16rem,0.7fr)]">
                  <Field label="Plantilla"><select name="templateId" value={form.templateId} onChange={(event) => updateForm('templateId', event.target.value)} className={COMPACT_INPUT_CLASS} required>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
                  <Field label="Tema"><select name="themeId" value={form.themeId} onChange={(event) => updateForm('themeId', event.target.value)} className={COMPACT_INPUT_CLASS}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></Field>
                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-orange-950">
                    <p className="font-black">Vista previa en vivo</p>
                    <p className="mt-1">Se actualiza con los cambios del formulario antes de guardar.</p>
                  </div>
                </div>
                <DesignPreview store={designPreviewStore} />
              </div>
            </div>
          )}

          {activeTab === 'operation' && (
            <div id="store-editor-operation" role="tabpanel">
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="WhatsApp"><input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} className={INPUT_CLASS} placeholder="Ej. +57 300 123 4567…" /></Field>
                <Field label="Instagram"><input name="instagram" autoComplete="off" spellCheck={false} value={form.instagram} onChange={(event) => updateForm('instagram', event.target.value)} className={INPUT_CLASS} placeholder="Ej. @mitienda…" /></Field>
                <Field label="Dirección"><input name="address" autoComplete="street-address" value={form.address} onChange={(event) => updateForm('address', event.target.value)} className={INPUT_CLASS} /></Field>
                <Field label="Notas de domicilio"><input name="deliveryNotes" autoComplete="off" value={form.deliveryNotes} onChange={(event) => updateForm('deliveryNotes', event.target.value)} className={INPUT_CLASS} /></Field>
              </div>

              <SectionTitle title="Horario" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {WEEK_DAYS.map(([day, label]) => (
                  <div key={day} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm">
                    <label className="flex items-center gap-2 font-semibold text-gray-700">
                      <input type="checkbox" checked={form.schedule[day].closed} onChange={(event) => updateSchedule(day, 'closed', event.target.checked)} className="h-4 w-4 accent-orange-600" />
                      {label}
                    </label>
                    <input aria-label={`Hora de apertura ${label}`} name={`${day}Open`} type="time" value={form.schedule[day].open} disabled={form.schedule[day].closed} onChange={(event) => updateSchedule(day, 'open', event.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40" />
                    <input aria-label={`Hora de cierre ${label}`} name={`${day}Close`} type="time" value={form.schedule[day].close} disabled={form.schedule[day].closed} onChange={(event) => updateSchedule(day, 'close', event.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div id="store-editor-products" role="tabpanel">
              <div className="mt-4 space-y-5">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
                  <p className="font-black">Menú base</p>
                  <p>Las categorías y productos alimentan la tienda pública. Stock y opciones de pedido aparecen solo si el superadmin habilita esas capacidades.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle title="Categorías y productos" />
                  <button type="button" onClick={addCategory} className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
                    Agregar categoría
                  </button>
                </div>

                {categoryDrafts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm leading-6 text-gray-600">
                    Todavía no hay categorías. Agregá una para empezar a cargar productos reales; mientras tanto el preview usa datos de ejemplo.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryDrafts.map((category) => {
                      const categoryProducts = productDrafts.filter((product) => product.categoryId === category.id);

                      return (
                        <section key={category.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto_auto] md:items-end">
                            <Field label="Categoría"><input value={category.name} onChange={(event) => updateCategory(category.id, 'name', event.target.value)} className={COMPACT_INPUT_CLASS} placeholder="Ej. Entradas" /></Field>
                            <Field label="Orden"><input type="number" inputMode="numeric" value={category.order} onChange={(event) => updateCategory(category.id, 'order', event.target.value)} className={COMPACT_INPUT_CLASS} /></Field>
                            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
                              <input type="checkbox" checked={category.active} onChange={(event) => updateCategory(category.id, 'active', event.target.checked)} className="h-4 w-4 accent-orange-600" />
                              Activa
                            </label>
                            <button type="button" onClick={() => removeCategory(category.id)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50">
                              Eliminar
                            </button>
                          </div>

                          <div className="mt-4 space-y-3">
                            {categoryProducts.map((product) => (
                              <div key={product.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_8rem_6rem_auto] lg:items-end">
                                  <Field label="Producto"><input value={product.name} onChange={(event) => updateProduct(product.id, 'name', event.target.value)} className={COMPACT_INPUT_CLASS} placeholder="Ej. Plato especial" /></Field>
                                  <Field label="Descripción"><input value={product.description} onChange={(event) => updateProduct(product.id, 'description', event.target.value)} className={COMPACT_INPUT_CLASS} placeholder="Descripción corta" /></Field>
                                  <Field label="Precio"><input type="number" inputMode="decimal" min="0" step="0.01" value={product.price} onChange={(event) => updateProduct(product.id, 'price', event.target.value)} className={COMPACT_INPUT_CLASS} /></Field>
                                  <Field label="Orden"><input type="number" inputMode="numeric" value={product.order} onChange={(event) => updateProduct(product.id, 'order', event.target.value)} className={COMPACT_INPUT_CLASS} /></Field>
                                  <button type="button" onClick={() => removeProduct(product.id)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50">
                                    Quitar
                                  </button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-gray-700">
                                  <label className="flex items-center gap-2"><input type="checkbox" checked={product.active} onChange={(event) => updateProduct(product.id, 'active', event.target.checked)} className="h-4 w-4 accent-orange-600" /> Visible</label>
                                  {form.inStoreOrdering && <label className="flex items-center gap-2"><input type="checkbox" checked={product.availableInStore} onChange={(event) => updateProduct(product.id, 'availableInStore', event.target.checked)} className="h-4 w-4 accent-orange-600" /> Pedido en tienda</label>}
                                  {form.deliveryOrdering && <label className="flex items-center gap-2"><input type="checkbox" checked={product.availableForDelivery} onChange={(event) => updateProduct(product.id, 'availableForDelivery', event.target.checked)} className="h-4 w-4 accent-orange-600" /> Domicilio</label>}
                                </div>

                                {form.stockControl && (
                                  <div className="mt-3 grid gap-3 sm:grid-cols-[auto_10rem] sm:items-end">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={product.trackStock} onChange={(event) => updateProduct(product.id, 'trackStock', event.target.checked)} className="h-4 w-4 accent-orange-600" /> Controlar stock</label>
                                    <Field label="Stock"><input type="number" inputMode="numeric" min="0" value={product.stock} disabled={!product.trackStock} onChange={(event) => updateProduct(product.id, 'stock', event.target.value)} className={COMPACT_INPUT_CLASS} /></Field>
                                  </div>
                                )}
                              </div>
                            ))}

                            <button type="button" onClick={() => addProduct(category.id)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-950">
                              Agregar producto
                            </button>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'superadmin' && (
            <div id="store-editor-superadmin" role="tabpanel">
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Slug público"><input name="slug" autoComplete="off" spellCheck={false} value={form.slug} onChange={(event) => updateForm('slug', normalizeSlug(event.target.value))} className={INPUT_CLASS} placeholder="Ej. mi-tienda…" required /></Field>
                <Field label="Plan"><select name="plan" value={form.plan} onChange={(event) => updateForm('plan', event.target.value as PlanType)} className={INPUT_CLASS}>{PLANS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}</select></Field>
                <Field label="Asignar storeadmin por correo"><input name="storeAdminEmail" type="email" autoComplete="email" spellCheck={false} value={form.storeAdminEmail} onChange={(event) => updateForm('storeAdminEmail', event.target.value)} className={INPUT_CLASS} placeholder="Ej. correo@ejemplo.com…" /></Field>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700">
                  <input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} className="h-4 w-4 accent-orange-600" />
                  Tienda activa
                </label>
              </div>

              <SectionTitle title="Límites comerciales" />
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Máx. productos"><input name="maxProducts" type="number" inputMode="numeric" min="1" value={form.maxProducts} onChange={(event) => updateForm('maxProducts', event.target.value)} className={INPUT_CLASS} /></Field>
                <Field label="Máx. categorías"><input name="maxCategories" type="number" inputMode="numeric" min="1" value={form.maxCategories} onChange={(event) => updateForm('maxCategories', event.target.value)} className={INPUT_CLASS} /></Field>
                <Field label="Máx. imágenes"><input name="maxImages" type="number" inputMode="numeric" min="1" value={form.maxImages} onChange={(event) => updateForm('maxImages', event.target.value)} className={INPUT_CLASS} /></Field>
              </div>

              <SectionTitle title="Capacidades de la tienda" />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <CapabilityToggle label="Pedidos en tienda" checked={form.inStoreOrdering} onChange={(checked) => updateForm('inStoreOrdering', checked)} />
                <CapabilityToggle label="Pedidos a domicilio" checked={form.deliveryOrdering} onChange={(checked) => updateForm('deliveryOrdering', checked)} />
                <CapabilityToggle label="Control de stock" checked={form.stockControl} onChange={(checked) => updateForm('stockControl', checked)} />
              </div>
            </div>
          )}
        </div>

        <div className="m-6 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Guardando…' : mode === 'create' ? 'Crear tienda' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </EditorShell>
  );
}

function DesignPreview({ store }: { store: PublicStore }) {
  return (
    <section
      aria-labelledby="design-preview-title"
      className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-black/10 bg-white px-4 py-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Preview</p>
        <h2 id="design-preview-title" className="mt-1 text-lg font-black text-gray-950">Así se va a ver la tienda pública</h2>
        <p className="mt-1 text-sm text-gray-500">Usa la misma plantilla y los mismos colores que la página real.</p>
      </div>

      <div className="max-h-[44rem] overflow-auto bg-gray-100">
        <div className="min-w-[72rem]">
          <PublicStoreTemplateView store={store} />
        </div>
      </div>
    </section>
  );
}

function makePreviewStore(form: StoreFormState, categories: CategoryDraft[], products: ProductDraft[]): PublicStore {
  const template = resolveTemplate(form.templateId);
  const storeName = form.name.trim() || 'Nombre de la tienda';
  const slug = normalizeSlug(form.slug || form.name) || 'preview';
  const previewCategories = categories
    .map((category, categoryIndex) => ({
      id: category.id,
      name: category.name.trim(),
      active: category.active,
      order: toOptionalNumber(category.order || String(categoryIndex)),
      items: products
        .filter((product) => product.categoryId === category.id && product.name.trim())
        .map((product, productIndex) => ({
          id: product.id,
          categoryId: category.id,
          name: product.name.trim(),
          description: product.description.trim(),
          price: toOptionalNumber(product.price),
          active: product.active,
          order: toOptionalNumber(product.order || String(productIndex)),
          ...(form.stockControl ? { trackStock: product.trackStock, stock: product.trackStock ? toOptionalNumber(product.stock) : 0 } : {}),
          ...(form.inStoreOrdering ? { availableInStore: product.availableInStore } : {}),
          ...(form.deliveryOrdering ? { availableForDelivery: product.availableForDelivery } : {}),
        })),
    }))
    .filter((category) => category.name && category.items.length > 0);

  return {
    id: form.id || 'preview-store',
    name: storeName,
    slug,
    type: form.type,
    active: form.active,
    isActive: form.active,
    currency: form.currency,
    templateId: form.templateId,
    themeId: form.themeId,
    template: { id: template.id, name: template.name },
    capabilities: {
      inStoreOrdering: form.inStoreOrdering,
      deliveryOrdering: form.deliveryOrdering,
      stockControl: form.stockControl,
    },
    contact: {
      whatsapp: form.whatsapp.trim() || '+573001234567',
      instagram: form.instagram.trim() || '@mitienda',
      address: form.address.trim() || 'Dirección de la tienda',
      deliveryNotes: form.deliveryNotes.trim(),
    },
    schedule: form.schedule,
    categories: previewCategories.length > 0 ? previewCategories : PREVIEW_CATEGORIES[form.type].map((category, categoryIndex) => ({
      id: `preview-category-${categoryIndex}`,
      name: category.name,
      active: true,
      order: categoryIndex,
      items: category.items.map((item, itemIndex) => ({
        id: `preview-item-${categoryIndex}-${itemIndex}`,
        categoryId: `preview-category-${categoryIndex}`,
        name: item.name,
        description: item.description,
        price: item.price,
        active: true,
        order: itemIndex,
      })),
    })),
  };
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

function CapabilityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-600" />
      <span>
        <span className="block text-gray-950">{label}</span>
        <span className="mt-1 block text-xs font-medium leading-5 text-gray-500">Se habilita por tienda y no afecta al menú simple.</span>
      </span>
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

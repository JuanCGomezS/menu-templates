import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { User } from 'firebase/auth';
import type { AppUserProfile } from '../../lib/auth';
import { withBasePath } from '../../lib/base-path';
import { ROLES } from '../../../config/app-constants.js';

const STORE_PENDING_PATH = withBasePath('/t/tienda-pendiente/admin');
const MISSING_PROFILE_MESSAGE = 'Tu cuenta existe, pero aún no tiene un perfil completo. Vamos a intentar completarlo automáticamente.';

function isFirebaseError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

async function createCustomerProfile(user: User, name?: string) {
  const [{ doc, serverTimestamp, setDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('../../lib/firebase'),
  ]);

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email || '',
    ...(name ? { name } : {}),
    role: ROLES.CUSTOMER,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Creates only a missing profile; it never overwrites existing roles or store links. */
async function ensureCustomerProfile(user: User, name?: string) {
  const [{ doc, getDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('../../lib/firebase'),
  ]);
  const profileRef = doc(db, 'users', user.uid);
  const existing = await getDoc(profileRef);
  if (!existing.exists()) {
    await createCustomerProfile(user, name);
    const { clearUserProfileCache } = await import('../../lib/auth');
    clearUserProfileCache(user.uid);
  }
}

function getAuthErrorMessage(error: unknown, mode: 'login' | 'register' | 'google') {
  const code = isFirebaseError(error) ? error.code : '';

  if (code === 'auth/email-already-in-use') {
    return 'Correo ya está registrado.';
  }

  if (code === 'auth/weak-password') {
    return 'La contraseña es muy débil. Usa mínimo 6 caracteres.';
  }

  if (code === 'auth/invalid-email') {
    return 'El correo no tiene un formato válido.';
  }

  if (code === 'auth/operation-not-allowed') {
    return mode === 'google' ? 'Google Sign-In no está habilitado todavía. Contacta al administrador.' : 'El inicio de sesión no está disponible en este momento.';
  }

  if (code === 'auth/popup-closed-by-user') return 'Cerraste la ventana de Google antes de terminar.';
  if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de Google. Permite popups e inténtalo de nuevo.';
  if (code === 'auth/account-exists-with-different-credential') return 'Este correo ya usa otro método de acceso. Inicia sesión con ese método para vincular Google.';

  if (code === 'permission-denied') {
    return 'No pudimos completar el acceso de la cuenta.';
  }

  return 'No pudimos iniciar sesión. Revisa el correo y la contraseña.';
}

function getRedirectPath(profile: AppUserProfile) {
  if (profile.role === ROLES.SUPERADMIN) {
    return withBasePath('/admin');
  }

  if (profile.role === ROLES.STOREADMIN && profile.storeSlug) {
    return withBasePath(`/t/${profile.storeSlug}/admin`);
  }

  return STORE_PENDING_PATH;
}

async function resolveRedirect(profile: AppUserProfile, getStoreSlugById: (storeId: string) => Promise<string | null>) {
  if (profile.role !== ROLES.STOREADMIN || profile.storeSlug || !profile.storeId) {
    return getRedirectPath(profile);
  }

  const slug = await getStoreSlugById(profile.storeId);
  return slug ? withBasePath(`/t/${slug}/admin`) : STORE_PENDING_PATH;
}

async function redirectForUser(user: User) {
  const [{ getUserProfile }, { getStoreSlugById }] = await Promise.all([
    import('../../lib/auth'),
    import('../../lib/public-store-data'),
  ]);
  const profile = await getUserProfile(user);

  if (!profile) {
    return null;
  }

  const path = await resolveRedirect(profile, getStoreSlugById);
  window.location.assign(path);
  return path;
}

export default function LoginForm() {
  const registeringRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);
  const [googleName, setGoogleName] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function startAuthListener() {
      try {
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('../../lib/firebase'),
        ]);

        if (cancelled) return;

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            setLoading(false);
            return;
          }

          if (registeringRef.current) {
            return;
          }

          const redirected = await redirectForUser(user);

          if (!redirected) {
            setError(MISSING_PROFILE_MESSAGE);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('No se pudo inicializar el acceso:', err);
        setError('No pudimos cargar el acceso. Recarga la página e intenta de nuevo.');
        setLoading(false);
      }
    }

    startAuthListener();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'register') {
        registeringRef.current = true;

        const [{ createUserWithEmailAndPassword }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('../../lib/firebase'),
        ]);
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        await credential.user.getIdToken(true);
        await ensureCustomerProfile(credential.user);

        setMessage('Cuenta creada correctamente. Tu rol inicial es cliente.');
        window.location.assign(withBasePath('/'));
        return;
      }

      const [{ signInWithEmailAndPassword }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../../lib/firebase'),
      ]);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const redirected = await redirectForUser(credential.user);

      if (!redirected) {
        setError(MISSING_PROFILE_MESSAGE);
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setError(getAuthErrorMessage(err, mode));
    } finally {
      registeringRef.current = false;
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    registeringRef.current = true;
    try {
      const [{ GoogleAuthProvider, signInWithPopup }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../../lib/firebase'),
      ]);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      const { getUserProfile } = await import('../../lib/auth');
      const existingProfile = await getUserProfile(credential.user);
      if (existingProfile) {
        const redirected = await redirectForUser(credential.user);
        if (!redirected) setError(MISSING_PROFILE_MESSAGE);
        return;
      }
      if (mode === 'register') {
        setPendingGoogleUser(credential.user);
        setGoogleName(credential.user.displayName || '');
        setMessage('Confirma tu nombre para crear tu perfil.');
        return;
      }
      setError('Esta cuenta Google aún no está registrada. Usa la pestaña Registrarme para crear tu perfil.');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (err) {
      console.error('Error de acceso con Google:', err);
      setError(getAuthErrorMessage(err, 'google'));
    } finally {
      registeringRef.current = false;
      setSubmitting(false);
      setLoading(false);
    }
  };

  const confirmGoogleRegistration = async () => {
    const name = googleName.trim();
    if (!pendingGoogleUser || name.length < 2 || name.length > 80) {
      setError('Confirma un nombre entre 2 y 80 caracteres.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await ensureCustomerProfile(pendingGoogleUser, name);
      setMessage('Cuenta creada correctamente. Tu rol inicial es cliente.');
      window.location.assign(withBasePath('/'));
    } catch (err) {
      console.error('No se pudo crear el perfil Google:', err);
      setError(getAuthErrorMessage(err, 'google'));
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-gray-200">
        <p className="text-gray-600">Preparando acceso…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">Acceso a la plataforma</p>
      <h1 className="mt-3 text-3xl font-black text-gray-950">{mode === 'login' ? 'Ingresa a Menu Templates' : 'Crea tu cuenta'}</h1>
      {pendingGoogleUser ? <section className="mt-6 rounded-2xl bg-orange-50 p-4"><p className="text-sm font-semibold text-orange-900">Confirma el nombre de tu cuenta Google.</p>{error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}<label className="mt-3 block text-sm font-semibold text-gray-700" htmlFor="google-name">Nombre</label><input id="google-name" value={googleName} onChange={(event) => setGoogleName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" required /><button type="button" disabled={submitting} onClick={() => void confirmGoogleRegistration()} className="mt-4 w-full rounded-full bg-gray-950 px-6 py-3 font-bold text-white disabled:opacity-60">{submitting ? 'Creando perfil…' : 'Confirmar y crear cuenta'}</button></section> : <>
      <div className="mt-6 grid grid-cols-2 rounded-full bg-gray-100 p-1 text-sm font-bold">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-full px-4 py-2 transition ${mode === 'login' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`rounded-full px-4 py-2 transition ${mode === 'register' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
        >
          Registrarme
        </button>
      </div>

      <button type="button" disabled={submitting} onClick={() => void handleGoogleSignIn()} className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-6 py-3 font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"><span aria-hidden="true" className="text-lg">G</span>{mode === 'register' ? 'Registrarme con Google' : 'Continuar con Google'}</button>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-gray-400"><span className="h-px flex-1 bg-gray-200" />o con correo<span className="h-px flex-1 bg-gray-200" /></div>

      <label className="block text-sm font-semibold text-gray-700" htmlFor="email">
        Correo electrónico
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        autoComplete="email"
        required
      />

      <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="password">
        Contraseña
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        autoComplete="current-password"
        required
      />

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-full bg-gray-950 px-6 py-3 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </button></>}
    </form>
  );
}

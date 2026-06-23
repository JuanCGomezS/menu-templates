import { onAuthStateChanged, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { auth } from '../../lib/firebase';
import { getUserProfile, ROLE_LABELS, ROLES, type AppUserProfile } from '../../lib/auth';
import { withBasePath } from '../../lib/base-path';
import Messaging, { type MessageTone } from './Messaging';

function getRoleLabel(role?: AppUserProfile['role']) {
  return role ? ROLE_LABELS[role] : '';
}

export default function AppHeader({ title = 'Menu Templates' }: { title?: string }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'anonymous' | 'authenticated'>('loading');
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>('info');

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setMessage(null);

      if (!user) {
        setAuthStatus('anonymous');
        setProfile(null);
        setEmail('');
        return;
      }

      setEmail(user.email || '');
      setProfile(await getUserProfile(user));
      setAuthStatus('authenticated');
    });
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePasswordReset = async () => {
    setMessage(null);

    if (!email) {
      setMessageTone('warning');
      setMessage('No hay un correo disponible para enviar recuperación.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessageTone('done');
      setMessage('Te enviamos un correo para cambiar la contraseña.');
      setOpen(false);
    } catch (err) {
      console.error('Error al enviar recuperación de contraseña:', err);
      setMessageTone('error');
      setMessage('No pudimos enviar el correo para cambiar contraseña.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(false);
    window.location.assign(withBasePath('/login'));
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/70 bg-white/65 px-4 py-2 shadow-sm backdrop-blur-xl sm:px-6">
      <Messaging message={message} tone={messageTone} onClose={() => setMessage(null)} />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <a href={withBasePath('/')} className="flex items-center gap-3">
          <img src={withBasePath('/logo.png')} alt="Logo" className="h-10 w-auto object-contain" />
        </a>
        {/* <a href={withBasePath('/')} className="text-sm font-black uppercase tracking-[0.28em] text-gray-950">
          {title}
        </a> */}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full bg-white/80 text-gray-950 shadow-sm ring-1 ring-gray-200 transition hover:bg-white"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </button>

          {open && (
            <div className="absolute right-0 z-20 mt-3 w-72 overflow-hidden rounded-2xl bg-white text-sm shadow-2xl ring-1 ring-gray-200">
              <div className="border-b border-gray-100 px-4 py-4">
                <p className="font-bold text-gray-950">{email || 'Invitado'}</p>
                <p className="mt-1 text-gray-500">{authStatus === 'loading' ? 'Cargando sesión...' : getRoleLabel(profile?.role)}</p>
              </div>

              <nav className="grid p-2">
                <a className="rounded-xl px-3 py-2 font-semibold text-gray-700 hover:bg-orange-50" href={withBasePath('/')}>Inicio</a>
                {profile?.role === ROLES.SUPERADMIN && (
                  <a className="rounded-xl px-3 py-2 font-semibold text-gray-700 hover:bg-orange-50" href={withBasePath('/admin')}>Panel superadmin</a>
                )}
                {profile?.role === ROLES.STOREADMIN && profile.storeSlug && (
                  <a className="rounded-xl px-3 py-2 font-semibold text-gray-700 hover:bg-orange-50" href={withBasePath(`/t/${profile.storeSlug}/admin`)}>Mi tienda</a>
                )}
                {authStatus === 'anonymous' && (
                  <a className="rounded-xl px-3 py-2 font-semibold text-gray-700 hover:bg-orange-50" href={withBasePath('/login')}>Iniciar sesión</a>
                )}
                {authStatus === 'authenticated' && (
                  <button type="button" onClick={handlePasswordReset} className="rounded-xl px-3 py-2 text-left font-semibold text-gray-700 hover:bg-orange-50">
                    Cambiar contraseña
                  </button>
                )}
                {authStatus === 'authenticated' && (
                  <button type="button" onClick={handleLogout} className="rounded-xl px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50">
                    Cerrar sesión
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}

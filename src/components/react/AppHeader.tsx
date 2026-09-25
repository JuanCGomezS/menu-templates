import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { useEffect, useId, useRef, useState } from "react";
import { auth } from "../../lib/firebase";
import {
  clearUserProfileCache,
  getUserProfile,
  ROLE_LABELS,
  ROLES,
  type AppUserProfile,
} from "../../lib/auth";
import { withBasePath } from "../../lib/base-path";
import Messaging, { type MessageTone } from "./Messaging";

function getRoleLabel(role?: AppUserProfile["role"]) {
  return role ? ROLE_LABELS[role] : "";
}

function getInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "M";
}

export default function AppHeader({
  fixed = false,
}: {
  title?: string;
  fixed?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [authStatus, setAuthStatus] = useState<
    "loading" | "anonymous" | "authenticated"
  >("loading");
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("info");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setMessage(null);

      if (!user) {
        setAuthStatus("anonymous");
        setProfile(null);
        setEmail("");
        return;
      }

      setEmail(user.email || "");
      setProfile(await getUserProfile(user));
      setAuthStatus("authenticated");
    });
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handlePasswordReset = async () => {
    setMessage(null);

    if (!email) {
      setMessageTone("warning");
      setMessage("No hay un correo disponible para enviar recuperación.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessageTone("done");
      setMessage("Te enviamos un correo para cambiar la contraseña.");
      setOpen(false);
    } catch (err) {
      console.error("Error al enviar recuperación de contraseña:", err);
      setMessageTone("error");
      setMessage("No pudimos enviar el correo para cambiar contraseña.");
    }
  };

  const handleLogout = async () => {
    clearUserProfileCache(auth.currentUser?.uid);
    await signOut(auth);
    clearUserProfileCache();
    setOpen(false);
    window.location.assign(withBasePath("/login"));
  };

  return (
    <header
      className={`${fixed ? "fixed" : "sticky"} left-0 right-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:px-6`}
    >
      <Messaging
        message={message}
        tone={messageTone}
        onClose={() => setMessage(null)}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <a
          href={withBasePath("/")}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-4"
          aria-label="Ir al inicio"
        >
          <img
            src={withBasePath("/logo.png")}
            alt="Menu Templates"
            className="h-10 w-auto object-contain"
          />
        </a>

        <div className="relative" ref={menuRef}>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 active:translate-y-0"
            aria-label={open ? "Cerrar menú de cuenta" : "Abrir menú de cuenta"}
            aria-expanded={open}
            aria-controls={menuId}
            aria-haspopup="dialog"
          >
            <span
              className="material-icons-outlined text-[25px] leading-none"
              aria-hidden="true"
            >
              {open ? "close" : "menu"}
            </span>
          </button>

          {open && (
            <div
              id={menuId}
              role="dialog"
              aria-label="Menú de cuenta"
              className="absolute right-0 z-20 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-[0_20px_45px_rgba(15,23,42,0.16)]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-800 text-sm font-bold text-white shadow-sm"
                  aria-hidden="true"
                >
                  {getInitial(email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {email || "Invitado"}
                  </p>
                  <p className="mt-0.5 text-slate-500">
                    {authStatus === "loading"
                      ? "Cargando sesión..."
                      : getRoleLabel(profile?.role)}
                  </p>
                </div>
              </div>

              <nav aria-label="Navegación de cuenta" className="grid gap-1 p-2">
                <a
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-medium text-teal-950 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                  href={withBasePath("/")}
                  onClick={() => setOpen(false)}
                >
                  <span
                    className="material-icons-outlined text-[20px] text-slate-500"
                    aria-hidden="true"
                  >
                    home
                  </span>
                  Inicio
                </a>
                {profile?.role === ROLES.SUPERADMIN && (
                  <a
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-medium text-teal-950 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    href={withBasePath("/admin")}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className="material-icons-outlined text-[20px] text-slate-500"
                      aria-hidden="true"
                    >
                      admin_panel_settings
                    </span>
                    Panel superadmin
                  </a>
                )}
                {profile?.role === ROLES.STOREADMIN && profile.storeSlug && (
                  <a
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-medium text-teal-950 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    href={withBasePath(`/t/${profile.storeSlug}/admin`)}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className="material-icons-outlined text-[20px] text-slate-500"
                      aria-hidden="true"
                    >
                      storefront
                    </span>
                    Mi tienda
                  </a>
                )}
                {authStatus === "anonymous" && (
                  <a
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-medium text-teal-950 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    href={withBasePath("/login")}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className="material-icons-outlined text-[20px] text-slate-500"
                      aria-hidden="true"
                    >
                      login
                    </span>
                    Iniciar sesión
                  </a>
                )}
                {authStatus === "authenticated" && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-medium text-teal-950 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <span
                        className="material-icons-outlined text-[20px] text-slate-500"
                        aria-hidden="true"
                      >
                        lock_reset
                      </span>
                      Cambiar contraseña
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-medium text-red-700 transition hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                    >
                      <span
                        className="material-icons-outlined text-[20px]"
                        aria-hidden="true"
                      >
                        logout
                      </span>
                      Cerrar sesión
                    </button>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

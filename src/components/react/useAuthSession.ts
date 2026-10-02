import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { getUserProfile, type AppUserProfile } from '../../lib/auth';

export type AuthSessionState = 'loading' | 'anonymous' | 'authenticated' | 'missing-profile' | 'error';

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return;
      setError(null);
      setUser(nextUser);
      setProfile(null);
      if (!nextUser) {
        setState('anonymous');
        return;
      }

      setState('loading');
      try {
        const nextProfile = await getUserProfile(nextUser);
        if (!active) return;
        setProfile(nextProfile);
        setState(nextProfile ? 'authenticated' : 'missing-profile');
      } catch (reason) {
        if (!active) return;
        setError(reason);
        setState('error');
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  return { state, user, profile, error };
}

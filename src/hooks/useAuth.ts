import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'flowboard_device_auth';

interface DeviceCredentials {
  email: string;
  password: string;
}

function generateCredentials(): DeviceCredentials {
  const id = crypto.randomUUID().replace(/-/g, '');
  return {
    email: `device-${id}@flowboard.local`,
    password: crypto.randomUUID() + crypto.randomUUID(),
  };
}

function loadCredentials(): DeviceCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DeviceCredentials;
  } catch {
    return null;
  }
}

function saveCredentials(creds: DeviceCredentials) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  } catch {}
}

export function useAuth() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Restore an existing Supabase session first (avoids a network round-trip).
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mounted) setAuthReady(true);
          return;
        }

        // Try signing in with the stored device credentials.
        const stored = loadCredentials();
        if (stored) {
          const { error } = await supabase.auth.signInWithPassword(stored);
          if (!error) {
            if (mounted) setAuthReady(true);
            return;
          }
          // Credentials exist but sign-in failed (account deleted?). Fall through to sign-up.
        }

        // Create a new device account and persist the credentials locally.
        const creds = generateCredentials();
        saveCredentials(creds);
        const { error: signUpError } = await supabase.auth.signUp(creds);
        if (signUpError) {
          // Sign-up can fail if email confirmation is required or the account exists.
          // Attempt sign-in as a final fallback.
          await supabase.auth.signInWithPassword(creds);
        }
      } catch (err) {
        console.error('Auth initialisation failed:', err);
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (mounted) setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { authReady };
}

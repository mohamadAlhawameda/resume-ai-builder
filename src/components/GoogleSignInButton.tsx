'use client';

// "Sign in with Google" via Google Identity Services. Renders nothing unless
// NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so the button never appears half-wired.
// The GIS credential is exchanged at POST /auth/google for our own JWT.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api, apiErrorMessage } from '@/lib/api';
import type { StoredUser } from '@/lib/auth';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export interface GoogleAuthResult {
  token: string;
  user: StoredUser;
  isNewUser?: boolean;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

interface Props {
  onSuccess: (result: GoogleAuthResult) => void;
}

export default function GoogleSignInButton({ onSuccess }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const init = () => {
      const gsi = window.google?.accounts?.id;
      if (!gsi || !divRef.current) return;
      gsi.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const result = await api<GoogleAuthResult>('/auth/google', {
              method: 'POST',
              auth: false,
              body: { credential },
            });
            if (!result?.token || !result?.user) throw new Error('Invalid response');
            onSuccessRef.current(result);
          } catch (err) {
            toast.error(apiErrorMessage(err, 'Google sign-in failed — please try again.'));
          }
        },
      });
      gsi.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', init);
      return () => existing.removeEventListener('load', init);
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);
  }, []);

  if (!CLIENT_ID || failed) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4" aria-hidden>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <div ref={divRef} className="flex justify-center min-h-[44px]" />
    </div>
  );
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, Palette, ShieldCheck } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/')
      }
    })
  }, [router])

  const signInWithGoogle = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-brand">
        <div className="auth-brand-glow auth-brand-glow-a" />
        <div className="auth-brand-glow auth-brand-glow-b" />

        <header className="auth-brand-top">
          <div className="auth-logo-plate">
            <Image
              src="/PURAVOX.jpg"
              alt="Puravox"
              fill
              sizes="160px"
              className="auth-logo-img"
              priority
            />
          </div>
        </header>

        <div className="auth-brand-copy">
          <span className="eyebrow auth-eyebrow">QR STUDIO</span>
          <h2 className="auth-headline">
            Create branded QR codes&mdash;and see every scan.
          </h2>
          <p className="auth-subcopy">
            Design, publish, and track QR codes from one calm workspace.
            Real-time analytics included.
          </p>
        </div>

        <ul className="auth-highlights">
          <li>
            <span className="auth-highlight-icon"><Palette size={14} strokeWidth={2} /></span>
            <div>
              <strong>Fully customizable</strong>
              <small>Colors, rounded modules, and your own logo.</small>
            </div>
          </li>
          <li>
            <span className="auth-highlight-icon"><BarChart3 size={14} strokeWidth={2} /></span>
            <div>
              <strong>Scan analytics</strong>
              <small>Sources, trends, and top codes at a glance.</small>
            </div>
          </li>
          <li>
            <span className="auth-highlight-icon"><ShieldCheck size={14} strokeWidth={2} /></span>
            <div>
              <strong>Secure by default</strong>
              <small>Sign in safely with your Google account.</small>
            </div>
          </li>
        </ul>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <div className="auth-logo-plate auth-logo-plate-sm">
              <Image
                src="/PURAVOX.jpg"
                alt="Puravox"
                fill
                sizes="140px"
                className="auth-logo-img"
                priority
              />
            </div>
          </div>

          <span className="eyebrow auth-eyebrow-light">WELCOME BACK</span>
          <h1 className="auth-title">Sign in to QR Studio</h1>
          <p className="auth-lead">
            Continue with Google to jump back into your dashboard.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="auth-google-button"
          >
            {loading ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                Redirecting to Google&hellip;
              </>
            ) : (
              <>
                <GoogleIcon />
                Sign in with Google
                <ArrowRight className="auth-button-arrow" size={15} strokeWidth={2.2} />
              </>
            )}
          </button>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <p className="auth-fineprint">
            <ShieldCheck size={12} strokeWidth={2} />
            We never post or store your password&mdash;authentication is handled by Google.
          </p>
        </div>

        <footer className="auth-footer">
          <span>&copy; {new Date().getFullYear()} Puravox</span>
          <span className="auth-footer-dot">&middot;</span>
          <Link href="/">About QR Studio</Link>
        </footer>
      </main>
    </div>
  )
}

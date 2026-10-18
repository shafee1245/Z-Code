'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push('/')
      }
    })
  }, [router])

  const signInWithGoogle = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Sign in to QR Studio</h1>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}

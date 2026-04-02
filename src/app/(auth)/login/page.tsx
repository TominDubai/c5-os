'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState<boolean|null>(null)
  const router = useRouter()

  // Check demo mode on component mount
  useEffect(() => {
    fetch('/api/demo-mode')
      .then(res => res.json())
      .then(data => {
        setIsDemoMode(data.isDemoMode)
      })
      .catch(err => {
        console.warn('demo-mode request failed', err)
        setIsDemoMode(true) // Default to demo mode if API fails
      })
  }, [])

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email address first')
      return
    }
    
    if (isDemoMode) {
      setError('Password reset not available in demo mode')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('1. handleLogin called, isDemoMode=', isDemoMode)
    setError('')
    setLoading(true)

    if (isDemoMode === null) {
      console.log('2. isDemoMode is null, aborting')
      setError('Checking configuration, please wait')
      setLoading(false)
      return
    }

    console.log('3. isDemoMode is', isDemoMode)
    
    if (isDemoMode === true) {
      console.log('4. In demo mode, navigating immediately')
      setLoading(false)
      router.push('/')
      return
    }

    console.log('7. Not in demo mode, attempting Supabase login')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.log('8. Supabase error:', error)
        setError(error.message)
        setLoading(false)
      } else {
        console.log('9. Supabase success, pushing to /')
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      console.log('10. Exception:', err)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  if (isDemoMode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-600">Checking configuration…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/logo.jpg" 
            alt="Concept 5" 
            className="h-24 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <h1 className="text-2xl font-bold text-gray-900">Concept 5 - OS</h1>
          {isDemoMode && (
            <p className="text-sm text-blue-600 mt-2">🔧 Demo Mode</p>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {isDemoMode && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
              Demo mode active - Click Sign In to continue
            </div>
          )}

          {resetSent && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center">
              Reset link sent — check your email
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isDemoMode === null}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={async () => {
              if (isDemoMode) {
                setError('Password reset not available in demo mode')
                return
              }
              setError('')
              setLoading(true)
              try {
                const supabase = createClient()
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                })
                if (error) {
                  setError(error.message)
                } else {
                  setResetSent(true)
                }
              } catch (err: any) {
                setError(err.message || 'Failed to send reset email')
              }
              setLoading(false)
            }}
            disabled={loading}
            className="w-full text-sm text-blue-600 hover:underline text-center mt-2"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  )
}

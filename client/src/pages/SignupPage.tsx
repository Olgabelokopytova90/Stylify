import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')
    setLoading(true)

    try {
      await signUp(email, password)
      setSuccessMessage('Account created. Now sign in.')
      setEmail('')
      setPassword('')

      setTimeout(() => {
        navigate('/login')
      }, 800)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2ec] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-semibold text-[#1f1a17]">Create account</h1>
        <p className="mb-8 text-sm text-[#7a6a60]">
          Create your Stylify account
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1f1a17]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-[#d8c8ba] px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#1f1a17]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full rounded-xl border border-[#d8c8ba] px-4 py-3 outline-none"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm text-green-600">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1f1a17] py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#7a6a60]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#1f1a17] underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
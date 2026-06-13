import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '../api/client'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const loggedInUser = await signIn(email, password)
      const profile = await getProfile(loggedInUser.id)

      if (profile.onboarding_completed) {
        navigate('/app')
      } else {
        navigate('/onboarding')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '46% 54%',
        background: '#fbf8f3',
        color: '#1f1a17',
      }}
    >
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          backgroundImage: "url('/images/login-fashion-panel.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(36,25,18,0.08), rgba(36,25,18,0.24))',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            padding: '92px 80px',
            boxSizing: 'border-box',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ textAlign: 'center', marginTop: '160px' }}>
            <div style={{ fontSize: '42px', marginBottom: '18px' }}>✦</div>
            <div
              style={{
                fontFamily: 'serif',
                fontSize: '64px',
                letterSpacing: '0.12em',
                lineHeight: 1,
              }}
            >
              STYLIFY
            </div>
            <div
              style={{
                marginTop: '34px',
                fontSize: '18px',
                letterSpacing: '0.22em',
                lineHeight: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Your style.
              <br />
              Your identity.
            </div>
          </div>

          <p
            style={{
              margin: 0,
              maxWidth: '360px',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: '24px',
              lineHeight: 1.35,
            }}
          >
            “Style is a way to say who you are without having to speak.”
          </p>
        </div>
      </section>

      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '56px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '52px',
            right: '72px',
            fontSize: '16px',
            color: '#2e2a25',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            style={{
              color: '#1f1a17',
              textDecoration: 'underline',
              fontWeight: 500,
            }}
          >
            Sign up
          </Link>
        </div>

        <div style={{ width: '100%', maxWidth: '520px' }}>
          <h1
            style={{
              margin: '0 0 12px',
              fontFamily: 'serif',
              fontSize: '56px',
              fontWeight: 500,
              lineHeight: 1.1,
              color: '#1f1a17',
            }}
          >
            Welcome back
          </h1>

          <p
            style={{
              margin: '0 0 54px',
              fontSize: '20px',
              color: '#7a6a60',
            }}
          >
            Sign in to continue your journey.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={inputStyle}
            />

            <div style={{ height: '32px' }} />

            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={inputStyle}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '14px',
                marginBottom: '38px',
              }}
            >
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  color: '#1f1a17',
                  textDecoration: 'underline',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Forgot password?
              </button>
            </div>

            {errorMessage ? (
              <p
                style={{
                  margin: '0 0 18px',
                  color: '#8a2f2f',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '64px',
                borderRadius: '12px',
                border: 'none',
                background: '#1f1a17',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              margin: '56px 0 28px',
              color: '#8a817c',
              fontSize: '15px',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#ded2c8' }} />
            or continue with
            <div style={{ flex: 1, height: '1px', background: '#ded2c8' }} />
          </div>

          <button type="button" style={socialButtonStyle}>
            <span style={{ fontSize: '28px', fontWeight: 800 }}>G</span>
            Continue with Google
          </button>

          <button type="button" style={{ ...socialButtonStyle, marginTop: '16px' }}>
            <span style={{ fontSize: '30px' }}></span>
            Continue with Apple
          </button>

          <p
            style={{
              margin: '52px auto 0',
              maxWidth: '360px',
              textAlign: 'center',
              color: '#6f625a',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            By signing in, you agree to our{' '}
            <span style={{ color: '#1f1a17', textDecoration: 'underline' }}>
              Terms of Service
            </span>{' '}
            and{' '}
            <span style={{ color: '#1f1a17', textDecoration: 'underline' }}>
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </section>
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '12px',
  color: '#1f1a17',
  fontSize: '16px',
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '64px',
  borderRadius: '12px',
  border: '1px solid #d8c8ba',
  background: '#fffdf9',
  padding: '0 20px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
}

const socialButtonStyle: React.CSSProperties = {
  width: '100%',
  height: '64px',
  borderRadius: '12px',
  border: '1px solid #d8c8ba',
  background: '#fffdf9',
  color: '#1f1a17',
  fontSize: '18px',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '18px',
  cursor: 'pointer',
}
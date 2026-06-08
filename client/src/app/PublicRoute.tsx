import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

console.log('USER:', user)
console.log('LOADING:', loading)

  if (loading) {
    return <div>Loading...</div>
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import StylifyApp from './StylifyApp'
import OnboardingPage from '../pages/OnboardingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        <Route
        path='/onboarding'
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <StylifyApp />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/client";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      if (loading) return;

      if (!user?.id) {
        setRedirectTo("/login");
        setCheckingProfile(false);
        return;
      }

      try {
  const profile = await getProfile(user.id);

  const isOnboardingPage = location.pathname === "/onboarding";
  const isEditOnboarding = location.search.includes("mode=edit");

  if (!profile.onboarding_completed && !isOnboardingPage) {
    setRedirectTo("/onboarding");
    return;
  }

  if (profile.onboarding_completed && isOnboardingPage && !isEditOnboarding) {
    setRedirectTo("/app");
    return;
  }

  setRedirectTo(null);
} catch (error) {
        console.error("Failed to check protected profile:", error);
        setRedirectTo("/onboarding");
      } finally {
        setCheckingProfile(false);
      }
    }

    void checkProfile();
  }, [user?.id, loading, location.pathname]);

  if (loading || checkingProfile) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f8f4ed",
          color: "#1f1a17",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        Preparing your style profile...
      </main>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
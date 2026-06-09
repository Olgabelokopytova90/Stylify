import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/client";

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (!user?.id) return;

      setCheckingProfile(true);

      try {
        const profile = await getProfile(user.id);

        if (profile.onboarding_completed) {
          setRedirectTo("/app");
        } else {
          setRedirectTo("/onboarding");
        }
      } catch (error) {
        console.error("Failed to check profile:", error);
        setRedirectTo("/onboarding");
      } finally {
        setCheckingProfile(false);
      }
    }

    void checkProfile();
  }, [user?.id]);

  if (loading || checkingProfile) {
    return <div>Loading...</div>;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
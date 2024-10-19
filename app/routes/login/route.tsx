import { Button } from "~/components/ui/button";
import { useSupabase } from "~/hooks/useSupabase";
import { useSearchParams } from "@remix-run/react";

const LoginPage = () => {
  const supabase = useSupabase();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleLogin = () => {
    const currentDomain = window.location.origin;
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${currentDomain}/auth/callback?next=${encodeURIComponent(
          redirect
        )}`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button onClick={handleLogin}>Login with Google</Button>
    </div>
  );
};

export default LoginPage;

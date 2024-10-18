import { Button } from "~/components/ui/button";
import { useSupabase } from "~/hooks/useSupabase";

const LoginPage = () => {
  const supabase = useSupabase();

  const handleLogin = () => {
    const currentDomain = window.location.origin;
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${currentDomain}/auth/callback`,
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

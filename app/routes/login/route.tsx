import { Button } from "~/components/ui/button";
import { useSupabase } from "~/hooks/useSupabase";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useUser } from "~/hooks/useUser";
import { useEffect } from "react";

const LoginPage = () => {
  const supabase = useSupabase();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/redirect";
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();

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

  useEffect(() => {
    if (!userLoading && user) navigate(redirect);
  }, [navigate, user, userLoading]);

  if (userLoading)
    return (
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
        <img
          src="/images/login-graphics.png"
          alt=""
          className="hidden h-full max-h-screen w-full object-cover lg:col-span-7 lg:block lg:rounded-r-xl"
        />
        <div className="col-span-5 flex h-full w-full items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </div>
    );

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
      <img
        src="/images/login-graphics.png"
        alt=""
        className="hidden h-full max-h-screen w-full object-cover lg:col-span-7 lg:block lg:rounded-r-xl"
      />
      <div className="flex items-center justify-center px-4 py-8 lg:col-span-5 lg:px-0">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Sign in to OpenStatus
            </CardTitle>
            <CardDescription className="text-center">
              Monitor your services with ease
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} className="w-full" variant="outline">
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

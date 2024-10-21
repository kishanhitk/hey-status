import { Link } from "@remix-run/react";
import { Button } from "./ui/button";
import { Globe } from "lucide-react";
import { useUser } from "~/hooks/useUser";

export const LandingHeader = () => {
  const { user } = useUser();
  return (
    <header className="h-14 flex items-center container">
      <Link className="flex items-center justify-center" to="/">
        <Globe className="h-6 w-6" />
        <span className="ml-2 text-xl font-bold">HeyStatus</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <Link
          className="text-sm font-medium hover:underline underline-offset-4"
          to="#features"
        >
          Features
        </Link>
        <Link
          className="text-sm font-medium hover:underline underline-offset-4"
          to="#pricing"
        >
          Pricing
        </Link>
      </nav>
      {user ? (
        <Button asChild className="ml-4" variant="outline">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      ) : (
        <Button asChild className="ml-4" variant="outline">
          <Link to="/login">Login</Link>
        </Button>
      )}
    </header>
  );
};

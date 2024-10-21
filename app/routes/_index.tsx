import { Link, MetaFunction } from "@remix-run/react";
import { Globe, Bell, ArrowRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useUser } from "~/hooks/useUser";
import { metaGenerator } from "~/utils/metaGenerator";

export const meta: MetaFunction = () => {
  return metaGenerator({});
};

export default function Component() {
  const { user } = useUser();
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center container">
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
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <Badge variant="outline">Open Source</Badge>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none">
                  Monitor your services with ease
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
                  Keep your users informed with beautiful, customizable status
                  pages. Monitor your API and website globally.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <div className="flex space-x-2">
                  <Button asChild className="w-full">
                    <Link to="/login">Get Started</Link>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  No credit card required. Start monitoring in minutes.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <img
                alt="Status page example"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Status Pages
                </h2>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    <span>Build trust with real visibility to your users</span>
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    <span>Custom domain support</span>
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    <span>Let users subscribe to your status page</span>
                  </li>
                </ul>
                <Button className="w-full sm:w-auto" asChild>
                  <Link to="/login">Create Your Status Page</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Incident Management
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Efficiently manage and communicate incidents to your users.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    <span>Create and update incidents in real-time</span>
                  </li>
                  <li className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    <span>Automatically notify subscribers</span>
                  </li>
                  <li className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    <span>Track incident history and resolution times</span>
                  </li>
                </ul>
                <Button className="w-full sm:w-auto" asChild>
                  <Link to="/login">Start Managing Incidents</Link>
                </Button>
              </div>
              <div className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex items-center space-x-4">
                  <Bell className="h-5 w-5" />
                  <div>
                    <h3 className="font-bold">API Latency Issue</h3>
                    <p className="text-sm text-gray-500">
                      Investigating increased response times
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Bell className="h-5 w-5" />
                  <div>
                    <h3 className="font-bold">Database Maintenance</h3>
                    <p className="text-sm text-gray-500">
                      Scheduled maintenance in progress
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Simple, Transparent Pricing
                </h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl">
                  Start monitoring your services for free. Upgrade as you grow.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <Button asChild className="w-full">
                  <Link to="/login">Get Started for Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">
          © 2024 HeyStatus Inc. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" to="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" to="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}

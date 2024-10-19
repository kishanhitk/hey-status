import { Link } from "@remix-run/react";
import { Globe, Bell, ArrowRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useUser } from "~/hooks/useUser";

export default function Component() {
  const { user } = useUser();
  return (
    <div className="flex flex-col min-h-screen ">
      <header className="px-4 lg:px-6 h-14 flex items-center container">
        <Link className="flex items-center justify-center" to="#">
          <Globe className="h-6 w-6" />
          <span className="ml-2 text-xl font-bold">OpenStatus</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            to="#"
          >
            Product
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            to="#"
          >
            Resources
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            to="#"
          >
            Pricing
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            to="#"
          >
            Docs
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
                <Badge variant="outline">Proudly Open Source</Badge>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none">
                  A better way to monitor your services.
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
                  Monitor your API and website globally, identify performance
                  issues, downtime and receive alerts before your users are
                  affected.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex space-x-2">
                  <Input
                    className="max-w-lg flex-1"
                    placeholder="Enter your email"
                    type="email"
                  />
                  <Button type="submit">Get Started</Button>
                </form>
                <p className="text-xs text-gray-500">
                  Start monitoring in minutes. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold text-center mb-8">
              Trusted by developers worldwide
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8">
              {["Company 1", "Company 2", "Company 3", "Company 4"].map(
                (company) => (
                  <div
                    key={company}
                    className="text-2xl font-bold text-gray-400"
                  >
                    {company}
                  </div>
                )
              )}
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <img
                alt="World map with monitoring points"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Monitoring
                </h2>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    <span>Latency Monitoring across all continents</span>
                  </li>
                  <li className="flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    <span>
                      Monitor anything: API, DNS, TCP, SMTP, ping, websocket
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    <span>
                      Cron Monitoring: Get notified when a job did not run
                      successfully
                    </span>
                  </li>
                </ul>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button>Learn more</Button>
                  <Button variant="outline">Speed Checker</Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Our Impact
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  See how we're making a difference in monitoring services
                  worldwide.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="flex flex-col justify-center space-y-4 border-b border-gray-200 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold">734M</h3>
                  <p className="text-sm text-gray-500">
                    Pings in the last hour
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 border-b border-gray-200 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold">167K</h3>
                  <p className="text-sm text-gray-500">
                    Checks in the last hour
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold">2400+</h3>
                  <p className="text-sm text-gray-500">Active users</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Status Pages
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Keep your users informed with beautiful, customizable status
                  pages.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2">
              <img
                alt="Status page example"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    <span>
                      Build trust: Provide real visibility to your users
                    </span>
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    <span>
                      Custom domain: Bring your own domain, give the status page
                      a personal touch
                    </span>
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    <span>
                      Subscription: Let your users subscribe to your status page
                    </span>
                  </li>
                </ul>
                <Button className="w-full sm:w-auto">Learn more</Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Alerting
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Stay informed about your services' status with our advanced
                  alerting system.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    <span>Reduce fatigue with automatic noise reduction</span>
                  </li>
                  <li className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    <span>Escalation: Notify your on-call team member</span>
                  </li>
                  <li className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    <span>
                      Get notified via Email, SMS, Slack, Discord, and more
                    </span>
                  </li>
                </ul>
                <Button className="w-full sm:w-auto">Get started</Button>
              </div>
              <div className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex items-center space-x-4">
                  <Bell className="h-5 w-5" />
                  <div>
                    <h3 className="font-bold">Monitor down</h3>
                    <p className="text-sm text-gray-500">
                      API endpoint is unreachable
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Bell className="h-5 w-5" />
                  <div>
                    <h3 className="font-bold">Investigating</h3>
                    <p className="text-sm text-gray-500">
                      Investigating notifications from StatusPage
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Bell className="h-5 w-5" />
                  <div>
                    <h3 className="font-bold">Notification sent</h3>
                    <p className="text-sm text-gray-500">
                      Email notification with summary sent to your Slack channel
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  We ship
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Check out the changelog to see our latest features
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="font-bold">Sep 09, 2024</div>
                  <div>Binary payload</div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="font-bold">Aug 27, 2024</div>
                  <div>Speed Checker</div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="font-bold">Jul 21, 2024</div>
                  <div>Docker Image Checker</div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="font-bold">Jun 15, 2024</div>
                  <div>Status Page rework</div>
                </div>
              </div>
              <Button className="w-full sm:w-auto">Full changelog</Button>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container  px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Ready to get started?
                </h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl">
                  Start monitoring your services in minutes. No credit card
                  required.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex space-x-2">
                  <Input
                    className="max-w-lg flex-1"
                    placeholder="Enter your email"
                    type="email"
                  />
                  <Button type="submit">Get Started</Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">
          © 2024 OpenStatus Inc. All rights reserved.
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

import { Link, MetaFunction } from "@remix-run/react";
import { Globe, Bell, ServerCrash } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DotPattern } from "~/components/ui/dot-pattern";
import { RainbowButton } from "~/components/ui/rainbow-button";
import ShinyButton from "~/components/ui/shiny-button";
import { useUser } from "~/hooks/useUser";
import { cn } from "~/lib/utils";
import { metaGenerator } from "~/utils/metaGenerator";
import { BentoCard, BentoGrid } from "~/components/ui/bento-grid";
import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  InputIcon,
} from "@radix-ui/react-icons";
import { MailIcon } from "lucide-react";

export const meta: MetaFunction = () => {
  return metaGenerator({});
};

export default function Component() {
  const { user } = useUser();
  return (
    <div className="flex flex-col min-h-screen">
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
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-28 xl:py-28 relative">
          <div className="container relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-5">
                <a
                  href="https://github.com/kishanhitk/hey-status"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ShinyButton className="rounded-full" textClassName="text-xs">
                    Proudly Open Source
                  </ShinyButton>
                </a>
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
                  <Link to="/login" className="w-full">
                    <RainbowButton className="w-full rounded-lg py-5 text-md">
                      Get Started
                    </RainbowButton>
                  </Link>
                </div>
              </div>
            </div>
            <img
              src="/images/status-page-example.png"
              alt="HeyStatus Example Status Page"
              className="w-full max-w-[1000px] rounded-xl shadow-xl mx-auto mt-12 border-2 border-gray-100 hover:scale-105 transition-all duration-300"
            />
          </div>

          <DotPattern
            width={20}
            height={20}
            cx={5}
            cy={5}
            cr={1}
            className={cn(
              "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
            )}
          />
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-8 text-center">
              Features
            </h2>
            <FeaturesBentoGrid />
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

const features = [
  {
    Icon: FileTextIcon,
    name: "Status Pages",
    description: "Create customizable status pages to display service health.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="/images/status-page-example.png"
        className="absolute right-0 top-10 opacity-60"
        alt="Status Page"
      />
    ),
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
  },
  {
    Icon: InputIcon,
    name: "Service Management",
    description: "Easily add, update, and monitor multiple services.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="/images/service-management-bg.png"
        className="absolute -right-20 -top-20 opacity-60"
        alt="Service Management"
      />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: CalendarIcon,
    name: "Manage Maintenance",
    description: "Plan and communicate scheduled maintenance to your users.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="/images/manage-maintenance-bg.png"
        className="absolute -right-20 -top-20 opacity-60"
        alt="Manage Maintenance"
      />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: ServerCrash,
    name: "Incident Management",
    description: "Create, update, and resolve incidents efficiently.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="/images/incident-management-bg.png"
        className="absolute -right-20 -top-20 opacity-60"
        alt="Incident Management"
      />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: BellIcon,
    name: "Real-time Updates",
    description: "Updates are pushed to users in real-time via WebSocket.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="/images/real-time-updates-bg.png"
        className="absolute -right-20 -top-20 opacity-60"
        alt="Real-time Updates"
      />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-3",
  },
  {
    Icon: MailIcon,
    name: "Email Subscriptions",
    description:
      "Subscribers receive email notifications for incident updates.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="/images/email-subscriptions-bg.png"
        className="absolute -right-20 -top-20 opacity-60"
        alt="Email Subscriptions"
      />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-3 lg:row-end-4",
  },
];

function FeaturesBentoGrid() {
  return (
    <BentoGrid className="lg:grid-rows-3">
      {features.map((feature) => (
        <BentoCard key={feature.name} {...feature} />
      ))}
    </BentoGrid>
  );
}

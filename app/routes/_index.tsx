import { Link, MetaFunction } from "@remix-run/react";
import { ServerCrash, Check, MailIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DotPattern } from "~/components/ui/dot-pattern";
import { RainbowButton } from "~/components/ui/rainbow-button";
import ShinyButton from "~/components/ui/shiny-button";
import { cn } from "~/lib/utils";
import { metaGenerator } from "~/utils/metaGenerator";
import { BentoCard, BentoGrid } from "~/components/ui/bento-grid";
import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  InputIcon,
} from "@radix-ui/react-icons";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { LandingHeader } from "~/components/landing-header";

export const meta: MetaFunction = () => {
  return metaGenerator({});
};

export default function Component() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-28 xl:py-28 relative animate-fade-in-up">
          <div className="container relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-5 animate-fade-in-up animation-delay-200">
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
              <div className="w-full max-w-sm space-y-2 animate-fade-in-up animation-delay-400">
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
              className="w-full max-w-[1000px] rounded-xl shadow-xl mx-auto mt-12 border-2 border-gray-100 hover:scale-105 transition-all duration-300 animate-fade-in-up animation-delay-600"
            />
          </div>
          <DotPattern
            width={20}
            height={20}
            cx={5}
            cy={5}
            cr={1}
            className={cn(
              "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
            )}
          />
        </section>
        <section id="features" className="w-full py-12 md:py-18">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center">
              Features
            </h2>
            <p className="max-w-[600px] text-gray-500 md:text-xl text-center mx-auto mt-2 mb-8">
              HeyStatus is a powerful status page tool that allows you to
              monitor your services and keep your users informed.
            </p>
            <FeaturesBentoGrid />
          </div>
        </section>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}

const features = [
  {
    Icon: FileTextIcon,
    name: "Status Pages",
    description: "Create customizable status pages to display service health.",
    href: "/login",
    cta: "Get Started",
    background: (
      <img
        src="/images/status-page-example.png"
        className="absolute right-0 top-10 opacity-60 group-hover:scale-105 transition-all duration-300"
        alt="Status Page"
      />
    ),
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
  },
  {
    Icon: InputIcon,
    name: "Service Management",
    description: "Easily add, update, and monitor multiple services.",
    href: "/login",
    cta: "Get Started",
    background: (
      <img
        src="/images/dashboard-example.png"
        className="absolute right-0 -top-20 opacity-60 group-hover:scale-105 transition-all duration-300 group-hover:-top-15"
        alt="Service Management"
      />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: CalendarIcon,
    name: "Manage Maintenance",
    description: "Plan and communicate scheduled maintenance to your users.",
    href: "/login",
    cta: "Get Started",
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
    href: "/login",
    cta: "Get Started",
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
    href: "/login",
    cta: "Get Started",
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
    href: "/login",
    cta: "Get Started",
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

const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    description: "Best for small teams and startups",
    features: [
      "Up to 5 services",
      "1 team member",
      "Public status page",
      "Email notifications",
      "5 subscribers",
      "7 days data retention",
    ],
    buttonVariant: "outline",
  },
  {
    name: "Pro",
    price: "$99",
    description: "Perfect for growing businesses",
    features: [
      "Unlimited services",
      "Unlimited team members",
      "Custom domain",
      "Email & SMS notifications",
      "Unlimited subscribers",
      "30 days data retention",
      "Priority support",
    ],
    buttonVariant: "default",
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-t from-gray-50 to-white"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
              Simple, Transparent Pricing
            </h2>
            <p className="max-w-[600px] text-gray-500 md:text-xl">
              Start monitoring your services with our flexible plans. Upgrade as
              you grow.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2 md:gap-8">
          {pricingPlans.map((plan) => (
            <Card key={plan.name} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-4">
                  {plan.price}
                  <span className="text-xl font-normal">/month</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                  variant={plan.buttonVariant as "default" | "outline"}
                >
                  <Link to="/login">Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center container">
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
  );
}

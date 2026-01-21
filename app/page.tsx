import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Search,
  MessageSquare,
  FileText,
  BarChart3,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              AEO Nexus
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Sign In
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
            <Zap className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300">
              The all-in-one Answer Engine Optimization platform
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-zinc-100">Own the AI answer.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Before your competitors do.
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Track your brand across ChatGPT, Perplexity, Gemini & more. Engage on Reddit & forums. Optimize content for AI citations. All in one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </Link>
          </div>

          <p className="text-sm text-zinc-500">
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-100 mb-4">
              Everything you need to dominate AI search
            </h2>
            <p className="text-lg text-zinc-400">
              The only platform that combines LLM tracking, forum engagement, and content optimization
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                title: "LLM Tracker",
                description: "Monitor your brand across ChatGPT, Perplexity, Claude, Gemini & more",
                color: "text-violet-400",
              },
              {
                icon: MessageSquare,
                title: "Forum Hub",
                description: "Discover & engage with Reddit, Quora, and niche forum opportunities",
                color: "text-blue-400",
              },
              {
                icon: FileText,
                title: "Content Studio",
                description: "Optimize content for AI citations with schema & E-E-A-T analysis",
                color: "text-orange-400",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                description: "Track share of voice, trends, and ROI across all channels",
                color: "text-green-400",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-100 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-zinc-400">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$29",
                description: "For individual brands",
                features: ["1 workspace", "100 LLM scans/mo", "200 forum threads", "2 team members"],
              },
              {
                name: "Pro",
                price: "$99",
                description: "For growing teams",
                features: ["3 workspaces", "500 LLM scans/mo", "Unlimited threads", "5 team members", "White-label reports"],
                popular: true,
              },
              {
                name: "Agency",
                price: "$249",
                description: "For agencies & enterprises",
                features: ["10 workspaces", "2000 LLM scans/mo", "Unlimited threads", "15 team members", "API access", "Priority support"],
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl border ${plan.popular
                    ? "border-violet-500/50 bg-gradient-to-b from-violet-600/10 to-transparent"
                    : "border-zinc-800 bg-zinc-900/50"
                  }`}
              >
                {plan.popular && (
                  <div className="flex items-center gap-1 text-violet-400 text-sm font-medium mb-4">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-zinc-100">{plan.name}</h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-4xl font-bold text-zinc-100">{plan.price}</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <p className="text-sm text-zinc-400 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-zinc-100 mb-4">
            Ready to own the AI answer?
          </h2>
          <p className="text-lg text-zinc-400 mb-8">
            Join brands and agencies using AEO Nexus to dominate AI search
          </p>
          <Link href="/signup">
            <Button size="lg" className="px-8">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-zinc-400">AEO Nexus</span>
          </div>
          <p className="text-xs text-zinc-500">
            © 2025 AEO Nexus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TryFreeSection } from "@/components/landing/try-free-section";
import {
  Zap,
  Search,
  MessageSquare,
  FileText,
  BarChart3,
  ArrowRight,
  Check,
  Star,
  Swords,
  ChevronDown,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Lumina
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-zinc-950/0 to-zinc-950/0 pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">
              The all-in-one Answer Engine Optimization platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            <span className="text-[var(--text-primary)]">Own the AI answer.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              Before your competitors do.
            </span>
          </h1>

          <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Track your brand across ChatGPT, Perplexity, Gemini & more. Engage on niche forums. Optimize content for AI citations. All in one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/signup">
              <Button size="lg" className="px-8 h-12 text-base bg-indigo-500 hover:bg-violet-700 shadow-lg shadow-violet-500/20">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 text-base border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                View Live Demo
              </Button>
            </Link>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative mx-auto max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-sm overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />

            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
              </div>
              <div className="flex-1 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--surface-elevated)] text-xs text-[var(--text-ghost)] font-mono border border-[var(--border)]/50">
                  <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
                  app.aeonexus.com/dashboard
                </div>
              </div>
            </div>

            {/* Mock Dashboard Content - Simplified representation */}
            <div className="p-6 grid gap-6 md:grid-cols-3 text-left">
              {/* Visual Cards */}
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                      <Zap className="w-4 h-4 text-indigo-400" /> AEO Health Score
                    </div>
                    <div className="text-3xl font-bold text-white">84/100</div>
                    <div className="text-xs text-green-400 mt-1">↑ 12% vs last week</div>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                      <Search className="w-4 h-4 text-blue-400" /> Share of Voice
                    </div>
                    <div className="text-3xl font-bold text-white">32%</div>
                    <div className="text-xs text-[var(--text-ghost)] mt-1">Leading competitor at 28%</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] h-48 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
                  <span className="text-[var(--text-ghost)] text-sm font-mono">Interactive Chart Area</span>
                  {/* Fake chart bars */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 h-24 px-8">
                    {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                      <div key={i} className="w-full bg-indigo-500/30 rounded-t-sm hover:bg-indigo-500/50 transition-colors" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Side Panel */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <div className="text-sm font-medium text-[var(--text-secondary)] mb-3">Recent Alerts</div>
                  <div className="space-y-3">
                    {[
                      { text: "Mentioned by ChatGPT", time: "2m ago", color: "bg-green-500" },
                      { text: "New Competitor: Omni", time: "1h ago", color: "bg-orange-500" },
                      { text: "Reddit Thread Opportunity", time: "3h ago", color: "bg-blue-500" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                        <span className="text-[var(--text-muted)] flex-1">{item.text}</span>
                        <span className="text-[var(--text-ghost)]">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-[var(--text-ghost)] mt-12 mb-4">Trusted by modern marketing teams</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Simple text logos for now */}
            <span className="text-lg font-bold text-[var(--text-secondary)]">Acme Inc</span>
            <span className="text-lg font-bold text-[var(--text-secondary)]">Globex</span>
            <span className="text-lg font-bold text-[var(--text-secondary)]">Soylent Corp</span>
            <span className="text-lg font-bold text-[var(--text-secondary)]">Initech</span>
            <span className="text-lg font-bold text-[var(--text-secondary)]">Umbrella</span>
          </div>
        </div>
      </section>

      {/* Try Free Section */}
      <TryFreeSection />

      {/* Features */}
      <section className="py-20 px-6 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Everything you need to dominate AI search
            </h2>
            <p className="text-lg text-[var(--text-muted)]">
              The only platform that combines LLM tracking, forum engagement, and content optimization
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                title: "LLM Tracker",
                description: "Monitor your brand across ChatGPT, Perplexity, Claude, Gemini & more",
                color: "text-indigo-400",
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
                className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)] transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-[var(--surface-elevated)] flex items-center justify-center mb-4`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-32 space-y-32">
            {/* Feature 1: LLM Tracker */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20">
                  <Search className="w-4 h-4" /> LLM Tracker
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">See what AI thinks of you.</h2>
                <p className="text-lg text-[var(--text-muted)]">
                  Stop guessing. We scan ChatGPT, Perplexity, Gemini, and Claude to tell you exactly how your brand appears in AI search results.
                </p>
                <ul className="space-y-3">
                  {[
                    'Track brand mentions & sentiment',
                    'Compare vs competitors',
                    'Identify cited sources'
                  ].map(item => (
                    <li key={item} className="flex items-center gap-3 text-[var(--text-secondary)]">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <Link href="/signup">
                    <Button variant="outline" className="border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                      Start Tracking <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-[var(--border)] p-8 h-80 flex items-center justify-center relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent opacity-50" />
                {/* Abstract visual */}
                <div className="relative w-full h-full flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-2 px-4 py-2 border-b border-[var(--border)]">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 px-4 py-2 rounded-lg bg-[var(--surface-elevated)]/30 border border-[var(--border)]/30 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className="w-8 h-8 rounded bg-[var(--surface-elevated)]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2 bg-[var(--surface-elevated)] rounded w-3/4" />
                        <div className="h-2 bg-[var(--surface-elevated)] rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 2: Battle Arena */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
                  <Swords className="w-4 h-4" /> Battle Arena
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Win the comparison war.</h2>
                <p className="text-lg text-[var(--text-muted)]">
                  Go head-to-head with competitors. See who AI recommends for specific queries and why.
                </p>
                <ul className="space-y-3">
                  {[
                    'Head-to-head AI battles',
                    'Win/Loss analysis',
                    'Opportunity scoring'
                  ].map(item => (
                    <li key={item} className="flex items-center gap-3 text-[var(--text-secondary)]">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <Link href="/signup">
                    <Button variant="outline" className="border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                      Compare Competitors <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-bl from-zinc-900 to-zinc-950 rounded-2xl border border-[var(--border)] p-8 h-80 flex items-center justify-center relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50" />
                {/* Battle Visual */}
                <div className="relative w-full h-full flex items-center justify-center gap-8">
                  <div className="w-24 h-32 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">Y</div>
                    <div className="h-1.5 w-12 bg-green-500 rounded-full" />
                  </div>
                  <div className="text-2xl font-black text-[var(--text-ghost)]">VS</div>
                  <div className="w-24 h-32 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex flex-col items-center justify-center gap-2 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center font-bold text-[var(--text-muted)]">C</div>
                    <div className="h-1.5 w-12 bg-red-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-12 text-center">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: "What is Answer Engine Optimization (AEO)?", a: "AEO is the practice of optimizing your content to be cited by AI search engines like ChatGPT, Perplexity, and Gemini. Unlike SEO which targets 10 blue links, AEO targets the single correct answer." },
              { q: "How accurate is the LLM tracking?", a: "We scan real-time responses from live LLM models including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and Llama 3. Our system analyzes these responses to detect brand mentions and sentiment with high accuracy." },
              { q: "Can I track my competitors?", a: "Yes. Our Battle Arena and Benchmarking tools allow you to compare your brand directly against competitors to see who wins for specific queries." },
              { q: "Do you offer a free trial?", a: "Yes, we offer a 14-day free trial on all plans. No credit card required to start." }
            ].map((faq, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors">
                    {faq.q}
                    <ChevronDown className="w-4 h-4 text-[var(--text-ghost)] transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 text-[var(--text-muted)] text-sm leading-relaxed border-t border-[var(--border)]/50 pt-4">
                    {faq.a}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-[var(--text-muted)]">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "₹2,499",
                description: "For small businesses",
                features: ["1 workspace", "100 LLM scans/mo", "200 forum threads", "2 team members"],
              },
              {
                name: "Pro",
                price: "₹7,999",
                description: "For growing teams",
                features: ["3 workspaces", "500 LLM scans/mo", "Unlimited threads", "5 team members", "White-label reports"],
                popular: true,
              },
              {
                name: "Agency",
                price: "₹19,999",
                description: "For agencies & enterprises",
                features: ["10 workspaces", "2000 LLM scans/mo", "Unlimited threads", "15 team members", "API access", "Priority support"],
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl border ${plan.popular
                  ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-transparent"
                  : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
              >
                {plan.popular && (
                  <div className="flex items-center gap-1 text-indigo-400 text-sm font-medium mb-4">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">{plan.name}</h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-4xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                  <span className="text-[var(--text-muted)]">/month</span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Ready to own the AI answer?
          </h2>
          <p className="text-lg text-[var(--text-muted)] mb-8">
            Join brands and agencies using Lumina to dominate AI search
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
      <footer className="py-8 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--text-muted)]">Lumina</span>
          </div>
          <p className="text-xs text-[var(--text-ghost)]">
            © 2026 Lumina. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

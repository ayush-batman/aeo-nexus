"use client";
import Link from "next/link";
import { ArrowRight, BarChart2, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-zinc-100 selection:text-black font-sans">
      
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Geometric Sharp Logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22h20L12 2z" className="fill-white" />
              <path d="M12 8L6 20h12L12 8z" className="fill-black" />
            </svg>
            <span className="text-base font-medium tracking-tight text-white group-hover:text-zinc-300 transition-colors">Aelo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Platform</Link>
            <Link href="#solutions" className="text-sm text-zinc-400 hover:text-white transition-colors">Solutions</Link>
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="text-sm bg-white text-black px-4 py-2 opacity-90 hover:opacity-100 transition-opacity font-medium">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 md:pt-48 md:pb-32 px-6">
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none border border-white/10 bg-white/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-300 tracking-wide uppercase font-mono">Live on ChatGPT & Gemini</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[1.05] mb-6 text-white text-balance">
            The standard for <br /> artificial intelligence visibility.
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl text-balance leading-relaxed mb-10">
            Aelo is the command center for winning the AI answer. Track, analyze, and reverse-engineer your brand's presence across ChatGPT, Perplexity, Claude, and Gemini.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/signup" className="w-full sm:w-auto text-base bg-white text-black px-8 py-3.5 hover:bg-zinc-200 transition-colors font-medium flex items-center justify-center gap-2">
              Calculate your AI Score
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#demo" className="w-full sm:w-auto text-base bg-transparent text-white border border-white/20 px-8 py-3.5 hover:bg-white/5 transition-colors font-medium flex items-center justify-center">
              View Analytics
            </Link>
          </div>
        </div>
      </section>

      {/* ── DATA VISUALIZATION / UI MOCKUP ── */}
      <section className="pb-32 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="bg-[#0A0A0A] border border-white/10 p-2 shadow-2xl">
            <div className="border border-white/5 bg-[#121212] p-8 md:p-12 flex flex-col md:flex-row gap-12 items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Overall Visibility</p>
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-6xl md:text-8xl font-medium tracking-tighter text-white">72</span>
                  <span className="text-lg text-emerald-400 font-mono tracking-widest">+14% YoY</span>
                </div>
                <p className="text-sm text-zinc-400 mt-4 leading-relaxed max-w-sm">
                  Your brand controls the narrative in 72% of all AI-generated answers related to your core market category.
                </p>
              </div>

              <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                {[
                  { engine: "ChatGPT 4o", score: 85, color: "bg-white" },
                  { engine: "Perplexity", score: 62, color: "bg-zinc-400" },
                  { engine: "Claude 3.5", score: 78, color: "bg-zinc-500" },
                  { engine: "Gemini Pro", score: 64, color: "bg-zinc-700" },
                ].map((stat) => (
                  <div key={stat.engine} className="flex flex-col p-5 bg-black border border-white/5">
                    <span className="text-xs text-zinc-500 font-mono mb-2">{stat.engine}</span>
                    <span className="text-2xl font-medium text-white mb-4">{stat.score}</span>
                    <div className="h-0.5 w-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${stat.color}`} style={{ width: `${stat.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-32 bg-[#050505] border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6 text-white">
              Data is the new search engine.
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Traditional SEO is becoming obsolete. As users shift toward AI chat interfaces for product discovery, your brand must be systematically embedded into LLM training weights and retrieval streams.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 border-t border-white/10 pt-16">
            {[
              {
                icon: <BarChart2 className="w-5 h-5" />,
                title: "Precise Analytics",
                description: "Map your exact share of voice across every major LLM with down-to-the-prompt granularity."
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: "Brand Sentinel",
                description: "Live alerts the moment an AI hallucinates a competitor's feature or drops your ranking."
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: "Execution Engine",
                description: "Identify the exact Reddit threads, documentation pages, and GitHub repos LLMs are citing."
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-col">
                <div className="w-10 h-10 flex items-center justify-center border border-white/10 bg-white/5 text-white mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-medium text-white mb-3 tracking-tight">{f.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING / CTA ── */}
      <section className="py-32 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-8 text-white">
            Dominate the AI narrative.
          </h2>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 font-medium hover:bg-zinc-200 transition-colors">
            Deploy Aelo Workspace
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-white/5 bg-black">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22h20L12 2z" className="fill-white" />
            </svg>
            <span className="text-sm font-medium tracking-widest uppercase">Aelo Inc.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <span>System Status: <span className="text-emerald-500">All Systems Operational</span></span>
          </div>
        </div>
      </footer>

    </div>
  );
}

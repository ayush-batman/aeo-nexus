"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

const SAMPLES = [
    {
        engine: "ChatGPT",
        sample: "01",
        answer: "For a growing engineering team, I would compare Notion for flexibility, Slite for focused knowledge sharing, and Confluence for teams already working in Jira.",
        citations: 3,
        reference: "P1 · E1 · S1",
        mentioned: false,
    },
    {
        engine: "Gemini",
        sample: "02",
        answer: "Notion is a strong general-purpose choice. Slite is more opinionated about team documentation, while Confluence works well when the rest of the workflow already lives in Atlassian.",
        citations: 2,
        reference: "P1 · E2 · S2",
        mentioned: false,
    },
    {
        engine: "Claude",
        sample: "03",
        answer: "Start with the review habit, not the feature list. Teams that write lightweight decisions may prefer Slite; teams that need a flexible workspace often choose Notion.",
        citations: 1,
        reference: "P1 · E3 · S3",
        mentioned: false,
    },
    {
        engine: "Perplexity",
        sample: "04",
        answer: "Notion, Slite, and Confluence are the common shortlist. Compare permissions, search quality, version history, and how quickly engineers can update a decision after shipping.",
        citations: 4,
        reference: "P1 · E4 · S4",
        mentioned: false,
    },
] as const;

const ENGINE_ROWS = [
    { name: "ChatGPT", mentions: 3, samples: 4, range: "30–95%" },
    { name: "Gemini", mentions: 2, samples: 4, range: "15–85%" },
    { name: "Claude", mentions: 1, samples: 4, range: "5–70%" },
    { name: "Perplexity", mentions: 3, samples: 4, range: "30–95%" },
] as const;

export function EvidenceSequence() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isInteracting, setIsInteracting] = useState(false);
    const activeSample = SAMPLES[activeIndex];

    useEffect(() => {
        if (!isPlaying || isInteracting || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const interval = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % SAMPLES.length);
        }, 4800);

        return () => window.clearInterval(interval);
    }, [isInteracting, isPlaying]);

    function chooseSample(index: number) {
        setActiveIndex(index);
        setIsPlaying(false);
    }

    function togglePlayback() {
        setIsPlaying((current) => !current);
        setIsInteracting(false);
    }

    return (
        <div
            className="aelo-evidence-sequence relative pb-4 pr-4"
            onPointerEnter={() => setIsInteracting(true)}
            onPointerLeave={() => setIsInteracting(false)}
            onFocusCapture={() => setIsInteracting(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false);
            }}
        >
            <div aria-hidden="true" className="aelo-evidence-echo aelo-evidence-echo-back" />
            <div aria-hidden="true" className="aelo-evidence-echo aelo-evidence-echo-mid" />

            <article
                id="illustrative-answer"
                key={activeSample.reference}
                className="aelo-evidence-answer relative bg-[#fbfaf5] p-6 text-[#1d2523] shadow-[0_20px_70px_rgba(29,37,35,.13)] md:p-8"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d2d7cf] pb-5 font-mono text-xs uppercase tracking-widest text-[#586560]">
                    <span>{activeSample.engine} / sample {activeSample.sample}</span>
                    <span>Illustrative answer</span>
                </div>

                <h3 className="mt-8 max-w-xl text-2xl font-semibold tracking-tight">Which project wiki is best for an engineering team?</h3>
                <p className="mt-6 min-h-[104px] max-w-2xl text-base leading-relaxed text-[#3f4947] md:min-h-[78px]">
                    {activeSample.answer}
                </p>

                <div aria-hidden="true" className="aelo-evidence-source-line mt-8 h-px origin-left bg-[#a8cbe0]" />
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-[#895345]">Your brand is absent from this answer</p>
                        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#586560]">
                            {activeSample.citations} provider citation{activeSample.citations === 1 ? "" : "s"} · illustrative
                        </p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest text-[#586560]">{activeSample.reference}</span>
                </div>
            </article>

            <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-[#bbc4bc] py-2">
                <div className="flex flex-wrap" role="group" aria-label="Choose an illustrative answer sample">
                    {SAMPLES.map((sample, index) => (
                        <button
                            key={sample.reference}
                            type="button"
                            aria-controls="illustrative-answer"
                            aria-pressed={activeIndex === index}
                            onClick={() => chooseSample(index)}
                            className="aelo-sample-button relative inline-flex min-h-11 items-center gap-2 px-3 text-left font-mono text-xs uppercase tracking-widest text-[#586560] transition-colors duration-200 hover:text-[#1d2523] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#416a88] focus-visible:ring-offset-2"
                        >
                            <span className="text-[#416a88]">0{index + 1}</span>
                            <span className="hidden sm:inline">{sample.engine}</span>
                            {activeIndex === index && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-[#416a88]" />}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={togglePlayback}
                    className="inline-flex min-h-11 items-center gap-2 px-3 font-mono text-xs uppercase tracking-widest text-[#53615d] transition-colors duration-200 hover:text-[#1d2523] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#416a88] focus-visible:ring-offset-2"
                    aria-label={isPlaying ? "Pause sample sequence" : "Play sample sequence"}
                >
                    {isPlaying ? <Pause aria-hidden="true" className="size-3.5" /> : <Play aria-hidden="true" className="size-3.5" />}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>
            </div>

            <div className="relative mt-12 border-y border-[#bbc4bc]">
                {ENGINE_ROWS.map((engine, index) => {
                    const score = Math.round((engine.mentions / engine.samples) * 100);
                    return (
                        <div key={engine.name} className="grid gap-3 border-b border-[#cbd2cb] px-4 py-5 last:border-b-0 sm:grid-cols-[36px_96px_1fr_110px] sm:items-center">
                            <span className="font-mono text-xs text-[#586560]">0{index + 1}</span>
                            <span className="text-sm font-semibold">{engine.name}</span>
                            <div className="relative h-4 before:absolute before:inset-x-0 before:top-2 before:h-px before:bg-[#bbc4bc]">
                                <span className="absolute top-1 h-2 w-0.5 bg-[#416a88]" style={{ left: `${score}%` }} />
                            </div>
                            <span className="font-mono text-xs text-[#586560] sm:text-right">{engine.mentions}/{engine.samples} · 95% {engine.range}</span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#586560]">Illustrative structure, not a customer result. A live receipt only shows answers and evidence returned by the provider.</p>
        </div>
    );
}

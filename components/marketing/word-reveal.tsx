"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type WordRevealProps = {
    children: string;
    className?: string;
};

export function WordReveal({ children, className }: WordRevealProps) {
    const rootRef = useRef<HTMLParagraphElement>(null);
    const [visibleWords, setVisibleWords] = useState(0);
    const words = children.split(" ");
    const wordCount = words.length;

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const frame = window.requestAnimationFrame(() => setVisibleWords(wordCount));
            return () => window.cancelAnimationFrame(frame);
        }

        const timers: number[] = [];

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                Array.from({ length: wordCount }).forEach((_, index) => {
                    timers.push(window.setTimeout(() => setVisibleWords(index + 1), index * 55));
                });
                observer.disconnect();
            },
            { threshold: 0.35 },
        );

        observer.observe(root);
        return () => {
            observer.disconnect();
            timers.forEach((timer) => window.clearTimeout(timer));
        };
    }, [wordCount]);

    return (
        <p ref={rootRef} className={className}>
            {words.map((word, index) => (
                <span
                    key={`${word}-${index}`}
                    className={cn(
                        "inline-block transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        index < visibleWords
                            ? "translate-y-0 text-[#111936] opacity-100"
                            : "translate-y-2 text-[#111936] opacity-25",
                    )}
                >
                    {word}
                    {index < words.length - 1 ? "\u00a0" : ""}
                </span>
            ))}
        </p>
    );
}

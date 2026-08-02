// Shared shell for legal pages so Privacy / Terms / Security look consistent
// and are easy to update. Sage: clean, structured, no marketing gloss.

export interface Section {
    title: string;
    body: string | string[];
}

export function LegalPage({
    kind,
    lastUpdated,
    intro,
    sections,
}: {
    kind: string;
    lastUpdated: string;
    intro: string;
    sections: Section[];
}) {
    return (
        <>
            <section className="pt-20 pb-8 md:pt-28 md:pb-12 px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        Legal · {kind}
                    </p>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4">
                        {kind}
                    </h1>
                    <p className="text-[13px] text-zinc-500 font-mono">
                        Last updated · {lastUpdated}
                    </p>
                </div>
            </section>

            <section className="pb-24 px-6">
                <div className="mx-auto max-w-3xl text-[15px] text-zinc-400 leading-[1.75] space-y-8">
                    <p className="text-[16px] text-zinc-300">{intro}</p>

                    {sections.map((s, i) => (
                        <div key={i}>
                            <h2 className="text-xl font-medium tracking-tight text-white mb-3">
                                {i + 1}. {s.title}
                            </h2>
                            {Array.isArray(s.body) ? (
                                <ul className="space-y-2">
                                    {s.body.map((b, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                            <span className="mt-2 h-1 w-1 rounded-full bg-zinc-600 flex-shrink-0" />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{s.body}</p>
                            )}
                        </div>
                    ))}

                    <div className="border-t border-white/5 pt-6 text-[13px] text-zinc-500">
                        Questions? Email <span className="font-mono text-zinc-300">legal@aelohq.com</span>.
                    </div>
                </div>
            </section>
        </>
    );
}

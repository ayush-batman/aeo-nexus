import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="marketing-site min-h-screen bg-[#0e1530] text-zinc-100 selection:bg-[#f6e76b] selection:text-[#111936] font-sans [--accent-base:#f6e76b] [--accent-hover:#ffef8a] [--text-on-accent:#111936]">
            <MarketingNav />
            <main id="main-content">{children}</main>
            <MarketingFooter />
        </div>
    );
}

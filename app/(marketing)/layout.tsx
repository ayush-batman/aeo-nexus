import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black text-zinc-100 selection:bg-zinc-100 selection:text-black font-sans">
            <MarketingNav />
            <main>{children}</main>
            <MarketingFooter />
        </div>
    );
}

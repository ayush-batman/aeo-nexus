"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
    title: string;
    description?: string;
}

export function Header({ title, description }: HeaderProps) {
    return (
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center justify-between h-full px-6">
                {/* Title */}
                <div>
                    <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
                    {description && (
                        <p className="text-sm text-zinc-400">{description}</p>
                    )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Search..."
                            className="w-64 pl-9 bg-zinc-900/50"
                        />
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
                    </button>

                    {/* User menu */}
                    <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                            U
                        </div>
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
            </div>
        </header>
    );
}

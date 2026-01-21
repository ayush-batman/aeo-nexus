"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Settings,
    User,
    Building,
    CreditCard,
    Users,
    Bell,
    Key,
    Globe,
    Palette,
    Save,
    Plus,
    Trash2,
    Crown,
} from "lucide-react";

const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "team", label: "Team", icon: Users },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api", label: "API Keys", icon: Key },
];

const mockTeam = [
    { id: 1, name: "Ayush", email: "ayush@example.com", role: "owner", avatar: "A" },
    { id: 2, name: "Demo User", email: "demo@example.com", role: "admin", avatar: "D" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("general");

    return (
        <>
            <Header
                title="Settings"
                description="Manage your workspace settings"
            />

            <div className="p-6">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-48 flex-shrink-0 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                    activeTab === tab.id
                                        ? "bg-zinc-800 text-zinc-100"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-6">
                        {activeTab === "general" && (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Building className="w-5 h-5" />
                                            Workspace
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Workspace Name
                                            </label>
                                            <Input defaultValue="My Brand" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Brand Domain
                                            </label>
                                            <Input defaultValue="dylect.com" />
                                        </div>
                                        <Button>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="w-5 h-5" />
                                            Profile
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                    Full Name
                                                </label>
                                                <Input defaultValue="Ayush" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                    Email
                                                </label>
                                                <Input defaultValue="ayush@example.com" type="email" />
                                            </div>
                                        </div>
                                        <Button>
                                            <Save className="w-4 h-4 mr-2" />
                                            Update Profile
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {activeTab === "team" && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Team Members</CardTitle>
                                    <Button size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Invite
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {mockTeam.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                                                        {member.avatar}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-zinc-200">{member.name}</p>
                                                        <p className="text-sm text-zinc-500">{member.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={member.role === "owner" ? "default" : "outline"}>
                                                        {member.role === "owner" && <Crown className="w-3 h-3 mr-1" />}
                                                        {member.role}
                                                    </Badge>
                                                    {member.role !== "owner" && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "billing" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Current Plan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-4 rounded-lg bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <Badge variant="default" className="mb-2">Free Plan</Badge>
                                                <p className="text-2xl font-bold text-zinc-100">$0/month</p>
                                            </div>
                                            <Button>Upgrade</Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-zinc-400">LLM Scans</p>
                                                <p className="font-medium text-zinc-200">5 / 10</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-400">Forum Threads</p>
                                                <p className="font-medium text-zinc-200">12 / 20</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-400">Team Members</p>
                                                <p className="font-medium text-zinc-200">1 / 1</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "notifications" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Notification Preferences</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { label: "Daily visibility report", description: "Get a summary of your LLM visibility each day" },
                                        { label: "New high-priority threads", description: "Alert when new HOT threads are discovered" },
                                        { label: "Competitor mentions", description: "Notify when competitors are mentioned in AI answers" },
                                        { label: "Weekly digest", description: "Weekly summary of all AEO activity" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                                            <div>
                                                <p className="font-medium text-zinc-200">{item.label}</p>
                                                <p className="text-sm text-zinc-500">{item.description}</p>
                                            </div>
                                            <input type="checkbox" defaultChecked={i < 2} className="rounded" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "api" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">API Keys</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium text-zinc-200">Production Key</p>
                                            <Badge variant="success">Active</Badge>
                                        </div>
                                        <code className="text-sm text-zinc-400 bg-zinc-900 px-2 py-1 rounded">
                                            aeo_live_••••••••••••••••
                                        </code>
                                    </div>
                                    <Button variant="outline">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Generate New Key
                                    </Button>
                                    <p className="text-xs text-zinc-500">
                                        API access is available on Pro and Agency plans.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

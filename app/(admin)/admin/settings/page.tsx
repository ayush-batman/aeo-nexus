import { getCurrentUser } from "@/lib/admin";
import {
    Settings,
    User,
    Shield,
    Bell,
    Key
} from "lucide-react";

export default async function AdminSettingsPage() {
    const user = await getCurrentUser();

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Admin Settings
                </h1>
                <p className="text-[var(--text-secondary)]">
                    Platform configuration and preferences
                </p>
            </div>

            {/* Profile Section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">{user?.full_name || 'Admin User'}</h2>
                        <p className="text-[var(--text-secondary)]">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Shield className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400 text-sm font-medium">Super Admin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notifications */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Bell className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Notifications</h3>
                    </div>
                    <div className="space-y-4">
                        <label className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)]">New signup alerts</span>
                            <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-[var(--bg-raised)] border-[var(--border-default)] text-violet-600 focus:ring-violet-500" />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)]">Subscription changes</span>
                            <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-[var(--bg-raised)] border-[var(--border-default)] text-violet-600 focus:ring-violet-500" />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)]">Weekly reports</span>
                            <input type="checkbox" className="w-5 h-5 rounded bg-[var(--bg-raised)] border-[var(--border-default)] text-violet-600 focus:ring-violet-500" />
                        </label>
                    </div>
                </div>

                {/* API Keys */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
                            <Key className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">API Configuration</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[var(--text-secondary)] text-sm mb-1 block">Stripe Webhook Secret</label>
                            <input
                                type="password"
                                value="••••••••••••••••"
                                readOnly
                                className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-ghost)]"
                            />
                        </div>
                        <div>
                            <label className="text-[var(--text-secondary)] text-sm mb-1 block">OpenAI API Key</label>
                            <input
                                type="password"
                                value="••••••••••••••••"
                                readOnly
                                className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-ghost)]"
                            />
                        </div>
                    </div>
                    <p className="text-[var(--text-ghost)] text-sm mt-4">
                        API keys are configured via environment variables
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
                <button className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-medium rounded-lg hover:from-rose-500 hover:to-orange-500 transition-all">
                    Save Settings
                </button>
            </div>
        </div>
    );
}

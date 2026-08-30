"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import { Save, Globe, Shield, Code2, Zap } from "lucide-react";

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.getSettings);
  const updateSetting = useMutation(api.settings.updateSetting);
  const [saved, setSaved] = useState(false);

  const handleSave = async (key: string, value: unknown) => {
    await updateSetting({ key, value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    {
      title: "General",
      icon: Globe,
      items: [
        { key: "siteName", label: "Site Name", type: "text", value: settings?.siteName ?? "CodeRush" },
        { key: "siteDescription", label: "Site Description", type: "textarea", value: settings?.siteDescription ?? "" },
      ],
    },
    {
      title: "Security",
      icon: Shield,
      items: [
        { key: "allowRegistration", label: "Allow Registration", type: "toggle", value: settings?.allowRegistration ?? true },
        { key: "requireEmailVerification", label: "Require Email Verification", type: "toggle", value: settings?.requireEmailVerification ?? false },
      ],
    },
    {
      title: "Execution",
      icon: Zap,
      items: [
        { key: "defaultTimeLimit", label: "Default Time Limit (ms)", type: "number", value: settings?.defaultTimeLimit ?? 2000 },
        { key: "defaultMemoryLimit", label: "Default Memory Limit (MB)", type: "number", value: settings?.defaultMemoryLimit ?? 256 },
        { key: "maxConcurrentExecutions", label: "Max Concurrent Executions", type: "number", value: settings?.maxConcurrentExecutions ?? 10 },
      ],
    },
    {
      title: "Features",
      icon: Code2,
      items: [
        { key: "leaderboardEnabled", label: "Leaderboard Enabled", type: "toggle", value: settings?.leaderboardEnabled ?? true },
        { key: "showcaseEnabled", label: "Showcase Enabled", type: "toggle", value: settings?.showcaseEnabled ?? true },
        { key: "maintenanceMode", label: "Maintenance Mode", type: "toggle", value: settings?.maintenanceMode ?? false },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">Configure platform settings and preferences</p>
        </div>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
            <Save size={16} /> Settings saved
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5"
          >
            <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <section.icon size={18} className="text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            </div>
            <div className="mt-4 space-y-4">
              {section.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">{item.label}</label>
                  {item.type === "toggle" ? (
                    <button
                      onClick={() => handleSave(item.key, !item.value)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${item.value ? "bg-blue-500" : "bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${item.value ? "left-5.5" : "left-0.5"}`} />
                    </button>
                  ) : item.type === "textarea" ? (
                    <textarea
                      defaultValue={String(item.value ?? "")}
                      onBlur={(e) => handleSave(item.key, e.target.value)}
                      className="w-48 rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      rows={2}
                    />
                  ) : (
                    <input
                      type={item.type}
                      defaultValue={String(item.value ?? "")}
                      onBlur={(e) => handleSave(item.key, item.type === "number" ? Number(e.target.value) : e.target.value)}
                      className="w-48 rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}


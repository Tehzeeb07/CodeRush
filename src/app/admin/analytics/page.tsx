"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import { Users, TrendingUp, Code2, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AdminAnalyticsPage() {
  const analytics = useQuery(api.admin.getAnalytics);
  const userGrowth = analytics?.userGrowth ?? [];
  const languageUsage = analytics?.languageUsage ?? [];
  const submissionTrends = analytics?.submissionTrends ?? [];
  const difficultyDist = analytics?.difficultyDistribution ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">Platform performance and usage insights</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: analytics?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", change: "+12%" },
          { label: "Active Today", value: analytics?.activeToday ?? 0, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", change: "+5%" },
          { label: "Submissions", value: analytics?.totalSubmissions ?? 0, icon: Code2, color: "text-purple-400", bg: "bg-purple-500/10", change: "+18%" },
          { label: "Success Rate", value: `${analytics?.successRate ?? 0}%`, icon: BarChart3, color: "text-amber-400", bg: "bg-amber-500/10", change: "+2%" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-emerald-400">{stat.change} this week</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
          <h3 className="text-lg font-semibold text-white">User Growth</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px" }} labelStyle={{ color: "#F1F5F9" }} />
                <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
          <h3 className="text-lg font-semibold text-white">Language Usage</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={languageUsage} dataKey="count" nameKey="language" cx="50%" cy="50%" outerRadius={80} label>
                  {languageUsage.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
        <h3 className="text-lg font-semibold text-white">Daily Submissions</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={submissionTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px" }} labelStyle={{ color: "#F1F5F9" }} />
              <Bar dataKey="submissions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
        <h3 className="text-lg font-semibold text-white">Problem Difficulty Distribution</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={difficultyDist} dataKey="count" nameKey="difficulty" cx="50%" cy="50%" outerRadius={80} label>
                {difficultyDist.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


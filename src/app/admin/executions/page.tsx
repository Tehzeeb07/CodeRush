"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";

export default function AdminExecutionsPage() {
  const stats = useQuery(api.executions.getExecutionStats);
  const recentJobs = useQuery(api.executions.listRecentExecutions, { limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Execution Monitoring</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor code execution jobs and service health</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Executions", value: stats?.total ?? 0, icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Successful", value: stats?.successful ?? 0, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Failed", value: stats?.failed ?? 0, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Avg Runtime", value: `${stats?.avgRuntimeMs ?? 0}ms`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
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
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Service Status */}
      <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
        <h2 className="text-lg font-semibold text-white">Service Status</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Judge0 Service</p>
              <p className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle size={12} /> Healthy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <Activity size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Queue Processor</p>
              <p className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle size={12} /> Running
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <Clock size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Queue Length</p>
              <p className="text-xs text-slate-400">{stats?.queueLength ?? 0} jobs pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
        <div className="border-b border-slate-700/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent Executions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Language</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Runtime</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {recentJobs?.map((job) => (
                <tr key={job._id} className="hover:bg-slate-700/20">
                  <td className="px-6 py-3 text-sm font-mono text-slate-300">{job._id.slice(-8)}</td>
                  <td className="px-6 py-3 text-sm text-slate-300">{job.language}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${job.status === "success" ? "bg-emerald-500/20 text-emerald-400" : job.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-300">{job.executionTime ?? 0}ms</td>
                  <td className="px-6 py-3 text-sm text-slate-400">{new Date(job.startedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

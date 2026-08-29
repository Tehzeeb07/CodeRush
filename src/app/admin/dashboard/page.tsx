
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";

import {
  Users,
  Puzzle,
  Code2,
  CheckCircle2,
  XCircle,
  Bookmark,
  Palette,
  Clock,
  TrendingUp,
  Activity,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
];

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  color,
  index,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.05,
        ease: "easeOut",
      }}
      whileHover={{ y: -3 }}
      className="
        group relative overflow-hidden
        rounded-2xl
        border border-white/[0.06]
        bg-[#111827]
        p-4 sm:p-5
        shadow-[0_10px_40px_rgba(0,0,0,0.12)]
        transition-shadow
        hover:border-white/[0.1]
        hover:shadow-[0_16px_50px_rgba(0,0,0,0.2)]
      "
    >
      {/* Glow */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${color} opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.15]`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-white sm:text-[28px]">
            {value}
          </p>

          {change ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
              <TrendingUp size={11} />
              {change}
            </div>
          ) : (
            <div className="mt-2 text-[10px] text-slate-600">
              Current platform total
            </div>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg sm:h-12 sm:w-12`}
        >
          <Icon size={21} className="text-white" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500 group-hover:w-full" />
    </motion.div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.12)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white sm:text-base">
            {title}
          </h3>
          <p className="mt-1 text-[11px] text-slate-600">{subtitle}</p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-500">
          <BarChart3 size={15} />
        </div>
      </div>

      {children}
    </div>
  );
}

export default function AdminDashboardPage() {
  const overview = useQuery(api.admin.getDashboardOverview);

  if (!overview) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-400" />
          <p className="mt-4 text-xs text-slate-600">
            Loading admin analytics...
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: Users,
      label: "Total Users",
      value: overview.totalUsers,
      change: "+12%",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      label: "Active Users",
      value: overview.activeUsers,
      change: "+8%",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Puzzle,
      label: "Total Problems",
      value: overview.totalProblems,
      color: "from-violet-500 to-purple-600",
    },
    {
      icon: Code2,
      label: "Total Submissions",
      value: overview.totalSubmissions,
      change: "+24%",
      color: "from-amber-500 to-orange-500",
    },
    {
      icon: CheckCircle2,
      label: "Successful Executions",
      value: overview.successfulExecutions,
      color: "from-emerald-500 to-green-600",
    },
    {
      icon: XCircle,
      label: "Failed Executions",
      value: overview.failedExecutions,
      color: "from-red-500 to-rose-600",
    },
    {
      icon: Bookmark,
      label: "Total Bookmarks",
      value: overview.totalBookmarks,
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: Palette,
      label: "Showcase Posts",
      value: overview.totalShowcasePosts,
      color: "from-indigo-500 to-violet-600",
    },
    {
      icon: Clock,
      label: "Avg Execution Time",
      value: `${overview.averageExecutionTimeMs}ms`,
      color: "from-cyan-500 to-blue-500",
    },
  ];

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="
          relative overflow-hidden rounded-2xl
          border border-white/[0.06]
          bg-gradient-to-br from-[#111827] via-[#111827] to-[#15152A]
          p-5 sm:p-6
        "
      >
        <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-20 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/10 bg-blue-400/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-400">
              <Activity size={11} />
              Live Platform Overview
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
              Monitor users, coding activity, executions and the overall
              performance of your CodeRush platform.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              System Operational
            </span>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Platform Metrics</h2>
            <p className="mt-1 text-[11px] text-slate-600">
              Real-time overview of your platform
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} index={index} />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-white">
            Platform Analytics
          </h2>
          <p className="mt-1 text-[11px] text-slate-600">
            Activity and distribution across CodeRush
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* User Growth */}
          <ChartCard
            title="User Growth"
            subtitle="New users over time"
          >
            <div className="h-[230px] w-full sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={overview.charts.usersGrowth}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="adminUserGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#3B82F6"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3B82F6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1F2937"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    cursor={{
                      stroke: "rgba(59,130,246,0.2)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#adminUserGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Daily Submissions */}
          <ChartCard
            title="Daily Submissions"
            subtitle="Coding activity across the platform"
          >
            <div className="h-[230px] w-full sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.dailySubmissions}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1F2937"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Language Usage */}
          <ChartCard
            title="Language Usage"
            subtitle="Programming languages used by the community"
          >
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.charts.languageUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="language"
                    stroke="none"
                  >
                    {overview.charts.languageUsage.map((_, index: number) => (
                      <Cell
                        key={`language-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/[0.05] pt-3">
              {overview.charts.languageUsage.map((item, index: number) => (
                <div
                  key={item.language}
                  className="flex items-center gap-1.5 text-[10px] text-slate-500"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  {item.language}
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Difficulty */}
          <ChartCard
            title="Problem Difficulty"
            subtitle="Distribution of problems by difficulty"
          >
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.charts.difficultyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius="48%"
                    outerRadius="76%"
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="difficulty"
                    stroke="none"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#F59E0B" />
                    <Cell fill="#EF4444" />
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-3 border-t border-white/[0.05] pt-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Easy
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Medium
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Hard
              </div>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* Success Rate */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="
          relative overflow-hidden rounded-2xl
          border border-white/[0.06]
          bg-[#111827]
          p-5 sm:p-6
        "
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 size={17} className="text-emerald-400" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">
                  Platform Success Rate
                </h3>
                <p className="text-[10px] text-slate-600">
                  Successful code executions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400 sm:text-4xl">
              {overview.successRate}%
            </span>

            <ArrowUpRight
              size={18}
              className="text-emerald-400"
            />
          </div>
        </div>

        <div className="relative mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.max(
                  0,
                  Math.min(100, overview.successRate)
                )}%`,
              }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
              }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
            />
          </div>

          <div className="mt-2 flex justify-between text-[9px] uppercase tracking-wider text-slate-700">
            <span>0%</span>
            <span>Platform reliability</span>
            <span>100%</span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

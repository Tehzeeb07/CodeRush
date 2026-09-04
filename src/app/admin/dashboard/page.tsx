
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
  "#60A5FA",
  "#A78BFA",
  "#34D399",
  "#FBBF24",
  "#F472B6",
  "#22D3EE",
];

/* =========================================================
   STAT CARD
========================================================= */

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
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
      }}
      whileHover={{
        y: -6,
        scale: 1.01,
      }}
      className="
        group relative overflow-hidden
        rounded-[22px]
        border border-white/[0.08]
        bg-gradient-to-br
        from-white/[0.07]
        via-white/[0.035]
        to-white/[0.015]
        p-5
        backdrop-blur-xl
        shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        transition-all duration-300
        hover:border-white/[0.15]
        hover:shadow-[0_25px_80px_rgba(0,0,0,0.4)]
      "
    >
      {/* Background Glow */}
      <div
        className={`absolute -right-12 -top-12 h-32 w-32 rounded-full ${color} opacity-10 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-20`}
      />

      {/* Decorative Circle */}
      <div className="absolute right-5 top-5 h-20 w-20 rounded-full border border-white/[0.04]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-lg`}
          >
            <Icon size={21} className="text-white" />
          </div>

          {change && (
            <div className="flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-400/10 px-2 py-1">
              <TrendingUp size={11} className="text-emerald-400" />

              <span className="text-[10px] font-bold text-emerald-400">
                {change}
              </span>
            </div>
          )}
        </div>

        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>

        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className={`h-full w-[65%] rounded-full bg-gradient-to-r ${color} opacity-70 transition-all duration-700 group-hover:w-full`}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================
   CHART CARD
========================================================= */

function ChartCard({
  title,
  subtitle,
  children,
  large = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        relative overflow-hidden
        rounded-[24px]
        border border-white/[0.07]
        bg-gradient-to-br
        from-white/[0.055]
        via-white/[0.025]
        to-transparent
        p-5
        backdrop-blur-xl
        shadow-[0_20px_70px_rgba(0,0,0,0.22)]
        ${large ? "xl:col-span-2" : ""}
      `}
    >
      {/* Top Highlight */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">
            {title}
          </h3>

          <p className="mt-1 text-[11px] text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04]">
          <BarChart3 size={15} className="text-slate-400" />
        </div>
      </div>

      {children}
    </motion.div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminDashboardPage() {
  const overview = useQuery(api.admin.getDashboardOverview);

  if (!overview) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full border border-blue-500/20" />

            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-400" />
          </div>

          <p className="mt-5 text-xs font-medium text-slate-500">
            Loading dashboard...
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
      color: "from-blue-500 to-cyan-400",
    },
    {
      icon: Activity,
      label: "Active Users",
      value: overview.activeUsers,
      change: "+8%",
      color: "from-emerald-500 to-teal-400",
    },
    {
      icon: Puzzle,
      label: "Problems",
      value: overview.totalProblems,
      color: "from-violet-500 to-purple-400",
    },
    {
      icon: Code2,
      label: "Submissions",
      value: overview.totalSubmissions,
      change: "+24%",
      color: "from-orange-500 to-amber-400",
    },
    {
      icon: CheckCircle2,
      label: "Successful Executions",
      value: overview.successfulExecutions,
      color: "from-green-500 to-emerald-400",
    },
    {
      icon: XCircle,
      label: "Failed Executions",
      value: overview.failedExecutions,
      color: "from-red-500 to-rose-400",
    },
    {
      icon: Bookmark,
      label: "Bookmarks",
      value: overview.totalBookmarks,
      color: "from-pink-500 to-fuchsia-400",
    },
    {
      icon: Palette,
      label: "Showcase Posts",
      value: overview.totalShowcasePosts,
      color: "from-indigo-500 to-blue-400",
    },
    {
      icon: Clock,
      label: "Avg Execution",
      value: `${overview.averageExecutionTimeMs}ms`,
      color: "from-cyan-500 to-sky-400",
    },
  ];

  return (
    <div className="min-h-full space-y-7 pb-12">

      {/* =====================================================
          HERO
      ====================================================== */}

      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="
          relative overflow-hidden
          rounded-[28px]
          border border-white/[0.08]
          bg-gradient-to-br
          from-[#111827]
          via-[#0F172A]
          to-[#101426]
          p-6
          shadow-[0_30px_100px_rgba(0,0,0,0.3)]
          sm:p-8
        "
      >
        {/* Grid Background */}
        <div
          className="
            pointer-events-none absolute inset-0 opacity-[0.08]
            bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)]
            bg-[size:40px_40px]
          "
        />

        {/* Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/10 bg-blue-400/[0.06] px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">
                Live Analytics
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Monitor your CodeRush ecosystem, track coding activity,
              analyze platform performance and manage your community.
            </p>
          </div>

          {/* System Status */}
          <div className="
            flex shrink-0 items-center gap-4
            rounded-2xl
            border border-emerald-400/10
            bg-emerald-400/[0.04]
            px-5 py-4
          ">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10">
              <Activity size={19} className="text-emerald-400" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                System Status
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-sm font-semibold text-emerald-400">
                  Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          STATS
      ====================================================== */}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
              Overview
            </p>

            <h2 className="mt-1 text-lg font-bold text-white">
              Platform Metrics
            </h2>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-500">
              Live data
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              {...stat}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* =====================================================
          ANALYTICS
      ====================================================== */}

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
            Analytics
          </p>

          <h2 className="mt-1 text-lg font-bold text-white">
            Platform Intelligence
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Real-time activity and platform distribution
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* USER GROWTH */}

          <ChartCard
            title="User Growth"
            subtitle="New registered users"
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={overview.charts.usersGrowth}
                  margin={{
                    top: 10,
                    right: 5,
                    left: -25,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="userGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#60A5FA"
                        stopOpacity={0.35}
                      />

                      <stop
                        offset="100%"
                        stopColor="#60A5FA"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#1E293B"
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0B1120",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#60A5FA"
                    strokeWidth={2.5}
                    fill="url(#userGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* SUBMISSIONS */}

          <ChartCard
            title="Daily Submissions"
            subtitle="Coding activity"
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.dailySubmissions}
                  margin={{
                    top: 10,
                    right: 5,
                    left: -25,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#1E293B"
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0B1120",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    fill="#34D399"
                    radius={[8, 8, 3, 3]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* LANGUAGE */}

          <ChartCard
            title="Language Usage"
            subtitle="Programming language distribution"
          >
            <div className="relative h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.charts.languageUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="78%"
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="language"
                    stroke="none"
                  >
                    {overview.charts.languageUsage.map(
                      (_, index: number) => (
                        <Cell
                          key={`language-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#0B1120",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {overview.charts.languageUsage.reduce(
                      (sum, item) => sum + item.count,
                      0
                    )}
                  </p>

                  <p className="text-[9px] uppercase tracking-wider text-slate-600">
                    Executions
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-white/[0.05] pt-4">
              {overview.charts.languageUsage.map(
                (item, index: number) => (
                  <div
                    key={item.language}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS[index % COLORS.length],
                      }}
                    />

                    <span className="text-[10px] text-slate-500">
                      {item.language}
                    </span>
                  </div>
                )
              )}
            </div>
          </ChartCard>

          {/* DIFFICULTY */}

          <ChartCard
            title="Problem Difficulty"
            subtitle="Problem distribution"
          >
            <div className="relative h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.charts.difficultyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="78%"
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="difficulty"
                    stroke="none"
                  >
                    <Cell fill="#34D399" />
                    <Cell fill="#FBBF24" />
                    <Cell fill="#F87171" />
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#0B1120",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {overview.totalProblems}
                  </p>

                  <p className="text-[9px] uppercase tracking-wider text-slate-600">
                    Problems
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-6 border-t border-white/[0.05] pt-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-500">
                  Easy
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-[10px] text-slate-500">
                  Medium
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-[10px] text-slate-500">
                  Hard
                </span>
              </div>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* =====================================================
          SUCCESS RATE
      ====================================================== */}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="
          relative overflow-hidden
          rounded-[26px]
          border border-white/[0.07]
          bg-gradient-to-br
          from-white/[0.055]
          to-transparent
          p-6
          shadow-[0_25px_80px_rgba(0,0,0,0.25)]
        "
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[90px]" />

        <div className="relative z-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/10">
                <CheckCircle2
                  size={21}
                  className="text-emerald-400"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">
                  Performance
                </p>

                <h3 className="mt-1 text-base font-bold text-white">
                  Platform Success Rate
                </h3>

                <p className="mt-1 text-[11px] text-slate-600">
                  Successful code executions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-4xl font-black tracking-tight text-emerald-400">
                {overview.successRate}%
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10">
                <ArrowUpRight
                  size={16}
                  className="text-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-7">
            <div className="h-3 overflow-hidden rounded-full border border-white/[0.05] bg-white/[0.035]">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.max(
                    0,
                    Math.min(100, overview.successRate)
                  )}%`,
                }}
                transition={{
                  duration: 1.4,
                  ease: "easeOut",
                }}
                className="
                  h-full rounded-full
                  bg-gradient-to-r
                  from-emerald-500
                  via-teal-400
                  to-cyan-400
                  shadow-[0_0_20px_rgba(16,185,129,0.35)]
                "
              />
            </div>

            <div className="mt-3 flex justify-between text-[9px] font-semibold uppercase tracking-wider text-slate-700">
              <span>0%</span>
              <span>System Reliability</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

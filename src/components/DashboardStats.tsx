import React from "react";
import { Zap, Smartphone, Calendar, DollarSign, Wallet, AlertTriangle } from "lucide-react";
import { DashboardStats as StatsType, User } from "../types";

interface DashboardStatsProps {
  stats: StatsType | null;
  settings: User | null;
}

export default function DashboardStats({ stats, settings }: DashboardStatsProps) {
  const currentKwh = stats?.electricity_remaining_kwh ?? 0;
  const threshold = settings?.low_balance_threshold ?? 20;
  const isLow = currentKwh < threshold;

  const totalExpenses = stats?.total_expenses_month ?? 0;
  const avgUsage = stats?.avg_daily_usage_kwh ?? 0;
  const daysLeft = stats?.estimated_days_left ?? 0;

  // Render a visual meter status
  const getMeterColor = () => {
    if (isLow) return "bg-red-500";
    if (currentKwh < threshold * 1.5) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getMeterTextColor = () => {
    if (isLow) return "text-red-600";
    if (currentKwh < threshold * 1.5) return "text-amber-600";
    return "text-emerald-600";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="dashboard-stats-grid">
      {/* 1. Electricity Remaining */}
      <div 
        className={`p-6 rounded-2xl border transition-all duration-300 bg-white ${
          isLow ? "border-red-200 ring-2 ring-red-100 ring-offset-1" : "border-slate-100"
        } shadow-sm`}
        id="stat-electricity-kwh"
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${isLow ? "bg-red-50 text-red-500" : "bg-slate-50 text-sky-500"}`}>
            <Zap className="h-6 w-6" />
          </div>
          {isLow && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 animate-pulse border border-red-100">
              <AlertTriangle className="h-3.5 w-3.5" /> Low Balance
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 font-sans">Remaining Electricity</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
              {currentKwh.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-slate-500">kWh</span>
          </div>
        </div>

        {/* Meter Gauge */}
        <div className="mt-4 space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getMeterColor()}`}
              style={{ width: `${Math.min((currentKwh / (threshold * 3)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>0 kWh</span>
            <span className="font-semibold text-slate-500">Limit: {threshold} kWh</span>
            <span>Max scale</span>
          </div>
        </div>
      </div>

      {/* 2. Estimated Days Remaining */}
      <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm" id="stat-estimated-days">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${isLow ? "bg-amber-50 text-amber-505" : "bg-slate-50 text-indigo-500"}`}>
            <Calendar className="h-6 w-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 font-sans">Estimated Days Left</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
              {avgUsage > 0 ? Math.ceil(daysLeft) : "—"}
            </span>
            <span className="text-sm font-medium text-slate-500">
              {avgUsage > 0 ? (Math.ceil(daysLeft) === 1 ? "day" : "days") : "logs needed"}
            </span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400 font-sans leading-relaxed">
          {avgUsage > 0 ? (
            <span>Based on manual daily log tracking logic.</span>
          ) : (
            <span className="text-amber-600 font-medium">Please add daily usages below to estimate.</span>
          )}
        </p>
      </div>

      {/* 3. Average Daily Usage */}
      <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm" id="stat-avg-usage">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-slate-50 text-emerald-500">
            <Zap className="h-6 w-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 font-sans">Avg Daily Consumption</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
              {avgUsage > 0 ? avgUsage.toFixed(2) : "0.00"}
            </span>
            <span className="text-sm font-medium text-slate-500">kWh/day</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400 font-sans leading-relaxed">
          <span>Active average since historical daily usage updates on logs.</span>
        </p>
      </div>

      {/* 4. Total Monthly Expense */}
      <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm" id="stat-monthly-expense">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-slate-50 text-purple-500">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 font-sans">Total Monthly Expense</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
              {totalExpenses.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500 font-sans">UZS</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400 font-mono">
          <span>Includes electric purchases + mobile rates combined.</span>
        </p>
      </div>
    </div>
  );
}

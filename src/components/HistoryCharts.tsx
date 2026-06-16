import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import { ElectricityLog, MobilePayment } from "../types";
import { TrendingUp, Award, DollarSign } from "lucide-react";

interface HistoryChartsProps {
  logs: ElectricityLog[];
  payments: MobilePayment[];
}

export default function HistoryCharts({ logs, payments }: HistoryChartsProps) {
  // 1. Prepare data for remaining electricity trends.
  // We want to sort chronologically for a timeline graph (ascending)
  const timelineData = [...logs]
    .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())
    .map(log => ({
      date: new Date(log.purchase_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      "Remaining kWh": Number(log.remaining_kwh.toFixed(1)),
      "Log Val": log.purchased_kwh > 0 ? `+${log.purchased_kwh} kWh (Bought)` : `-${log.used_kwh} kWh (Used)`,
    }));

  // 2. Prepare data for expenditure distribution chart
  // Aggregate total expenditures per owner/electricity
  const elecPurchaseSums = logs.reduce((acc, log) => acc + (log.price_paid || 0), 0);
  
  const expenseBreakdown = [
    { name: "Electricity Purchases", Amount: elecPurchaseSums, fill: "#eab308" },
    ...payments.map((p, idx) => ({
      name: `${p.owner} Mobile (${p.provider})`,
      Amount: p.amount,
      fill: ["#6366f1", "#a855f7", "#ec4899", "#14b8a6", "#10b981"][idx % 5],
    }))
  ];

  const totalCurrentAllocation = expenseBreakdown.reduce((sum, item) => sum + item.Amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" id="statistics-charts-section">
      {/* Chart 1: Electricity Reserve Timeline */}
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          <div>
            <h3 className="text-base font-bold text-slate-800 font-sans">Remaining Electricity Trend</h3>
            <p className="text-xs text-slate-400 font-sans">Chronological remaining balance levels in kWh.</p>
          </div>
        </div>

        <div className="h-72 w-full mt-4" id="electricity-trend-chart-container">
          {timelineData.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-300">
              <TrendingUp className="h-10 w-10 mb-2" />
              <p className="text-sm">Log some electricity entries to see trends.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#94a3b8" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Remaining kWh" 
                  stroke="#0284c7" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorRemaining)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Monthly Expenditure Allocation */}
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 font-sans">Expense Allocation Breakdown</h3>
              <p className="text-xs text-slate-400 font-sans">Active billing amounts and power purchase balances.</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            Total Ledger: {totalCurrentAllocation.toLocaleString()} UZS
          </span>
        </div>

        <div className="h-72 w-full mt-4" id="expenses-allocation-chart-container">
          {totalCurrentAllocation === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-300">
              <DollarSign className="h-10 w-10 mb-2" />
              <p className="text-sm">Add some billing ledger logs to see distribution.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseBreakdown} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} tickLine={false} />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} UZS`, "Allocation"]}
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Bar dataKey="Amount" radius={[0, 6, 6, 0]}>
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

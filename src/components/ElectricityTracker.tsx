import React, { useState } from "react";
import { Zap, Plus, Trash2, Calendar, ShoppingBag, TrendingDown, RefreshCw } from "lucide-react";
import { ElectricityLog } from "../types";

interface ElectricityTrackerProps {
  logs: ElectricityLog[];
  onAdd: (log: Omit<ElectricityLog, "id" | "remaining_kwh">) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRecalculate: () => Promise<void>;
}

export default function ElectricityTracker({ logs, onAdd, onDelete, onRecalculate }: ElectricityTrackerProps) {
  const [activeTab, setActiveTab] = useState<"purchase" | "usage">("purchase");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [purchasedKwh, setPurchasedKwh] = useState("");
  const [pricePaid, setPricePaid] = useState("");
  const [usedKwh, setUsedKwh] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      if (activeTab === "purchase") {
        if (!purchasedKwh) return;
        await onAdd({
          purchase_date: date,
          purchased_kwh: Number(purchasedKwh),
          used_kwh: 0,
          price_paid: Number(pricePaid) || 0,
        });
        setPurchasedKwh("");
        setPricePaid("");
      } else {
        if (!usedKwh) return;
        await onAdd({
          purchase_date: date,
          purchased_kwh: 0,
          used_kwh: Number(usedKwh),
          price_paid: 0,
        });
        setUsedKwh("");
      }
    } catch (err) {
      console.error("Add electricity log failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      await onRecalculate();
    } catch (err) {
      console.error("Audit fail:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="electricity-section">
      {/* 1. Add Purchase / Daily Log Input Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          <h2 className="text-lg font-bold text-slate-800 font-sans">Power Log</h2>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 mb-5">
          <button
            onClick={() => setActiveTab("purchase")}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "purchase" 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Buy Electricity
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "usage" 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" /> Log Daily Use
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Log Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 font-sans block">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-mono"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {activeTab === "purchase" ? (
            <>
              {/* Purchase Details */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans block">Purchased kWh</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 150"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-mono"
                  value={purchasedKwh}
                  onChange={e => setPurchasedKwh(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans block">Price Paid (UZS)</label>
                <input
                  type="number"
                  placeholder="e.g. 60000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-sans"
                  value={pricePaid}
                  onChange={e => setPricePaid(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Used details */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans block">Used Amount (kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 7.50"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-mono"
                  value={usedKwh}
                  onChange={e => setUsedKwh(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-900 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Save Record
          </button>
        </form>
      </div>

      {/* 2. List of Historical Entries and logs */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 font-sans">Power Transaction Logs</h2>
            <p className="text-xs text-slate-400 font-sans">Chronological purchases and raw daily consumptions logged.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAudit}
              disabled={isAuditing}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 flex items-center gap-1 sm:self-center transition-all cursor-pointer shadow-2xsDisabled disabled:opacity-50"
              title="Recalculates all running kWh balances chronologically based on purchase history."
            >
              <RefreshCw className={`h-3 w-3 ${isAuditing ? "animate-spin" : ""}`} /> 
              {isAuditing ? "Auditing..." : "Audit Balance Chain"}
            </button>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Zap className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">No electricity transaction logs added yet.</p>
            <p className="text-xs text-slate-400 mt-1">Record a purchase or consumption to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse" id="electricity-logs-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-sky-500">Purchased</th>
                  <th className="py-3 px-3 text-red-500">Used</th>
                  <th className="py-3 px-4 text-emerald-500">Remaining Balance</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-3 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-sans">
                {logs.map(log => {
                  const isPurchaseVal = (log.purchased_kwh ?? 0) > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {log.purchase_date}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPurchaseVal ? (
                          <span className="font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded text-xs">
                            +{log.purchased_kwh} kWh
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {!isPurchaseVal ? (
                          <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">
                            -{log.used_kwh} kWh
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 font-mono text-xs">
                          {Number(log.remaining_kwh).toFixed(2)} kWh
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {log.price_paid > 0 ? `${Number(log.price_paid).toLocaleString()} UZS` : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => onDelete(log.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Smartphone, 
  Zap, 
  Settings, 
  RefreshCw, 
  AlertTriangle, 
  Bell, 
  Sparkles,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { User, MobilePayment, ElectricityLog, EmailNotice, DashboardStats as StatsType } from "./types";
import { 
  getSettings, 
  saveSettings, 
  getMobilePayments, 
  addMobilePayment, 
  deleteMobilePayment, 
  testMobilePayment, 
  getElectricity, 
  addElectricity, 
  deleteElectricity, 
  recalculateElectricity, 
  testElectricity, 
  getEmailNotices, 
  clearEmailNotices, 
  getDashboardStats 
} from "./utils/api";

import DashboardStats from "./components/DashboardStats";
import HistoryCharts from "./components/HistoryCharts";
import MobilePayments from "./components/MobilePayments";
import ElectricityTracker from "./components/ElectricityTracker";
import SettingsPanel from "./components/SettingsPanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "payments" | "electricity" | "settings">("dashboard");
  const [settings, setSettings] = useState<User | null>(null);
  const [stats, setStats] = useState<StatsType | null>(null);
  const [payments, setPayments] = useState<MobilePayment[]>([]);
  const [electricityLogs, setElectricityLogs] = useState<ElectricityLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotice[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load all system data
  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    setErrorMsg(null);
    try {
      const [fetchedSettings, fetchedStats, fetchedPayments, fetchedElectricity, fetchedEmailLogs] = await Promise.all([
        getSettings(),
        getDashboardStats(),
        getMobilePayments(),
        getElectricity(),
        getEmailNotices()
      ]);

      setSettings(fetchedSettings);
      setStats(fetchedStats);
      setPayments(fetchedPayments);
      setElectricityLogs(fetchedElectricity);
      setEmailLogs(fetchedEmailLogs);
    } catch (err: any) {
      console.error("Data load failed:", err);
      setErrorMsg("Failed to synchronize tracker dataset with local engine database.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Actions
  const handleSaveSettings = async (updated: Partial<User>) => {
    try {
      const result = await saveSettings(updated);
      setSettings(result.config);
      await loadAllData(true);
    } catch (err) {
      alert("Failed to modify settings configurations.");
    }
  };

  const handleAddMobilePayment = async (input: Omit<MobilePayment, "id">) => {
    try {
      await addMobilePayment(input);
      await loadAllData(true);
    } catch (err) {
      alert("Error logging target mobile carrier number.");
    }
  };

  const handleDeleteMobilePayment = async (id: number) => {
    if (!confirm("Are you sure you want to remove this mobile number from scheduled alerts?")) return;
    try {
      await deleteMobilePayment(id);
      await loadAllData(true);
    } catch (err) {
      alert("Could not remove mobile record.");
    }
  };

  const handleAddElectricity = async (input: Omit<ElectricityLog, "id" | "remaining_kwh">) => {
    try {
      await addElectricity(input);
      await loadAllData(true);
    } catch (err) {
      alert("Could not register power log transaction.");
    }
  };

  const handleDeleteElectricity = async (id: number) => {
    if (!confirm("Are you sure you want to delete this electricity entry? Remaining balance will be re-audited.")) return;
    try {
      await deleteElectricity(id);
      await loadAllData(true);
    } catch (err) {
      alert("Could not remove electricity log.");
    }
  };

  const handleRecalculateElectricity = async () => {
    try {
      await recalculateElectricity();
      await loadAllData(true);
    } catch (err) {
      alert("Could not run balance chronology check.");
    }
  };

  const handleClearEmailLogs = async () => {
    if (!confirm("Clear whole email notice terminal receipt history?")) return;
    try {
      await clearEmailNotices();
      setEmailLogs([]);
    } catch (err) {
      alert("Could not clean logs directory.");
    }
  };

  const isElectricityLow = stats && settings && stats.electricity_remaining_kwh < settings.low_balance_threshold;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 text-slate-900 animate-spin" />
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-800">Booting Family Dashboard...</h3>
            <p className="text-xs text-slate-400 mt-1">Starting local database models and checking scheduler logs</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex flex-col justify-between">
      {/* 1. TOP HEADER SHELL */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-md">
              <Zap className="h-5 w-5 animate-pulse text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                Smart Family Payment & Electricity Tracker
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1 font-sans">
                Admin: {settings?.name || "Family Representative"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAllData(true)}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer ${
                isRefreshing ? "opacity-50" : ""
              }`}
              title="Sync values"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-150 py-1 px-2.5 rounded-full border border-slate-200">
              ⚡ Live Auto-Check Active
            </span>
          </div>
        </div>
      </header>

      {/* 2. BODY INNER AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Error Flag Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex gap-2">
            <AlertTriangle className="h-5 w-5 text-red-650 shrink-0" />
            <div>
              <span className="font-bold">Sync Error:</span> {errorMsg}
            </div>
          </div>
        )}

        {/* Low Electricity Warning Banner */}
        {isElectricityLow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border-2 border-red-200 text-red-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            id="global-low-electricity-alert"
          >
            <div className="flex gap-3">
              <div className="p-2 bg-red-100 rounded-xl text-red-600 self-start sm:self-center">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <div className="font-sans">
                <h4 className="text-sm font-bold text-red-950">Warning: Critical Electricity Fuel Levels ⚡</h4>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  Your remaining electricity balance is currently at <strong>{stats?.electricity_remaining_kwh.toFixed(2)} kWh</strong> (Required Threshold: {settings?.low_balance_threshold} kWh). An automated alert has been logged.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("electricity")}
              className="text-xs font-bold text-red-900 bg-red-150 border border-red-300 hover:bg-red-200 px-4 py-2 rounded-xl transition-all self-end sm:self-center cursor-pointer"
            >
              Recharge Meter Now
            </button>
          </motion.div>
        )}

        {/* NAVIGATION TAB CONTROLLER */}
        <div className="flex border-b border-slate-200 overflow-x-auto pb-px" id="tabs-navigation">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-3 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "dashboard"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "payments"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <Smartphone className="h-4 w-4" /> Mobile Numbers ({payments.length})
          </button>

          <button
            onClick={() => setActiveTab("electricity")}
            className={`py-3 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "electricity"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <Zap className="h-4 w-4" /> Electricity Log
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-4 sm:px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            <Settings className="h-4 w-4" /> Configurations & Mailer Console
          </button>
        </div>

        {/* TAB VIEWS INJECTIONS WITH LOAD TRANSITIONS */}
        <div className="pt-4" id="view-renderer-container">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-8"
              >
                {/* 1. Stats KPI Block row */}
                <DashboardStats stats={stats} settings={settings} />

                {/* 2. Visual Graphs row */}
                <HistoryCharts logs={electricityLogs} payments={payments} />

                {/* 3. Upcoming events mini tracker block */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Payments list info */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 font-sans mb-4">Family Scheduled Bills</h3>
                    {payments.length === 0 ? (
                      <p className="text-xs text-slate-400">No scheduled bills yet. Go to Mobile tab to add numbers.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                              <th className="pb-3">Name</th>
                              <th className="pb-3">Contact</th>
                              <th className="pb-3 text-right">Rate</th>
                              <th className="pb-3 text-right">Trigger Rule (Day/Time)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-sans">
                            {payments.map(p => (
                              <tr key={p.id}>
                                <td className="py-3 font-semibold text-slate-900">{p.owner}</td>
                                <td className="py-3 font-mono">{p.phone_number} ({p.provider})</td>
                                <td className="py-3 text-right font-bold text-indigo-600">{Number(p.amount).toLocaleString()} UZS</td>
                                <td className="py-3 text-right font-mono text-slate-500">Day {p.payment_date} @ {p.payment_time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Manual trigger notice guides */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-slate-800 font-sans">Alert Rules Summary</h3>
                      
                      <div className="space-y-4 pt-2">
                        <div className="flex gap-2.5 items-start">
                          <div className="p-1 px-1.5 rounded-md bg-amber-50 text-amber-500 text-[10px] font-bold font-mono">
                            RULE #1
                          </div>
                          <p className="text-xs text-slate-500 leading-normal">
                            A periodic background cron task checks all scheduled mobile rates every minute. If time is within the payment window of the dues day, a notification email is sent.
                          </p>
                        </div>

                        <div className="flex gap-2.5 items-start">
                          <div className="p-1 px-1.5 rounded-md bg-red-50 text-red-550 text-[10px] font-bold font-mono">
                            RULE #2
                          </div>
                          <p className="text-xs text-slate-500 leading-normal">
                            When writing daily usage, if balance slips below user configured warning limits, an automatic SMTP email check is triggered immediately.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <button 
                        onClick={() => setActiveTab("settings")}
                        className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-650 transition-all cursor-pointer border border-slate-150-sm"
                      >
                        Adjust Alarms & SMTP Settings
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "payments" && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <MobilePayments 
                  payments={payments} 
                  onAdd={handleAddMobilePayment} 
                  onDelete={handleDeleteMobilePayment} 
                  onTest={testMobilePayment}
                />
              </motion.div>
            )}

            {activeTab === "electricity" && (
              <motion.div
                key="electricity"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <ElectricityTracker 
                  logs={electricityLogs} 
                  onAdd={handleAddElectricity} 
                  onDelete={handleDeleteElectricity} 
                  onRecalculate={handleRecalculateElectricity}
                />
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <SettingsPanel 
                  settings={settings} 
                  onSave={handleSaveSettings} 
                  onTestSMTP={testElectricity}
                  emailLogs={emailLogs}
                  onRefreshLogs={async () => {
                    const logs = await getEmailNotices();
                    setEmailLogs(logs);
                  }}
                  onClearLogs={handleClearEmailLogs}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-white border-t border-slate-100 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p className="font-sans">
            &copy; {new Date().getFullYear()} Smart Family Payment & Electricity Tracker. All Rights Reserved.
          </p>
          <div className="flex gap-4 font-mono text-[11px]">
            <span>ENGINE: SQLite3 + Express + React19</span>
            <span>|</span>
            <span>CRON Schedulers Status: Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

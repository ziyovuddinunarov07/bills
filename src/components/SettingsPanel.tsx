import React, { useState, useEffect } from "react";
import { Mail, Settings, ShieldAlert, Key, HelpCircle, Terminal, RefreshCw, Trash2, ToggleLeft, AlertCircle } from "lucide-react";
import { User, EmailNotice } from "../types";

interface SettingsPanelProps {
  settings: User | null;
  onSave: (settings: Partial<User>) => Promise<void>;
  onTestSMTP: () => Promise<{ success: boolean; status?: string; error?: string; message: string }>;
  emailLogs: EmailNotice[];
  onRefreshLogs: () => Promise<void>;
  onClearLogs: () => Promise<void>;
}

export default function SettingsPanel({
  settings,
  onSave,
  onTestSMTP,
  emailLogs,
  onRefreshLogs,
  onClearLogs
}: SettingsPanelProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [threshold, setThreshold] = useState("20");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpReceiver, setSmtpReceiver] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [testState, setTestState] = useState<{ loading: boolean; status?: string; message?: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setEmail(settings.email || "");
      setThreshold(String(settings.low_balance_threshold ?? 20));
      setSmtpHost(settings.smtp_host || "smtp.gmail.com");
      setSmtpPort(String(settings.smtp_port || 465));
      setSmtpUser(settings.smtp_user || "");
      setSmtpPass(settings.smtp_pass || "");
      setSmtpReceiver(settings.smtp_receiver || settings.email || "");
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name,
        email,
        low_balance_threshold: Number(threshold),
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort),
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        smtp_receiver: smtpReceiver || email,
      });
    } catch (err) {
      console.error("Save settings failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSMTPTest = async () => {
    setTestState({ loading: true });
    try {
      const result = await onTestSMTP();
      setTestState({
        loading: false,
        status: result.success ? (result.status || "sent") : "failed",
        message: result.success 
          ? "Test warning dispatched successfully!" 
          : `SMTP check failed: ${result.error || "missing credentials"}`
      });
      await onRefreshLogs();
    } catch (err: any) {
      setTestState({
        loading: false,
        status: "failed",
        message: err.message || "Manual check request failed"
      });
    }

    setTimeout(() => setTestState(null), 5000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="settings-section">
      {/* 1. Main System Settings Form */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-800 font-sans">Tracker Configurations</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Profile & General</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans">Family Admin Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 face-indigo-400 text-sm font-sans"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans">Primary Contact Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-sans"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Threshold Limit Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 font-sans flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 text-red-500" /> Low Electricity Warning limit
                </span>
                <span className="text-xs font-extrabold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                  {threshold} kWh
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                className="w-full accent-red-500"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
              />
              <span className="block text-[10px] text-slate-400 leading-normal">
                If the remaining electricity balance reaches below this number, the tracker fires an automatic email warning.
              </span>
            </div>
          </div>

          {/* Section: SMTP Credentials */}
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-700">Gmail SMTP Mailer Credentials</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 flex items-center gap-1">
                Secure SSL SSL/TLS Ready
              </span>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-2.5">
              <HelpCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-800 leading-normal font-sans">
                <strong>Config Guide:</strong> To send real alerts, use <strong>smtp.gmail.com</strong> on port <strong>465</strong>. For the password, do not use your standard password. Create a Google <strong>App Password</strong> under Security Settings in your account menu.
                <br />
                <span className="text-indigo-500 font-bold block mt-1">If blank: The application handles simulated notifications locally. No real emails are sent but logs are saved below for visual verification.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 font-sans">SMTP Port Host</label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-sans"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans">Port</label>
                <input
                  type="number"
                  placeholder="465"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-mono"
                  value={smtpPort}
                  onChange={e => setSmtpPort(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans">SMTP Email Account (sender)</label>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-sans"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 font-sans block flex items-center gap-1">
                  <Key className="h-3 w-3" /> Gmail App Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-mono"
                  value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 font-sans">Recipient Email Address (Where to notify)</label>
              <input
                type="email"
                placeholder="ziyovuddinunarov2107@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-sans"
                value={smtpReceiver}
                onChange={e => setSmtpReceiver(e.target.value)}
              />
              <span className="block text-[10px] text-slate-400">
                Default: {smtpReceiver || "Your primary email is used if blank."}
              </span>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all border border-slate-900 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={handleSMTPTest}
              disabled={testState?.loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              title="Dispatches a manual threshold check simulating low balance to verify SMTP configuration immediately."
            >
              Check SMTP Mailer
            </button>
          </div>

          {/* Inline SMTP Test result feedback */}
          {testState && (
            <div className={`p-3.5 rounded-xl border text-xs font-sans ${
              testState.status === "failed" 
                ? "bg-red-50 border-red-100 text-red-800" 
                : testState.status === "simulated" 
                  ? "bg-blue-50 border-blue-105 text-blue-900"
                  : "bg-emerald-50 border-emerald-100 text-emerald-800"
            }`}>
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>SMTP Status Check:</strong> {testState.message}
                  {testState.status === "simulated" && (
                    <span className="block mt-1 text-[11px] text-blue-600 font-semibold font-mono">
                      (Simulated alert successfully generated in the terminal log to your right!)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* 2. Sent Email Terminal Logs */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-md h-fit flex flex-col justify-between text-slate-200">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">Mailer Console Logs</h3>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={onRefreshLogs}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Refresh log list"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClearLogs}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all cursor-pointer"
                title="Clears all email notices history"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1" id="mailer-terminal">
            {emailLogs.length === 0 ? (
              <div className="text-center py-10 font-mono text-xs text-slate-500">
                <span>[No dispatch packets found]</span>
                <br />
                <span className="text-[10px] mt-1 text-slate-600 block">Waiting for alerts to fire...</span>
              </div>
            ) : (
              emailLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1 border-b border-slate-900 pb-1">
                    <span>{new Date(log.sent_at).toLocaleTimeString()}</span>
                    <span className={`font-bold uppercase tracking-wider ${
                      log.status === "sent" 
                        ? "text-emerald-400" 
                        : log.status === "simulated" 
                          ? "text-sky-500" 
                          : "text-rose-500"
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="text-slate-300">
                    <span className="text-emerald-400 text-[10px]">TO:</span> {log.recipient}
                  </div>
                  <div className="text-slate-100 font-bold">
                    <span className="text-emerald-400 text-[10px]">SUBJ:</span> {log.subject}
                  </div>
                  <div className="text-slate-400 whitespace-pre-wrap max-h-20 overflow-y-auto text-[11px] font-sans mt-1 bg-slate-905/50 p-2 rounded border border-slate-900">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center gap-1">
          <ToggleLeft className="text-indigo-400 h-3.5 w-3.5" /> Continuous cron verification active.
        </div>
      </div>
    </div>
  );
}

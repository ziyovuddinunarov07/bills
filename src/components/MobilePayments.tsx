import React, { useState } from "react";
import { Smartphone, Plus, Trash2, Send, Clock, User, Phone, CheckCircle, AlertTriangle, Play } from "lucide-react";
import { MobilePayment } from "../types";

interface MobilePaymentsProps {
  payments: MobilePayment[];
  onAdd: (payment: Omit<MobilePayment, "id">) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onTest: (id: number) => Promise<{ success: boolean; status?: string; error?: string; message: string }>;
}

export default function MobilePayments({ payments, onAdd, onDelete, onTest }: MobilePaymentsProps) {
  const [owner, setOwner] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [provider, setProvider] = useState("Ucell");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("15");
  const [paymentTime, setPaymentTime] = useState("12:00");
  const [reminderMinutes, setReminderMinutes] = useState("20");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStates, setTestStates] = useState<{ [id: number]: { loading: boolean; status?: string; message?: string } }>({});

  const providers = ["Ucell", "Beeline", "Uztelecom", "Mobiuz", "Perfectum", "Other"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner || !phoneNumber || !amount || !paymentDate) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        owner,
        phone_number: phoneNumber,
        provider,
        amount: Number(amount),
        payment_date: Number(paymentDate),
        payment_time: paymentTime || "12:00",
        reminder_minutes: Number(reminderMinutes) || 20,
      });
      // Reset
      setOwner("");
      setPhoneNumber("");
      setAmount("");
      setPaymentDate("15");
      setPaymentTime("12:00");
    } catch (err) {
      console.error("Add payment failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerTest = async (id: number) => {
    setTestStates(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      const result = await onTest(id);
      setTestStates(prev => ({
        ...prev,
        [id]: {
          loading: false,
          status: result.success ? (result.status || "sent") : "failed",
          message: result.success
            ? "Reminder dispatched successfully!"
            : `Failed: ${result.error || "SMTP not configured"}`
        }
      }));
    } catch (err: any) {
      setTestStates(prev => ({
        ...prev,
        [id]: { loading: false, status: "failed", message: err.message || "Request failed" }
      }));
    }

    // Clear after 4 seconds
    setTimeout(() => {
      setTestStates(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 4500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="payments-section">
      {/* 1. Register Mobile Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Smartphone className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800 font-sans">Add Family Number</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Owner */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 font-sans block">Owner / Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Father, Mother"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm placeholder:text-slate-300 font-sans"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 font-sans block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. +998 90 123-4567"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm placeholder:text-slate-300 font-mono"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Operator */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 font-sans block">Operator</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-sans bg-white"
                value={provider}
                onChange={e => setProvider(e.target.value)}
              >
                {providers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Bill Amount */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 font-sans block">Monthly Bill</label>
              <input
                type="number"
                placeholder="UZS"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-sans placeholder:text-slate-300"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Day */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 font-sans block">Due Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Day (1-31)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-mono"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Payment Time */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 font-sans block">Due Time</label>
              <input
                type="time"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm font-mono"
                value={paymentTime}
                onChange={e => setPaymentTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Buffer Reminder minutes */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 font-sans">Pre-alert Buffer</label>
              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                {reminderMinutes} mins before
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              className="w-full accent-indigo-505"
              value={reminderMinutes}
              onChange={e => setReminderMinutes(e.target.value)}
            />
            <span className="block text-[10px] text-slate-400 leading-snug">
              Determines how many minutes before the designated hour standard alerts check is fired.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-900 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add Register
          </button>
        </form>
      </div>

      {/* 2. List of Numbers Card */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 font-sans">Registered Numbers & Reminders</h2>
            <p className="text-xs text-slate-400 font-sans">Automated Gmail reminders trigger relative to the target dates.</p>
          </div>
          <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {payments.length} Registered
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Smartphone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">No family mobile numbers registered yet.</p>
            <p className="text-xs text-slate-400 mt-1">Register a number using the left form panel.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map(payment => {
              const test = testStates[payment.id];
              return (
                <div
                  key={payment.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 font-sans">{payment.owner}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {payment.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {payment.phone_number}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                      <span className="text-xs text-indigo-600 font-semibold">
                        {Number(payment.amount).toLocaleString()} UZS
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Due: Day {payment.payment_date} @ {payment.payment_time}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                        Alert: -{payment.reminder_minutes}m
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:self-center">
                    {/* Test alert block */}
                    {test ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium mr-2 max-w-[180px]">
                        {test.loading && (
                          <span className="text-indigo-600 animate-pulse flex items-center gap-1">
                            <Send className="h-3.5 w-3.5 animate-bounce" /> Sending...
                          </span>
                        )}
                        {!test.loading && test.status === "sent" && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Sent!
                          </span>
                        )}
                        {!test.loading && test.status === "simulated" && (
                          <span className="text-blue-500 flex items-center gap-1 bg-blue-50 border border-blue-105 px-1.5 py-0.5 rounded">
                            <CheckCircle className="h-3.5 w-3.5" /> Simulated Logged
                          </span>
                        )}
                        {!test.loading && test.status === "failed" && (
                          <span className="text-red-500 flex items-center gap-1" title={test.message}>
                            <AlertTriangle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTriggerTest(payment.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Dispatch a test email reminder immediately to verify SMTP setup."
                      >
                        <Play className="h-3 w-3 fill-indigo-600" /> Send Test Mail
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => onDelete(payment.id)}
                      className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 cursor-pointer"
                      title="Remove mobile number"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

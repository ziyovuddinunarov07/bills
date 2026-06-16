import { MobilePayment, ElectricityLog, EmailNotice, DashboardStats, User } from "../types";

export async function getSettings(): Promise<User> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to get configurations.");
  return res.json();
}

export async function saveSettings(settings: Partial<User>): Promise<{ message: string; config: User }> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to store configurations.");
  return res.json();
}

export async function getMobilePayments(): Promise<MobilePayment[]> {
  const res = await fetch("/api/mobile-payments");
  if (!res.ok) throw new Error("Failed to fetch mobile payments data.");
  return res.json();
}

export async function addMobilePayment(payment: Omit<MobilePayment, "id">): Promise<{ message: string; payment: MobilePayment }> {
  const res = await fetch("/api/mobile-payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payment),
  });
  if (!res.ok) throw new Error("Failed to add mobile number payment details.");
  return res.json();
}

export async function deleteMobilePayment(id: number): Promise<{ message: string }> {
  const res = await fetch(`/api/mobile-payments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove mobile record from index.");
  return res.json();
}

export async function testMobilePayment(id: number): Promise<{ message: string; success: boolean; status?: string; error?: string }> {
  const res = await fetch(`/api/mobile-payments/${id}/trigger-test`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to dispatch test notification.");
  return res.json();
}

export async function getElectricity(): Promise<ElectricityLog[]> {
  const res = await fetch("/api/electricity");
  if (!res.ok) throw new Error("Failed to fetch electricity records.");
  return res.json();
}

export async function addElectricity(log: Omit<ElectricityLog, "id" | "remaining_kwh">): Promise<{ message: string; record: ElectricityLog }> {
  const res = await fetch("/api/electricity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error("Failed to write electricity record.");
  return res.json();
}

export async function deleteElectricity(id: number): Promise<{ message: string }> {
  const res = await fetch(`/api/electricity/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete track log.");
  return res.json();
}

export async function recalculateElectricity(): Promise<{ message: string }> {
  const res = await fetch("/api/electricity/recalculate", { method: "POST" });
  if (!res.ok) throw new Error("Failed to audit chronological entries.");
  return res.json();
}

export async function testElectricity(): Promise<{ message: string; success: boolean; status?: string; error?: string }> {
  const res = await fetch("/api/electricity/trigger-low-test", { method: "POST" });
  if (!res.ok) throw new Error("Failed to dispatch manual power trigger.");
  return res.json();
}

export async function getEmailNotices(): Promise<EmailNotice[]> {
  const res = await fetch("/api/email-notices");
  if (!res.ok) throw new Error("Failed to fetch emailed receipts log.");
  return res.json();
}

export async function clearEmailNotices(): Promise<{ message: string }> {
  const res = await fetch("/api/email-notices", { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear receipts index.");
  return res.json();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard-stats");
  if (!res.ok) throw new Error("Failed to retrieve metrics dataset.");
  return res.json();
}

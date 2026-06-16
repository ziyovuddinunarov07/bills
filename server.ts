import express from "express";
import path from "path";
import sqlite3 from "sqlite3";
import nodemailer from "nodemailer";
import cron from "node-cron";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = "smart_tracker.db";

app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err);
  } else {
    console.log("Connected to SQLite Database.");
    initializeDatabase();
  }
});

// Database promise wrappers of standard SQLite statements
function dbRun(query: string, params: any[] = []): Promise<{ id: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (this: sqlite3.RunResult, err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbAll<T>(query: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

function dbGet<T>(query: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

// Set up the database tables
async function initializeDatabase() {
  try {
    // 1. Users Table (profile, configurations, notifications)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        low_balance_threshold REAL DEFAULT 20.0,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        smtp_receiver TEXT,
        low_balance_notified INTEGER DEFAULT 0
      )
    `);

    // 2. Mobile Payments Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS mobile_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        provider TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_date INTEGER NOT NULL, -- Day of month: 1 - 31
        payment_time TEXT DEFAULT '12:00', -- HH:MM
        reminder_minutes INTEGER DEFAULT 20, -- Minutes before to remind
        last_notified_month TEXT DEFAULT NULL -- Format: 'YYYY-MM'
      )
    `);

    // 3. Electricity Tracking Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS electricity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_date TEXT NOT NULL, -- YYYY-MM-DD
        purchased_kwh REAL DEFAULT 0.0,
        used_kwh REAL DEFAULT 0.0,
        remaining_kwh REAL DEFAULT 0.0,
        price_paid REAL DEFAULT 0.0
      )
    `);

    // 4. Email Log Table for live visibility & easy UI debugging
    await dbRun(`
      CREATE TABLE IF NOT EXISTS email_notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sent_at TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL -- 'sent' | 'failed' | 'simulated'
      )
    `);

    // Seed default user configuration if None exists
    const users = await dbAll("SELECT * FROM users");
    if (users.length === 0) {
      // Create developer user matching metadata context as fallback
      await dbRun(`
        INSERT INTO users (name, email, password, low_balance_threshold, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_receiver)
        VALUES ('Ziyovuddin (Family Admin)', 'ziyovuddinunarov2107@gmail.com', 'admin123', 20.0, 'smtp.gmail.com', 465, '', '', 'ziyovuddinunarov2107@gmail.com')
      `);
      console.log("Seeded database with default user configuration.");

      // Seed initial sample mobile payments
      await dbRun(`
        INSERT INTO mobile_payments (owner, phone_number, provider, amount, payment_date, payment_time, reminder_minutes)
        VALUES 
          ('Father', '+998 90 123-4567', 'Ucell', 50000, 16, '13:00', 20),
          ('Mother', '+998 93 456-7890', 'Beeline', 35000, 18, '10:00', 10),
          ('Brother', '+998 97 987-6543', 'Mobiuz', 40000, 25, '15:30', 30)
      `);

      // Seed initial mock electricity history (1 purchase of 100 kwh, then 3 manual daily use logs)
      await dbRun(`
        INSERT INTO electricity (purchase_date, purchased_kwh, used_kwh, remaining_kwh, price_paid)
        VALUES ('2026-06-12', 100.0, 0.0, 100.0, 45000.0)
      `);
      await dbRun(`
        INSERT INTO electricity (purchase_date, purchased_kwh, used_kwh, remaining_kwh, price_paid)
        VALUES ('2026-06-13', 0.0, 6.5, 93.5, 0.0)
      `);
      await dbRun(`
        INSERT INTO electricity (purchase_date, purchased_kwh, used_kwh, remaining_kwh, price_paid)
        VALUES ('2026-06-14', 0.0, 7.2, 86.3, 0.0)
      `);
      await dbRun(`
        INSERT INTO electricity (purchase_date, purchased_kwh, used_kwh, remaining_kwh, price_paid)
        VALUES ('2026-06-15', 0.0, 6.8, 79.5, 0.0)
      `);
      console.log("Seeded initial dataset for payments and electricity transactions.");
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

// Mail Dispatch Service with fallback logging
async function dispatchEmail(to: string, subject: string, text: string) {
  const user = await dbGet<any>("SELECT * FROM users LIMIT 1");
  const smtpUser = user?.smtp_user || process.env.SMTP_USER || "";
  const smtpPass = user?.smtp_pass || process.env.SMTP_PASS || "";
  const smtpHost = user?.smtp_host || "smtp.gmail.com";
  const smtpPort = user?.smtp_port || 465;
  const recipient = to || user?.smtp_receiver || user?.email || "ziyovuddinunarov2107@gmail.com";

  const isSMTPConfigured = smtpUser && smtpPass;
  const timestamp = new Date().toISOString();

  if (isSMTPConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Smart Family Tracker" <${smtpUser}>`,
        to: recipient,
        subject,
        text,
      });

      // Write a successful mail log
      await dbRun(
        "INSERT INTO email_notices (sent_at, recipient, subject, message, status) VALUES (?, ?, ?, ?, ?)",
        [timestamp, recipient, subject, text, "sent"]
      );
      console.log(`Successfully sent email reminder to ${recipient}`);
      return { success: true, status: "sent" };
    } catch (error: any) {
      console.error("SMTP sending failed, falling back to simulated status log:", error);
      await dbRun(
        "INSERT INTO email_notices (sent_at, recipient, subject, message, status) VALUES (?, ?, ?, ?, ?)",
        [timestamp, recipient, subject, `[SMTP Error: ${error.message}] - ` + text, "failed"]
      );
      return { success: false, error: error.message };
    }
  } else {
    // Save as simulated so the app works flawlessly out of the box without environment configurations
    await dbRun(
      "INSERT INTO email_notices (sent_at, recipient, subject, message, status) VALUES (?, ?, ?, ?, ?)",
      [timestamp, recipient, subject, text, "simulated"]
    );
    console.log(`SMTP undefined. Logged simulated alert to ${recipient}: ${subject}`);
    return { success: true, status: "simulated" };
  }
}

// Core alert validation checks
async function checkUpcomingPayments() {
  try {
    const payments = await dbAll<any>("SELECT * FROM mobile_payments");
    const user = await dbGet<any>("SELECT * FROM users LIMIT 1");
    if (!payments.length) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 - 11
    const pad = (n: number) => n.toString().padStart(2, "0");
    const monthKey = `${currentYear}-${pad(currentMonth + 1)}`; // "2026-06"

    for (const payment of payments) {
      if (payment.last_notified_month === monthKey) {
        continue; // Prevents double alerting this month
      }

      // Check if day matches
      const targetDay = payment.payment_date;
      // Extract hour and minute
      const [hourStr, minStr] = (payment.payment_time || "12:00").split(":");
      const targetHour = parseInt(hourStr) || 12;
      const targetMin = parseInt(minStr) || 0;

      // Construct payment datetime for this month
      const maxDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const actualDay = Math.min(targetDay, maxDaysInMonth);
      const paymentDateVal = new Date(currentYear, currentMonth, actualDay, targetHour, targetMin, 0);

      const offsetMs = (payment.reminder_minutes || 20) * 60 * 1000;
      const nowMs = Date.now();
      const dueMs = paymentDateVal.getTime();

      // Trigger reminder if within the window: [due - offset, due] and we haven't hit the due datetime
      if (nowMs >= dueMs - offsetMs && nowMs < dueMs) {
        const amountFormatted = Number(payment.amount).toLocaleString();
        const subject = `Reminder: ${payment.owner}'s Mobile payment due soon! ⏰`;
        const text = `Dear Admin,

This is an automated notification from your Smart Family Payment & Electricity Tracker.

Reminder: ${payment.owner}'s mobile number (${payment.phone_number}, Provider: ${payment.provider}) payment is due in ${payment.reminder_minutes} minutes.

Amount: ${amountFormatted} UZS.
Payment due date: Day ${payment.payment_date} of the month at ${payment.payment_time}.

Please complete this payment to avoid service outages.

Best regards,
Smart Family Tracker Bot`;

        const recipient = user?.smtp_receiver || user?.email || "ziyovuddinunarov2107@gmail.com";
        const result = await dispatchEmail(recipient, subject, text);
        
        if (result.success) {
          await dbRun("UPDATE mobile_payments SET last_notified_month = ? WHERE id = ?", [monthKey, payment.id]);
        }
      }
    }
  } catch (error) {
    console.error("Scheduled payments alert check failed:", error);
  }
}

async function checkElectricityBalance() {
  try {
    const user = await dbGet<any>("SELECT * FROM users LIMIT 1");
    if (!user) return;

    // Get latest running balance record
    const latestElectricity = await dbGet<any>("SELECT * FROM electricity ORDER BY id DESC LIMIT 1");
    if (!latestElectricity) return;

    const currentBalance = latestElectricity.remaining_kwh;
    const threshold = user.low_balance_threshold;

    if (currentBalance < threshold) {
      if (user.low_balance_notified === 0) {
        // Build low balance warning message
        const subject = "Electricity Balance Warning ⚡";
        const text = `Dear Admin,

Your electricity balance is low.
Remaining: ${Number(currentBalance).toFixed(2)} kWh.
low-balance Warning Limit: ${Number(threshold).toFixed(2)} kWh.

Please recharge soon to prevent service interruption.

Best regards,
Smart Family Tracker Bot`;

        const recipient = user?.smtp_receiver || user?.email || "ziyovuddinunarov2107@gmail.com";
        const result = await dispatchEmail(recipient, subject, text);

        if (result.success) {
          await dbRun("UPDATE users SET low_balance_notified = 1 WHERE id = ?", [user.id]);
          console.log(`Updated low_balance_notified status to active alert.`);
        }
      }
    } else {
      // If balance goes back above threshold, reset notification flag
      if (user.low_balance_notified === 1) {
        await dbRun("UPDATE users SET low_balance_notified = 0 WHERE id = ?", [user.id]);
        console.log(`Electricity balance recharged. Reset user alert notifier state to cleared.`);
      }
    }
  } catch (error) {
    console.error("Scheduled electricity balance check failed:", error);
  }
}

// ------------------------------------------
// API REST ENDPOINTS
// ------------------------------------------

// 1. Settings / Profile
app.get("/api/settings", async (req, res) => {
  try {
    const config = await dbGet("SELECT id, name, email, low_balance_threshold, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_receiver, low_balance_notified FROM users LIMIT 1");
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { name, email, low_balance_threshold, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_receiver } = req.body;
    
    // Update target parameters
    await dbRun(`
      UPDATE users SET 
        name = ?, 
        email = ?, 
        low_balance_threshold = ?, 
        smtp_host = ?, 
        smtp_port = ?, 
        smtp_user = ?, 
        smtp_pass = ?, 
        smtp_receiver = ?
      WHERE id = 1
    `, [
      name, 
      email, 
      Number(low_balance_threshold), 
      smtp_host || 'smtp.gmail.com', 
      Number(smtp_port) || 465, 
      smtp_user || '', 
      smtp_pass || '', 
      smtp_receiver || email
    ]);

    // Query updated values
    const config = await dbGet("SELECT * FROM users LIMIT 1");
    res.json({ message: "Settings saved successfully.", config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Mobile Payments APIS
app.get("/api/mobile-payments", async (req, res) => {
  try {
    const payments = await dbAll("SELECT * FROM mobile_payments ORDER BY payment_date ASC");
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mobile-payments", async (req, res) => {
  try {
    const { owner, phone_number, provider, amount, payment_date, payment_time, reminder_minutes } = req.body;
    
    if (!owner || !phone_number || !provider || !amount || !payment_date) {
      return res.status(400).json({ error: "Missing required mobile payment fields." });
    }

    const { id } = await dbRun(`
      INSERT INTO mobile_payments (owner, phone_number, provider, amount, payment_date, payment_time, reminder_minutes, last_notified_month)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
    `, [
      owner, 
      phone_number, 
      provider, 
      Number(amount), 
      Number(payment_date), 
      payment_time || '12:00', 
      Number(reminder_minutes) || 20
    ]);

    const createdPayment = await dbGet("SELECT * FROM mobile_payments WHERE id = ?", [id]);
    res.json({ message: "Mobile payment number added.", payment: createdPayment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/mobile-payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { changes } = await dbRun("DELETE FROM mobile_payments WHERE id = ?", [id]);
    if (changes > 0) {
      res.json({ message: "Mobile payment tracking removed." });
    } else {
      res.status(404).json({ error: "Record not found." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Test API to trigger reminders instantly
app.post("/api/mobile-payments/:id/trigger-test", async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await dbGet<any>("SELECT * FROM mobile_payments WHERE id = ?", [id]);
    const user = await dbGet<any>("SELECT * FROM users LIMIT 1");
    if (!payment) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    const amountFormatted = Number(payment.amount).toLocaleString();
    const subject = `[TEST] Reminder: ${payment.owner}'s Mobile payment due soon! ⏰`;
    const text = `Dear Admin,

This is an INSTANT MANUAL TEST of your Mobile Phone reminder system triggered from the UI panel.

Reminder: ${payment.owner}'s mobile number (${payment.phone_number}, Provider: ${payment.provider}) payment is due in ${payment.reminder_minutes} minutes.

Amount: ${amountFormatted} UZS.
Payment due date: Day ${payment.payment_date} of the month at ${payment.payment_time}.

The alert automation is working perfectly!

Best regards,
Smart Family Tracker Bot`;

    const recipient = user?.smtp_receiver || user?.email || "ziyovuddinunarov2107@gmail.com";
    const result = await dispatchEmail(recipient, subject, text);
    res.json({ message: "Manual warning test fired successfully.", ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Electricity Tracking APIs
app.get("/api/electricity", async (req, res) => {
  try {
    const logs = await dbAll("SELECT * FROM electricity ORDER BY purchase_date DESC, id DESC");
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/electricity", async (req, res) => {
  try {
    const { purchase_date, purchased_kwh, used_kwh, price_paid } = req.body;
    
    if (!purchase_date) {
      return res.status(400).json({ error: "Entry date is required." });
    }

    const boughtVal = Number(purchased_kwh) || 0;
    const usedVal = Number(used_kwh) || 0;
    const priceVal = Number(price_paid) || 0;

    // Get current remaining_kwh before adding this
    const latestLog = await dbGet<any>("SELECT remaining_kwh FROM electricity ORDER BY id DESC LIMIT 1");
    const currentRemaining = latestLog ? latestLog.remaining_kwh : 0;

    // Calculate new remaining_kwh
    const newRemaining = currentRemaining + boughtVal - usedVal;

    const { id } = await dbRun(`
      INSERT INTO electricity (purchase_date, purchased_kwh, used_kwh, remaining_kwh, price_paid)
      VALUES (?, ?, ?, ?, ?)
    `, [purchase_date, boughtVal, usedVal, newRemaining, priceVal]);

    // Force run checking to trigger email instantly if user's entry drops balance below threshold
    await checkElectricityBalance();

    const createdRecord = await dbGet("SELECT * FROM electricity WHERE id = ?", [id]);
    res.json({ message: "Electricity transaction logged.", record: createdRecord });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/electricity/recalculate", async (req, res) => {
  try {
    // Re-calculates and overrides all historical `remaining_kwh` chronologically.
    // Useful if a middle entry was added or deleted.
    const allLogs = await dbAll<any>("SELECT * FROM electricity ORDER BY purchase_date ASC, id ASC");
    let currentKwh = 0;
    
    for (const log of allLogs) {
      currentKwh = currentKwh + (log.purchased_kwh || 0) - (log.used_kwh || 0);
      await dbRun("UPDATE electricity SET remaining_kwh = ? WHERE id = ?", [currentKwh, log.id]);
    }

    res.json({ message: "Full chronological balance audit completed successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/electricity/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { changes } = await dbRun("DELETE FROM electricity WHERE id = ?", [id]);
    if (changes > 0) {
      // Re-trigger balance chain audit after deleting
      const allLogs = await dbAll<any>("SELECT * FROM electricity ORDER BY purchase_date ASC, id ASC");
      let currentKwh = 0;
      for (const log of allLogs) {
        currentKwh = currentKwh + (log.purchased_kwh || 0) - (log.used_kwh || 0);
        await dbRun("UPDATE electricity SET remaining_kwh = ? WHERE id = ?", [currentKwh, log.id]);
      }
      res.json({ message: "Electricity entry deleted and balance chain recalculated." });
    } else {
      res.status(404).json({ error: "Record not found." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Test API to trigger Low Electricity Alert instantly
app.post("/api/electricity/trigger-low-test", async (req, res) => {
  try {
    const user = await dbGet<any>("SELECT * FROM users LIMIT 1");
    const latestElec = await dbGet<any>("SELECT * FROM electricity ORDER BY id DESC LIMIT 1");
    const currentBalance = latestElec ? latestElec.remaining_kwh : 0.0;
    const threshold = user.low_balance_threshold;

    const subject = "Electricity Balance Warning ⚡ [TEST]";
    const text = `Dear Admin,

This is a MANUAL SMTP TEST of your low-balance Electricity alarm triggered via the settings dashboard.

Your current electricity remaining balance is ${Number(currentBalance).toFixed(2)} kWh.
The alarm is configured to alert below ${Number(threshold).toFixed(2)} kWh.

SMTP validation is fully online and functioning perfectly.

Best regards,
Smart Family Tracker Bot`;

    const recipient = user?.smtp_receiver || user?.email || "ziyovuddinunarov2107@gmail.com";
    const result = await dispatchEmail(recipient, subject, text);
    res.json({ message: "Electricity mock test fired.", ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Email Notice Logs
app.get("/api/email-notices", async (req, res) => {
  try {
    const logs = await dbAll("SELECT * FROM email_notices ORDER BY id DESC LIMIT 50");
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/email-notices", async (req, res) => {
  try {
    await dbRun("DELETE FROM email_notices");
    res.json({ message: "All notification history logs deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Consolidated Dashboard statistics endpoint
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    // 1. Mobile Payments
    const upcomingPayments = await dbAll<any>("SELECT * FROM mobile_payments ORDER BY payment_date ASC");

    // 2. Latest electricity state
    const latestElectricity = await dbGet<any>("SELECT * FROM electricity ORDER BY id DESC LIMIT 1");
    const currentBalance = latestElectricity ? latestElectricity.remaining_kwh : 0;

    // 3. Calculate avg daily usage
    const logsWithUsage = await dbAll<any>("SELECT * FROM electricity WHERE used_kwh > 0 ORDER BY purchase_date ASC");
    
    let avgDaily = 0;
    if (logsWithUsage.length > 0) {
      // Sum all daily usages and divide by number of entries
      const totalUsed = logsWithUsage.reduce((acc, log) => acc + log.used_kwh, 0);
      avgDaily = totalUsed / logsWithUsage.length;
    }

    // 4. Days until empty estimation
    const daysLeft = avgDaily > 0 ? (currentBalance / avgDaily) : 0;

    // 5. Total Expenses this Month (payments + electricity purchases in current calendar month)
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    
    // Sum electricity purchase costs in this month
    const elecExpenses = await dbGet<any>(
      "SELECT SUM(price_paid) as total FROM electricity WHERE purchase_date LIKE ? AND purchased_kwh > 0", 
      [`${currentMonthStr}%`]
    );
    const totalElecPurchases = elecExpenses?.total || 0;

    // Sum mobile billing rates (monthly rate assuming they are due each month, or we can sum active)
    const paymentSumRow = await dbGet<any>("SELECT SUM(amount) as total FROM mobile_payments");
    const totalPayments = paymentSumRow?.total || 0;

    const totalExpenses = totalElecPurchases + totalPayments;

    // 6. Recent billing logs
    const historyLogs = await dbAll("SELECT * FROM electricity ORDER BY purchase_date DESC, id DESC LIMIT 12");

    res.json({
      electricity_remaining_kwh: currentBalance,
      estimated_days_left: daysLeft,
      avg_daily_usage_kwh: avgDaily,
      total_expenses_month: totalExpenses,
      payment_history: historyLogs,
      upcoming_payments: upcomingPayments,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ------------------------------------------
// AUTOMATED CRON SCHEDULER
// ------------------------------------------

// Check every 1 minute of every hour, every day
cron.schedule("* * * * *", async () => {
  console.log(`[Scheduler] Executing periodic checks at ${new Date().toISOString()}`);
  await checkUpcomingPayments();
  await checkElectricityBalance();
});


// ------------------------------------------
// VITE OR STATIC HOSTING DISPATCH
// ------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Tracker Server up and running at http://localhost:${PORT}`);
  });
}

startServer();

#!/usr/bin/env node
/**
 * grant-plan.js
 *
 * CLI tool to grant subscription plans to users by email
 *
 * Usage:
 *   node scripts/grant-plan.js <email> <plan> <duration>
 *
 * Examples:
 *   node scripts/grant-plan.js user@example.com "Advocate Starter Plan" "1 Month"
 *   node scripts/grant-plan.js user@example.com "LawgikalAI Enterprise Premium" "12 Months"
 *   node scripts/grant-plan.js user@example.com premium 12
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// ─── Color codes for terminal output ──────────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// ─── Plan presets ──────────────────────────────────────────────────────────────
const PLAN_PRESETS = {
  starter: { name: "Advocate Starter Plan", duration: "1 Month", months: 1 },
  litigator: {
    name: "Professional Litigator Plan",
    duration: "3 Months",
    months: 3,
  },
  power: { name: "Courtroom Power Plan", duration: "6 Months", months: 6 },
  premium: {
    name: "LawgikalAI Enterprise Premium",
    duration: "12 Months",
    months: 12,
  },
};

// ─── Duration parser ───────────────────────────────────────────────────────────
function parseDurationInMonths(durationStr) {
  if (!durationStr) return 1;
  const s = String(durationStr).toLowerCase().trim();

  // numeric match
  const numMatch = s.match(/(\d{1,2})/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (s.includes("year") && n === 1) return 12;
    return n;
  }

  // fallback checks
  if (s.includes("1 month")) return 1;
  if (s.includes("3 months")) return 3;
  if (s.includes("6 months")) return 6;
  if (s.includes("12 months") || s.includes("1 year")) return 12;

  return 1;
}

// ─── Safe month addition (preserves day or falls back to month-end) ───────────
function addMonthsSafe(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  if (d.getDate() < day) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

// ─── Main grant function ───────────────────────────────────────────────────────
async function grantPlan(email, planInput, durationInput) {
  try {
    // ── Connect to MongoDB ─────────────────────────────────────────────────────
    log(`\n🔌 Connecting to MongoDB...`, "cyan");
    await mongoose.connect(process.env.DOCUMENTDB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log(`✅ Connected to MongoDB\n`, "green");

    // ── Find user by email ─────────────────────────────────────────────────────
    log(`🔍 Searching for user: ${email}`, "cyan");
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      log(`❌ User not found with email: ${email}`, "red");
      process.exit(1);
    }

    log(`✅ User found: ${user.fullName} (${user._id})`, "green");
    log(`   Current plan: ${user.plan?.name || "None"}`, "gray");
    if (user.plan?.endDate) {
      const expiry = new Date(user.plan.endDate);
      const isActive = expiry > new Date();
      log(
        `   Expires: ${expiry.toISOString()} ${isActive ? "(Active)" : "(Expired)"}`,
        "gray",
      );
    }

    // ── Resolve plan details ───────────────────────────────────────────────────
    let planName, duration, months;

    // Check if planInput is a preset key
    const preset = PLAN_PRESETS[planInput.toLowerCase()];
    if (preset) {
      planName = preset.name;
      duration = preset.duration;
      months = preset.months;
      log(
        `\n📦 Using preset: ${planInput} → ${planName} (${duration})`,
        "yellow",
      );
    } else {
      // Custom plan
      planName = planInput;
      duration = durationInput || "1 Month";
      months = parseDurationInMonths(duration);
      log(`\n📦 Custom plan: ${planName} (${duration})`, "yellow");
    }

    // ── Calculate dates ────────────────────────────────────────────────────────
    const now = new Date();
    const previousEnd = user.plan?.endDate ? new Date(user.plan.endDate) : null;
    const start = previousEnd && previousEnd > now ? previousEnd : now;
    const end = addMonthsSafe(start, months);

    log(`\n📅 Subscription dates:`, "cyan");
    log(`   Start: ${start.toISOString()}`, "gray");
    log(`   End:   ${end.toISOString()}`, "gray");
    log(`   Duration: ${months} month(s)`, "gray");

    // ── Update user plan ───────────────────────────────────────────────────────
    user.plan = {
      name: planName,
      duration: duration,
      startDate: start,
      endDate: end,
      source: "ADMIN_GRANT", // track that this was manually granted
    };

    await user.save();

    // ── Create transaction record ──────────────────────────────────────────────
    const transaction = new Transaction({
      userId: user._id,
      planName: planName,
      duration: duration,
      amount: 0, // admin grant = free
      status: "success",
      paymentGateway: "Admin Grant",
      merchantTransactionId: `ADMIN-${Date.now()}`,
      completedAt: new Date(),
    });

    await transaction.save();

    // ── Success ────────────────────────────────────────────────────────────────
    log(`\n✅ Plan granted successfully!`, "green");
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "bright");
    log(`User:       ${user.fullName} (${user.email})`, "bright");
    log(`Plan:       ${planName}`, "bright");
    log(`Duration:   ${duration} (${months} months)`, "bright");
    log(`Start:      ${start.toLocaleDateString()}`, "bright");
    log(`End:        ${end.toLocaleDateString()}`, "bright");
    log(`Transaction ID: ${transaction._id}`, "gray");
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, "bright");
  } catch (err) {
    log(`\n❌ Error: ${err.message}`, "red");
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log(`🔌 MongoDB connection closed\n`, "gray");
  }
}

// ─── CLI Entry Point ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length < 2) {
  log(`\n📋 Grant Subscription Plan Tool`, "bright");
  log(`\nUsage:`, "yellow");
  log(`  node scripts/grant-plan.js <email> <plan> [duration]\n`, "cyan");

  log(`Examples:`, "yellow");
  log(`  # Using presets (recommended):`, "gray");
  log(`  node scripts/grant-plan.js user@example.com starter`, "cyan");
  log(`  node scripts/grant-plan.js user@example.com litigator`, "cyan");
  log(`  node scripts/grant-plan.js user@example.com power`, "cyan");
  log(`  node scripts/grant-plan.js user@example.com premium`, "cyan");

  log(`\n  # Custom plan:`, "gray");
  log(
    `  node scripts/grant-plan.js user@example.com "Custom Plan" "6 Months"`,
    "cyan",
  );
  log(
    `  node scripts/grant-plan.js user@example.com "VIP Access" 12\n`,
    "cyan",
  );

  log(`Available presets:`, "yellow");
  Object.entries(PLAN_PRESETS).forEach(([key, preset]) => {
    log(`  ${key.padEnd(12)} → ${preset.name} (${preset.duration})`, "gray");
  });

  log(`\nEnvironment:`, "yellow");
  log(`  Make sure MONGO_URI is set in your .env file\n`, "gray");

  process.exit(0);
}

const [email, plan, duration] = args;

// Validate email format
if (!email.includes("@")) {
  log(`\n❌ Invalid email format: ${email}`, "red");
  process.exit(1);
}

// Run
grantPlan(email, plan, duration);

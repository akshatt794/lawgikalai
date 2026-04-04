#!/usr/bin/env node
/**
 * grant-plan.js
 * 
 * CLI tool to grant subscription plans to users by email
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// ─── Colors ────────────────────────────────────────────────────────────────────
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
  const numMatch = s.match(/(\d{1,2})/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (s.includes("year") && n === 1) return 12;
    return n;
  }
  if (s.includes("1 month")) return 1;
  if (s.includes("3 months")) return 3;
  if (s.includes("6 months")) return 6;
  if (s.includes("12 months") || s.includes("1 year")) return 12;
  return 1;
}

// ─── Safe month addition ───────────────────────────────────────────────────────
function addMonthsSafe(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}

// ─── Main grant function ───────────────────────────────────────────────────────
async function grantPlan(email, planInput, durationInput) {
  try {
    log(`\n🔌 Connecting to MongoDB...`, "cyan");
    await mongoose.connect(process.env.MONGO_URI);
    log(`✅ Connected to MongoDB\n`, "green");

    // ── Find user - try multiple approaches ───────────────────────────────────
    const emailNormalized = email.toLowerCase().trim();
    log(`🔍 Searching for user: ${email}`, "cyan");
    log(`   Normalized email: ${emailNormalized}`, "gray");

    // Try exact match first
    let user = await User.findOne({ email: emailNormalized });

    // If not found, try case-insensitive regex
    if (!user) {
      log(
        `   ⚠️  Exact match failed, trying case-insensitive search...`,
        "yellow",
      );
      user = await User.findOne({
        email: { $regex: new RegExp(`^${emailNormalized}$`, "i") },
      });
    }

    // If still not found, try by mobileNumber (in case email is the phone)
    if (!user && email.match(/^\+?\d+$/)) {
      log(`   ⚠️  Trying to search by mobile number...`, "yellow");
      user = await User.findOne({ mobileNumber: email });
    }

    // If still not found, list all users with similar email (debugging)
    if (!user) {
      const similarUsers = await User.find({
        email: { $regex: emailNormalized.split("@")[0], $options: "i" },
      })
        .limit(5)
        .select("email fullName _id");

      if (similarUsers.length > 0) {
        log(`\n   💡 Did you mean one of these?`, "yellow");
        similarUsers.forEach((u) => {
          log(`      ${u.email} (${u.fullName})`, "gray");
        });
      }

      log(`\n❌ User not found with email: ${email}`, "red");
      log(`   Searched normalized: ${emailNormalized}`, "gray");
      process.exit(1);
    }

    log(`✅ User found: ${user.fullName} (${user._id})`, "green");
    log(`   Email in DB: ${user.email}`, "gray");
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
      source: "ADMIN", // ✅ Use "ADMIN" (matches your enum)
      platform: "web", // ✅ Default to web for admin grants
    };

    await user.save();
    log(`✅ User plan saved to database`, "green");

    // ── Create transaction record ──────────────────────────────────────────────
    const transaction = new Transaction({
      userId: user._id,
      planName: planName,
      duration: duration,
      amount: 0,
      status: "success",
      paymentGateway: "Admin",
      merchantTransactionId: `ADMIN-${Date.now()}`,
      completedAt: new Date(),
    });

    await transaction.save();
    log(`✅ Transaction record created`, "green");

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
  log(`  node scripts/grant-plan.js user@example.com starter`, "cyan");
  log(`  node scripts/grant-plan.js user@example.com litigator`, "cyan");
  log(`  node scripts/grant-plan.js user@example.com power`, "cyan");
  log(`  node scripts/grant-plan.js user@example.com premium`, "cyan");

  log(`\nAvailable presets:`, "yellow");
  Object.entries(PLAN_PRESETS).forEach(([key, preset]) => {
    log(`  ${key.padEnd(12)} → ${preset.name} (${preset.duration})`, "gray");
  });

  process.exit(0);
}

const [email, plan, duration] = args;

if (!email.includes("@")) {
  log(`\n❌ Invalid email format: ${email}`, "red");
  process.exit(1);
}

grantPlan(email, plan, duration);
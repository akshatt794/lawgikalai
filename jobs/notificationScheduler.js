// /jobs/notificationScheduler.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const User = require("../models/User");
const Case = require("../models/Case");
const Notification = require("../models/Notification");

async function sendFCM(user, title, body) {
  if (!user.fcmToken) return;

  const message = { notification: { title, body }, token: user.fcmToken };

  try {
    await admin.messaging().send(message);
    await Notification.create({ userId: user._id, title, body });
    console.log(`✅ Sent notification to ${user.fullName}`);
  } catch (err) {
    console.error(
      `❌ Failed to send notification to ${user.fullName}`,
      err.message
    );
  }
}

// 🧭 DAILY SCHEDULED TASK
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Running daily notification scheduler...");

  try {
    const now = new Date();

    // =====================================================
    // 1️⃣ CASE UPCOMING HEARINGS (within 1 day)
    // =====================================================
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const upcomingCases = await Case.find({
      "hearing_details.next_hearing_date": {
        $gte: now,
        $lte: tomorrow,
      },
    }).populate("userId", "fullName fcmToken");

    for (const c of upcomingCases) {
      const user = c.userId;
      if (user) {
        const title = "Upcoming Hearing Reminder 📅";
        const body = `Your case "${
          c.case_title
        }" has a hearing scheduled on ${new Date(
          c.hearing_details.next_hearing_date
        ).toLocaleDateString()}.`;
        await sendFCM(user, title, body);
      }
    }

    // =====================================================
    // 2️⃣ SUBSCRIPTION/TRIAL EXPIRING IN 3 DAYS
    // =====================================================
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const expiringUsers = await User.find({
      $or: [
        { "plan.endDate": { $lte: threeDaysFromNow, $gte: now } },
        { "trial.endDate": { $lte: threeDaysFromNow, $gte: now, $ne: null } },
      ],
      fcmToken: { $exists: true, $ne: "" },
    });

    for (const user of expiringUsers) {
      const isTrial = user.trial?.started && user.trial?.endDate;
      const expiryDate = new Date(
        isTrial ? user.trial.endDate : user.plan.endDate
      ).toLocaleDateString();

      const title = isTrial
        ? "Your Free Trial is Ending Soon ⚠️"
        : "Subscription Expiring Soon ⏳";

      const body = isTrial
        ? `Your free trial will end on ${expiryDate}. Renew your plan to continue enjoying all features.`
        : `Your subscription plan "${user.plan.name}" expires on ${expiryDate}. Please renew soon.`;

      await sendFCM(user, title, body);
    }

    console.log(
      `✅ Notification scheduler complete: ${upcomingCases.length} hearing reminders, ${expiringUsers.length} expiry alerts.`
    );
  } catch (err) {
    console.error("❌ Scheduler error:", err);
  }
});

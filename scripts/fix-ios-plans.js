require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

// Product ID to Plan Name mapping (expo-iap)
const expoIAPMap = {
  monthly: "Advocate Starter Plan",
  quaterly: "Professional Litigator Plan",
  halfyearly: "Courtroom Power Plan",
  annual: "LawgikalAI Enterprise Premium",
};

// Product ID to Plan Name mapping (RevenueCat)
const revenueCatMap = {
  "rc.monthly": "Advocate Starter Plan",
  "rc.quarterly": "Professional Litigator Plan",
  "rc.halfyearly": "Courtroom Power Plan",
  "rc.annually": "LawgikalAI Enterprise Premium",
};

// Combined map
const productMap = { ...expoIAPMap, ...revenueCatMap };

async function fixIOSPlans() {
  try {
    console.log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.DOCUMENTDB_URI);
    console.log("✅ Connected\n");

    // Find users with iOS plans that have productId instead of plan name
    const users = await User.find({
      "plan.platform": "ios",
      "plan.name": { $in: Object.keys(productMap) }, // Find users with productId as name
    });

    console.log(`📋 Found ${users.length} iOS users to fix\n`);

    if (users.length === 0) {
      console.log(
        "✅ No users need fixing! All iOS subscriptions already have correct plan names.",
      );
      process.exit(0);
    }

    let fixed = 0;

    for (const user of users) {
      const oldName = user.plan.name;
      const newName = productMap[oldName];

      if (newName) {
        console.log(`Fixing user: ${user.email || user._id}`);
        console.log(`  Old plan.name: "${oldName}"`);
        console.log(`  New plan.name: "${newName}"`);
        console.log(`  Source: ${user.plan.source || "unknown"}`);
        console.log(
          `  Expires: ${user.plan.endDate ? new Date(user.plan.endDate).toLocaleDateString() : "N/A"}`,
        );

        user.plan.name = newName;
        await user.save();

        console.log(`  ✅ Fixed\n`);
        fixed++;
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Successfully fixed ${fixed} out of ${users.length} users`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed\n");
  }
}

fixIOSPlans();

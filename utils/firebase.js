const admin = require("firebase-admin");

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not defined");
}

const serviceAccount = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;

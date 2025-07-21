const admin = require('firebase-admin');

const firebaseConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); // ✅ Parse from env

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

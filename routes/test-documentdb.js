const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const path = require('path');

const uri = "mongodb://gaurav244:Gaurav%40244@docdb-2025-07-28-11-38-29.cluster-ch8qku0esu6r.ap-south-1.docdb.amazonaws.com:27017/?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false";

router.get('/test-documentdb', async (req, res) => {
  const client = new MongoClient(uri, {
    tls: true,
    tlsCAFile: path.resolve(__dirname, '../../global-bundle.pem'), // ✅ correct and working path
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 10000
  });

  try {
    await client.connect();

    const db = client.db('lawgikalai');
    const collection = db.collection('connect_test');

    const result = await collection.insertOne({ status: 'Connected', time: new Date() });

    await client.close();

    res.json({
      message: '✅ DocumentDB connection successful',
      insertedId: result.insertedId
    });
  } catch (err) {
    console.error('❌ DocumentDB error:', err);
    res.status(500).json({
      error: 'DocumentDB connection failed',
      details: err.message
    });
  }
});

module.exports = router;

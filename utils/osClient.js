const { Client } = require('@opensearch-project/opensearch');

const osClient = new Client({
  node: process.env.OPENSEARCH_URL || 'https://your-opensearch-endpoint.amazonaws.com',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin'
  },
  ssl: {
    rejectUnauthorized: false // Set to true if using valid certs
  }
});

module.exports = osClient;

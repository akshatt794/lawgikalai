const { Client } = require('@opensearch-project/opensearch');

const osClient = new Client({
  node: process.env.OPENSEARCH_ENDPOINT, // e.g. 'https://search-your-domain.ap-south-1.es.amazonaws.com'
  auth: {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD
  },
  ssl: {
    rejectUnauthorized: false // only use in dev mode if needed
  }
});

module.exports = osClient;

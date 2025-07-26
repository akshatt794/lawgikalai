// utils/esClient.js
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: 'https://<your-domain>.es.amazonaws.com',
  auth: {
    username: 'your-username',
    password: 'your-password'
  }
});

module.exports = esClient;

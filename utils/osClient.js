const { Client } = require('@opensearch-project/opensearch');

const osClient = new Client({
  node: 'https://search-lawgikalai-search-seopqzx7gi5moy2vfi2vlem5o4.aos.ap-south-1.on.aws', // ✅ REPLACE THIS
  auth: {
    username: 'gaurav244',     // ✅ Replace with actual user
    password: 'Gaurav@244'  // ✅ Replace with actual password
  },
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = osClient;

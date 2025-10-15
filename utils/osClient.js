const { Client } = require('@opensearch-project/opensearch');

const osClient = new Client({
  node: 'https://vpc-lawgikalai-d2q2wvsq3e5pn66xpzg5lnxx6i.ap-south-1.es.amazonaws.com', // ✅ REPLACE THIS
  auth: {
    username: 'lawgikalai-ishan',     // ✅ Replace with actual user
    password: 'Helloamanishan@1234'  // ✅ Replace with actual password
  },
  ssl: {
    rejectUnauthorized: false
  }
});

// For development
// const osClient = new Client({
//   node: 'https://search-lawgikalai-search-seopqzx7gi5moy2vfi2vlem5o4.aos.ap-south-1.on.aws', // ✅ REPLACE THIS
//   auth: {
//     username: 'gaurav244',     // ✅ Replace with actual user
//     password: 'Gaurav@244'  // ✅ Replace with actual password
//   },
//   ssl: {
//     rejectUnauthorized: false
//   }
// });


module.exports = osClient;

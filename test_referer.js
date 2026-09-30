const https = require('https');
https.get('https://ik.imagekit.io/awan1177/luvira/products/1789263345651-e2_IesQM8rSt.jpg', {
  headers: { 'Referer': 'http://localhost:3000/' }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', console.error);

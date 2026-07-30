async function checkRoutes() {
  const urls = [
    'https://igen-backend-4w4i.onrender.com/',
    'https://igen-backend-4w4i.onrender.com/api/health',
    'https://igen-backend-4w4i.onrender.com/api/candidates',
    'https://igen-backend-4w4i.onrender.com/api/companies'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${text.slice(0, 150)}\n`);
    } catch (e) {
      console.error(`URL: ${url} Failed: ${e.message}\n`);
    }
  }
}

checkRoutes();

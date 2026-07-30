async function testOnlineRender() {
  console.log('🌐 Testing Render Backend URL: https://igen-backend-4w4i.onrender.com/api/companies');
  try {
    const res = await fetch('https://igen-backend-4w4i.onrender.com/api/companies');
    console.log('Status Code:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testOnlineRender();

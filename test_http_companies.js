async function testHttpCreateCompany() {
  console.log('🧪 Testing HTTP POST /api/companies endpoint...');
  try {
    const response = await fetch('http://localhost:5000/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'HTTP Test Company',
        branches: [
          { branchName: 'HQ Branch', city: 'Chennai', isHeadquarters: true }
        ]
      })
    });
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));

    // Clean up
    const pool = require('./config/db');
    await pool.query("DELETE FROM companies WHERE company_name = 'HTTP Test Company'");
    console.log('✅ Cleaned up HTTP Test Company from DB');
    process.exit(0);
  } catch (err) {
    console.error('❌ HTTP Test Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testHttpCreateCompany();

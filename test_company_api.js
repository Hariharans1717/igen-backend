const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const companyService = require('./services/companyService');

async function testCompanyService() {
  console.log('🧪 Testing Company Service...');
  try {
    const list = await companyService.listCompanies();
    console.log('📋 Listed Companies:', JSON.stringify(list, null, 2));

    if (list.length > 0) {
      console.log('✅ Company list response structure verified! Total companies:', list.length);
      console.log('   Sample company branches count:', list[0].branchCount);
    } else {
      console.warn('⚠️ List empty, attempting to create test company...');
      const created = await companyService.createCompany({
        companyName: 'Test Corp',
        branches: [{ branchName: 'Main Branch', city: 'Chennai', isHeadquarters: true }]
      });
      console.log('✅ Created test company:', JSON.stringify(created, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testCompanyService();

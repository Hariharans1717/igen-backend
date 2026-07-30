const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const companyService = require('./services/companyService');

async function testCreateCompany() {
  console.log('🧪 Testing createCompany service...');
  try {
    const created = await companyService.createCompany({
      companyName: 'Test Tech Corp',
      branches: [
        { branchName: 'Chennai HQ', city: 'Chennai', isHeadquarters: true },
        { branchName: 'Bangalore Office', city: 'Bangalore', isHeadquarters: false }
      ]
    });
    console.log('✅ Created company successfully:', JSON.stringify(created, null, 2));

    const list = await companyService.listCompanies();
    console.log('📋 Companies in DB after creation:', list.length);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create company:', err);
    process.exit(1);
  }
}

testCreateCompany();

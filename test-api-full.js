const http = require('http');

function makeRequest(method, path, data, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }
    };
    
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testAPI() {
  console.log("🧪 Testing Create Candidate API Workflow");
  console.log("═".repeat(60));
  
  // Step 1: Login
  console.log("\n📝 Step 1: Login to get auth token");
  console.log("─".repeat(60));
  
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    email: 'priya@igen.in',
    password: 'TempPassword123!' 
  });
  
  console.log("Status:", loginResponse.status);
  
  if (loginResponse.status !== 200) {
    console.error("❌ Login failed:", loginResponse.data);
    return;
  }
  
  const token = loginResponse.data.token;
  console.log("✅ Login successful");
  console.log("Token:", token.substring(0, 50) + "...");
  
  // Step 2: Create Candidate
  console.log("\n📝 Step 2: Create a new candidate");
  console.log("─".repeat(60));
  
  const candidateData = {
    name: "Test Candidate " + Date.now(),
    email: "testcandidate_" + Date.now() + "@example.com",
    mobile: "+1" + Math.random().toString().substring(2, 11),
    employmentStatus: "employed",
    expectedCTC: 50000,
    preferredLocation: "New York",
    skills: ["JavaScript", "React", "Node.js"],
    status: "new"
  };
  
  console.log("Sending:", JSON.stringify(candidateData, null, 2));
  
  const createResponse = await makeRequest('POST', '/api/candidates', candidateData, token);
  
  console.log("\nResponse Status:", createResponse.status);
  console.log("Response Body:", JSON.stringify(createResponse.data, null, 2));
  
  if (createResponse.status === 201) {
    console.log("\n✅ SUCCESS: Candidate created!");
    console.log("Candidate ID:", createResponse.data.id);
    console.log("Candidate Name:", createResponse.data.name);
    console.log("Candidate Email:", createResponse.data.email);
  } else {
    console.log("\n❌ FAILED: Could not create candidate");
  }
}

testAPI().catch(error => {
  console.error("❌ Error:", error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error("Server is not running on port 5000");
  }
});

const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4LWFiY2QtMTIzNC01Njc4LWFiY2RlZjAxMjM0NSIsImVtYWlsIjoidGVzdEBpZ2VuLmNvbSIsInJvbGUiOiJhZG1pbiJ9.qXV5PeXR7TzCJY4w9GxXqXV5PeXR7TzCJY4w9GxXqRc";

const candidateData = {
  name: "Test Candidate " + Date.now(),
  email: "testcandidate_" + Date.now() + "@example.com",
  mobile: "+1234567890",
  employmentStatus: "employed",
  expectedCTC: 50000,
  preferredLocation: "New York",
  skills: ["JavaScript", "React", "Node.js"],
  status: "new"
};

const postData = JSON.stringify(candidateData);

console.log("📨 Testing Create Candidate API");
console.log("═".repeat(50));
console.log("📍 Endpoint: POST http://localhost:5000/api/candidates");
console.log("📦 Payload:", JSON.stringify(candidateData, null, 2));
console.log("═".repeat(50));

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/candidates',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log("\n✅ Response Received");
    console.log("─".repeat(50));
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", JSON.stringify(res.headers, null, 2));
    console.log("\nResponse Body:");
    
    try {
      const responseData = JSON.parse(data);
      console.log(JSON.stringify(responseData, null, 2));
      
      if (res.statusCode === 201) {
        console.log("\n✅ SUCCESS: Candidate created with ID:", responseData.id);
      } else {
        console.log("\n❌ FAILED: Status code is", res.statusCode);
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error("\n❌ Request Error:", error.message);
  console.error("Code:", error.code);
  
  if (error.code === 'ECONNREFUSED') {
    console.error("The server is not running on port 5000");
  }
});

req.write(postData);
req.end();

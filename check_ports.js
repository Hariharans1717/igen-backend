async function checkPorts() {
  for (const port of [5000, 5001, 5002, 5003]) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) {
        console.log(`✅ Backend is active on port ${port}!`);
        process.exit(0);
      }
    } catch (e) {
      console.log(`Port ${port} not reachable.`);
    }
  }
  console.log('❌ Backend not reachable on ports 5000-5003.');
  process.exit(1);
}
checkPorts();

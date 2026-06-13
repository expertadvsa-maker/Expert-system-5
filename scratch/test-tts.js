async function testTTS() {
  const url = 'http://localhost:3000/api/tts';
  const payload = {
    stats: {
      income: 120000,
      expenses: 85000,
      net: 35000,
      pendingPurchases: 3,
      activeProjects: 5,
      totalWorkers: 12,
      totalEmployees: 4,
      todayAttendance: 3
    },
    voiceFocus: 'all',
    customKey: 'AQ.Ab8RN6KBm-tCCYjQl-r8EWNWcHnkIBJEoPcMUfkrVFXKT81c2Q'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testTTS();

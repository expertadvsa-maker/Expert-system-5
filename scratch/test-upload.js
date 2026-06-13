async function testUpload() {
  const url = 'http://localhost:3000/api/upload';
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 png
  const payload = {
    fileData: dummyBase64,
    fileName: 'test_image.png'
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

testUpload();

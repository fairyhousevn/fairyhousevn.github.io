// =========================================================
// 🔐 VERCEL SERVERLESS FUNCTION - Proxy Gemini API
// API keys được giấu an toàn trong Environment Variables
// Frontend gọi đến /api/chat thay vì gọi trực tiếp Google
// =========================================================

export default async function handler(req, res) {
  // Chỉ cho phép phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS - Chỉ cho phép domain của bạn gọi API này
  const allowedOrigins = [
    'https://fairyhouse.vercel.app',
    'https://fairyhousevn.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý preflight request (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Lấy danh sách API keys từ Environment Variables (an toàn, không ai thấy được)
  const GEMINI_KEYS = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4
  ].filter(Boolean); // Loại bỏ các key undefined/null

  if (GEMINI_KEYS.length === 0) {
    return res.status(500).json({ error: 'No API keys configured' });
  }

  const GEMINI_MODEL = 'gemini-2.5-flash';

  // Lấy dữ liệu từ request body của frontend
  const { contents, systemInstruction, generationConfig } = req.body;

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Invalid request body: missing contents' });
  }

  // Chuẩn bị request body cho Gemini API
  const requestBody = {
    contents,
    generationConfig: generationConfig || {
      maxOutputTokens: 2000,
      temperature: 0.7
    }
  };

  // Thêm systemInstruction nếu có
  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  // Thử lần lượt từng key (round-robin xoay vòng)
  let lastError = null;

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const apiKey = GEMINI_KEYS[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Trả về kết quả kèm thông tin key nào đã xử lý (chỉ gửi số thứ tự, không gửi key thật)
        return res.status(200).json({
          ...data,
          _keyUsed: i + 1 // Chỉ gửi số thứ tự key để frontend hiển thị chấm tròn
        });
      }

      // Nếu key bị rate limit (429), thử key tiếp theo
      if (response.status === 429) {
        lastError = `Key ${i + 1}: Rate limit exceeded (429)`;
        console.warn(lastError);
        continue; // Thử key tiếp theo
      }

      // Các lỗi khác (400, 403, v.v.), vẫn thử key tiếp theo
      const errText = await response.text();
      lastError = `Key ${i + 1}: HTTP ${response.status} - ${errText}`;
      console.error(lastError);
      continue;

    } catch (error) {
      lastError = `Key ${i + 1}: ${error.message}`;
      console.error(lastError);
      continue;
    }
  }

  // Tất cả các key đều thất bại
  return res.status(429).json({
    error: 'ALL_KEYS_EXHAUSTED',
    message: 'Tất cả API keys đều đang quá tải. Vui lòng thử lại sau 1 phút.'
  });
}

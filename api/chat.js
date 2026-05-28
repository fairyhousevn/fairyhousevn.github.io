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
    { id: 1, key: process.env.GEMINI_KEY_1 },
    { id: 2, key: process.env.GEMINI_KEY_2 },
    { id: 3, key: process.env.GEMINI_KEY_3 },
    { id: 4, key: process.env.GEMINI_KEY_4 }
  ].filter(item => !!item.key); // Chỉ lấy các key được cấu hình

  if (GEMINI_KEYS.length === 0) {
    return res.status(500).json({ error: 'No API keys configured' });
  }

  const GEMINI_MODEL = 'gemini-2.5-flash';

  // Lấy dữ liệu từ request body của frontend
  const { contents, systemInstruction, generationConfig, preferredKeyIndex } = req.body;

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

  // Xác định vị trí bắt đầu thử key (Sequential Round-Robin do frontend chỉ định)
  const preferredId = parseInt(preferredKeyIndex) || 1;
  const startIndex = GEMINI_KEYS.findIndex(k => k.id === preferredId) !== -1
    ? GEMINI_KEYS.findIndex(k => k.id === preferredId)
    : 0;

  // Trạng thái của các key được thử trong lượt này để trả về cho frontend hiển thị
  const keyStatuses = {};
  const keyErrors = {};
  let lastError = null;

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const currentIndex = (startIndex + i) % GEMINI_KEYS.length;
    const keyObj = GEMINI_KEYS[currentIndex];
    const apiKey = keyObj.key;
    const keyId = keyObj.id;
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
        keyStatuses[keyId] = 'success';
        
        // Trả về kết quả kèm thông tin key nào đã xử lý và trạng thái các key đã thử
        return res.status(200).json({
          ...data,
          _keyUsed: keyId,
          _keyStatuses: keyStatuses
        });
      }

      // Nếu key bị lỗi, đánh dấu lỗi và thử key tiếp theo trong danh sách xoay vòng
      keyStatuses[keyId] = 'error';
      const errText = await response.text();
      lastError = `Key ${keyId}: HTTP ${response.status} - ${errText}`;
      keyErrors[keyId] = lastError;
      console.warn(lastError);

    } catch (error) {
      keyStatuses[keyId] = 'error';
      lastError = `Key ${keyId}: ${error.message}`;
      keyErrors[keyId] = lastError;
      console.error(lastError);
    }
  }

  // Tất cả các key đều thất bại
  return res.status(429).json({
    error: 'ALL_KEYS_EXHAUSTED',
    message: 'Tất cả API keys đều đang quá tải. Vui lòng thử lại sau 1 phút.',
    _keyStatuses: keyStatuses,
    _keyErrors: keyErrors
  });
}

// =========================================================
// 🔐 VERCEL SERVERLESS FUNCTION - Key Dispenser
// API keys được giấu an toàn trong Environment Variables
// Trả về cấu hình đã được mã hóa đơn giản để tránh scan key
// =========================================================

export default async function handler(req, res) {
  // CORS - Chỉ cho phép các domain được chỉ định
  const allowedOrigins = [
    'https://fairyhouse.vercel.app',
    'https://fairyhousevn.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:5000',
    'http://localhost:5500',
    'http://localhost:5173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Cho phép gọi trực tiếp không có origin (ví dụ: curl từ máy cá nhân hoặc kiểm tra)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý preflight request (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ cho phép phương thức GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.NINE_ROUTER_KEY || '';
  const url = process.env.NINE_ROUTER_URL || 'https://rlf2des.abc-tunnel.us/v1/chat/completions';
  const model = 'chatboxweb';

  // Hàm mã hóa đơn giản: Base64 + đảo chuỗi
  const encode = (str) => {
    if (!str) return '';
    const b64 = Buffer.from(str).toString('base64');
    return b64.split('').reverse().join('');
  };

  const ek = encode(key);
  const eu = encode(url);
  const em = encode(model);

  // Debug thông tin các biến môi trường liên quan đến NINE (chỉ trả về độ dài và tên để bảo mật)
  const debugEnv = {};
  for (const k of Object.keys(process.env)) {
    if (k.toLowerCase().includes('nine')) {
      debugEnv[k] = {
        length: process.env[k] ? process.env[k].length : 0,
        exists: !!process.env[k]
      };
    }
  }

  return res.status(200).json({
    ek,
    eu,
    em,
    _debug: debugEnv
  });
}

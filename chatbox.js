// =========================================================
// 🧚 FAIRY HOUSE AI CHATBOX - Gemini API Integration
// =========================================================

(function() {
  'use strict';

  // ===== CẤU HÌNH 9ROUTER PROXY =====
  const NINE_ROUTER_KEY = "sk-50ed9f833897dfa8-314oks-2608b897";
  const NINE_ROUTER_MODEL = "chatboxweb";
  const NINE_ROUTER_API_URL = "https://rlf2des.abc-tunnel.us/v1/chat/completions";
  
  const MAX_HISTORY = 6; // Giới hạn context lịch sử chat
  const RATE_LIMIT_MS = 2000; // Khôi phục rate limit 2 giây vì 9Router có cơ chế xoay vòng miễn phí tốt
  const API_TIMEOUT_MS = 30000; // Timeout 30 giây

  // ===== SYSTEM PROMPT =====
  function buildSystemPrompt() {
    // Lấy dữ liệu sản phẩm từ biến products toàn cục (từ script.js)
    let productContext = "Chưa có dữ liệu sản phẩm.";
    if (typeof products !== 'undefined' && products.length > 0) {
      productContext = products.map(p => {
        const remaining = p.stock;
        const status = remaining <= 0 ? "HẾT HÀNG" : `Còn ${remaining}`;
        return `- [${p.code}] ${p.name} | Giá: ${p.price} | Danh mục: ${p.category} | ${status} | Đã bán: ${p.sold}`;
      }).join('\n');
    }

    return `Bạn là "Fairy" — trợ lý AI dễ thương của cửa hàng **Fairy House**, chuyên bán phụ kiện xinh, móc khoá trend và quà lưu niệm dễ thương tại Chợ Mỹ Luông, An Giang.

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời câu hỏi liên quan đến Fairy House: sản phẩm, giá cả, đặt hàng, giao hàng, địa chỉ, liên hệ, khuyến mãi.
2. Nếu khách hỏi KHÔNG liên quan (chính trị, tin tức, lập trình, toán học, bài tập, v.v.), hãy từ chối nhẹ nhàng: "Fairy chỉ biết về phụ kiện xinh thôi nè ✨ Bạn muốn xem sản phẩm gì không?"
3. Luôn trả lời bằng tiếng Việt, giọng điệu thân thiện, dễ thương, dùng emoji phù hợp nhưng KHÔNG quá nhiều (tối đa 2-3 emoji/câu trả lời).
4. Khi gợi ý sản phẩm, LUÔN kèm mã sản phẩm trong dấu ngoặc vuông, ví dụ: [PK.01]. Bắt buộc phải có dấu ngoặc vuông [] thì hệ thống mới hiển thị được card sản phẩm trực quan cho khách hàng click xem chi tiết.
5. TUYỆT ĐỐI KHÔNG sử dụng bảng biểu markdown (dạng cột dùng ký tự | và nét đứt -). Hãy trình bày danh sách sản phẩm bằng các dòng gạch đầu dòng (-) đơn giản, dễ đọc trên di động.
6. Nếu có nhiều mẫu mã sản phẩm tương tự hoặc cùng loại, hãy liệt kê đầy đủ các mẫu phù hợp nhất (lên đến 10 sản phẩm) theo định dạng dòng:
   - **Tên sản phẩm** [Mã_sản_phẩm] | Giá: [Giá] (Trạng thái: Còn hàng / Hết hàng)
7. Nếu khách muốn mua hàng, hướng dẫn: "Bạn có thể bấm vào sản phẩm để xem chi tiết và đặt hàng, hoặc liên hệ [Zalo 0378 791 667](https://zalo.me/0378791667) nhé! 💕"
8. Khi khách chào, hãy chào lại thân thiện và gợi ý xem sản phẩm.
9. Nếu sản phẩm hết hàng, thông báo và gợi ý sản phẩm tương tự còn hàng.
10. Khi gửi các link liên hệ như Zalo, Facebook, TikTok, hãy LUÔN viết dưới dạng link markdown [Tên hiển thị](đường_dẫn) để khách bấm được và truy cập trực tiếp luôn.
11. Khi khách hỏi về sản phẩm bán chạy nhất (hoặc "bán chạy", "hot nhất", "best seller"), hãy liệt kê đúng 5 sản phẩm bán chạy nhất (dựa trên cột Đã bán cao nhất) theo định dạng dòng, ghi rõ đã bán bao nhiêu và tình trạng kho:
    - **Tên sản phẩm** [Mã_sản_phẩm]
      🔥 Đã bán: [Số_lượng_đã_bán] | Giá: [Giá]
      📌 Tình trạng: Còn hàng (Còn [Số_tồn] sản phẩm) / Hết hàng


THÔNG TIN CỬA HÀNG:
- Tên: Fairy House
- Địa chỉ: Chợ Mỹ Luông, An Giang
- SĐT / Zalo: [0378 791 667](https://zalo.me/0378791667)
- Facebook: [Facebook Fairy House](https://www.facebook.com/fairyhouse67)
- TikTok: [TikTok @tienhouse67](https://www.tiktok.com/@tienhouse67)
- Giao hàng: Toàn quốc, ship COD
- Chuyên: Phụ kiện xinh Kitty, móc khoá, quà lưu niệm

DANH SÁCH SẢN PHẨM HIỆN CÓ:
${productContext}`;
  }

  // ===== STATE =====
  let chatHistory = []; // {role: 'user'|'model', parts: [{text: ''}]}
  let isOpen = window.innerWidth > 768; // Mặc định mở trên Desktop (màn hình > 768px), đóng trên Mobile
  let isWaiting = false;
  let lastSentTime = 0;

  // ===== KHỞI TẠO HTML =====
  function initChatboxHTML() {
    // Overlay (mobile)
    const overlay = document.createElement('div');
    overlay.className = 'chatbox-overlay';
    overlay.id = 'chatboxOverlay';
    overlay.addEventListener('click', toggleChatbox);
    document.body.appendChild(overlay);

    // Container
    const container = document.createElement('div');
    container.id = 'fairyChatbox';
    container.innerHTML = `
      <!-- Toggle Button -->
      <button class="chatbox-toggle ${isOpen ? 'active' : ''}" id="chatboxToggle" title="Chat với Fairy">
        <span class="toggle-icon">
          <img src="kitty1.png" alt="Kitty" class="chatbox-toggle-avatar">
        </span>
        <span class="chatbox-toggle-text">Chat với Fairy</span>
        <span class="chatbox-notif" id="chatboxNotif"></span>
      </button>

      <!-- Chat Window -->
      <div class="chatbox-window ${isOpen ? 'open' : ''}" id="chatboxWindow">
        <!-- Header -->
        <div class="chatbox-header">
          <img src="logo.jpg" alt="Fairy House" class="chatbox-header-avatar"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐱</text></svg>'">
          <div class="chatbox-header-info">
            <div class="chatbox-header-name">Fairy House</div>
            <div class="chatbox-header-status">
              <span class="chatbox-status-dot"></span>
              Luôn sẵn sàng hỗ trợ bạn
            </div>
          </div>
          <button class="chatbox-header-close" id="chatboxClose" title="Đóng">✕</button>
        </div>

        <!-- Messages -->
        <div class="chatbox-messages" id="chatboxMessages">
          <div class="chatbox-welcome">
            <img src="kitty1.png" alt="Kitty" class="chatbox-welcome-avatar-img">
            <div class="chatbox-welcome-text">
              Xin chào! Mình là <strong>Fairy</strong> 💕<br>
              Trợ lý AI của Fairy House.<br>
              Hỏi mình bất cứ gì về sản phẩm nhé!
            </div>
          </div>
        </div>

        <!-- Quick Replies -->
        <div class="chatbox-quick-replies" id="chatboxQuickReplies">
          <button class="quick-reply-chip" data-msg="Sản phẩm nào bán chạy nhất?">🔥 Bán chạy</button>
          <button class="quick-reply-chip" data-msg="Gợi ý quà tặng dễ thương">🎁 Gợi ý quà</button>
          <button class="quick-reply-chip" data-msg="Địa chỉ và liên hệ cửa hàng">📍 Liên hệ</button>
          <button class="quick-reply-chip" data-msg="Cách đặt hàng và giao hàng">🚚 Đặt hàng</button>
        </div>

        <!-- Input -->
        <div class="chatbox-input-area">
          <input type="text" class="chatbox-input" id="chatboxInput"
                 placeholder="Nhắn tin cho Fairy..." maxlength="500" autocomplete="off">
          <button class="chatbox-send-btn" id="chatboxSendBtn" title="Gửi">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // Ủy quyền sự kiện (Event Delegation) cho việc click vào card sản phẩm trong chat
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.chat-product-card');
      if (card) {
        let idVal = card.getAttribute('data-id');
        let codeVal = card.getAttribute('data-code');
        
        // Fallback cho lịch sử chat cũ không chứa thuộc tính data-*
        if (!codeVal) {
          const nameEl = card.querySelector('.chat-product-name');
          if (nameEl) {
            codeVal = nameEl.textContent.split(' - ')[0];
          }
        }

        if (typeof openProductModal === 'function') {
          let id = parseInt(idVal);
          if (isNaN(id) && typeof products !== 'undefined' && codeVal) {
            const found = products.find(p => p.code === codeVal);
            if (found) id = found.id;
          }
          if (!isNaN(id)) {
            openProductModal(id);
          }
        }
      }
    });

    // Bind events
    document.getElementById('chatboxToggle').addEventListener('click', toggleChatbox);
    document.getElementById('chatboxClose').addEventListener('click', toggleChatbox);
    document.getElementById('chatboxSendBtn').addEventListener('click', handleSend);
    document.getElementById('chatboxInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Quick replies
    document.querySelectorAll('.quick-reply-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const msg = chip.getAttribute('data-msg');
        if (msg) {
          document.getElementById('chatboxInput').value = msg;
          handleSend();
        }
      });
    });

    // Load chat history from sessionStorage
    loadChatHistory();

    // Nếu mặc định mở chatbox, thêm class dịch chuyển layout cho body
    if (isOpen) {
      document.body.classList.add('chatbox-is-open');
      scrollToBottom('auto');
    }
  }

  // ===== TOGGLE CHATBOX =====
  function toggleChatbox() {
    isOpen = !isOpen;
    const window = document.getElementById('chatboxWindow');
    const toggle = document.getElementById('chatboxToggle');
    const overlay = document.getElementById('chatboxOverlay');
    const notif = document.getElementById('chatboxNotif');

    if (isOpen) {
      window.classList.add('open');
      toggle.classList.add('active');
      document.body.classList.add('chatbox-is-open');
      notif.classList.remove('show');
      
      // Show overlay on mobile
      if (innerWidth <= 768) {
        overlay.classList.add('show');
      }

      // Focus input
      setTimeout(() => {
        document.getElementById('chatboxInput').focus();
      }, 350);

      // Scroll to bottom
      scrollToBottom('auto');
    } else {
      window.classList.remove('open');
      toggle.classList.remove('active');
      document.body.classList.remove('chatbox-is-open');
      overlay.classList.remove('show');
    }
  }

  // ===== PHẢN HỒI SẢN PHẨM BÁN CHẠY =====
  function respondWithBestSellers() {
    hideTyping();
    if (typeof products === 'undefined' || !products.length) {
      const errorMsg = "Fairy chưa tải được danh sách sản phẩm, bạn chờ chút nhé! 💕";
      addMessage('ai', errorMsg);
      chatHistory.push({ role: 'assistant', content: errorMsg });
      return;
    }

    // Sắp xếp sản phẩm theo số lượng bán (sold) giảm dần
    const sorted = [...products].sort((a, b) => (parseInt(b.sold) || 0) - (parseInt(a.sold) || 0));
    const top5 = sorted.slice(0, 5);

    let aiText = "✨ Dưới đây là **Top 5 sản phẩm bán chạy nhất** tại Fairy House nè:\n\n";
    top5.forEach((p, idx) => {
      const remaining = parseInt(p.stock) || 0;
      const status = remaining <= 0 
        ? "❌ **Hết hàng**" 
        : `✅ **Còn hàng** (Còn **${remaining}** sản phẩm)`;
      
      aiText += `${idx + 1}. **${p.name}** [${p.code}]\n`;
      aiText += `   🔥 Đã bán: **${p.sold || 0}** | Giá: **${p.price}**\n`;
      aiText += `   📌 Tình trạng: ${status}\n\n`;
    });
    aiText += "💕 Bạn có thể bấm trực tiếp vào thẻ sản phẩm bên dưới để xem chi tiết và đặt mua nha!";

    // Lưu vào lịch sử chat
    chatHistory.push({ role: 'assistant', content: aiText });

    // Hiển thị tin nhắn kèm các card sản phẩm tương ứng
    addMessage('ai', aiText, top5);
  }

  // ===== GỬI TIN NHẮN =====
  function handleSend() {
    if (isWaiting) return;

    const input = document.getElementById('chatboxInput');
    const text = input.value.trim();
    if (!text) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastSentTime < RATE_LIMIT_MS) {
      return;
    }
    lastSentTime = now;

    // Clear input
    input.value = '';

    // Add user message
    addMessage('user', text);

    // Add to history
    chatHistory.push({ role: 'user', content: text });

    // Show typing indicator
    showTyping();

    // Chuẩn hóa chuỗi tìm kiếm không dấu
    const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedText.includes('ban chay') || normalizedText.includes('best seller') || normalizedText.includes('hot nhat') || (normalizedText.includes('san pham') && normalizedText.includes('hot'))) {
      setTimeout(() => {
        respondWithBestSellers();
      }, 800);
      return;
    }

    // Call 9Router API
    callGemini(text);
  }

  // ===== THÊM TIN NHẮN VÀO CHAT =====
  function addMessage(type, content, withProducts) {
    const messagesEl = document.getElementById('chatboxMessages');

    // Remove welcome message if exists
    const welcome = messagesEl.querySelector('.chatbox-welcome');
    if (welcome) welcome.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `chatbox-msg ${type}`;

    if (type === 'ai') {
      // Parse markdown-like formatting
      const formattedContent = formatMessage(content);
      
      msgDiv.innerHTML = `
        <img src="logo.jpg" alt="Fairy" class="msg-avatar"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐱</text></svg>'">
        <div class="msg-bubble">${formattedContent}</div>
      `;

      // Append product cards if found
      if (withProducts && withProducts.length > 0) {
        const bubble = msgDiv.querySelector('.msg-bubble');
        withProducts.forEach(p => {
          const card = createProductCard(p);
          bubble.appendChild(card);
        });
      }
    } else if (type === 'user') {
      msgDiv.innerHTML = `
        <div class="msg-bubble">${escapeHtml(content)}</div>
      `;
    } else if (type === 'error') {
      msgDiv.className = 'chatbox-msg ai error';
      msgDiv.innerHTML = `
        <img src="logo.jpg" alt="Fairy" class="msg-avatar"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐱</text></svg>'">
        <div class="msg-bubble">${content}</div>
      `;
    }

    messagesEl.appendChild(msgDiv);
    if (type === 'ai' || type === 'error') {
      scrollToMessage(msgDiv);
    } else {
      scrollToBottom();
    }
    saveChatHistory();
  }

  // ===== PRODUCT CARD =====
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'chat-product-card';
    card.setAttribute('data-id', product.id);
    card.setAttribute('data-code', product.code);
    card.innerHTML = `
      <img src="${product.img}" alt="${product.name}" class="chat-product-img"
           onerror="this.src='product_image.jpg'">
      <div class="chat-product-info">
        <div class="chat-product-name">${product.code} - ${product.name}</div>
        <div class="chat-product-price">${product.price}</div>
        <div class="chat-product-btn">Xem chi tiết →</div>
      </div>
    `;
    return card;
  }

  // ===== TYPING INDICATOR =====
  function showTyping() {
    isWaiting = true;
    const messagesEl = document.getElementById('chatboxMessages');
    const sendBtn = document.getElementById('chatboxSendBtn');
    sendBtn.disabled = true;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbox-typing';
    typingDiv.id = 'chatboxTyping';
    typingDiv.innerHTML = `
      <img src="logo.jpg" alt="Fairy" class="msg-avatar"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐱</text></svg>'">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(typingDiv);
    scrollToBottom();
  }

  function hideTyping() {
    isWaiting = false;
    const typing = document.getElementById('chatboxTyping');
    if (typing) typing.remove();
    document.getElementById('chatboxSendBtn').disabled = false;
  }

  // ===== GỌI 9ROUTER API =====
  async function callGemini(userMessage, retries = 1) {
    try {
      const systemPrompt = buildSystemPrompt();
      const historySlice = chatHistory.slice(-MAX_HISTORY);

      // Cấu trúc request body chuẩn OpenAI API để gửi tới 9Router
      const messages = [
        { role: 'system', content: systemPrompt },
        ...historySlice
      ];

      const requestBody = {
        model: NINE_ROUTER_MODEL,
        messages: messages,
        max_tokens: 2000
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(NINE_ROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NINE_ROUTER_KEY}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Hỗ trợ tự động thử lại nếu gặp lỗi từ 9Router
        if ((response.status === 429 || response.status >= 500) && retries > 0) {
          console.warn(`9Router returned ${response.status}. Retrying in 3s...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return callGemini(userMessage, retries - 1);
        }
        throw new Error(`API error: ${response.status}`);
      }

      // 9Router có thể trả về text thô chứa chuỗi JSON kèm theo các ký tự xuống dòng và text thừa như "data: [DONE]"
      const rawText = await response.text();
      let aiText = '';

      try {
        // Tìm vị trí bắt đầu "{" đầu tiên và "}" cuối cùng để cắt lấy toàn bộ đối tượng JSON lồng nhau
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
          const data = JSON.parse(jsonStr);
          if (data.choices && data.choices[0] && data.choices[0].message) {
            aiText = data.choices[0].message.content;
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse 9Router JSON:', parseErr);
      }

      if (!aiText) {
        throw new Error('Could not extract text response from 9Router');
      }

      // Add to history
      chatHistory.push({ role: 'assistant', content: aiText });

      // Find mentioned products
      const mentionedProducts = findMentionedProducts(aiText);

      // Hide typing and show response
      hideTyping();
      addMessage('ai', aiText, mentionedProducts);

    } catch (error) {
      console.error('9Router API Error:', error);
      hideTyping();

      let errorMsg = 'Fairy đang bận trả lời khách khác, bạn chờ chút rồi thử lại nhé! 💕 Hoặc liên hệ Zalo <strong>0378 791 667</strong> để được hỗ trợ nhanh!';
      
      if (error.name === 'AbortError') {
        errorMsg = 'Fairy mất hơi lâu để suy nghĩ 🤔 Bạn thử hỏi lại nhé!';
      }

      addMessage('error', errorMsg);
    }
  }

  // ===== TÌM SẢN PHẨM ĐƯỢC MENTION =====
  function findMentionedProducts(text) {
    if (typeof products === 'undefined' || !products.length) return [];
    
    const found = [];
    const codeRegex = /\[?([A-Z]{1,4}\.\d{1,3})\]?/g;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      const code = match[1];
      const product = products.find(p => p.code === code);
      if (product && !found.find(f => f.id === product.id)) {
        found.push(product);
      }
    }

    // Giới hạn tối đa 10 sản phẩm để hiển thị đầy đủ mẫu cho khách
    return found.slice(0, 10);
  }

  // ===== FORMAT MESSAGE (Markdown-like) =====
  function formatMessage(text) {
    let html = escapeHtml(text);
    
    // Markdown links: [text](url) -> <a href="url" target="_blank" rel="noopener noreferrer">text</a>
    html = html.replace(/\[([^\]]+)\]\(((?:https?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[^\s)]*)\)/g, function(match, text, url) {
      const href = url.startsWith('http') ? url : 'https://' + url;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*(?!\*)(.*?)(?<!\*)\*/g, '<em>$1</em>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Product codes: [PK.01] -> styled
    html = html.replace(/\[([A-Z]{1,4}\.\d{1,3})\]/g, '<code>$1</code>');
    
    // Lists: - item or • item
    html = html.replace(/(?:^|<br>)[-•]\s+(.*?)(?=<br>|$)/g, '<br>• $1');
    
    return html;
  }

  // ===== ESCAPE HTML =====
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== SCROLL TO BOTTOM =====
  function scrollToBottom(behavior = 'smooth') {
    const messagesEl = document.getElementById('chatboxMessages');
    if (messagesEl) {
      setTimeout(() => {
        messagesEl.scrollTo({
          top: messagesEl.scrollHeight,
          behavior: behavior
        });
      }, 50);
    }
  }

  // ===== TÍNH TOÁN VỊ TRÍ TƯƠNG ĐỐI TRÁNH ẢNH HƯỞNG ANIMATION =====
  function getRelativeOffsetTop(element, container) {
    // Với .chatbox-messages có position: relative, offsetParent của element sẽ chính là container.
    // Lấy trực tiếp element.offsetTop là chuẩn nhất, nhanh nhất và không bị lỗi lặp vòng ngoài.
    return element.offsetTop || 0;
  }

  // ===== SCROLL TO MESSAGE =====
  function scrollToMessage(msgDiv, behavior = 'smooth') {
    const messagesEl = document.getElementById('chatboxMessages');
    if (messagesEl && msgDiv) {
      // Đợi 100ms để layout và các thẻ HTML được render hoàn thiện, sau đó cuộn mượt mà
      // lên vị trí đầu dòng của tin nhắn đó.
      setTimeout(() => {
        const targetScrollTop = getRelativeOffsetTop(msgDiv, messagesEl) - 8;
        messagesEl.scrollTo({
          top: targetScrollTop,
          behavior: behavior
        });
      }, 100);
    }
  }

  // ===== LƯU / TẢI LỊCH SỬ CHAT =====
  function saveChatHistory() {
    try {
      // Save messages HTML
      const messagesEl = document.getElementById('chatboxMessages');
      sessionStorage.setItem('fairy_chat_html', messagesEl.innerHTML);
      // Save history for API context
      sessionStorage.setItem('fairy_chat_history', JSON.stringify(chatHistory.slice(-MAX_HISTORY)));
    } catch (e) { /* ignore */ }
  }

  function loadChatHistory() {
    try {
      const savedHtml = sessionStorage.getItem('fairy_chat_html');
      const savedHistory = sessionStorage.getItem('fairy_chat_history');
      
      if (savedHtml && savedHistory) {
        document.getElementById('chatboxMessages').innerHTML = savedHtml;
        const parsedHistory = JSON.parse(savedHistory);
        
        // Chuẩn hóa định dạng lịch sử cũ (Gemini) sang định dạng mới (OpenAI/9Router) nếu cần
        chatHistory = parsedHistory.map(item => {
          if (item.parts && Array.isArray(item.parts)) {
            const text = item.parts.map(p => p.text).join('');
            const role = item.role === 'model' ? 'assistant' : 'user';
            return { role, content: text };
          }
          return item;
        });
        

      }
    } catch (e) { /* ignore */ }
  }

  // ===== KHỞI TẠO KHI DOM READY =====
  function initChatbox() {
    // Đợi products được load xong (từ script.js)
    const checkProducts = () => {
      if (typeof products !== 'undefined') {
        initChatboxHTML();
      } else {
        setTimeout(checkProducts, 500);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkProducts);
    } else {
      checkProducts();
    }
  }

  initChatbox();

})();

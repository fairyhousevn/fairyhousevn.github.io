// =========================================================
// 🚀 CẤU HÌNH GOOGLE SHEET
// =========================================================
// Hướng dẫn quản lý sản phẩm bằng Google Sheet:
// 1. Tạo Google Sheet với các tên cột đúng như sau ở Dòng 1:
//    id | name | code | priceNum | oldPrice | img | category | requiresModel | description | stock | sold
// 2. Ý nghĩa các cột:
//    - id: Số thứ tự (1, 2, 3...)
//    - name: Tên sản phẩm
//    - code: Mã sản phẩm (VD: OL.01, MK.01)
//    - priceNum: Giá bán (chỉ nhập số, VD: 89000)
//    - oldPrice: Giá cũ để gạch ngang (VD: 120.000₫) - Để trống nếu không sale
//    - img: Link ảnh sản phẩm (nhiều ảnh cách nhau bằng dấu phẩy)
//    - category: Điền "Mới", "Phụ Kiện", "Móc Khoá", "Quà Lưu Niệm"
//    - requiresModel: TRUE nếu bắt buộc chọn dòng máy, FALSE nếu không
//    - description: Mô tả sản phẩm
//    - stock: Tổng số lượng sản phẩm (VD: 100)
//    - sold: Số lượng đã bán (VD: 20) -> Số còn lại = stock - sold
// 3. Chọn Tệp -> Chia sẻ -> Công bố lên web -> CSV -> Copy Link dán vào dưới:

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRPIWIkBG6CUr-DtynitymDAlgFKThimrMHIK5rTpakdq0Gi7xz8zMuNBarecNSJ8FDq7AGkRHk9NGE/pub?output=csv"; 

// =========================================================
// DỮ LIỆU MẪU
// =========================================================
const sampleProducts = [
  { id: 1, name: "Kẹp Tóc Nơ Bướm Đính Đá", code: "PK.01", price: "45.000₫", priceNum: 45000, oldPrice: "65.000₫", sale: true, img: "product_image.jpg", category: "Mới", requiresModel: false, description: "Kẹp tóc nơ bướm đính đá lấp lánh, xinh xắn cho các nàng.", stock: 100, sold: 15 },
  { id: 2, name: "Dây Buộc Tóc Hoa Hồng", code: "PK.02", price: "25.000₫", priceNum: 25000, oldPrice: "40.000₫", sale: true, img: "product_image.jpg", category: "Phụ Kiện", requiresModel: false, description: "Dây buộc tóc hoa hồng dễ thương, chất liệu cao cấp.", stock: 50, sold: 20 },
  { id: 3, name: "Móc Khoá Capybara Bóp Kêu", code: "MK.01", price: "35.000₫", priceNum: 35000, oldPrice: "50.000₫", sale: true, img: "product_image.jpg", category: "Móc Khoá", requiresModel: false, description: "Móc khoá Capybara bóp kêu cute xỉu.", stock: 200, sold: 45 },
  { id: 4, name: "Quả Cầu Tuyết Tình Yêu", code: "QLN.01", price: "120.000₫", priceNum: 120000, oldPrice: "150.000₫", sale: true, img: "product_image.jpg", category: "Quà Lưu Niệm", requiresModel: false, description: "Quả cầu tuyết lung linh đẹp mắt. Có đèn LED đổi màu.", stock: 20, sold: 5 }
];

let products = [];
let cart = [];
let currentSelectedProduct = null;
let galleryIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

// =========================================================
// FETCH SHEET VÀ RENDER
// =========================================================
async function initApp() {
  const loading = document.getElementById('loadingOverlay');
  loading.querySelector('p').textContent = "Đang tải dữ liệu sản phẩm...";
  loading.classList.add('show');
  
  try {
    if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL.trim() === "") {
      products = [...sampleProducts];
    } else {
      await new Promise((resolve, reject) => {
        const noCacheUrl = GOOGLE_SHEET_CSV_URL + "&t=" + new Date().getTime();
        Papa.parse(noCacheUrl, {
          download: true, header: true, skipEmptyLines: true,
          complete: function(results) {
            // Tìm ID lớn nhất hiện tại để làm cơ sở tự tăng ID cho hàng bị thiếu ID
            let maxId = 0;
            results.data.forEach(row => {
              const val = parseInt(row.id);
              if (!isNaN(val) && val > maxId) maxId = val;
            });
            
            let tempId = maxId;
            const validRows = results.data.filter(row => {
              const name = row['Sản Phẩm'] || row.name || "";
              return name.trim() !== "";
            });

            products = validRows.map((row, index) => {
              let id = parseInt(row.id);
              if (isNaN(id)) {
                tempId++;
                id = tempId;
              }

              const rawPrice = row['Giá'] || row.priceNum || "0";
              const priceNum = parseInt(String(rawPrice).replace(/\D/g, '')) || 0;
              
              let imgs = [];
              const rawImg = row['Ảnh'] || row.img;
              if (rawImg) imgs = rawImg.split(',').map(url => url.trim()).filter(url => url);
              if (imgs.length === 0) imgs = ["product_image.jpg"];
              
              const totalStock = parseInt(row['hàng tồn kho'] || row.stock) || 0;
              const sold = parseInt(row['hàng đã bán'] || row.sold) || 0;

              let rawCode = (row.Code || row.code || "").trim();
              let finalCat = "Phụ Kiện";
              let code = "";

              const lowerCode = rawCode.toLowerCase();
              if (lowerCode.includes("móc khóa") || lowerCode.includes("móc khoá") || lowerCode.includes("moc khoa")) {
                finalCat = "Móc Khoá";
                code = `MK.${String(id).padStart(2, '0')}`;
              } else if (lowerCode.includes("quà lưu niệm") || lowerCode.includes("qua luu niem") || lowerCode.includes("quà")) {
                finalCat = "Quà Lưu Niệm";
                code = `QLN.${String(id).padStart(2, '0')}`;
              } else if (lowerCode.includes("phụ kiện") || lowerCode.includes("phu kien") || lowerCode.includes("xinh")) {
                finalCat = "Phụ Kiện";
                code = `PK.${String(id).padStart(2, '0')}`;
              } else {
                // Hỗ trợ nếu dùng mã ngắn trực tiếp (ví dụ: PK.01, MK.02, QL.03)
                let upperCode = rawCode.toUpperCase();
                if (upperCode.includes("OP") || upperCode.includes("PK")) {
                  finalCat = "Phụ Kiện";
                } else if (upperCode.includes("MK")) {
                  finalCat = "Móc Khoá";
                } else if (upperCode.includes("QL")) {
                  finalCat = "Quà Lưu Niệm";
                } else {
                  finalCat = "Phụ Kiện";
                }
                code = rawCode || `SP.${id}`;
              }
              
              let chiTiet = (row['Chi Tiết'] || "").trim().toLowerCase();
              let isNew = chiTiet === "mới" || chiTiet === "new";
              let oldPrice = (row['Giảm Giá'] || row.oldPrice || "").trim();
              let isSale = chiTiet === "sale" || oldPrice !== "";

              let name = row['Sản Phẩm'] || row.name || "Sản phẩm không tên";
              let requiresModel = false;

              return {
                id: id,
                name: name,
                code: code,
                price: priceNum.toLocaleString('vi-VN') + "₫",
                priceNum: priceNum,
                oldPrice: oldPrice,
                sale: isSale,
                isNew: isNew,
                img: imgs[0],
                images: imgs,
                category: finalCat,
                requiresModel: requiresModel,
                description: row['Thông Tin Sản Phẩm'] || row.description || "Sản phẩm chất lượng từ Fairy House.",
                stock: totalStock,
                sold: sold
              };
            });
            resolve();
          },
          error: function(err) { console.error("Lỗi Google Sheet:", err); reject(err); }
        });
      });
    }
  } catch (error) {
    alert("Không thể tải dữ liệu từ Google Sheet. Tạm thời dùng dữ liệu mẫu.");
    products = [...sampleProducts];
  } finally {
    loading.classList.remove('show');
    loading.querySelector('p').textContent = "Đang xử lý đơn hàng...";
    renderAllProducts(products);
    updateCartUI();
    createHearts();
  }
}

function generateProductHTML(p) {
  const remaining = p.stock - p.sold;
  const isOutOfStock = remaining <= 0;
  
  return `
    <div class="product-card" onclick="openProductModal(${p.id})">
      ${(p.isNew || p.category === 'Mới') ? '<span class="tag-new">MỚI ✨</span>' : ''}
      ${p.sale ? '<span class="tag-sale">SALE 🔥</span>' : ''}
      <div class="product-img">
        <div class="product-badges-bottom">
          <div class="product-comment-badge card-comment-${p.id}" style="display:none;"><i class="fa-solid fa-comment-dots"></i> <span>0</span></div>
          <div class="product-like-badge card-like-${p.id}" style="display:none;"><i class="fa-solid fa-heart"></i> <span>0</span></div>
        </div>
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${isOutOfStock ? '<div class="out-of-stock-overlay">HẾT HÀNG</div>' : ''}
      </div>
      <div class="product-info">
        <h3>${p.code} - ${p.name}</h3>
        <div class="product-price">
          <span class="price-current">${p.price}</span>
          ${p.oldPrice ? `<span class="price-old">${p.oldPrice}</span>` : ''}
        </div>
        <div class="product-stats">
          <span class="stat-sold">Đã bán ${p.sold}</span>
          <span class="stat-stock">${isOutOfStock ? 'Hết hàng' : `Còn ${remaining}`}</span>
        </div>
        <div class="product-actions">
          <button class="btn-cart ${isOutOfStock ? 'btn-disabled' : ''}" onclick="event.stopPropagation(); ${isOutOfStock ? '' : `openProductModal(${p.id})`}">
            <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Hết hàng' : 'Chọn Mua'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAllProducts(productList) {
  const cats = { 
    'Mới': 'grid-new', 
    'Phụ Kiện': 'grid-accessory', 
    'Móc Khoá': 'grid-keychain', 
    'Quà Lưu Niệm': 'grid-souvenir' 
  };
  const sections = { 
    'Mới': 'section-new', 
    'Phụ Kiện': 'section-accessory', 
    'Móc Khoá': 'section-keychain', 
    'Quà Lưu Niệm': 'section-souvenir' 
  };
  
  for (const [cat, gridId] of Object.entries(cats)) {
    const items = cat === 'Mới' 
      ? productList.filter(p => p.isNew || p.category === 'Mới') 
      : productList.filter(p => p.category === cat);
    const grid = document.getElementById(gridId);
    if (grid) grid.innerHTML = items.map(generateProductHTML).join('');
    
    const section = document.getElementById(sections[cat]);
    if (section) section.style.display = items.length > 0 ? 'block' : 'none';
  }
  document.getElementById('no-results').style.display = productList.length === 0 ? 'block' : 'none';
  listenToCardInteractions(productList);
}

// ===== TÌM KIẾM =====
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) { renderAllProducts(products); return; }
  renderAllProducts(products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)));
});

// ===== PRODUCT MODAL WITH SWIPEABLE GALLERY =====
function openProductModal(id) {
  currentSelectedProduct = products.find(x => x.id === id);
  if (!currentSelectedProduct) return;
  galleryIndex = 0;

  document.getElementById('modalName').textContent = `${currentSelectedProduct.code} - ${currentSelectedProduct.name}`;
  
  const remaining = currentSelectedProduct.stock - currentSelectedProduct.sold;
  const isOutOfStock = remaining <= 0;
  
  let priceHtml = `<span class="price-current">${currentSelectedProduct.price}</span>`;
  if (currentSelectedProduct.oldPrice) {
    priceHtml += ` <span class="price-old">${currentSelectedProduct.oldPrice}</span>`;
  }
  document.getElementById('modalPrice').innerHTML = priceHtml;
  
  const stockHtml = `
    <div style="font-size: 0.95rem; margin-top: 8px; color: var(--gray-600);">
      🔥 Đã bán: <b>${currentSelectedProduct.sold}</b> | 📦 Kho: <b style="color: ${isOutOfStock ? 'red' : 'var(--primary-600)'}">${isOutOfStock ? 'HẾT HÀNG' : 'Còn ' + remaining}</b>
    </div>
  `;
  document.getElementById('modalPrice').innerHTML += stockHtml;

  document.getElementById('modalDescText').textContent = currentSelectedProduct.description;
  
  const btnAddToCart = document.getElementById('btnAddToCart');
  const btnBuyNow = document.getElementById('btnBuyNow');
  
  if (isOutOfStock) {
    btnAddToCart.disabled = true;
    btnAddToCart.style.opacity = '0.5';
    btnAddToCart.innerHTML = '<i class="fa-solid fa-ban"></i> Đã Hết Hàng';
    btnBuyNow.disabled = true;
    btnBuyNow.style.opacity = '0.5';
  } else {
    btnAddToCart.disabled = false;
    btnAddToCart.style.opacity = '1';
    btnAddToCart.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ hàng';
    btnBuyNow.disabled = false;
    btnBuyNow.style.opacity = '1';
  }

  const images = currentSelectedProduct.images || [currentSelectedProduct.img];
  const slidesEl = document.getElementById('gallerySlides');
  const dotsEl = document.getElementById('galleryDots');

  slidesEl.innerHTML = images.map(url => `<img src="${url}" alt="${currentSelectedProduct.name}">`).join('');
  dotsEl.innerHTML = images.map((_, i) => `<button class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`).join('');

  const showNav = images.length > 1;
  document.getElementById('galleryPrev').style.display = showNav ? 'flex' : 'none';
  document.getElementById('galleryNext').style.display = showNav ? 'flex' : 'none';
  dotsEl.style.display = showNav ? 'flex' : 'none';
  updateGallery();

  if (currentSelectedProduct.requiresModel) {
    document.getElementById('modelSelectGroup').style.display = "block";
    document.getElementById('phoneModelSelect').value = "";
  } else {
    document.getElementById('modelSelectGroup').style.display = "none";
  }


  // Load likes & comments for this product
  loadProductInteractions(id);

  document.getElementById('modelError').style.display = "none";
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function updateGallery() {
  const slidesEl = document.getElementById('gallerySlides');
  slidesEl.style.transform = `translateX(-${galleryIndex * 100}%)`;
  document.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === galleryIndex));
}

function goToSlide(i) { galleryIndex = i; updateGallery(); }

document.getElementById('galleryPrev').addEventListener('click', () => {
  const images = currentSelectedProduct?.images || [];
  if (images.length <= 1) return;
  galleryIndex = (galleryIndex - 1 + images.length) % images.length;
  updateGallery();
});
document.getElementById('galleryNext').addEventListener('click', () => {
  const images = currentSelectedProduct?.images || [];
  if (images.length <= 1) return;
  galleryIndex = (galleryIndex + 1) % images.length;
  updateGallery();
});

// Touch swipe support
const swipeContainer = document.getElementById('gallerySwipeContainer');
swipeContainer.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
swipeContainer.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  const images = currentSelectedProduct?.images || [];
  if (images.length <= 1) return;
  if (Math.abs(diff) > 50) {
    if (diff > 0) galleryIndex = (galleryIndex + 1) % images.length;
    else galleryIndex = (galleryIndex - 1 + images.length) % images.length;
    updateGallery();
  }
});

function closeProductModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.body.style.overflow = '';
  currentSelectedProduct = null;
}

document.getElementById('modalClose').addEventListener('click', closeProductModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeProductModal();
});

// ===== VALIDATE MODEL & GET CART ITEM =====
function validateAndGetCartItem() {
  let selectedModel = "Mặc định";
  if (currentSelectedProduct.requiresModel) {
    selectedModel = document.getElementById('phoneModelSelect').value;
    if (!selectedModel) { document.getElementById('modelError').style.display = "block"; return null; }
  }
  document.getElementById('modelError').style.display = "none";
  return {
    id: currentSelectedProduct.id, code: currentSelectedProduct.code,
    name: currentSelectedProduct.name, price: currentSelectedProduct.price,
    priceNum: currentSelectedProduct.priceNum, img: currentSelectedProduct.img,
    model: selectedModel, cartId: `${currentSelectedProduct.id}_${selectedModel}`,
    quantity: 1, requiresModel: currentSelectedProduct.requiresModel,
    description: currentSelectedProduct.description
  };
}

// ===== ADD TO CART =====
document.getElementById('btnAddToCart').addEventListener('click', () => {
  const cartItem = validateAndGetCartItem();
  if (!cartItem) return;
  const existing = cart.findIndex(item => item.cartId === cartItem.cartId);
  if (existing > -1) cart[existing].quantity += 1;
  else cart.push(cartItem);
  closeProductModal();
  updateCartUI();
  openCartSidebar();
});

// ===== BUY NOW =====
document.getElementById('btnBuyNow').addEventListener('click', () => {
  const cartItem = validateAndGetCartItem();
  if (!cartItem) return;
  const existing = cart.findIndex(item => item.cartId === cartItem.cartId);
  if (existing > -1) cart[existing].quantity += 1;
  else cart.push(cartItem);
  closeProductModal();
  updateCartUI();
  openCheckoutModal();
});

// ===== CART =====
function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('headerCartCount').textContent = totalItems;
  document.getElementById('floatCartCount').textContent = totalItems;
  const container = document.getElementById('cartItemsContainer');
  const totalEl = document.getElementById('cartTotalPrice');
  const checkoutBtn = document.getElementById('btnOpenCheckout');

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart"><i class="fa-solid fa-cart-arrow-down" style="font-size:3rem;margin-bottom:15px;color:var(--primary-300);"></i><br>Giỏ hàng đang trống</div>';
    totalEl.textContent = '0₫';
    checkoutBtn.style.display = 'none';
  } else {
    checkoutBtn.style.display = 'flex';
    let total = 0;
    container.innerHTML = cart.map(item => {
      total += item.priceNum * item.quantity;
      return `<div class="cart-item">
        <img src="${item.img}" class="cart-item-img" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.code} - ${item.name}</div>
          ${item.requiresModel ? `<div class="cart-item-model">📱 ${item.model}</div>` : ''}
          <div class="cart-item-bottom">
            <div class="cart-item-price">${formatCurrency(item.priceNum)}</div>
            <div class="cart-qty">
              <button type="button" class="btn-qty" onclick="changeQty('${item.cartId}', -1)">-</button>
              <span>${item.quantity}</span>
              <button type="button" class="btn-qty" onclick="changeQty('${item.cartId}', 1)">+</button>
            </div>
          </div>
        </div>
        <button type="button" class="btn-remove-item" onclick="removeItem('${item.cartId}')"><i class="fa-solid fa-trash-can"></i></button>
      </div>`;
    }).join('');
    totalEl.textContent = formatCurrency(total);
  }
}

function changeQty(cartId, delta) {
  const item = cart.find(x => x.cartId === cartId);
  if (item) { item.quantity += delta; if (item.quantity <= 0) cart = cart.filter(x => x.cartId !== cartId); updateCartUI(); }
}
function removeItem(cartId) { cart = cart.filter(x => x.cartId !== cartId); updateCartUI(); }
function formatCurrency(num) { return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "₫"; }

// ===== CART SIDEBAR =====
function openCartSidebar() {
  document.getElementById('cartSidebar').classList.add('show');
  document.getElementById('cartOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeCartSidebar() {
  document.getElementById('cartSidebar').classList.remove('show');
  document.getElementById('cartOverlay').classList.remove('show');
  document.body.style.overflow = '';
}
document.getElementById('headerCartBtn').addEventListener('click', (e) => { e.preventDefault(); openCartSidebar(); });
document.getElementById('floatCartBtn').addEventListener('click', openCartSidebar);
document.getElementById('closeCartBtn').addEventListener('click', closeCartSidebar);
document.getElementById('cartOverlay').addEventListener('click', closeCartSidebar);

// ===== CHECKOUT MODAL =====
document.getElementById('btnOpenCheckout').addEventListener('click', () => { openCheckoutModal(); });

function openCheckoutModal() {
  closeCartSidebar();
  // Build summary
  const summaryEl = document.getElementById('checkoutSummary');
  const totalMoney = cart.reduce((s, i) => s + i.priceNum * i.quantity, 0);
  summaryEl.innerHTML = cart.map(item => {
    const m = item.requiresModel ? ` (${item.model})` : '';
    return `<div class="summary-item"><span>${item.code} - ${item.name}${m} x${item.quantity}</span><span>${formatCurrency(item.priceNum * item.quantity)}</span></div>`;
  }).join('') + `<div class="summary-total"><span>Tổng cộng:</span><span>${formatCurrency(totalMoney)}</span></div>`;
  
  document.getElementById('checkoutModalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  document.getElementById('checkoutModalOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

document.getElementById('checkoutModalClose').addEventListener('click', closeCheckoutModal);
document.getElementById('checkoutModalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCheckoutModal();
});

// ===== VIETNAM PROVINCES API =====
let provincesData = [];
async function loadProvinces() {
  try {
    const res = await fetch('https://provinces.open-api.vn/api/?depth=2');
    provincesData = await res.json();
    const select = document.getElementById('custProvince');
    provincesData.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    provincesData.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      opt.dataset.code = p.code;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Không thể tải danh sách tỉnh:', err);
  }
}

document.getElementById('custProvince').addEventListener('change', function() {
  const districtSelect = document.getElementById('custDistrict');
  districtSelect.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
  const selectedOpt = this.options[this.selectedIndex];
  const code = selectedOpt?.dataset?.code;
  if (!code) return;
  const province = provincesData.find(p => p.code == code);
  if (province && province.districts) {
    province.districts.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    province.districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = d.name;
      districtSelect.appendChild(opt);
    });
  }
});

loadProvinces();

// ===== CHECKOUT SUBMIT =====
document.getElementById('checkoutForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (cart.length === 0) { alert('Giỏ hàng trống!'); return; }

  const custName = document.getElementById('custName').value.trim();
  const custPhone = document.getElementById('custPhone').value.trim();
  const custEmail = document.getElementById('custEmail').value.trim();
  const custProvince = document.getElementById('custProvince').value;
  const custDistrict = document.getElementById('custDistrict').value;
  const custAddress = document.getElementById('custAddress').value.trim();
  const custNote = document.getElementById('custNote').value.trim();

  if (!custName || !custPhone || !custProvince || !custDistrict || !custAddress) {
    alert('Vui lòng điền đầy đủ các trường bắt buộc!');
    return;
  }

  const totalMoney = cart.reduce((sum, item) => sum + (item.priceNum * item.quantity), 0);
  const itemsText = cart.map((item, i) => {
    const m = item.requiresModel ? ` | Model: ${item.model}` : '';
    return `${i+1}. [${item.code}] ${item.name}${m} | SL: ${item.quantity} | Giá: ${formatCurrency(item.priceNum)}`;
  }).join('\n');

  const formattedOrder = `🛍️ ĐƠN HÀNG MỚI TỪ FAIRY HOUSE
-----------------------------------
👤 Khách hàng: ${custName}
📱 Số điện thoại: ${custPhone}
📧 Email: ${custEmail ? custEmail : 'Không có'}
📍 Địa chỉ: ${custAddress}, ${custDistrict}, ${custProvince}
📝 Ghi chú: ${custNote ? custNote : 'Không có'}
-----------------------------------
📦 DANH SÁCH SẢN PHẨM:
${itemsText}
-----------------------------------
💰 TỔNG CỘNG: ${formatCurrency(totalMoney)}
🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`;

  const orderData = {
    customerName: custName, phone: custPhone, email: custEmail,
    province: custProvince, district: custDistrict,
    address: custAddress, note: custNote,
    totalAmount: formatCurrency(totalMoney),
    items: itemsText, orderTime: new Date().toLocaleString('vi-VN'), rawCart: cart,
    fullMessage: formattedOrder
  };

  closeCheckoutModal();
  document.getElementById('loadingOverlay').classList.add('show');
  fetch('https://aleta-voluted-suppliantly.ngrok-free.dev/webhook/don-hang-tien-house', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  })
  .then(() => { document.getElementById('loadingOverlay').classList.remove('show'); showSuccessModal(); })
  .catch(() => { document.getElementById('loadingOverlay').classList.remove('show'); showSuccessModal(); });
});

function showSuccessModal() {
  document.getElementById('checkoutForm').reset();
  document.getElementById('custDistrict').innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
  cart = [];
  updateCartUI();
  document.getElementById('successModalOverlay').classList.add('show');
}
function closeSuccessModal() { document.getElementById('successModalOverlay').classList.remove('show'); }

// ===== HIỆU ỨNG =====
function createHearts() {
  const container = document.getElementById('floatingHearts');
  const hearts = ['✨', '💖', '🩷', '💗', '✨', '🎀', '🌸', '💝'];
  for (let i = 0; i < 15; i++) {
    const span = document.createElement('span');
    span.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDuration = (6 + Math.random() * 8) + 's';
    span.style.animationDelay = Math.random() * 10 + 's';
    span.style.fontSize = (14 + Math.random() * 18) + 'px';
    container.appendChild(span);
  }
}

const scrollBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => { scrollBtn.classList.toggle('show', window.scrollY > 400); });
scrollBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) { closeCartSidebar(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// START APP
initApp();

// =========================================================
// FIREBASE & REAL-TIME SYSTEM (LIKES / COMMENTS)
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyCNmFRXonf1CVQ8jEjizP01kxO6LUJYgjE",
  authDomain: "velvety-rock-492621-i6.firebaseapp.com",
  databaseURL: "https://velvety-rock-492621-i6-default-rtdb.firebaseio.com/",
  projectId: "velvety-rock-492621-i6",
  storageBucket: "velvety-rock-492621-i6.firebasestorage.app",
  messagingSenderId: "852386350152",
  appId: "1:852386350152:web:e819cf085cb15572d1447d"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

let currentUser = JSON.parse(localStorage.getItem('tienhouse_user') || 'null');
let currentLikesRef = null;
let currentCommentsRef = null;

function updateLoginUI() {
  const loginWrapper = document.getElementById('loginButtonsContainer');
  const avatarWrapper = document.getElementById('userAvatarWrapper');
  if (currentUser) {
    if (loginWrapper) loginWrapper.style.display = 'none';
    avatarWrapper.style.display = 'flex';
    document.getElementById('userAvatar').src = currentUser.picture;
    document.getElementById('userDisplayName').textContent = currentUser.name.split(' ')[0];
    document.getElementById('commentLoginPrompt').style.display = 'none';
    document.getElementById('commentForm').style.display = 'flex';
    document.getElementById('commentAvatar').src = currentUser.picture;
  } else {
    if (loginWrapper) loginWrapper.style.display = 'flex';
    avatarWrapper.style.display = 'none';
    document.getElementById('commentLoginPrompt').style.display = 'block';
    document.getElementById('commentForm').style.display = 'none';
  }
}


function handleGoogleLogin() {
  if (typeof google === 'undefined') { alert('Google Sign-In đang tải, vui lòng thử lại!'); return; }
  
  const client = google.accounts.oauth2.initTokenClient({
    client_id: '852386350152-713354qvcnie2sqfkjeambda44j45jgf.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        .then(res => res.json())
        .then(payload => {
          currentUser = { 
            name: payload.name, 
            email: payload.email, 
            picture: payload.picture, 
            sub: payload.sub 
          };
          localStorage.setItem('tienhouse_user', JSON.stringify(currentUser));
          updateLoginUI();
          if (currentSelectedProduct) loadProductInteractions(currentSelectedProduct.id);
        })
        .catch(err => {
          console.error('Lỗi lấy thông tin user:', err);
          alert('Có lỗi xảy ra khi lấy thông tin. Vui lòng thử lại.');
        });
      }
    },
  });
  
  client.requestAccessToken();
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('tienhouse_user');
  updateLoginUI();
  if (currentSelectedProduct) loadProductInteractions(currentSelectedProduct.id);
}

// ===== LIKES =====
function toggleLike() {
  if (!currentUser) { handleGoogleLogin(); return; }
  if (!currentSelectedProduct) return;
  const pid = currentSelectedProduct.id;
  const likeRef = database.ref(`products/${pid}/likes/${currentUser.sub}`);
  
  likeRef.once('value').then(snapshot => {
    if (snapshot.exists()) {
      likeRef.remove(); // Un-like
    } else {
      likeRef.set({ name: currentUser.name }); // Like
    }
  });
}

// ===== COMMENTS =====
function postComment() {
  if (!currentUser || !currentSelectedProduct) return;
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;
  
  const pid = currentSelectedProduct.id;
  const commentsRef = database.ref(`products/${pid}/comments`);
  
  commentsRef.push({
    sub: currentUser.sub,
    name: currentUser.name,
    picture: currentUser.picture,
    text: text,
    time: firebase.database.ServerValue.TIMESTAMP
  });
  
  input.value = '';
}

// ===== REAL-TIME LISTENERS =====
function loadProductInteractions(productId) {
  updateLoginUI();
  
  // Xoá listeners cũ nếu có
  if (currentLikesRef) currentLikesRef.off('value');
  if (currentCommentsRef) currentCommentsRef.off('value');
  
  // Listen for Likes
  currentLikesRef = database.ref(`products/${productId}/likes`);
  currentLikesRef.on('value', (snapshot) => {
    const likesData = snapshot.val() || {};
    const likesCount = Object.keys(likesData).length;
    const isLiked = currentUser ? !!likesData[currentUser.sub] : false;
    
    const btn = document.getElementById('btnLikeProduct');
    const icon = document.getElementById('likeIcon');
    const text = document.getElementById('likeText');
    
    btn.classList.toggle('liked', isLiked);
    icon.className = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    text.textContent = isLiked ? 'Đã thích' : 'Thích';
    document.getElementById('likeCount').textContent = likesCount + ' lượt thích';
  });
  
  // Listen for Comments
  currentCommentsRef = database.ref(`products/${productId}/comments`);
  currentCommentsRef.on('value', (snapshot) => {
    const commentsData = snapshot.val() || {};
    const commentsArray = Object.keys(commentsData).map(key => commentsData[key]);
    
    // Sort theo thời gian (cũ nhất -> mới nhất)
    commentsArray.sort((a, b) => a.time - b.time);
    
    const list = document.getElementById('commentsList');
    document.getElementById('commentCount').textContent = commentsArray.length;
    
    if (commentsArray.length === 0) {
      list.innerHTML = '<div class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</div>';
    } else {
      list.innerHTML = commentsArray.map(c => {
        const time = new Date(c.time);
        const timeStr = time.toLocaleDateString('vi-VN') + ' ' + time.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'});
        return `<div class="comment-item">
          <img src="${c.picture}" class="comment-user-avatar" alt="" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=f74d7b&color=fff&size=32'">
          <div class="comment-body">
            <div class="comment-author">${c.name}</div>
            <div class="comment-text">${c.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
            <div class="comment-time">${timeStr}</div>
          </div>
        </div>`;
      }).join('');
      // Cuộn xuống dòng mới nhất
      list.scrollTop = list.scrollHeight;
    }
  });
}

// Enter to post comment
document.getElementById('commentInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') postComment();
});

// Sync likes and comments on product cards
const listeningProducts = new Set();
function listenToCardInteractions(productList) {
  if (typeof database === 'undefined') return;
  productList.forEach(p => {
    if (!listeningProducts.has(p.id)) {
      listeningProducts.add(p.id);
      
      // Listen for likes
      database.ref(`products/${p.id}/likes`).on('value', snap => {
        const likes = snap.val() || {};
        const count = Object.keys(likes).length;
        document.querySelectorAll(`.card-like-${p.id}`).forEach(el => {
          if (count > 0) {
            el.style.display = 'flex';
            el.querySelector('span').textContent = count;
          } else {
            el.style.display = 'none';
          }
        });
      });
      
      // Listen for comments
      database.ref(`products/${p.id}/comments`).on('value', snap => {
        const comments = snap.val() || {};
        const count = Object.keys(comments).length;
        document.querySelectorAll(`.card-comment-${p.id}`).forEach(el => {
          if (count > 0) {
            el.style.display = 'flex';
            el.querySelector('span').textContent = count;
          } else {
            el.style.display = 'none';
          }
        });
      });
    }
  });
}

// Init login state on load
updateLoginUI();

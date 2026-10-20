const productSelect = document.getElementById('page-product');
const requestedProduct = new URLSearchParams(window.location.search).get('product');

const CART_STORAGE_KEY = 'doratechno-cart';

const readCart = () => {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(savedCart)) return [];

    return savedCart.filter((item) =>
      item && typeof item.id === 'string' && typeof item.name === 'string' &&
      Number.isFinite(Number(item.price)) && Number(item.quantity) > 0
    ).map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image: String(item.image || ''),
      url: String(item.url || 'catalog.html'),
      quantity: Math.min(10, Math.max(1, Number(item.quantity)))
    }));
  } catch {
    return [];
  }
};

let cart = readCart();

const saveCart = () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
};

const formatPrice = (price) => `${new Intl.NumberFormat('ru-RU').format(price)} ₽`;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const getProductFromButton = (button) => {
  const card = button.closest('.product-card, [data-category]');
  const detail = button.closest('.product-detail');
  const product = card || detail;
  if (!product) return null;

  const orderLink = product.querySelector('a[href*="order.html?product="]');
  const productId = card?.dataset.product || button.dataset.product || new URL(orderLink?.href || location.href).searchParams.get('product');
  const title = product.querySelector('.product-card__title, h1, .card-body h3');
  const price = product.querySelector('.product-card__price, .product-detail__price, .card-body .fs-4');
  const image = product.querySelector('img');
  const productLink = card?.querySelector('.product-card__title a, .card-body a[href^="product"]');

  if (!productId || !title || !price || !image) return null;

  const priceNode = price.cloneNode(true);
  priceNode.querySelectorAll('del').forEach((oldPrice) => oldPrice.remove());
  const productPrice = Number(card?.dataset.price) || Number(priceNode.textContent.replace(/\D/g, ''));

  return {
    id: productId,
    name: title.textContent.trim(),
    price: productPrice,
    image: image.getAttribute('src'),
    url: productLink?.getAttribute('href') || location.pathname.split('/').pop() || 'index.html',
    quantity: 1
  };
};

const updateCartIndicators = () => {
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  document.querySelectorAll('a[href="cart.html"]').forEach((link) => {
    let badge = link.querySelector('.cart-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-count badge rounded-pill ms-1';
      badge.setAttribute('aria-label', 'Товаров в корзине');
      link.append(badge);
    }

    badge.textContent = totalQuantity;
    badge.hidden = totalQuantity === 0;
  });
};

const addProductToCart = (product) => {
  const savedProduct = cart.find((item) => item.id === product.id);
  if (savedProduct) {
    savedProduct.quantity = Math.min(10, savedProduct.quantity + 1);
  } else {
    cart.push(product);
  }
  saveCart();
  updateCartIndicators();
};

document.querySelectorAll('button').forEach((button) => {
  if (!['В корзину', 'Добавить в корзину'].includes(button.textContent.trim())) return;

  button.dataset.cartAdd = '';
  button.addEventListener('click', () => {
    const product = getProductFromButton(button);
    if (!product) return;

    addProductToCart(product);
    const originalText = button.textContent;
    button.textContent = 'Добавлено';
    button.classList.add('active');
    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('active');
    }, 1200);
  });
});

const cartList = document.querySelector('[data-cart-list]');

const renderCart = () => {
  updateCartIndicators();
  if (!cartList) return;

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const quantity = document.querySelector('[data-cart-quantity]');
  const subtotal = document.querySelector('[data-cart-subtotal]');
  const checkout = document.querySelector('[data-cart-checkout]');
  const clearButton = document.querySelector('[data-cart-clear]');

  if (quantity) quantity.textContent = totalQuantity;
  if (subtotal) subtotal.textContent = formatPrice(totalPrice);
  if (clearButton) clearButton.hidden = cart.length === 0;
  if (checkout) {
    checkout.classList.toggle('disabled', cart.length === 0);
    checkout.setAttribute('aria-disabled', String(cart.length === 0));
    checkout.tabIndex = cart.length === 0 ? -1 : 0;
  }

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="cart-empty card border-0 shadow-sm p-4 p-md-5 text-center">
        <h2 class="h4">Корзина пока пуста</h2>
        <p class="text-secondary mb-4">Добавьте товары из каталога — они появятся здесь.</p>
        <a class="btn btn-primary align-self-center" href="catalog.html">Перейти в каталог</a>
      </div>`;
    return;
  }

  cartList.innerHTML = cart.map((item) => `
    <article class="cart-item card shadow-sm" data-cart-id="${escapeHtml(item.id)}">
      <a class="cart-item__image" href="${escapeHtml(item.url)}">
        <img alt="${escapeHtml(item.name)}" src="${escapeHtml(item.image)}">
      </a>
      <div class="cart-item__details">
        <h2 class="cart-item__title"><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a></h2>
        <p class="text-secondary mb-2">В наличии</p>
        <span class="cart-item__quantity-label small fw-semibold">Количество</span>
        <div class="cart-item__quantity-controls input-group input-group-sm mt-1">
          <button class="btn btn-outline-secondary" data-cart-action="decrease" type="button" aria-label="Уменьшить количество ${escapeHtml(item.name)}">−</button>
          <input class="cart-item__quantity form-control text-center" aria-label="Количество ${escapeHtml(item.name)}" max="10" min="1" readonly type="number" value="${item.quantity}">
          <button class="btn btn-outline-secondary" data-cart-action="increase" type="button" aria-label="Увеличить количество ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
      <div class="cart-item__aside">
        <p class="cart-item__price">${formatPrice(item.price * item.quantity)}</p>
        <button class="btn btn-sm btn-link text-danger p-0" data-cart-action="remove" type="button">Удалить</button>
      </div>
    </article>`).join('');
};

if (cartList) {
  cartList.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-cart-action]');
    const cartItem = event.target.closest('[data-cart-id]');
    if (!actionButton || !cartItem) return;

    const item = cart.find((entry) => entry.id === cartItem.dataset.cartId);
    if (!item) return;

    if (actionButton.dataset.cartAction === 'increase') item.quantity = Math.min(10, item.quantity + 1);
    if (actionButton.dataset.cartAction === 'decrease') item.quantity = Math.max(1, item.quantity - 1);
    if (actionButton.dataset.cartAction === 'remove') cart = cart.filter((entry) => entry.id !== item.id);

    saveCart();
    renderCart();
  });

  document.querySelector('[data-cart-clear]')?.addEventListener('click', () => {
    cart = [];
    saveCart();
    renderCart();
  });
}

const knownProducts = {
  'macbook-air-m2-8gb': { name: 'MacBook Air 13″ M2 8/256 ГБ', price: 79990 },
  'pixel-7-pro': { name: 'Google Pixel 7 Pro 12/128 ГБ', price: 39990 },
  'sony-wh1000xm4': { name: 'Sony WH-1000XM4', price: 19990 },
  'macbook-pro-14-m1': { name: 'MacBook Pro 14″ M1 Pro 16/512 ГБ', price: 119990 },
  'macbook-air-m2-16gb': { name: 'MacBook Air 13″ M2 16/512 ГБ', price: 99990 },
  'iphone-13-pro': { name: 'iPhone 13 Pro 128 ГБ', price: 44990 },
  'galaxy-s23-ultra': { name: 'Samsung Galaxy S23 Ultra 12/512 ГБ', price: 89990 },
  'bose-qc25': { name: 'Bose QuietComfort 25', price: 8990 },
  'airpods-max': { name: 'Apple AirPods Max (Lightning)', price: 39990 }
};

// Correct cart prices saved by older versions, where a sale price and its old price
// could be read together from the same product card.
let cartWasCorrected = false;
cart = cart.map((item) => {
  const product = knownProducts[item.id];
  if (!product || item.price === product.price) return item;
  cartWasCorrected = true;
  return { ...item, name: product.name, price: product.price };
});
if (cartWasCorrected) saveCart();

if (productSelect) {
  let orderItems = cart;

  if (requestedProduct && requestedProduct !== 'cart' && knownProducts[requestedProduct]) {
    const cartItem = cart.find((item) => item.id === requestedProduct);
    orderItems = [{
      id: requestedProduct,
      ...knownProducts[requestedProduct],
      quantity: cartItem?.quantity || 1
    }];
  }

  productSelect.value = orderItems.length
    ? orderItems.map((item) => `${item.name} — ${formatPrice(item.price)} × ${item.quantity}`).join('\n')
    : 'Корзина пуста — добавьте товары из каталога';
  productSelect.dataset.productIds = orderItems.map((item) => item.id).join(',');

  const submitButton = productSelect.form?.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = orderItems.length === 0;
}

renderCart();

const backToTop = document.querySelector('.back-to-top');

if (backToTop) {
  backToTop.addEventListener('click', function (event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('.site-header')?.classList.remove('site-header--hidden');
  });
}

const requestDialog = document.getElementById('request-dialog');

if (requestDialog) {
  document.getElementById('open-request-dialog').addEventListener('click', function () {
    document.getElementById('request-result').hidden = true;
    requestDialog.showModal();
  });

  document.getElementById('close-request-dialog').addEventListener('click', function () {
    requestDialog.close();
  });
}

const form = document.querySelector('[data-order-form]');

if (form) {
  const result = document.getElementById(form.dataset.result);

  form.addEventListener('input', function (event) {
    result.hidden = true;
    if (event.target.willValidate && event.target.checkValidity()) {
      event.target.removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const selectedProducts = productSelect?.value;
    result.hidden = true;
    for (const field of form.elements) {
      field.removeAttribute('aria-invalid');
      if (field.willValidate && !field.checkValidity()) {
        field.setAttribute('aria-invalid', 'true');
      }
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    form.reset();
    if (productSelect && selectedProducts) productSelect.value = selectedProducts;
    if (requestDialog) requestDialog.close();
    result.hidden = false;
    result.focus();
    result.scrollIntoView({ block: 'center' });
  });
}

const mainNavigation = document.getElementById('main-navigation');
const siteHeader = document.querySelector('.site-header');

if (mainNavigation) {
  mainNavigation.insertAdjacentHTML('afterbegin', `
    <div class="offcanvas-header site-nav-panel__header">
      <div>
        <span class="site-nav-panel__eyebrow">ДораТехно</span>
        <h2 class="offcanvas-title">Навигация</h2>
      </div>
      <button class="btn-close" type="button" data-bs-dismiss="offcanvas" aria-label="Закрыть меню"></button>
    </div>
  `);
}

if (mainNavigation) {
  mainNavigation.addEventListener('show.bs.offcanvas', () => {
    siteHeader?.classList.remove('site-header--hidden');
  });

  mainNavigation.addEventListener('click', (event) => {
    const selectedLink = event.target.closest('a');
    if (!selectedLink || !mainNavigation.classList.contains('show')) return;
    window.bootstrap.Offcanvas.getOrCreateInstance(mainNavigation).hide();
  });
}

if (siteHeader) {
  let previousScroll = window.scrollY;
  let scrollFrame;

  window.addEventListener('scroll', () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      const currentScroll = window.scrollY;
      const menuIsOpen = mainNavigation?.classList.contains('show');

      if (!menuIsOpen && currentScroll > 150 && currentScroll > previousScroll + 6) {
        siteHeader.classList.add('site-header--hidden');
      } else if (currentScroll < previousScroll - 6 || currentScroll < 80) {
        siteHeader.classList.remove('site-header--hidden');
      }

      previousScroll = currentScroll;
      scrollFrame = null;
    });
  }, { passive: true });
}

document.querySelectorAll('[data-filter-form]').forEach((filterForm) => {
  const catalog = filterForm.closest('.catalog-category');
  const cards = Array.from(catalog?.querySelectorAll('.catalog-products .product-card') || []);
  const resultCounter = catalog?.querySelector('[data-results-count]');

  const applyFilters = () => {
    const data = new FormData(filterForm);
    const priceFrom = Number(data.get('price-from')) || 0;
    const priceTo = Number(data.get('price-to')) || Number.POSITIVE_INFINITY;
    const groups = new Map();

    for (const [name, value] of data.entries()) {
      if (name === 'price-from' || name === 'price-to') continue;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(String(value));
    }

    let visibleCount = 0;

    cards.forEach((card) => {
      const price = Number(card.dataset.price);
      const tokens = new Set((card.dataset.filters || '').split(' '));
      const matchesPrice = price >= priceFrom && price <= priceTo;
      const matchesGroups = Array.from(groups.values()).every((values) =>
        values.some((value) => tokens.has(value))
      );
      const isVisible = matchesPrice && matchesGroups;

      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (resultCounter) {
      resultCounter.textContent = `Товары · показано ${visibleCount}`;
    }
  };

  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters();
  });

  filterForm.addEventListener('reset', () => window.setTimeout(applyFilters, 0));
});

const categoryFilter = document.querySelector('[data-category-filter]');

if (categoryFilter) {
  const previewCards = document.querySelectorAll('[data-catalog-preview] > [data-category]');

  categoryFilter.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;

    const selectedCategory = button.dataset.category;
    categoryFilter.querySelectorAll('button[data-category]').forEach((item) => {
      const isActive = item === button;
      item.classList.toggle('active', isActive);
      item.classList.toggle('btn-dark', isActive);
      item.classList.toggle('btn-outline-dark', !isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });

    previewCards.forEach((card) => {
      card.hidden = selectedCategory !== 'all' && card.dataset.category !== selectedCategory;
    });
  });
}


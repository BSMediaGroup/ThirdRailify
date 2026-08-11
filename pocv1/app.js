(() => {
  "use strict";

  const page = document.documentElement.dataset.page || "home";
  const assetPrefix = page === "shop" ? "../assets/" : "./assets/";
  const storageKey = "thirdrailify-poc-cart-v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("[data-site-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const primaryNav = document.querySelector("[data-primary-nav]");
  const prototypeFlag = document.querySelector(".prototype-flag");
  const toast = document.querySelector("[data-toast]");
  let toastTimer = 0;
  let lastCartTrigger = null;

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2700);
  }

  function handleHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 14);
  }

  handleHeader();
  window.addEventListener("scroll", handleHeader, { passive: true });

  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!open));
      primaryNav.classList.toggle("is-open", !open);
    });

    primaryNav.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLAnchorElement)) return;
      menuToggle.setAttribute("aria-expanded", "false");
      primaryNav.classList.remove("is-open");
    });

    document.addEventListener("click", (event) => {
      if (!primaryNav.classList.contains("is-open")) return;
      if (primaryNav.contains(event.target) || menuToggle.contains(event.target)) return;
      menuToggle.setAttribute("aria-expanded", "false");
      primaryNav.classList.remove("is-open");
    });
  }

  try {
    if (sessionStorage.getItem("thirdrailify-poc-flag-dismissed") === "1" && prototypeFlag) {
      prototypeFlag.hidden = true;
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts; the notice remains visible.
  }

  document.querySelector("[data-dismiss-prototype]")?.addEventListener("click", () => {
    if (prototypeFlag) prototypeFlag.hidden = true;
    try {
      sessionStorage.setItem("thirdrailify-poc-flag-dismissed", "1");
    } catch {
      // Non-critical prototype preference.
    }
  });

  const revealElements = [...document.querySelectorAll(".reveal")];
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.09, rootMargin: "0px 0px -5%" },
    );
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((surface) => {
      surface.addEventListener("pointermove", (event) => {
        const bounds = surface.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        surface.style.transform = `perspective(1400px) rotateX(${(-y * 2.8).toFixed(2)}deg) rotateY(${(x * 3.6).toFixed(2)}deg)`;
      });
      surface.addEventListener("pointerleave", () => {
        surface.style.transform = "";
      });
    });
  }

  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && !input.checkValidity()) {
        input.reportValidity();
        return;
      }
      showToast("Prototype only — no subscription endpoint is connected.");
      form.reset();
    });
  });

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item.id === "string" && Number.isFinite(Number(item.price)))
        .map((item) => ({
          id: item.id,
          name: String(item.name || "Prototype product"),
          price: Number(item.price),
          image: String(item.image || "thirdrailify-mark.svg").split("/").pop(),
          quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
        }));
    } catch {
      return [];
    }
  }

  let cart = readCart();

  function saveCart() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // The interactive POC still works for the current page even without persistence.
    }
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(value);
  }

  function imagePath(filename) {
    return `${assetPrefix}${String(filename || "thirdrailify-mark.svg").split("/").pop()}`;
  }

  const cartDrawer = document.querySelector("[data-cart-drawer]");
  const cartBackdrop = document.querySelector("[data-cart-backdrop]");
  const cartItems = document.querySelector("[data-cart-items]");
  const cartSubtotal = document.querySelector("[data-cart-subtotal]");

  function cartQuantity() {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  function renderCart() {
    const count = cartQuantity();
    document.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = String(count);
      node.setAttribute("aria-label", `${count} item${count === 1 ? "" : "s"} in prototype cart`);
    });

    const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
    if (!cartItems) return;

    if (!cart.length) {
      cartItems.innerHTML = `<div class="cart-empty"><img src="${imagePath("thirdrailify-mark.svg")}" alt="" /><strong>Your cart is off the rails.</strong><span>Add an illustrative product from the shop POC.</span></div>`;
      return;
    }

    cartItems.innerHTML = cart
      .map(
        (item) => `
          <article class="cart-item" data-cart-id="${escapeHtml(item.id)}">
            <div class="cart-item__image"><img src="${imagePath(item.image)}" alt="" /></div>
            <div class="cart-item__copy">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${formatPrice(item.price)}</span>
              <div class="cart-item__controls" aria-label="Quantity controls">
                <button type="button" data-cart-minus aria-label="Decrease quantity">−</button>
                <b>${item.quantity}</b>
                <button type="button" data-cart-plus aria-label="Increase quantity">+</button>
              </div>
            </div>
            <button class="cart-item__remove" type="button" data-cart-remove aria-label="Remove ${escapeHtml(item.name)}">×</button>
          </article>`,
      )
      .join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function openCart(trigger = null) {
    if (!cartDrawer || !cartBackdrop) return;
    lastCartTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
    cartBackdrop.hidden = false;
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => {
      cartBackdrop.classList.add("is-open");
      cartDrawer.classList.add("is-open");
      cartDrawer.querySelector("[data-cart-close]")?.focus();
    });
  }

  function closeCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartBackdrop.classList.remove("is-open");
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    window.setTimeout(() => {
      cartBackdrop.hidden = true;
      if (lastCartTrigger instanceof HTMLElement) lastCartTrigger.focus();
    }, 240);
  }

  document.querySelectorAll("[data-cart-open]").forEach((button) => {
    button.addEventListener("click", () => openCart(button));
  });
  document.querySelector("[data-cart-close]")?.addEventListener("click", closeCart);
  cartBackdrop?.addEventListener("click", closeCart);

  cartItems?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest("[data-cart-id]");
    if (!row) return;
    const item = cart.find((entry) => entry.id === row.dataset.cartId);
    if (!item) return;

    if (target.closest("[data-cart-plus]")) item.quantity = Math.min(99, item.quantity + 1);
    if (target.closest("[data-cart-minus]")) item.quantity -= 1;
    if (target.closest("[data-cart-remove]") || item.quantity <= 0) {
      cart = cart.filter((entry) => entry.id !== item.id);
    }
    saveCart();
    renderCart();
  });

  document.querySelector("[data-demo-checkout]")?.addEventListener("click", () => {
    showToast(cart.length ? "Prototype checkout only — no provider, shipping, tax, or payment API is connected." : "Your prototype cart is empty.");
  });

  function productFromCard(card) {
    return {
      id: card.dataset.id || "prototype-product",
      name: card.dataset.name || "Prototype product",
      price: Number(card.dataset.price || 0),
      image: String(card.dataset.image || "thirdrailify-mark.svg").split("/").pop(),
      quantity: 1,
    };
  }

  function addProduct(card, openAfter = true) {
    if (!card) return;
    const product = productFromCard(card);
    const existing = cart.find((item) => item.id === product.id);
    if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
    else cart.push(product);
    saveCart();
    renderCart();
    showToast(`${product.name} added to the prototype cart.`);
    if (openAfter) window.setTimeout(() => openCart(), 180);
  }

  document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
    button.addEventListener("click", () => addProduct(button.closest("[data-product-card]")));
  });

  renderCart();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && cartDrawer?.classList.contains("is-open")) closeCart();
  });

  const productCards = [...document.querySelectorAll("[data-product-card]")];
  const productGrid = document.querySelector("[data-product-grid]");
  const productCount = document.querySelector("[data-product-count]");
  const emptyState = document.querySelector("[data-catalogue-empty]");
  const searchInput = document.querySelector("[data-product-search]");
  const sortSelect = document.querySelector("[data-product-sort]");
  const categoryButtons = [...document.querySelectorAll("[data-filter]")];
  let activeCategory = "all";

  function applyCatalogue() {
    if (!productCards.length || !productGrid) return;
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const sort = String(sortSelect?.value || "featured");
    const visible = [];

    productCards.forEach((card) => {
      const categories = String(card.dataset.categories || "").split(/\s+/);
      const haystack = `${card.dataset.name || ""} ${card.dataset.description || ""} ${categories.join(" ")}`.toLowerCase();
      const categoryMatches = activeCategory === "all" || categories.includes(activeCategory);
      const searchMatches = !query || haystack.includes(query);
      const show = categoryMatches && searchMatches;
      card.classList.toggle("is-filtered-out", !show);
      if (show) visible.push(card);
    });

    const sorted = [...productCards];
    if (sort === "price-asc") sorted.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    if (sort === "price-desc") sorted.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    if (sort === "name") sorted.sort((a, b) => String(a.dataset.name).localeCompare(String(b.dataset.name)));
    if (sort === "featured") sorted.sort((a, b) => productCards.indexOf(a) - productCards.indexOf(b));
    sorted.forEach((card) => productGrid.append(card));

    if (productCount) productCount.textContent = String(visible.length);
    if (emptyState) emptyState.hidden = visible.length !== 0;
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.filter || "all";
      categoryButtons.forEach((entry) => entry.classList.toggle("is-active", entry === button));
      applyCatalogue();
    });
  });

  searchInput?.addEventListener("input", applyCatalogue);
  sortSelect?.addEventListener("change", applyCatalogue);

  document.querySelectorAll("[data-filter-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.filterShortcut || "all";
      activeCategory = category;
      categoryButtons.forEach((entry) => entry.classList.toggle("is-active", entry.dataset.filter === category));
      applyCatalogue();
      document.querySelector("#catalogue")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  document.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
    activeCategory = "all";
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "featured";
    categoryButtons.forEach((entry) => entry.classList.toggle("is-active", entry.dataset.filter === "all"));
    applyCatalogue();
  });

  applyCatalogue();

  const productDialog = document.querySelector("[data-product-dialog]");
  let dialogCard = null;

  function openProductDialog(card) {
    if (!(productDialog instanceof HTMLDialogElement) || !card) return;
    dialogCard = card;
    const setText = (selector, value) => {
      const node = productDialog.querySelector(selector);
      if (node) node.textContent = value;
    };
    const image = productDialog.querySelector("[data-dialog-image]");
    if (image instanceof HTMLImageElement) {
      image.src = imagePath(card.dataset.image || "thirdrailify-mark.svg");
      image.alt = `${card.dataset.name || "Product"} prototype`;
    }
    setText("[data-dialog-badge]", card.dataset.badge || "PRODUCT");
    setText("[data-dialog-category]", card.querySelector(".product-card__body > small")?.textContent || "COLLECTION");
    setText("[data-dialog-name]", card.dataset.name || "Prototype product");
    setText("[data-dialog-description]", card.dataset.description || "Illustrative product concept.");
    setText("[data-dialog-price]", formatPrice(Number(card.dataset.price || 0)));
    setText("[data-dialog-colour]", card.dataset.colour || "Prototype colour");
    productDialog.showModal();
    document.body.classList.add("is-locked");
  }

  document.querySelectorAll("[data-product-view]").forEach((button) => {
    button.addEventListener("click", () => openProductDialog(button.closest("[data-product-card]")));
  });

  function closeProductDialog() {
    if (!(productDialog instanceof HTMLDialogElement)) return;
    productDialog.close();
    document.body.classList.remove("is-locked");
  }

  productDialog?.querySelector("[data-product-dialog-close]")?.addEventListener("click", closeProductDialog);
  productDialog?.addEventListener("cancel", () => document.body.classList.remove("is-locked"));
  productDialog?.addEventListener("click", (event) => {
    if (event.target === productDialog) closeProductDialog();
  });
  productDialog?.querySelector("[data-dialog-add]")?.addEventListener("click", () => {
    if (!dialogCard) return;
    addProduct(dialogCard, false);
    closeProductDialog();
    window.setTimeout(() => openCart(), 180);
  });
})();

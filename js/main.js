/* ============================================
   Voya Travel - Main Rendering Logic
   Loads data from API (server.js) with
   fallback to config.js (static mode).
   Renders all dynamic content across all pages.
   ============================================ */

(function () {
  "use strict";

  /* ---- Load data: try API first, fallback to config.js ---- */
  function loadData(callback) {
    fetch("/api/data")
      .then(function (r) { return r.json(); })
      .then(function (data) { callback(data); })
      .catch(function () {
        console.log("API unavailable, using static config.js");
        callback(window.SITE_CONFIG || null);
      });
  }

  loadData(function (C) {
    if (!C) { console.error("No data loaded"); return; }
    window.__VOYA_DATA__ = C;

  /* ---- Helper: format currency ---- */
  function money(val, currency) {
    return (currency || "$") + val.toLocaleString();
  }

  /* ---- Helper: stars string ---- */
  function stars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let s = "";
    for (let i = 0; i < full; i++) s += "\u2605";
    if (half) s += "\u2606";
    while (s.length < 5) s += "\u2606";
    return s;
  }

  /* ---- Helper: badge label ---- */
  function badgeLabel(badge, saveAmount) {
    switch (badge) {
      case "popular": return "Popular";
      case "hot":     return "Hot Deal";
      case "new":     return "New";
      case "save":    return "Save " + money(saveAmount || 0, C.products[0] ? C.products[0].currency : "$");
      default:        return null;
    }
  }

  function badgeClass(badge) {
    switch (badge) {
      case "save":    return "card__badge--save";
      case "hot":     return "card__badge--hot";
      case "new":     return "card__badge--new";
      default:        return "";
    }
  }

  /* ---- Helper: escape HTML ---- */
  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---- Helper: format date ---- */
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ============================================
     RENDER: Promo Bar
     ============================================ */
  function renderPromoBar() {
    const el = document.getElementById("promo-bar");
    if (!el) return;
    const text = C.brand ? C.brand.promoBarText : "";
    if (!text) { el.style.display = "none"; return; }
    el.innerHTML = text;
  }

  /* ============================================
     RENDER: Navigation
     ============================================ */
  function renderNav() {
    const el = document.getElementById("navbar");
    if (!el) return;

    const currentPage = location.pathname.split("/").pop() || "index.html";

    const logoHTML = (C.brand && C.brand.logoImage)
      ? '<img src="' + C.brand.logoImage + '" alt="' + esc(C.brand.name) + '">'
      : '<span class="navbar__logo-text">' + esc((C.brand && C.brand.logoText) || (C.brand && C.brand.name) || "") + "</span>";

    const links = (C.nav || []).map(function (item) {
      const active = item.href === currentPage ? " active" : "";
      return '<a href="' + item.href + '" class="navbar__link' + active + '">' + esc(item.label) + "</a>";
    }).join("");

    el.innerHTML =
      '<div class="navbar__inner">' +
        '<a href="index.html" class="navbar__logo">' + logoHTML + "</a>" +
        '<nav class="navbar__menu" id="navMenu">' + links + "</nav>" +
        '<div class="navbar__actions">' +
          '<a href="products.html" class="btn btn--primary">Book Now</a>' +
          '<button class="navbar__toggle" id="navToggle" aria-label="Menu"><span></span><span></span><span></span></button>' +
        "</div>" +
      "</div>";

    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        menu.classList.toggle("open");
      });
    }
  }

  /* ============================================
     RENDER: Footer
     ============================================ */
  function renderFooter() {
    const el = document.getElementById("footer");
    if (!el || !C.footer) return;

    const cols = (C.footer.columns || []).map(function (col) {
      const links = (col.links || []).map(function (l) {
        return '<li><a href="' + l.href + '">' + esc(l.label) + "</a></li>";
      }).join("");
      return '<div class="footer__col"><h4>' + esc(col.title) + "</h4><ul>" + links + "</ul></div>";
    }).join("");

    const social = (C.footer.social || []).map(function (s) {
      return '<a href="' + s.href + '">' + esc(s.icon) + "</a>";
    }).join("");

    el.innerHTML =
      '<div class="container">' +
        '<div class="footer__grid">' +
          '<div class="footer__brand">' +
            '<h3>' + esc((C.brand && C.brand.logoText) || (C.brand && C.brand.name) || "") + "</h3>" +
            "<p>" + esc(C.footer.about) + "</p>" +
            '<div class="footer__social">' + social + "</div>" +
          "</div>" +
          cols +
        "</div>" +
        '<div class="footer__bottom">' +
          "&copy; " + esc(C.footer.copyright) +
        "</div>" +
      "</div>";
  }

  /* ============================================
     RENDER: Hero (homepage)
     ============================================ */
  function renderHero() {
    const el = document.getElementById("hero");
    if (!el || !C.hero) return;
    const h = C.hero;

    el.innerHTML =
      '<div class="hero__bg" style="background-image:url(' + h.image + ')"></div>' +
      '<div class="hero__overlay"></div>' +
      '<div class="container">' +
        '<div class="hero__content">' +
          (h.badge ? '<span class="hero__badge">' + esc(h.badge) + "</span>" : "") +
          "<h1>" + esc(h.title) + "</h1>" +
          '<p class="hero__subtitle">' + esc(h.subtitle) + "</p>" +
          '<div class="hero__actions">' +
            '<a href="' + h.primaryBtn.href + '" class="btn btn--primary btn--lg">' + esc(h.primaryBtn.text) + "</a>" +
            (h.secondaryBtn ? '<a href="' + h.secondaryBtn.href + '" class="btn btn--outline btn--lg">' + esc(h.secondaryBtn.text) + "</a>" : "") +
          "</div>" +
        "</div>" +
      "</div>";
  }

  /* ============================================
     RENDER: Product Card
     ============================================ */
  function productCard(p) {
    const bLabel = badgeLabel(p.badge, p.saveAmount);
    const bClass = badgeClass(p.badge);
    const badge = bLabel ? '<span class="card__badge ' + bClass + '">' + esc(bLabel) + "</span>" : "";

    const priceHTML = p.originalPrice
      ? '<span class="card__price-label">From</span>' +
        '<span class="card__price-now">' + money(p.priceFrom, p.currency) + "</span>" +
        '<span class="card__price-was">' + money(p.originalPrice, p.currency) + "</span>"
      : '<span class="card__price-label">From</span>' +
        '<span class="card__price-now">' + money(p.priceFrom, p.currency) + "</span>";

    return (
      '<article class="card fade-in">' +
        '<div class="card__image">' +
          '<img src="' + p.image + '" alt="' + esc(p.title) + '" loading="lazy">' +
          badge +
        "</div>" +
        '<div class="card__body">' +
          '<div class="card__rating">' +
            '<span class="card__stars">' + stars(p.rating) + "</span>" +
            "<span>" + p.rating + " (" + p.reviewCount + " reviews)</span>" +
          "</div>" +
          '<h3 class="card__title">' + esc(p.title) + "</h3>" +
          '<p class="card__desc">' + esc(p.desc) + "</p>" +
          '<div class="card__meta">' +
            "<span>\u23F1 " + p.days + " Days</span>" +
            "<span>\uD83D\uDCCD " + p.places + " Places</span>" +
            "<span>\uD83C\uDF0D " + p.countries + " Country" + (p.countries > 1 ? "ies" : "") + "</span>" +
          "</div>" +
          '<div class="card__price">' + priceHTML + "</div>" +
          '<a href="products.html" class="btn btn--ghost btn--block">View Trip</a>' +
        "</div>" +
      "</article>"
    );
  }

  /* ============================================
     RENDER: Journal Card
     ============================================ */
  function journalCard(j) {
    return (
      '<article class="journal-card fade-in">' +
        '<div class="journal-card__image">' +
          '<img src="' + j.image + '" alt="' + esc(j.title) + '" loading="lazy">' +
        "</div>" +
        '<div class="journal-card__body">' +
          '<span class="journal-card__category">' + esc(j.category) + "</span>" +
          '<h3 class="journal-card__title">' + esc(j.title) + "</h3>" +
          '<p class="journal-card__excerpt">' + esc(j.excerpt) + "</p>" +
          '<div class="journal-card__meta">' +
            '<span class="journal-card__author">' + esc(j.author) + "</span>" +
            "<span>" + formatDate(j.date) + "</span>" +
            "<span>" + esc(j.readTime) + " read</span>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* ============================================
     RENDER: Homepage Sections
     ============================================ */
  function renderHomepage() {
    const prodEl = document.getElementById("home-products");
    if (prodEl && C.products && C.products.length) {
      const items = C.products.slice(0, 3).map(productCard).join("");
      prodEl.innerHTML = '<div class="card-grid">' + items + "</div>";
    }

    const promoEl = document.getElementById("home-promos");
    if (promoEl && C.promotions && C.promotions.length) {
      const items = C.promotions.slice(0, 3).map(productCard).join("");
      promoEl.innerHTML = '<div class="card-grid">' + items + "</div>";
    }

    const jEl = document.getElementById("home-journal");
    if (jEl && C.journal && C.journal.length) {
      const items = C.journal.slice(0, 3).map(journalCard).join("");
      jEl.innerHTML = '<div class="card-grid">' + items + "</div>";
    }

    const destEl = document.getElementById("home-destinations");
    if (destEl && C.destinations && C.destinations.length) {
      const tiles = C.destinations.map(function (d) {
        return (
          '<div class="dest-tile">' +
            '<img src="' + d.image + '" alt="' + esc(d.name) + '" loading="lazy">' +
            '<div class="dest-tile__overlay">' +
              '<span class="dest-tile__name">' + esc(d.name) + "</span>" +
            "</div>" +
          "</div>"
        );
      }).join("");
      destEl.innerHTML = '<div class="dest-grid">' + tiles + "</div>";
    }

    const fbEl = document.getElementById("home-feature");
    if (fbEl && C.featureBanner) {
      fbEl.innerHTML =
        '<div class="feature-banner">' +
          '<div class="feature-banner__content">' +
            "<h2>" + esc(C.featureBanner.title) + "</h2>" +
            "<p>" + esc(C.featureBanner.subtitle) + "</p>" +
          "</div>" +
          '<a href="' + C.featureBanner.btnHref + '" class="btn btn--primary btn--lg">' + esc(C.featureBanner.btnText) + "</a>" +
        "</div>";
    }

    const statEl = document.getElementById("home-stats");
    if (statEl && C.stats) {
      const items = C.stats.map(function (s) {
        return '<div class="stat"><div class="stat__number">' + esc(s.number) + '</div><div class="stat__label">' + esc(s.label) + "</div></div>";
      }).join("");
      statEl.innerHTML = '<div class="stats">' + items + "</div>";
    }
  }

  /* ============================================
     RENDER: Products Page
     ============================================ */
  function renderProductsPage() {
    const el = document.getElementById("products-grid");
    if (!el) return;
    const products = C.products || [];

    const categories = ["All"];
    products.forEach(function (p) {
      if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
    });

    const filterHTML = categories.map(function (cat, i) {
      return '<button class="filter-btn' + (i === 0 ? " active" : "") + '" data-cat="' + esc(cat) + '">' + esc(cat) + "</button>";
    }).join("");

    el.innerHTML =
      '<div class="filter-bar" id="prod-filters">' + filterHTML + "</div>" +
      '<div class="card-grid" id="prod-list"></div>';

    const listEl = document.getElementById("prod-list");
    const filterEl = document.getElementById("prod-filters");

    function render(cat) {
      const items = (cat === "All" ? products : products.filter(function (p) { return p.category === cat; }));
      listEl.innerHTML = items.length
        ? items.map(productCard).join("")
        : '<div class="empty-state">No trips found in this category.</div>';
    }

    render("All");

    if (filterEl) {
      filterEl.addEventListener("click", function (e) {
        if (e.target.classList.contains("filter-btn")) {
          filterEl.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
          e.target.classList.add("active");
          render(e.target.dataset.cat);
        }
      });
    }
  }

  /* ============================================
     RENDER: Promotions Page
     ============================================ */
  function renderPromotionsPage() {
    const el = document.getElementById("promotions-grid");
    if (!el) return;
    const promos = C.promotions || [];

    if (!promos.length) {
      el.innerHTML = '<div class="empty-state">No current promotions. Check back soon!</div>';
      return;
    }

    el.innerHTML = '<div class="card-grid">' + promos.map(function (p) {
      var card = productCard(p);
      if (p.dealExpiry) {
        card = card.replace('class="btn btn--ghost btn--block">View Trip',
          'class="btn btn--primary btn--block">View Deal');
      }
      return card;
    }).join("") + "</div>";
  }

  /* ============================================
     RENDER: Journal Page
     ============================================ */
  function renderJournalPage() {
    const el = document.getElementById("journal-grid");
    if (!el) return;
    const entries = C.journal || [];

    if (!entries.length) {
      el.innerHTML = '<div class="empty-state">No journal entries yet.</div>';
      return;
    }

    const categories = ["All"];
    entries.forEach(function (j) {
      if (j.category && categories.indexOf(j.category) === -1) categories.push(j.category);
    });

    const filterHTML = categories.map(function (cat, i) {
      return '<button class="filter-btn' + (i === 0 ? " active" : "") + '" data-cat="' + esc(cat) + '">' + esc(cat) + "</button>";
    }).join("");

    el.innerHTML =
      '<div class="filter-bar" id="jrnl-filters">' + filterHTML + "</div>" +
      '<div class="card-grid" id="jrnl-list"></div>';

    const listEl = document.getElementById("jrnl-list");
    const filterEl = document.getElementById("jrnl-filters");

    function render(cat) {
      const items = (cat === "All" ? entries : entries.filter(function (j) { return j.category === cat; }));
      listEl.innerHTML = items.length
        ? items.map(journalCard).join("")
        : '<div class="empty-state">No articles in this category.</div>';
    }

    render("All");

    if (filterEl) {
      filterEl.addEventListener("click", function (e) {
        if (e.target.classList.contains("filter-btn")) {
          filterEl.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
          e.target.classList.add("active");
          render(e.target.dataset.cat);
        }
      });
    }
  }

  /* ============================================
     RENDER: About Page
     ============================================ */
  function renderAboutPage() {
    const a = C.about;
    if (!a) return;

    const heroEl = document.getElementById("about-hero");
    if (heroEl) {
      heroEl.innerHTML =
        '<div class="about-hero__bg" style="background-image:url(' + a.heroImage + ')"></div>' +
        '<div class="about-hero__overlay"></div>' +
        '<div class="about-hero__content">' +
          "<h1>" + esc(a.heroTitle) + "</h1>" +
          "<p>" + esc(a.heroSubtitle) + "</p>" +
        "</div>";
    }

    const storyEl = document.getElementById("about-story");
    if (storyEl) {
      const paras = (a.storyText || []).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
      storyEl.innerHTML =
        '<div class="about-section">' +
          '<div class="about-section__image"><img src="' + a.storyImage + '" alt="' + esc(a.storyTitle) + '"></div>' +
          '<div class="about-section__content">' +
            "<h2>" + esc(a.storyTitle) + "</h2>" +
            paras +
          "</div>" +
        "</div>";
    }

    const missionEl = document.getElementById("about-mission");
    if (missionEl) {
      const paras = (a.missionText || []).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
      missionEl.innerHTML =
        '<div class="about-section">' +
          '<div class="about-section__content">' +
            "<h2>" + esc(a.missionTitle) + "</h2>" +
            paras +
          "</div>" +
          '<div class="about-section__image"><img src="' + a.missionImage + '" alt="' + esc(a.missionTitle) + '"></div>' +
        "</div>";
    }

    const valuesEl = document.getElementById("about-values");
    if (valuesEl) {
      const items = (a.values || []).map(function (v) {
        return (
          '<div class="value-card">' +
            '<div class="value-card__icon">' + esc(v.icon) + "</div>" +
            "<h3>" + esc(v.title) + "</h3>" +
            "<p>" + esc(v.desc) + "</p>" +
          "</div>"
        );
      }).join("");
      valuesEl.innerHTML =
        '<div class="section-header"><h2>' + esc(a.valuesTitle) + "</h2></div>" +
        '<div class="values-grid">' + items + "</div>";
    }

    const statsEl = document.getElementById("about-stats");
    if (statsEl && a.aboutStats) {
      const items = a.aboutStats.map(function (s) {
        return '<div class="stat"><div class="stat__number">' + esc(s.number) + '</div><div class="stat__label">' + esc(s.label) + "</div></div>";
      }).join("");
      statsEl.innerHTML = '<div class="stats">' + items + "</div>";
    }
  }

  /* ============================================
     INIT: Run all renderers
     ============================================ */
  function init() {
    renderPromoBar();
    renderNav();
    renderHero();
    renderHomepage();
    renderProductsPage();
    renderPromotionsPage();
    renderJournalPage();
    renderAboutPage();
    renderFooter();
  }

  init();

  }); // end loadData callback
})();

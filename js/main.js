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
        '<nav class="navbar__menu" id="navMenu">' + links + "</nav>" +
        '<div class="navbar__right">' +
          '<a href="index.html" class="navbar__logo">' + logoHTML + "</a>" +
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

  /* ---- Helper: social icon SVG ---- */
  function socialIconSVG(type) {
    var icons = {
      instagram: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    };
    return icons[type] || icons.facebook;
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
      return '<a href="' + s.href + '" target="_blank" rel="noopener" aria-label="' + esc(s.icon) + '">' + socialIconSVG(s.icon) + "</a>";
    }).join("");

    var aboutHTML = (C.footer.about && C.footer.about.trim())
      ? "<p>" + esc(C.footer.about) + "</p>"
      : "";

    el.innerHTML =
      '<div class="container">' +
        '<div class="footer__grid">' +
          '<div class="footer__brand">' +
            '<h3>' + esc((C.brand && C.brand.logoText) || (C.brand && C.brand.name) || "") + "</h3>" +
            aboutHTML +
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
          '<a href="product-detail.html?id=' + encodeURIComponent(p.id) + '" class="btn btn--ghost btn--block">View Trip</a>' +
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

    const statEl = document.getElementById("home-stats");
    if (statEl && C.stats) {
      const items = C.stats.map(function (s) {
        return '<div class="stat"><div class="stat__number">' + esc(s.number) + '</div><div class="stat__label">' + esc(s.label) + "</div></div>";
      }).join("");
      statEl.innerHTML = '<div class="stats">' + items + "</div>";
    }
  }

  /* ============================================
     RENDER: Destinations Page
     ============================================ */
  function renderDestinationsPage() {
    var el = document.getElementById("destinations-grid");
    if (!el) return;
    var dests = C.destinations || [];
    if (!dests.length) {
      el.innerHTML = '<div class="empty-state">No destinations yet. Check back soon!</div>';
      return;
    }
    var tiles = dests.map(function (d) {
      return (
        '<div class="dest-tile">' +
          '<img src="' + d.image + '" alt="' + esc(d.name) + '" loading="lazy">' +
          '<div class="dest-tile__overlay">' +
            '<span class="dest-tile__name">' + esc(d.name) + "</span>" +
            (d.desc ? '<p class="dest-tile__desc">' + esc(d.desc) + "</p>" : "") +
          "</div>" +
        "</div>"
      );
    }).join("");
    el.innerHTML = '<div class="dest-grid">' + tiles + "</div>";
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
     RENDER: Product Detail Page
     ============================================ */
  function renderProductDetail() {
    var el = document.getElementById("product-detail");
    if (!el) return;

    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    if (!id) {
      el.innerHTML = '<div class="container" style="padding:80px 24px;text-align:center;"><h2>Trip not found.</h2><p><a href="products.html" style="color:var(--color-accent);font-weight:600;">&larr; Back to all trips</a></p></div>';
      return;
    }

    var allItems = (C.products || []).concat(C.promotions || []);
    var p = allItems.find(function (item) { return item.id === id; });

    if (!p) {
      el.innerHTML = '<div class="container" style="padding:80px 24px;text-align:center;"><h2>Trip not found.</h2><p><a href="products.html" style="color:var(--color-accent);font-weight:600;">&larr; Back to all trips</a></p></div>';
      return;
    }

    document.title = p.title + " - Voya Travel";

    var bLabel = badgeLabel(p.badge, p.saveAmount);
    var galleryHTML = "";
    if (p.gallery && p.gallery.length) {
      galleryHTML =
        '<section class="detail-gallery">' +
          "<h2>Photo Gallery</h2>" +
          '<div class="detail-gallery__grid">' +
            p.gallery.map(function (g) {
              return '<img src="' + g + '" alt="' + esc(p.title) + '" loading="lazy">';
            }).join("") +
          "</div>" +
        "</section>";
    }

    var highlightsHTML = "";
    if (p.highlights && p.highlights.length) {
      highlightsHTML =
        '<section class="detail-highlights">' +
          "<h3>Trip Highlights</h3>" +
          "<ul>" + p.highlights.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>" +
        "</section>";
    }

    var itineraryHTML = "";
    if (p.itinerary && p.itinerary.length) {
      itineraryHTML =
        '<section class="detail-itinerary">' +
          "<h2>Day-by-Day Itinerary</h2>" +
          '<div class="itinerary-timeline">' +
            p.itinerary.map(function (day) {
              return (
                '<div class="itinerary-day">' +
                  '<div class="itinerary-day__number">' + day.day + "</div>" +
                  '<div class="itinerary-day__card">' +
                    (day.image ? '<img class="itinerary-day__image" src="' + day.image + '" alt="' + esc(day.title) + '" loading="lazy">' : "") +
                    '<div class="itinerary-day__body">' +
                      '<h3 class="itinerary-day__title">Day ' + day.day + ": " + esc(day.title) + "</h3>" +
                      '<p class="itinerary-day__desc">' + esc(day.desc) + "</p>" +
                    "</div>" +
                  "</div>" +
                "</div>"
              );
            }).join("") +
          "</div>" +
        "</section>";
    }

    var includedHTML = "";
    if ((p.included && p.included.length) || (p.notIncluded && p.notIncluded.length)) {
      includedHTML =
        '<section class="detail-included">' +
          (p.included && p.included.length
            ? '<div class="included-box included-box--yes"><h3>\u2714 What\'s Included</h3><ul>' +
              p.included.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>"
            : "") +
          (p.notIncluded && p.notIncluded.length
            ? '<div class="included-box included-box--no"><h3>\u2718 Not Included</h3><ul>' +
              p.notIncluded.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>"
            : "") +
        "</section>";
    }

    var priceHTML = p.originalPrice
      ? '<span class="booking-card__price-value">' + money(p.priceFrom, p.currency) + "</span>" +
        '<span class="booking-card__price-was">' + money(p.originalPrice, p.currency) + "</span>"
      : '<span class="booking-card__price-value">' + money(p.priceFrom, p.currency) + "</span>";

    var sidebarHTML =
      '<aside class="detail-sidebar">' +
        '<div class="booking-card">' +
          '<div class="booking-card__price">' +
            '<div class="booking-card__price-label">From</div>' +
            priceHTML +
          "</div>" +
          '<div class="booking-card__meta">' +
            '<div class="booking-card__meta-item"><span>Duration</span><span>' + p.days + " Days</span></div>" +
            '<div class="booking-card__meta-item"><span>Places</span><span>' + p.places + "</span></div>" +
            '<div class="booking-card__meta-item"><span>Countries</span><span>' + p.countries + "</span></div>" +
            '<div class="booking-card__meta-item"><span>Rating</span><span>' + stars(p.rating) + " " + p.rating + "</span></div>" +
            '<div class="booking-card__meta-item"><span>Reviews</span><span>' + p.reviewCount + "</span></div>" +
            (p.category ? '<div class="booking-card__meta-item"><span>Region</span><span>' + esc(p.category) + "</span></div>" : "") +
          "</div>" +
          '<a href="products.html" class="btn btn--outline btn--block">View All Trips</a>' +
          '<p class="booking-card__note">Free cancellation up to 30 days before departure</p>' +
        "</div>" +
      "</aside>";

    el.innerHTML =
      '<div class="detail-back"><a href="products.html">&larr; All Trips</a></div>' +
      '<section class="detail-hero">' +
        '<div class="detail-hero__bg" style="background-image:url(' + p.image + ')"></div>' +
        '<div class="detail-hero__overlay"></div>' +
        '<div class="detail-hero__content">' +
          (bLabel ? '<span class="detail-hero__badge">' + esc(bLabel) + "</span>" : "") +
          "<h1>" + esc(p.title) + "</h1>" +
          '<div class="detail-hero__meta">' +
            '<span>\u23F1 ' + p.days + " Days</span>" +
            '<span>\uD83D\uDCCD ' + p.places + " Places</span>" +
            '<span>\uD83C\uDF0D ' + p.countries + " Country" + (p.countries > 1 ? "ies" : "") + "</span>" +
            '<span class="detail-hero__rating">\u2605 ' + p.rating + ' <span class="reviews">(' + p.reviewCount + " reviews)</span></span>" +
          "</div>" +
        "</div>" +
      "</section>" +
      '<div class="detail-layout">' +
        '<div class="detail-main">' +
          "<h2>Overview</h2>" +
          "<p>" + esc(p.desc) + "</p>" +
          highlightsHTML +
          galleryHTML +
          itineraryHTML +
          includedHTML +
        "</div>" +
        sidebarHTML +
      "</div>";
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
    renderDestinationsPage();
    renderJournalPage();
    renderAboutPage();
    renderProductDetail();
    renderFooter();
  }

  init();

  }); // end loadData callback
})();

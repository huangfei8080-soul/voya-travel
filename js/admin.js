/* ============================================
   Voya Travel - Admin Panel Logic
   Handles CRUD operations for products,
   promotions, journal entries via API.
   Password protected.
   ============================================ */

(function () {
  "use strict";

  var API = "/api";
  var token = localStorage.getItem("voya_admin_token") || null;
  var products = [];
  var promotions = [];
  var destinations = [];
  var journal = [];
  var settings = {};
  var hero = {};
  var footer = {};
  var about = {};

  /* ---- Login ---- */
  window.doLogin = function () {
    var pwd = document.getElementById("login-password").value;
    if (!pwd) return false;
    fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd })
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          token = res.token;
          localStorage.setItem("voya_admin_token", token);
          showAdmin();
        } else {
          var errEl = document.getElementById("login-error");
          errEl.textContent = res.error || "Password incorrect";
          errEl.style.display = "block";
        }
      }).catch(function () {
        var errEl = document.getElementById("login-error");
        errEl.textContent = "Cannot connect to server";
        errEl.style.display = "block";
      });
    return false;
  };

  function showAdmin() {
    document.getElementById("login-screen").style.display = "none";
    loadAll();
  }

  function logout() {
    token = null;
    localStorage.removeItem("voya_admin_token");
    location.reload();
  }

  /* ---- Check existing session on load ---- */
  function checkSession() {
    if (!token) {
      // Show login screen, hide admin content
      document.getElementById("login-screen").style.display = "flex";
      return;
    }
    fetch(API + "/verify?token=" + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.valid) {
          showAdmin();
        } else {
          token = null;
          localStorage.removeItem("voya_admin_token");
          document.getElementById("login-screen").style.display = "flex";
        }
      }).catch(function () {
        // Server not reachable, still show login
        document.getElementById("login-screen").style.display = "flex";
      });
  }

  /* ---- Toast notification ---- */
  function toast(msg, isError) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show" + (isError ? " error" : "");
    setTimeout(function () { el.className = "toast"; }, 3000);
  }

  /* ---- API helpers (with token) ---- */
  function apiGet(path) {
    var sep = path.indexOf("?") >= 0 ? "&" : "?";
    return fetch(API + path + sep + "token=" + encodeURIComponent(token))
      .then(function (r) { return r.json(); });
  }
  function apiPost(path, body) {
    var sep = path.indexOf("?") >= 0 ? "&" : "?";
    return fetch(API + path + sep + "token=" + encodeURIComponent(token), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function apiPut(path, body) {
    var sep = path.indexOf("?") >= 0 ? "&" : "?";
    return fetch(API + path + sep + "token=" + encodeURIComponent(token), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function apiDelete(path) {
    var sep = path.indexOf("?") >= 0 ? "&" : "?";
    return fetch(API + path + sep + "token=" + encodeURIComponent(token), {
      method: "DELETE"
    }).then(function (r) { return r.json(); });
  }

  /* ---- Image upload (base64 to server) ---- */
  function uploadImage(file, callback) {
    if (!file) { callback(null); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      var sep = ("/api/upload").indexOf("?") >= 0 ? "&" : "?";
      fetch(API + "/upload" + sep + "token=" + encodeURIComponent(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, data: e.target.result })
      }).then(function (r) { return r.json(); })
        .then(function (res) {
          callback(res.path || null);
        }).catch(function () {
          toast("Image upload failed", true);
          callback(null);
        });
    };
    reader.readAsDataURL(file);
  }

  /* ---- Escape HTML ---- */
  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ============================================
     TAB SWITCHING
     ============================================ */
  document.querySelectorAll(".admin-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".admin-tab").forEach(function (t) { t.classList.remove("active"); });
      document.querySelectorAll(".admin-section").forEach(function (s) { s.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("section-" + tab.dataset.tab).classList.add("active");
    });
  });

  /* ============================================
     LOAD ALL DATA
     ============================================ */
  function loadAll() {
    apiGet("/data").then(function (data) {
      products = data.products || [];
      promotions = data.promotions || [];
      destinations = data.destinations || [];
      journal = data.journal || [];
      settings = data.brand || {};
      hero = data.hero || {};
      footer = data.footer || {};
      about = data.about || {};
      renderProducts();
      renderPromos();
      renderDestinations();
      renderJournal();
      renderSettings();
      renderAboutEditor();
    }).catch(function () {
      toast("Cannot connect to server. Is server.js running?", true);
    });
  }

  /* ============================================
     PRODUCTS
     ============================================ */
  function renderProducts() {
    var el = document.getElementById("product-list");
    if (!products.length) {
      el.innerHTML = '<div class="empty-list">No products yet. Click "Add Product" to create one.</div>';
      return;
    }
    el.innerHTML = products.map(function (p) {
      return (
        '<div class="item-row">' +
          '<img src="' + (p.image || "") + '" alt="">' +
          '<div class="item-info"><h4>' + esc(p.title) + '</h4><p>' + esc(p.category) + ' &middot; ' + (p.days || 0) + ' days</p></div>' +
          '<span class="item-price">' + (p.currency || "$") + (p.priceFrom || 0).toLocaleString() + '</span>' +
          (p.badge ? '<span class="item-badge">' + esc(p.badge) + '</span>' : '<span></span>') +
          '<button class="btn-edit" onclick="editProduct(\'' + p.id + '\')">Edit</button>' +
          '<button class="btn-delete" onclick="deleteProduct(\'' + p.id + '\')">Delete</button>' +
        '</div>'
      );
    }).join("");
  }

  window.showProductForm = function (id) {
    var existing = id ? products.find(function (p) { return p.id === id; }) : null;
    var p = existing || { title: "", image: "", badge: "", rating: 4.5, reviewCount: 0, desc: "", days: 7, places: 3, countries: 1, priceFrom: 0, currency: "$", category: "Europe" };

    document.getElementById("product-form-container").innerHTML =
      '<div class="admin-form">' +
        '<h3>' + (existing ? "Edit Product" : "Add Product") + '</h3>' +
        '<div class="form-row">' +
          '<div class="form-field"><label>Title</label><input type="text" id="pf-title" value="' + esc(p.title) + '"></div>' +
          '<div class="form-field"><label>Category</label><select id="pf-category">' +
            ["Europe","Asia","Africa","South America","North America","Oceania","Middle East"].map(function(c) {
              return '<option value="'+c+'"'+(p.category===c?' selected':'')+'>'+c+'</option>';
            }).join("") +
          '</select></div>' +
        '</div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Image</label>' +
          '<div class="image-upload">' +
            (p.image ? '<img src="' + p.image + '" id="pf-img-preview">' : '<img src="" id="pf-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="pf-file" onchange="previewImage(this,\'pf-img-preview\')">' +
            '<input type="text" class="url-input" id="pf-image-url" placeholder="or paste image URL" value="' + esc(p.image) + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Description</label><textarea id="pf-desc">' + esc(p.desc) + '</textarea></div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Days</label><input type="number" id="pf-days" value="' + p.days + '"></div>' +
          '<div class="form-field"><label>Places</label><input type="number" id="pf-places" value="' + p.places + '"></div>' +
          '<div class="form-field"><label>Countries</label><input type="number" id="pf-countries" value="' + p.countries + '"></div>' +
        '</div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Price From</label><input type="number" id="pf-price" value="' + p.priceFrom + '"></div>' +
          '<div class="form-field"><label>Currency</label><input type="text" id="pf-currency" value="' + esc(p.currency) + '" maxlength="3"></div>' +
          '<div class="form-field"><label>Badge</label><select id="pf-badge">' +
            ["", "popular", "hot", "new", "save"].map(function(b) {
              return '<option value="'+b+'"'+(p.badge===b?' selected':'')+'>'+(b||"None")+'</option>';
            }).join("") +
          '</select></div>' +
        '</div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Rating</label><input type="number" step="0.1" max="5" id="pf-rating" value="' + p.rating + '"></div>' +
          '<div class="form-field"><label>Review Count</label><input type="number" id="pf-reviews" value="' + p.reviewCount + '"></div>' +
          '<div class="form-field"><label>Save Amount (if badge=save)</label><input type="number" id="pf-save" value="' + (p.saveAmount || 0) + '"></div>' +
        '</div>' +
        /* --- Itinerary Editor --- */
        '<div class="itinerary-editor" style="margin-top:20px;">' +
          '<h4 style="margin-bottom:12px;color:#0B9BAE;">Day-by-Day Itinerary</h4>' +
          '<div id="pf-itinerary-list">' + buildItineraryRows(p.itinerary || []) + '</div>' +
          '<button class="btn-add-day" onclick="addItineraryDay()">+ Add Day</button>' +
        '</div>' +
        /* --- Gallery Editor --- */
        '<div class="gallery-editor" style="margin-top:16px;">' +
          '<h4 style="margin-bottom:12px;color:#0B9BAE;">Photo Gallery</h4>' +
          '<div id="pf-gallery-list">' + buildGalleryRows(p.gallery || []) + '</div>' +
          '<button class="btn-add-gallery" onclick="addGalleryItem()">+ Add Image</button>' +
        '</div>' +
        /* --- Highlights / Included / Not Included --- */
        '<div class="form-row" style="margin-top:16px;">' +
          '<div class="form-field"><label>Trip Highlights (one per line)</label><textarea id="pf-highlights" style="min-height:100px;">' + (p.highlights || []).join("\n") + '</textarea></div>' +
          '<div class="form-field"><label>What\'s Included (one per line)</label><textarea id="pf-included" style="min-height:100px;">' + (p.included || []).join("\n") + '</textarea></div>' +
        '</div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Not Included (one per line)</label>' +
          '<textarea id="pf-notincluded" style="min-height:80px;">' + (p.notIncluded || []).join("\n") + '</textarea>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:20px;">' +
          '<button class="btn-save" onclick="saveProduct(\'' + (id || "") + '\')">' + (existing ? "Update" : "Create") + '</button>' +
          '<button class="btn-cancel" onclick="cancelProductForm()">Cancel</button>' +
        '</div>' +
      '</div>';
  };

  window.previewImage = function (input, previewId) {
    var file = input.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = document.getElementById(previewId);
        img.src = e.target.result;
        img.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  };

  /* ---- Itinerary & Gallery editor helpers ---- */
  function buildItineraryRows(itinerary) {
    if (!itinerary || !itinerary.length) return "";
    return itinerary.map(function (day, i) {
      return itineraryDayRow(i + 1, day);
    }).join("");
  }

  function itineraryDayRow(dayNum, day) {
    day = day || { title: "", desc: "", image: "" };
    return (
      '<div class="itinerary-day-edit" data-day-index="' + (dayNum - 1) + '">' +
        '<div class="itinerary-day-edit__header">' +
          "<span>Day " + dayNum + "</span>" +
          '<button class="btn-remove-day" onclick="removeItineraryDay(this)">Remove</button>' +
        "</div>" +
        '<div class="form-row" style="margin-bottom:8px;">' +
          '<div class="form-field"><label>Title</label><input type="text" class="iti-title" value="' + esc(day.title) + '"></div>' +
          '<div class="form-field"><label>Image URL</label><input type="text" class="iti-image" value="' + esc(day.image || "") + '" placeholder="Image URL"></div>' +
        "</div>" +
        '<div class="form-field"><label>Description</label><textarea class="iti-desc" style="min-height:60px;">' + esc(day.desc || "") + "</textarea></div>" +
      "</div>"
    );
  }

  window.addItineraryDay = function () {
    var list = document.getElementById("pf-itinerary-list");
    var count = list.children.length;
    var div = document.createElement("div");
    div.innerHTML = itineraryDayRow(count + 1);
    list.appendChild(div.firstChild);
  };

  window.removeItineraryDay = function (btn) {
    var row = btn.closest(".itinerary-day-edit");
    if (row) row.remove();
  };

  function buildGalleryRows(gallery) {
    if (!gallery || !gallery.length) return "";
    return gallery.map(function (url) {
      return galleryItemRow(url);
    }).join("");
  }

  function galleryItemRow(url) {
    return (
      '<div class="gallery-editor__item">' +
        (url ? '<img src="' + url + '" alt="">' : '<img src="" alt="" style="display:none;">') +
        '<input type="text" class="gallery-url" value="' + esc(url || "") + '" placeholder="Image URL" onchange="previewGalleryImg(this)">' +
        '<button class="btn-remove-gallery" onclick="this.parentElement.remove()">Remove</button>' +
      "</div>"
    );
  }

  window.addGalleryItem = function () {
    var list = document.getElementById("pf-gallery-list");
    var div = document.createElement("div");
    div.innerHTML = galleryItemRow("");
    list.appendChild(div.firstChild);
  };

  window.previewGalleryImg = function (input) {
    var img = input.parentElement.querySelector("img");
    if (input.value) {
      img.src = input.value;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  };

  /* ---- Collect itinerary data from form ---- */
  function collectItinerary() {
    var rows = document.querySelectorAll("#pf-itinerary-list .itinerary-day-edit");
    var result = [];
    rows.forEach(function (row, i) {
      result.push({
        day: i + 1,
        title: row.querySelector(".iti-title").value,
        desc: row.querySelector(".iti-desc").value,
        image: row.querySelector(".iti-image").value
      });
    });
    return result;
  }

  /* ---- Collect gallery data from form ---- */
  function collectGallery() {
    var inputs = document.querySelectorAll("#pf-gallery-list .gallery-url");
    var result = [];
    inputs.forEach(function (input) {
      if (input.value.trim()) result.push(input.value.trim());
    });
    return result;
  }

  /* ---- Collect textarea as array ---- */
  function textareaToArray(id) {
    var el = document.getElementById(id);
    if (!el) return [];
    return el.value.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }

  window.cancelProductForm = function () {
    document.getElementById("product-form-container").innerHTML = "";
  };

  window.saveProduct = function (id) {
    var fileInput = document.getElementById("pf-file");
    var file = fileInput && fileInput.files[0];
    var urlVal = document.getElementById("pf-image-url").value;

    function doSave(imagePath) {
      var data = {
        title: document.getElementById("pf-title").value,
        category: document.getElementById("pf-category").value,
        image: imagePath || urlVal || "",
        desc: document.getElementById("pf-desc").value,
        days: parseInt(document.getElementById("pf-days").value) || 0,
        places: parseInt(document.getElementById("pf-places").value) || 0,
        countries: parseInt(document.getElementById("pf-countries").value) || 0,
        priceFrom: parseInt(document.getElementById("pf-price").value) || 0,
        currency: document.getElementById("pf-currency").value || "$",
        badge: document.getElementById("pf-badge").value,
        rating: parseFloat(document.getElementById("pf-rating").value) || 4.5,
        reviewCount: parseInt(document.getElementById("pf-reviews").value) || 0,
        saveAmount: parseInt(document.getElementById("pf-save").value) || 0,
        itinerary: collectItinerary(),
        gallery: collectGallery(),
        highlights: textareaToArray("pf-highlights"),
        included: textareaToArray("pf-included"),
        notIncluded: textareaToArray("pf-notincluded")
      };

      if (id) {
        apiPut("/products/" + id, data).then(function () {
          toast("Product updated!");
          cancelProductForm();
          loadAll();
        }).catch(function () { toast("Update failed", true); });
      } else {
        apiPost("/products", data).then(function () {
          toast("Product created!");
          cancelProductForm();
          loadAll();
        }).catch(function () { toast("Create failed", true); });
      }
    }

    if (file) {
      uploadImage(file, function (path) { doSave(path); });
    } else {
      doSave(null);
    }
  };

  window.editProduct = function (id) {
    showProductForm(id);
    document.getElementById("product-form-container").scrollIntoView({ behavior: "smooth" });
  };

  window.deleteProduct = function (id) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    apiDelete("/products/" + id).then(function () {
      toast("Product deleted");
      loadAll();
    }).catch(function () { toast("Delete failed", true); });
  };

  /* ============================================
     PROMOTIONS
     ============================================ */
  function renderPromos() {
    var el = document.getElementById("promo-list");
    if (!promotions.length) {
      el.innerHTML = '<div class="empty-list">No promotions yet. Click "Add Promotion" to create one.</div>';
      return;
    }
    el.innerHTML = promotions.map(function (p) {
      return (
        '<div class="item-row">' +
          '<img src="' + (p.image || "") + '" alt="">' +
          '<div class="item-info"><h4>' + esc(p.title) + '</h4><p>' + esc(p.category) + ' &middot; ' + (p.days || 0) + ' days &middot; Expires: ' + esc(p.dealExpiry || "N/A") + '</p></div>' +
          '<span class="item-price">' + (p.currency || "$") + (p.priceFrom || 0).toLocaleString() + ' <span style="color:#9ca3af;text-decoration:line-through;font-weight:400;font-size:0.85rem;">' + (p.currency || "$") + (p.originalPrice || 0).toLocaleString() + '</span></span>' +
          (p.badge ? '<span class="item-badge">' + esc(p.badge) + '</span>' : '<span></span>') +
          '<button class="btn-edit" onclick="editPromo(\'' + p.id + '\')">Edit</button>' +
          '<button class="btn-delete" onclick="deletePromo(\'' + p.id + '\')">Delete</button>' +
        '</div>'
      );
    }).join("");
  }

  window.showPromoForm = function (id) {
    var existing = id ? promotions.find(function (p) { return p.id === id; }) : null;
    var p = existing || { title: "", image: "", badge: "save", saveAmount: 0, rating: 4.5, reviewCount: 0, desc: "", days: 7, places: 3, countries: 1, originalPrice: 0, priceFrom: 0, currency: "$", category: "Europe", dealExpiry: "" };

    document.getElementById("promo-form-container").innerHTML =
      '<div class="admin-form">' +
        '<h3>' + (existing ? "Edit Promotion" : "Add Promotion") + '</h3>' +
        '<div class="form-row">' +
          '<div class="form-field"><label>Title</label><input type="text" id="prf-title" value="' + esc(p.title) + '"></div>' +
          '<div class="form-field"><label>Category</label><select id="prf-category">' +
            ["Europe","Asia","Africa","South America","North America","Oceania","Middle East"].map(function(c) {
              return '<option value="'+c+'"'+(p.category===c?' selected':'')+'>'+c+'</option>';
            }).join("") +
          '</select></div>' +
        '</div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Image</label>' +
          '<div class="image-upload">' +
            (p.image ? '<img src="' + p.image + '" id="prf-img-preview">' : '<img src="" id="prf-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="prf-file" onchange="previewImage(this,\'prf-img-preview\')">' +
            '<input type="text" class="url-input" id="prf-image-url" placeholder="or paste image URL" value="' + esc(p.image) + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Description</label><textarea id="prf-desc">' + esc(p.desc) + '</textarea></div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Days</label><input type="number" id="prf-days" value="' + p.days + '"></div>' +
          '<div class="form-field"><label>Places</label><input type="number" id="prf-places" value="' + p.places + '"></div>' +
          '<div class="form-field"><label>Countries</label><input type="number" id="prf-countries" value="' + p.countries + '"></div>' +
        '</div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Original Price</label><input type="number" id="prf-original" value="' + (p.originalPrice || 0) + '"></div>' +
          '<div class="form-field"><label>Sale Price</label><input type="number" id="prf-price" value="' + p.priceFrom + '"></div>' +
          '<div class="form-field"><label>Currency</label><input type="text" id="prf-currency" value="' + esc(p.currency) + '" maxlength="3"></div>' +
        '</div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Badge</label><select id="prf-badge">' +
            ["save","hot","popular","new",""].map(function(b) {
              return '<option value="'+b+'"'+(p.badge===b?' selected':'')+'>'+(b||"None")+'</option>';
            }).join("") +
          '</select></div>' +
          '<div class="form-field"><label>Save Amount</label><input type="number" id="prf-save" value="' + (p.saveAmount || 0) + '"></div>' +
          '<div class="form-field"><label>Deal Expiry</label><input type="date" id="prf-expiry" value="' + esc(p.dealExpiry) + '"></div>' +
        '</div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Rating</label><input type="number" step="0.1" max="5" id="prf-rating" value="' + p.rating + '"></div>' +
          '<div class="form-field"><label>Review Count</label><input type="number" id="prf-reviews" value="' + p.reviewCount + '"></div>' +
          '<div></div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:20px;">' +
          '<button class="btn-save" onclick="savePromo(\'' + (id || "") + '\')">' + (existing ? "Update" : "Create") + '</button>' +
          '<button class="btn-cancel" onclick="cancelPromoForm()">Cancel</button>' +
        '</div>' +
      '</div>';
  };

  window.cancelPromoForm = function () {
    document.getElementById("promo-form-container").innerHTML = "";
  };

  window.savePromo = function (id) {
    var fileInput = document.getElementById("prf-file");
    var file = fileInput && fileInput.files[0];
    var urlVal = document.getElementById("prf-image-url").value;

    function doSave(imagePath) {
      var data = {
        title: document.getElementById("prf-title").value,
        category: document.getElementById("prf-category").value,
        image: imagePath || urlVal || "",
        desc: document.getElementById("prf-desc").value,
        days: parseInt(document.getElementById("prf-days").value) || 0,
        places: parseInt(document.getElementById("prf-places").value) || 0,
        countries: parseInt(document.getElementById("prf-countries").value) || 0,
        originalPrice: parseInt(document.getElementById("prf-original").value) || 0,
        priceFrom: parseInt(document.getElementById("prf-price").value) || 0,
        currency: document.getElementById("prf-currency").value || "$",
        badge: document.getElementById("prf-badge").value,
        saveAmount: parseInt(document.getElementById("prf-save").value) || 0,
        dealExpiry: document.getElementById("prf-expiry").value,
        rating: parseFloat(document.getElementById("prf-rating").value) || 4.5,
        reviewCount: parseInt(document.getElementById("prf-reviews").value) || 0
      };

      if (id) {
        apiPut("/promotions/" + id, data).then(function () {
          toast("Promotion updated!");
          cancelPromoForm();
          loadAll();
        }).catch(function () { toast("Update failed", true); });
      } else {
        apiPost("/promotions", data).then(function () {
          toast("Promotion created!");
          cancelPromoForm();
          loadAll();
        }).catch(function () { toast("Create failed", true); });
      }
    }

    if (file) {
      uploadImage(file, function (path) { doSave(path); });
    } else {
      doSave(null);
    }
  };

  window.editPromo = function (id) {
    showPromoForm(id);
    document.getElementById("promo-form-container").scrollIntoView({ behavior: "smooth" });
  };

  window.deletePromo = function (id) {
    if (!confirm("Delete this promotion? This cannot be undone.")) return;
    apiDelete("/promotions/" + id).then(function () {
      toast("Promotion deleted");
      loadAll();
    }).catch(function () { toast("Delete failed", true); });
  };

  /* ============================================
     DESTINATIONS
     ============================================ */
  function renderDestinations() {
    var el = document.getElementById("destination-list");
    if (!destinations.length) {
      el.innerHTML = '<div class="empty-list">No destinations yet. Click "Add Destination" to create one.</div>';
      return;
    }
    el.innerHTML = destinations.map(function (d) {
      return (
        '<div class="item-row">' +
          '<img src="' + (d.image || "") + '" alt="">' +
          '<div class="item-info"><h4>' + esc(d.name) + '</h4><p>' + esc(d.desc || "") + '</p></div>' +
          '<span></span><span></span>' +
          '<button class="btn-edit" onclick="editDestination(\'' + d.id + '\')">Edit</button>' +
          '<button class="btn-delete" onclick="deleteDestination(\'' + d.id + '\')">Delete</button>' +
        '</div>'
      );
    }).join("");
  }

  window.showDestinationForm = function (id) {
    var existing = id ? destinations.find(function (d) { return d.id === id; }) : null;
    var d = existing || { name: "", image: "", desc: "" };

    document.getElementById("destination-form-container").innerHTML =
      '<div class="admin-form">' +
        '<h3>' + (existing ? "Edit Destination" : "Add Destination") + '</h3>' +
        '<div class="form-field" style="margin-bottom:16px;">' +
          '<label>Destination Name</label>' +
          '<input type="text" id="df-name" value="' + esc(d.name) + '" placeholder="e.g. Japan">' +
        '</div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Image</label>' +
          '<div class="image-upload">' +
            (d.image ? '<img src="' + d.image + '" id="df-img-preview">' : '<img src="" id="df-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="df-file" onchange="previewImage(this,\'df-img-preview\')">' +
            '<input type="text" class="url-input" id="df-image-url" placeholder="or paste image URL" value="' + esc(d.image) + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;">' +
          '<label>Description (short text shown on the destination tile)</label>' +
          '<textarea id="df-desc" style="min-height:80px;">' + esc(d.desc || "") + '</textarea>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:20px;">' +
          '<button class="btn-save" onclick="saveDestination(\'' + (id || "") + '\')">' + (existing ? "Update" : "Create") + '</button>' +
          '<button class="btn-cancel" onclick="cancelDestinationForm()">Cancel</button>' +
        '</div>' +
      '</div>';
  };

  window.cancelDestinationForm = function () {
    document.getElementById("destination-form-container").innerHTML = "";
  };

  window.saveDestination = function (id) {
    var fileInput = document.getElementById("df-file");
    var file = fileInput && fileInput.files[0];
    var urlVal = document.getElementById("df-image-url").value;

    function doSave(imagePath) {
      var data = {
        name: document.getElementById("df-name").value,
        image: imagePath || urlVal || "",
        desc: document.getElementById("df-desc").value
      };

      if (id) {
        apiPut("/destinations/" + id, data).then(function () {
          toast("Destination updated!");
          cancelDestinationForm();
          loadAll();
        }).catch(function () { toast("Update failed", true); });
      } else {
        apiPost("/destinations", data).then(function () {
          toast("Destination created!");
          cancelDestinationForm();
          loadAll();
        }).catch(function () { toast("Create failed", true); });
      }
    }

    if (file) {
      uploadImage(file, function (path) { doSave(path); });
    } else {
      doSave(null);
    }
  };

  window.editDestination = function (id) {
    showDestinationForm(id);
    document.getElementById("destination-form-container").scrollIntoView({ behavior: "smooth" });
  };

  window.deleteDestination = function (id) {
    if (!confirm("Delete this destination? This cannot be undone.")) return;
    apiDelete("/destinations/" + id).then(function () {
      toast("Destination deleted");
      loadAll();
    }).catch(function () { toast("Delete failed", true); });
  };

  /* ============================================
     JOURNAL
     ============================================ */
  function renderJournal() {
    var el = document.getElementById("journal-list");
    if (!journal.length) {
      el.innerHTML = '<div class="empty-list">No articles yet. Click "Add Article" to create one.</div>';
      return;
    }
    el.innerHTML = journal.map(function (j) {
      return (
        '<div class="item-row">' +
          '<img src="' + (j.image || "") + '" alt="">' +
          '<div class="item-info"><h4>' + esc(j.title) + '</h4><p>' + esc(j.category) + ' &middot; ' + esc(j.author) + ' &middot; ' + esc(j.date) + '</p></div>' +
          '<span class="item-badge">' + esc(j.readTime) + '</span>' +
          '<span></span>' +
          '<button class="btn-edit" onclick="editJournal(\'' + j.id + '\')">Edit</button>' +
          '<button class="btn-delete" onclick="deleteJournal(\'' + j.id + '\')">Delete</button>' +
        '</div>'
      );
    }).join("");
  }

  window.showJournalForm = function (id) {
    var existing = id ? journal.find(function (j) { return j.id === id; }) : null;
    var j = existing || { title: "", image: "", category: "Inspiration", excerpt: "", author: "", date: new Date().toISOString().slice(0,10), readTime: "5 min" };

    document.getElementById("journal-form-container").innerHTML =
      '<div class="admin-form">' +
        '<h3>' + (existing ? "Edit Article" : "Add Article") + '</h3>' +
        '<div class="form-row">' +
          '<div class="form-field"><label>Title</label><input type="text" id="jf-title" value="' + esc(j.title) + '"></div>' +
          '<div class="form-field"><label>Category</label><select id="jf-category">' +
            ["Inspiration","Tips & Guides","Stories","News","Reviews"].map(function(c) {
              return '<option value="'+c+'"'+(j.category===c?' selected':'')+'>'+c+'</option>';
            }).join("") +
          '</select></div>' +
        '</div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Image</label>' +
          '<div class="image-upload">' +
            (j.image ? '<img src="' + j.image + '" id="jf-img-preview">' : '<img src="" id="jf-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="jf-file" onchange="previewImage(this,\'jf-img-preview\')">' +
            '<input type="text" class="url-input" id="jf-image-url" placeholder="or paste image URL" value="' + esc(j.image) + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Excerpt</label><textarea id="jf-excerpt">' + esc(j.excerpt) + '</textarea></div>' +
        '<div class="form-row--3">' +
          '<div class="form-field"><label>Author</label><input type="text" id="jf-author" value="' + esc(j.author) + '"></div>' +
          '<div class="form-field"><label>Date</label><input type="date" id="jf-date" value="' + esc(j.date) + '"></div>' +
          '<div class="form-field"><label>Read Time</label><input type="text" id="jf-readtime" value="' + esc(j.readTime) + '"></div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:20px;">' +
          '<button class="btn-save" onclick="saveJournal(\'' + (id || "") + '\')">' + (existing ? "Update" : "Create") + '</button>' +
          '<button class="btn-cancel" onclick="cancelJournalForm()">Cancel</button>' +
        '</div>' +
      '</div>';
  };

  window.cancelJournalForm = function () {
    document.getElementById("journal-form-container").innerHTML = "";
  };

  window.saveJournal = function (id) {
    var fileInput = document.getElementById("jf-file");
    var file = fileInput && fileInput.files[0];
    var urlVal = document.getElementById("jf-image-url").value;

    function doSave(imagePath) {
      var data = {
        title: document.getElementById("jf-title").value,
        category: document.getElementById("jf-category").value,
        image: imagePath || urlVal || "",
        excerpt: document.getElementById("jf-excerpt").value,
        author: document.getElementById("jf-author").value,
        date: document.getElementById("jf-date").value,
        readTime: document.getElementById("jf-readtime").value
      };

      if (id) {
        apiPut("/journal/" + id, data).then(function () {
          toast("Article updated!");
          cancelJournalForm();
          loadAll();
        }).catch(function () { toast("Update failed", true); });
      } else {
        apiPost("/journal", data).then(function () {
          toast("Article created!");
          cancelJournalForm();
          loadAll();
        }).catch(function () { toast("Create failed", true); });
      }
    }

    if (file) {
      uploadImage(file, function (path) { doSave(path); });
    } else {
      doSave(null);
    }
  };

  window.editJournal = function (id) {
    showJournalForm(id);
    document.getElementById("journal-form-container").scrollIntoView({ behavior: "smooth" });
  };

  window.deleteJournal = function (id) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    apiDelete("/journal/" + id).then(function () {
      toast("Article deleted");
      loadAll();
    }).catch(function () { toast("Delete failed", true); });
  };

  /* ============================================
     SETTINGS (Promo Bar, Brand Info)
     ============================================ */
  function renderSettings() {
    var el = document.getElementById("settings-form-container");
    if (!el) return;
    var b = settings || {};
    var h = hero || {};

    el.innerHTML =
      '<div class="settings-form">' +
        "<h3>Homepage Hero Banner</h3>" +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          "<label>Hero Background Image</label>" +
          '<div class="image-upload">' +
            (h.image ? '<img src="' + h.image + '" id="hf-img-preview">' : '<img src="" id="hf-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="hf-file" onchange="previewImage(this,\'hf-img-preview\')">' +
            '<input type="text" class="url-input" id="hf-image-url" placeholder="or paste image URL" value="' + esc(h.image || "") + '">' +
          "</div>" +
        "</div>" +
        '<div class="form-row" style="margin-bottom:16px;">' +
          '<div class="form-field"><label>Badge Text (small label above title)</label><input type="text" id="hf-badge" value="' + esc(h.badge || "") + '" placeholder="e.g. 2026 Trips Now Available"></div>' +
          '<div class="form-field"><label>Title</label><input type="text" id="hf-title" value="' + esc(h.title || "") + '"></div>' +
        "</div>" +
        '<div class="form-field" style="margin-bottom:16px;">' +
          "<label>Subtitle</label>" +
          '<input type="text" id="hf-subtitle" value="' + esc(h.subtitle || "") + '">' +
        "</div>" +
        '<div class="form-row" style="margin-bottom:16px;">' +
          '<div class="form-field"><label>Primary Button Text</label><input type="text" id="hf-pbtn-text" value="' + esc((h.primaryBtn && h.primaryBtn.text) || "") + '"></div>' +
          '<div class="form-field"><label>Primary Button Link</label><input type="text" id="hf-pbtn-href" value="' + esc((h.primaryBtn && h.primaryBtn.href) || "") + '"></div>' +
        "</div>" +
        '<div class="form-row" style="margin-bottom:16px;">' +
          '<div class="form-field"><label>Secondary Button Text</label><input type="text" id="hf-sbtn-text" value="' + esc((h.secondaryBtn && h.secondaryBtn.text) || "") + '"></div>' +
          '<div class="form-field"><label>Secondary Button Link</label><input type="text" id="hf-sbtn-href" value="' + esc((h.secondaryBtn && h.secondaryBtn.href) || "") + '"></div>' +
        "</div>" +
        '<div style="display:flex;gap:12px;margin-top:8px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">' +
          '<button class="btn-save" onclick="saveHero()">Save Hero Banner</button>' +
        "</div>" +
        "<h3>Promo Bar & Brand Settings</h3>" +
        '<div class="form-field" style="margin-bottom:16px;">' +
          "<label>Promo Bar Text (top yellow banner)</label>" +
          '<input type="text" id="sf-promo" value="' + esc(b.promoBarText || "") + '" placeholder="Leave empty to hide promo bar">' +
          "<p style=\"font-size:0.8rem;color:#6b7280;margin-top:4px;\">This text appears in the yellow bar at the very top of every page. Leave empty to hide it.</p>" +
        "</div>" +
        '<div class="form-row" style="margin-bottom:16px;">' +
          '<div class="form-field"><label>Brand Name</label><input type="text" id="sf-name" value="' + esc(b.name || "") + '"></div>' +
          '<div class="form-field"><label>Logo Text (fallback)</label><input type="text" id="sf-logotext" value="' + esc(b.logoText || "") + '"></div>' +
        "</div>" +
        '<div class="form-field" style="margin-bottom:16px;">' +
          "<label>Tagline</label>" +
          '<input type="text" id="sf-tagline" value="' + esc(b.tagline || "") + '">' +
        "</div>" +
        '<div class="form-field" style="margin-bottom:16px;">' +
          "<label>Logo Image Path</label>" +
          '<input type="text" id="sf-logoimage" value="' + esc(b.logoImage || "") + '" placeholder="images/logo.png">' +
        "</div>" +
        '<div style="display:flex;gap:12px;margin-top:20px;">' +
          '<button class="btn-save" onclick="saveSettings()">Save Settings</button>' +
        "</div>" +
        /* --- Footer Settings --- */
        '<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">' +
          "<h3>Footer Settings</h3>" +
          '<div class="form-field" style="margin-bottom:16px;">' +
            "<label>Footer About Text (shown under brand name)</label>" +
            '<textarea id="ff-about" style="min-height:60px;">' + esc(footer.about || "") + "</textarea>" +
          "</div>" +
          '<div class="form-field" style="margin-bottom:16px;">' +
            "<label>Copyright Text</label>" +
            '<input type="text" id="ff-copyright" value="' + esc(footer.copyright || "") + '">' +
          "</div>" +
          /* --- Footer Columns Editor --- */
          '<div class="itinerary-editor" style="margin-top:16px;">' +
            '<h4 style="margin-bottom:12px;color:#0B9BAE;">Footer Link Columns</h4>' +
            '<div id="ff-columns-list">' + buildFooterColumns(footer.columns || []) + '</div>' +
            '<button class="btn-add-day" onclick="addFooterColumn()">+ Add Column</button>' +
          "</div>" +
          /* --- Social Links Editor --- */
          '<div class="gallery-editor" style="margin-top:16px;">' +
            '<h4 style="margin-bottom:12px;color:#0B9BAE;">Social Media Links</h4>' +
            '<div id="ff-social-list">' + buildSocialLinks(footer.social || []) + '</div>' +
            '<button class="btn-add-gallery" onclick="addSocialLink()">+ Add Social Link</button>' +
          "</div>" +
          '<div style="display:flex;gap:12px;margin-top:20px;">' +
            '<button class="btn-save" onclick="saveFooter()">Save Footer</button>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  window.saveHero = function () {
    var fileInput = document.getElementById("hf-file");
    var file = fileInput && fileInput.files[0];
    var urlVal = document.getElementById("hf-image-url").value;

    function doSave(imagePath) {
      var data = {
        image: imagePath || urlVal || "",
        badge: document.getElementById("hf-badge").value,
        title: document.getElementById("hf-title").value,
        subtitle: document.getElementById("hf-subtitle").value,
        primaryBtn: {
          text: document.getElementById("hf-pbtn-text").value,
          href: document.getElementById("hf-pbtn-href").value
        },
        secondaryBtn: {
          text: document.getElementById("hf-sbtn-text").value,
          href: document.getElementById("hf-sbtn-href").value
        }
      };

      apiPut("/hero", data).then(function (res) {
        hero = res;
        toast("Hero banner saved! Refresh the website to see changes.");
      }).catch(function () {
        toast("Failed to save hero banner", true);
      });
    }

    if (file) {
      uploadImage(file, function (path) { doSave(path); });
    } else {
      doSave(null);
    }
  };

  window.saveSettings = function () {
    var data = {
      promoBarText: document.getElementById("sf-promo").value,
      name: document.getElementById("sf-name").value,
      logoText: document.getElementById("sf-logotext").value,
      tagline: document.getElementById("sf-tagline").value,
      logoImage: document.getElementById("sf-logoimage").value
    };

    apiPut("/settings", data).then(function (res) {
      settings = res;
      toast("Settings saved! Refresh the website to see changes.");
    }).catch(function () {
      toast("Failed to save settings", true);
    });
  };

  /* ---- Footer columns editor helpers ---- */
  function buildFooterColumns(columns) {
    if (!columns || !columns.length) return "";
    return columns.map(function (col, i) {
      return footerColumnRow(i, col);
    }).join("");
  }

  function footerColumnRow(index, col) {
    col = col || { title: "", links: [] };
    var linksHTML = (col.links || []).map(function (link, j) {
      return (
        '<div class="gallery-editor__item">' +
          '<input type="text" class="ff-link-label" value="' + esc(link.label || "") + '" placeholder="Link label">' +
          '<input type="text" class="ff-link-href" value="' + esc(link.href || "") + '" placeholder="Link URL">' +
          '<button class="btn-remove-gallery" onclick="removeFooterLink(this)">Remove</button>' +
        "</div>"
      );
    }).join("");

    return (
      '<div class="itinerary-day-edit" data-col-index="' + index + '">' +
        '<div class="itinerary-day-edit__header">' +
          '<input type="text" class="ff-col-title" value="' + esc(col.title || "") + '" placeholder="Column title" style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;">' +
          '<button class="btn-remove-day" onclick="this.closest(\'.itinerary-day-edit\').remove()">Remove Column</button>' +
        "</div>" +
        '<div class="ff-links-list">' + linksHTML + "</div>" +
        '<button class="btn-add-gallery" onclick="addFooterLink(this)" style="margin-top:8px;">+ Add Link</button>' +
      "</div>"
    );
  }

  window.addFooterColumn = function () {
    var list = document.getElementById("ff-columns-list");
    var count = list.children.length;
    var div = document.createElement("div");
    div.innerHTML = footerColumnRow(count);
    list.appendChild(div.firstChild);
  };

  window.addFooterLink = function (btn) {
    var col = btn.closest(".itinerary-day-edit");
    var linksList = col.querySelector(".ff-links-list");
    var div = document.createElement("div");
    div.innerHTML =
      '<div class="gallery-editor__item">' +
        '<input type="text" class="ff-link-label" value="" placeholder="Link label">' +
        '<input type="text" class="ff-link-href" value="" placeholder="Link URL">' +
        '<button class="btn-remove-gallery" onclick="removeFooterLink(this)">Remove</button>' +
      "</div>";
    linksList.appendChild(div.firstChild);
  };

  window.removeFooterLink = function (btn) {
    btn.parentElement.remove();
  };

  function collectFooterColumns() {
    var cols = document.querySelectorAll("#ff-columns-list .itinerary-day-edit");
    var result = [];
    cols.forEach(function (col) {
      var title = col.querySelector(".ff-col-title").value;
      var linkRows = col.querySelectorAll(".ff-links-list .gallery-editor__item");
      var links = [];
      linkRows.forEach(function (row) {
        var label = row.querySelector(".ff-link-label").value.trim();
        var href = row.querySelector(".ff-link-href").value.trim();
        if (label) links.push({ label: label, href: href });
      });
      if (title) result.push({ title: title, links: links });
    });
    return result;
  }

  /* ---- Social links editor helpers ---- */
  function buildSocialLinks(social) {
    if (!social || !social.length) return "";
    return social.map(function (s) {
      return socialLinkRow(s);
    }).join("");
  }

  function socialLinkRow(s) {
    s = s || { icon: "instagram", href: "" };
    var options = ["instagram", "facebook", "youtube"].map(function (ic) {
      return '<option value="' + ic + '"' + (s.icon === ic ? " selected" : "") + ">" + ic + "</option>";
    }).join("");
    return (
      '<div class="gallery-editor__item">' +
        '<select class="ff-social-icon" style="width:120px;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.85rem;">' + options + "</select>" +
        '<input type="text" class="ff-social-href" value="' + esc(s.href || "") + '" placeholder="https://instagram.com/...">' +
        '<button class="btn-remove-gallery" onclick="this.parentElement.remove()">Remove</button>' +
      "</div>"
    );
  }

  window.addSocialLink = function () {
    var list = document.getElementById("ff-social-list");
    var div = document.createElement("div");
    div.innerHTML = socialLinkRow({ icon: "instagram", href: "" });
    list.appendChild(div.firstChild);
  };

  function collectSocialLinks() {
    var rows = document.querySelectorAll("#ff-social-list .gallery-editor__item");
    var result = [];
    rows.forEach(function (row) {
      var icon = row.querySelector(".ff-social-icon").value;
      var href = row.querySelector(".ff-social-href").value.trim();
      if (href) result.push({ icon: icon, href: href });
    });
    return result;
  }

  window.saveFooter = function () {
    var data = {
      about: document.getElementById("ff-about").value,
      copyright: document.getElementById("ff-copyright").value,
      columns: collectFooterColumns(),
      social: collectSocialLinks()
    };

    apiPut("/footer", data).then(function (res) {
      footer = res;
      toast("Footer saved! Refresh the website to see changes.");
    }).catch(function () {
      toast("Failed to save footer", true);
    });
  };

  /* ============================================
     ABOUT US PAGE EDITOR
     ============================================ */
  function renderAboutEditor() {
    var el = document.getElementById("about-form-container");
    if (!el) return;
    var a = about || {};

    /* Build values rows */
    var valuesHTML = (a.values || []).map(function (v, i) {
      return (
        '<div class="itinerary-day-edit" data-val-index="' + i + '">' +
          '<div class="itinerary-day-edit__header">' +
            '<span>Value ' + (i + 1) + '</span>' +
            '<button class="btn-remove-day" onclick="this.closest(\'.itinerary-day-edit\').remove()">Remove</button>' +
          '</div>' +
          '<div class="form-row" style="margin-bottom:8px;">' +
            '<div class="form-field"><label>Icon (1-2 letters)</label><input type="text" class="ab-val-icon" value="' + esc(v.icon || "") + '" maxlength="3" style="max-width:80px;"></div>' +
            '<div class="form-field"><label>Title</label><input type="text" class="ab-val-title" value="' + esc(v.title || "") + '"></div>' +
          '</div>' +
          '<div class="form-field"><label>Description</label><textarea class="ab-val-desc" style="min-height:60px;">' + esc(v.desc || "") + '</textarea></div>' +
        '</div>'
      );
    }).join("");

    /* Build stats rows */
    var statsHTML = (a.aboutStats || []).map(function (s, i) {
      return (
        '<div class="gallery-editor__item">' +
          '<input type="text" class="ab-stat-number" value="' + esc(s.number || "") + '" placeholder="e.g. 50K+" style="max-width:120px;">' +
          '<input type="text" class="ab-stat-label" value="' + esc(s.label || "") + '" placeholder="e.g. Happy Travelers">' +
          '<button class="btn-remove-gallery" onclick="this.parentElement.remove()">Remove</button>' +
        '</div>'
      );
    }).join("");

    el.innerHTML =
      '<div class="admin-form">' +
        '<h3>About Hero Section</h3>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Hero Background Image</label>' +
          '<div class="image-upload">' +
            (a.heroImage ? '<img src="' + a.heroImage + '" id="ab-hero-img-preview">' : '<img src="" id="ab-hero-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="ab-hero-file" onchange="previewImage(this,\'ab-hero-img-preview\')">' +
            '<input type="text" class="url-input" id="ab-hero-url" placeholder="or paste image URL" value="' + esc(a.heroImage || "") + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Hero Title</label><input type="text" id="ab-hero-title" value="' + esc(a.heroTitle || "") + '"></div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Hero Subtitle</label><textarea id="ab-hero-subtitle" style="min-height:60px;">' + esc(a.heroSubtitle || "") + '</textarea></div>' +
      '</div>' +

      '<div class="admin-form">' +
        '<h3>Our Story Section</h3>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Story Title</label><input type="text" id="ab-story-title" value="' + esc(a.storyTitle || "") + '"></div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Story Image</label>' +
          '<div class="image-upload">' +
            (a.storyImage ? '<img src="' + a.storyImage + '" id="ab-story-img-preview">' : '<img src="" id="ab-story-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="ab-story-file" onchange="previewImage(this,\'ab-story-img-preview\')">' +
            '<input type="text" class="url-input" id="ab-story-url" placeholder="or paste image URL" value="' + esc(a.storyImage || "") + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Story Text (one paragraph per line)</label><textarea id="ab-story-text" style="min-height:120px;">' + esc((a.storyText || []).join("\n")) + '</textarea></div>' +
      '</div>' +

      '<div class="admin-form">' +
        '<h3>Our Mission Section</h3>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Mission Title</label><input type="text" id="ab-mission-title" value="' + esc(a.missionTitle || "") + '"></div>' +
        '<div class="form-row--full form-field" style="margin-bottom:16px;">' +
          '<label>Mission Image</label>' +
          '<div class="image-upload">' +
            (a.missionImage ? '<img src="' + a.missionImage + '" id="ab-mission-img-preview">' : '<img src="" id="ab-mission-img-preview" style="display:none;">') +
            '<input type="file" accept="image/*" id="ab-mission-file" onchange="previewImage(this,\'ab-mission-img-preview\')">' +
            '<input type="text" class="url-input" id="ab-mission-url" placeholder="or paste image URL" value="' + esc(a.missionImage || "") + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Mission Text (one paragraph per line)</label><textarea id="ab-mission-text" style="min-height:120px;">' + esc((a.missionText || []).join("\n")) + '</textarea></div>' +
      '</div>' +

      '<div class="admin-form">' +
        '<h3>Values Section</h3>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Values Section Title</label><input type="text" id="ab-values-title" value="' + esc(a.valuesTitle || "") + '"></div>' +
        '<div class="itinerary-editor">' +
          '<h4 style="margin-bottom:12px;color:#0B9BAE;">Value Cards</h4>' +
          '<div id="ab-values-list">' + valuesHTML + '</div>' +
          '<button class="btn-add-day" onclick="addAboutValue()">+ Add Value</button>' +
        '</div>' +
      '</div>' +

      '<div class="admin-form">' +
        '<h3>Stats Section</h3>' +
        '<div class="form-field" style="margin-bottom:16px;"><label>Stats Section Title</label><input type="text" id="ab-stats-title" value="' + esc(a.statsTitle || "") + '"></div>' +
        '<div class="gallery-editor">' +
          '<h4 style="margin-bottom:12px;color:#0B9BAE;">Stat Items</h4>' +
          '<div id="ab-stats-list">' + statsHTML + '</div>' +
          '<button class="btn-add-gallery" onclick="addAboutStat()">+ Add Stat</button>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:12px;margin-top:20px;">' +
        '<button class="btn-save" onclick="saveAbout()">Save About Page</button>' +
      '</div>';
  }

  window.addAboutValue = function () {
    var list = document.getElementById("ab-values-list");
    var count = list.children.length;
    var div = document.createElement("div");
    div.innerHTML =
      '<div class="itinerary-day-edit" data-val-index="' + count + '">' +
        '<div class="itinerary-day-edit__header">' +
          '<span>Value ' + (count + 1) + '</span>' +
          '<button class="btn-remove-day" onclick="this.closest(\'.itinerary-day-edit\').remove()">Remove</button>' +
        '</div>' +
        '<div class="form-row" style="margin-bottom:8px;">' +
          '<div class="form-field"><label>Icon (1-2 letters)</label><input type="text" class="ab-val-icon" value="" maxlength="3" style="max-width:80px;"></div>' +
          '<div class="form-field"><label>Title</label><input type="text" class="ab-val-title" value=""></div>' +
        '</div>' +
        '<div class="form-field"><label>Description</label><textarea class="ab-val-desc" style="min-height:60px;"></textarea></div>' +
      '</div>';
    list.appendChild(div.firstChild);
  };

  window.addAboutStat = function () {
    var list = document.getElementById("ab-stats-list");
    var div = document.createElement("div");
    div.innerHTML =
      '<div class="gallery-editor__item">' +
        '<input type="text" class="ab-stat-number" value="" placeholder="e.g. 50K+" style="max-width:120px;">' +
        '<input type="text" class="ab-stat-label" value="" placeholder="e.g. Happy Travelers">' +
        '<button class="btn-remove-gallery" onclick="this.parentElement.remove()">Remove</button>' +
      '</div>';
    list.appendChild(div.firstChild);
  };

  function collectAboutValues() {
    var rows = document.querySelectorAll("#ab-values-list .itinerary-day-edit");
    var result = [];
    rows.forEach(function (row) {
      var icon = row.querySelector(".ab-val-icon").value;
      var title = row.querySelector(".ab-val-title").value;
      var desc = row.querySelector(".ab-val-desc").value;
      if (title) result.push({ icon: icon, title: title, desc: desc });
    });
    return result;
  }

  function collectAboutStats() {
    var rows = document.querySelectorAll("#ab-stats-list .gallery-editor__item");
    var result = [];
    rows.forEach(function (row) {
      var number = row.querySelector(".ab-stat-number").value.trim();
      var label = row.querySelector(".ab-stat-label").value.trim();
      if (number || label) result.push({ number: number, label: label });
    });
    return result;
  }

  function textareaToLines(id) {
    var el = document.getElementById(id);
    if (!el) return [];
    return el.value.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }

  window.saveAbout = function () {
    /* Check for file uploads */
    var heroFile = document.getElementById("ab-hero-file");
    var storyFile = document.getElementById("ab-story-file");
    var missionFile = document.getElementById("ab-mission-file");

    var pending = 0;
    var heroPath = null, storyPath = null, missionPath = null;

    function trySave() {
      if (pending > 0) return;
      var data = {
        heroImage: heroPath || document.getElementById("ab-hero-url").value,
        heroTitle: document.getElementById("ab-hero-title").value,
        heroSubtitle: document.getElementById("ab-hero-subtitle").value,
        storyTitle: document.getElementById("ab-story-title").value,
        storyImage: storyPath || document.getElementById("ab-story-url").value,
        storyText: textareaToLines("ab-story-text"),
        missionTitle: document.getElementById("ab-mission-title").value,
        missionImage: missionPath || document.getElementById("ab-mission-url").value,
        missionText: textareaToLines("ab-mission-text"),
        valuesTitle: document.getElementById("ab-values-title").value,
        values: collectAboutValues(),
        statsTitle: document.getElementById("ab-stats-title").value,
        aboutStats: collectAboutStats()
      };

      apiPut("/about", data).then(function (res) {
        about = res;
        toast("About page saved! Refresh the website to see changes.");
      }).catch(function () {
        toast("Failed to save about page", true);
      });
    }

    if (heroFile && heroFile.files[0]) { pending++; uploadImage(heroFile.files[0], function (p) { heroPath = p; pending--; trySave(); }); }
    if (storyFile && storyFile.files[0]) { pending++; uploadImage(storyFile.files[0], function (p) { storyPath = p; pending--; trySave(); }); }
    if (missionFile && missionFile.files[0]) { pending++; uploadImage(missionFile.files[0], function (p) { missionPath = p; pending--; trySave(); }); }
    trySave();
  };

  /* ---- Expose logout to global ---- */
  window.adminLogout = logout;

  /* ============================================
     DATA EXPORT / IMPORT
     ============================================ */
  function exportData() {
    apiGet("/data").then(function (data) {
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "voya-backup-" + new Date().toISOString().slice(0,10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Data exported! File downloaded.");
    }).catch(function () {
      toast("Export failed — are you logged in?", true);
    });
  }

  function importData(fileInput) {
    var file = fileInput.files[0];
    if (!file) return;
    var statusEl = document.getElementById("import-status");
    statusEl.style.color = "#6b7280";
    statusEl.textContent = "Reading file...";

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        statusEl.textContent = "Importing data...";
        var sep = "/import".indexOf("?") >= 0 ? "&" : "?";
        fetch(API + "/import" + sep + "token=" + encodeURIComponent(token), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.success) {
              statusEl.style.color = "#16a34a";
              statusEl.textContent = "✅ Import successful! Reloading...";
              toast("Data imported! Reloading page...");
              setTimeout(function () { location.reload(); }, 1500);
            } else {
              statusEl.style.color = "#dc2626";
              statusEl.textContent = "❌ Import failed: " + (res.error || "Unknown error");
            }
          }).catch(function () {
            statusEl.style.color = "#dc2626";
            statusEl.textContent = "❌ Import failed — server error.";
          });
      } catch (err) {
        statusEl.style.color = "#dc2626";
        statusEl.textContent = "❌ Invalid JSON file: " + err.message;
      }
    };
    reader.readAsText(file);
    fileInput.value = "";
  }

  window.exportData = exportData;
  window.importData = importData;

  /* ============================================
     INIT
     ============================================ */
  checkSession();

})();

/* ============================================
   Voya Travel - Admin Panel Logic
   Handles CRUD operations for products,
   promotions, and journal entries via API.
   ============================================ */

(function () {
  "use strict";

  var API = "/api";
  var products = [];
  var promotions = [];
  var journal = [];

  /* ---- Toast notification ---- */
  function toast(msg, isError) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show" + (isError ? " error" : "");
    setTimeout(function () { el.className = "toast"; }, 3000);
  }

  /* ---- API helpers ---- */
  function apiGet(path) {
    return fetch(API + path).then(function (r) { return r.json(); });
  }
  function apiPost(path, body) {
    return fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function apiPut(path, body) {
    return fetch(API + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function apiDelete(path) {
    return fetch(API + path, { method: "DELETE" }).then(function (r) { return r.json(); });
  }

  /* ---- Image upload (base64 to server) ---- */
  function uploadImage(file, callback) {
    if (!file) { callback(null); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      apiPost("/upload", { name: file.name, data: e.target.result }).then(function (res) {
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
      journal = data.journal || [];
      renderProducts();
      renderPromos();
      renderJournal();
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
        saveAmount: parseInt(document.getElementById("pf-save").value) || 0
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
     INIT
     ============================================ */
  loadAll();

})();

// js/purchase.js (FINAL MERGED + PRODUCT CHART)

// ===== Data =====
let inventory = JSON.parse(localStorage.getItem("inventory")) || {};
let purchases = JSON.parse(localStorage.getItem("purchases")) || [];
let filterDate = "";
let purchaseChart = null;
let productChart = null;
let editIndex = -1; // -1 means "create new", otherwise index of purchase being edited

// ===== Save Data =====
function saveData() {
  localStorage.setItem("inventory", JSON.stringify(inventory));
  localStorage.setItem("purchases", JSON.stringify(purchases));
}

// ===== Populate Product Dropdown =====
function renderProductSelect() {
  const select = document.getElementById("productSelect");
  if (!select) return;
  select.innerHTML = `<option value="">-- select item --</option>`;
  Object.keys(inventory).forEach(item => {
    let opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

// ===== Inventory Summary (with badges + edit buttons) =====
function renderInventorySummary() {
  const summaryContainer = document.getElementById("inventorySummary");
  const countBadge = document.getElementById("productCountBadge");
  const unitBadge = document.getElementById("unitCountBadge");
  if (!summaryContainer) return;

  summaryContainer.innerHTML = "";

  let totalUnits = 0;
  let productCount = 0;

  Object.keys(inventory).forEach((productName) => {
    const units = inventory[productName] || 0;
    totalUnits += units;
    productCount++;

    const card = document.createElement("div");
    card.className = "summary-item";
    card.innerHTML = `
      <strong class="product-name">${productName}</strong>
      <p>Units: ${units}</p>
      <button class="edit-btn" data-product="${productName}">✏️ Edit</button>
    `;
    summaryContainer.appendChild(card);
  });

  if (countBadge) countBadge.textContent = `${productCount} items`;
  if (unitBadge) unitBadge.textContent = `${totalUnits} units`;

  // Attach edit button listeners
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const oldName = e.target.dataset.product;
      editProductName(oldName);
    });
  });
}

// ===== Edit Product Name =====
function editProductName(oldName) {
  const newName = prompt("Enter new product name:", oldName);
  if (!newName || newName === oldName) return;

  if (inventory[newName]) {
    alert("A product with this name already exists!");
    return;
  }

  inventory[newName] = inventory[oldName];
  delete inventory[oldName];

  purchases = purchases.map(p =>
    p.item === oldName ? { ...p, item: newName } : p
  );

  saveData();
  renderInventorySummary();
  renderPurchases();
  renderProductSelect();
}

// ===== Update Total Spent =====
function updateTotalSpent() {
  const total = purchases.reduce((sum, p) => sum + (p.qty * p.price), 0);
  const el = document.getElementById("totalSpentCard");
  if (el) el.innerHTML = `<h4>Total Spent</h4><p>₹${total.toLocaleString("en-IN")}</p>`;
}

// ===== Update Today's Purchases =====
function updateTodaySpent() {
  const todayLocal = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const total = purchases
    .filter(p => new Date(p.date).toLocaleDateString("en-CA") === todayLocal)
    .reduce((sum, p) => sum + (p.qty * p.price), 0);

  const el = document.getElementById("todaySpentCard");
  if (el) el.innerHTML = `<h4>Today's Purchases</h4><p>₹${total.toLocaleString("en-IN")}</p>`;
}


// ===== Update This Month's Purchases =====
function updateMonthSpent() {
  const ym = new Date().toISOString().slice(0, 7);
  const total = purchases
    .filter(p => p.date.startsWith(ym))
    .reduce((sum, p) => sum + (p.qty * p.price), 0);

  const el = document.getElementById("monthSpentCard");
  if (el) el.innerHTML = `<h4>This Month's Purchases</h4><p>₹${total.toLocaleString("en-IN")}</p>`;
}

// ===== Update Last Month's Purchases =====
function updateLastMonthSpent() {
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const total = purchases
    .filter(p => p.date.startsWith(lastMonth))
    .reduce((sum, p) => sum + (p.qty * p.price), 0);

  const el = document.getElementById("lastMonthSpentCard");
  if (el) el.innerHTML = `<h4>Last Month's Purchases</h4><p>₹${total.toLocaleString("en-IN")}</p>`;
}

// ===== Chart.js - Purchases Chart (Today/This/Last Month) =====
function updatePurchaseChart() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  const todayLocal = now.toLocaleDateString("en-CA");

const todayTotal = purchases
  .filter(p => new Date(p.date).toLocaleDateString("en-CA") === todayLocal)
  .reduce((sum, p) => sum + (p.qty * p.price), 0);

  const thisMonthTotal = purchases
    .filter(p => p.date.startsWith(thisMonth))
    .reduce((sum, p) => sum + (p.qty * p.price), 0);

  const lastMonthTotal = purchases
    .filter(p => p.date.startsWith(lastMonth))
    .reduce((sum, p) => sum + (p.qty * p.price), 0);

  const ctxEl = document.getElementById("purchaseChart");
  if (!ctxEl) return;
  const ctx = ctxEl.getContext("2d");

  if (purchaseChart) purchaseChart.destroy();

  purchaseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Today", "This Month", "Last Month"],
      datasets: [{
        label: "Purchases (₹)",
        data: [todayTotal, thisMonthTotal, lastMonthTotal],
        backgroundColor: ["#e74c3c", "#3498db", "#2ecc71"],
        barThickness: 36,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => `₹${value.toLocaleString("en-IN")}`
          }
        }
      }
    }
  });
}

// ===== Product Chart (per-item Quantity + Amount) =====
function updateProductChart() {
  const totals = {};

  purchases.forEach(p => {
    if (!totals[p.item]) {
      totals[p.item] = { qty: 0, amount: 0 };
    }
    totals[p.item].qty += p.qty;
    totals[p.item].amount += p.qty * p.price;
  });

  const labels = Object.keys(totals);
  const qtyData = labels.map(l => totals[l].qty);
  const amountData = labels.map(l => totals[l].amount);

  const ctxEl = document.getElementById("productChart");
  if (!ctxEl) return;
  const ctx = ctxEl.getContext("2d");

  if (productChart) productChart.destroy();

  productChart = new Chart(ctx, {
     type: "bar",
  data: {
    labels,
    datasets: [
      {
        label: "Quantity",
        data: qtyData,
        backgroundColor: "#3498db",
        yAxisID: "y1"
      },
      {
        label: "Amount (₹)",
        data: amountData,
        backgroundColor: "#e67e22",
        yAxisID: "y2"
      }
    ]
  },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: {
        y1: {
          beginAtZero: true,
          position: "left",
          title: { display: true, text: "Quantity" }
        },
        y2: {
          beginAtZero: true,
          position: "right",
          title: { display: true, text: "Amount (₹)" },
          ticks: {
            callback: value => `₹${value.toLocaleString("en-IN")}`
          },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

// ===== Render Purchases (grid cards) =====
function renderPurchases() {
  const container = document.getElementById("purchaseRecords");
  if (!container) return;

  let list = purchases.slice();
  if (filterDate) list = list.filter(p => p.date.startsWith(filterDate));

  if (list.length === 0) {
    container.innerHTML = "<p>No purchase records.</p>";
  } else {
    container.innerHTML = list.map(p => {
      const globalIndex = purchases.indexOf(p);
      return `
        <div class="record-card">
          <h4>${p.item}</h4>
          <p>Qty: ${p.qty}</p>
          <p>₹${p.price} each</p>
          <p>Total: ₹${p.qty * p.price}</p>
          <small>${new Date(p.date).toLocaleDateString()}</small>
          <div class="actions">
            <button class="edit" onclick="editPurchase(${globalIndex})">Edit</button>
            <button class="delete" onclick="deletePurchase(${globalIndex})">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  updateTotalSpent();
  updateTodaySpent();
  updateMonthSpent();
  updateLastMonthSpent();
  updatePurchaseChart();
  updateProductChart();
  renderInventorySummary();
  renderProductSelect();
}

// ===== Utility: clear input form =====
function clearForm() {
  const select = document.getElementById("productSelect");
  const qtyInput = document.getElementById("quantityInput");
  const priceInput = document.getElementById("priceInput");
  if (select) select.value = "";
  if (qtyInput) qtyInput.value = 1;
  if (priceInput) priceInput.value = 0;
  editIndex = -1;
  const saveBtn = document.getElementById("savePurchaseBtn");
  if (saveBtn) saveBtn.textContent = "Add / Update Purchase";
}

// ===== Add / Update Purchase =====
document.getElementById("savePurchaseBtn").addEventListener("click", () => {
  const product = document.getElementById("productSelect").value;
  const qty = parseFloat(document.getElementById("quantityInput").value);
  const price = parseFloat(document.getElementById("priceInput").value);

  if (!product || isNaN(qty) || isNaN(price)) {
    alert("Please fill all fields.");
    return;
  }

  if (editIndex === -1) {
    inventory[product] = (inventory[product] || 0) + qty;
    purchases.push({ item: product, qty, price, date: new Date().toISOString() });
  } else {
    const old = purchases[editIndex];
    if (!old) {
      alert("Unable to find purchase to edit.");
      editIndex = -1;
      clearForm();
      return;
    }

    if (inventory[old.item]) {
      inventory[old.item] = inventory[old.item] - old.qty;
      if (inventory[old.item] < 0) inventory[old.item] = 0;
    }

    inventory[product] = (inventory[product] || 0) + qty;
    purchases[editIndex] = { item: product, qty, price, date: old.date };
  }

  saveData();
  clearForm();
  renderProductSelect();
  renderPurchases();
});


// ===== Add New Item =====
document.getElementById("newItemBtn").addEventListener("click", () => {
  let name = prompt("Enter new item name:");
  if (!name) return;
  if (!inventory[name]) inventory[name] = 0;
  saveData();
  renderProductSelect();
  renderPurchases();
});

// ===== Filter Purchases =====
document.getElementById("applyFilterBtn").addEventListener("click", () => {
  filterDate = document.getElementById("filterDate").value;
  renderPurchases();
});
document.getElementById("clearFilterBtn").addEventListener("click", () => {
  filterDate = "";
  document.getElementById("filterDate").value = "";
  renderPurchases();
});

// ===== Delete Purchase =====
function deletePurchase(index) {
  if (!confirm("Delete this purchase?")) return;
  const record = purchases[index];
  if (record && inventory[record.item] !== undefined) {
    inventory[record.item] = inventory[record.item] - record.qty;
    if (inventory[record.item] < 0) inventory[record.item] = 0;
  }
  purchases.splice(index, 1);
  saveData();
  renderProductSelect();
  renderPurchases();
}

// ===== Edit Purchase =====
function editPurchase(index) {
  const p = purchases[index];
  if (!p) return alert("Purchase not found.");

  document.getElementById("productSelect").value = p.item;
  document.getElementById("quantityInput").value = p.qty;
  document.getElementById("priceInput").value = p.price;

  editIndex = index;
  const saveBtn = document.getElementById("savePurchaseBtn");
  if (saveBtn) saveBtn.textContent = "Update Purchase";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== Reset Inventory =====
document.getElementById("resetInventoryBtn").addEventListener("click", () => {
  if (!confirm("Reset all product units to 0?")) return;
  Object.keys(inventory).forEach(k => inventory[k] = 0);
  saveData();
  renderPurchases();
});

// ===== Initial Render =====
renderProductSelect();
renderPurchases();

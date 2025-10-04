// ====== Initialize ======
let orders = JSON.parse(localStorage.getItem("orders")) || [];
let filterDate = "";
let billSearch = "";
let typeFilter = "";
let custNameSearch = "";
let custPhoneSearch = "";
let minAmount = 0, maxAmount = Infinity;

// cart safety (needed for KOT section)
let cart = window.cart || [];

// Pagination
let currentPage = 1;
const pageSize = 10;

// ===== Helper: Filter Orders =====
function getFilteredOrders() {
  return orders.filter(order => {
    let orderDate = new Date(order.date).toISOString().split("T")[0];
    let matchDate = !filterDate || orderDate === filterDate;
    let matchBill = !billSearch || (order.billNo + "").includes(billSearch);
    let matchType = !typeFilter || order.type === typeFilter;
    let matchAmount = (!minAmount || order.total >= minAmount) && (!maxAmount || order.total <= maxAmount);
    let matchCustName = !custNameSearch || (order.customer?.name || "").toLowerCase().includes(custNameSearch.toLowerCase());
    let matchCustPhone = !custPhoneSearch || (order.customer?.phone || "").includes(custPhoneSearch);
    return matchDate && matchBill && matchType && matchAmount && matchCustName && matchCustPhone;
  });
}

// ===== Summary Section =====
function renderSummary() {
  const container = document.getElementById("summary");
  if (!container) return;

  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter(o => o.date.startsWith(today));
  const totalOrders = todayOrders.length;
  const totalRevenue = todayOrders.reduce((sum,o)=>sum+o.total,0);
  const avgBill = totalOrders ? (totalRevenue/totalOrders).toFixed(2) : 0;

  // most sold item
  let itemCounts = {};
  todayOrders.forEach(o => o.items.forEach(i => {
    itemCounts[i.name] = (itemCounts[i.name]||0) + i.qty;
  }));
  let topItem = Object.entries(itemCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "-";

  container.innerHTML = `
    <div class="card">Today's Orders: <strong>${totalOrders}</strong></div>
    <div class="card">Revenue: <strong>₹${totalRevenue}</strong></div>
    <div class="card">Avg Bill: <strong>₹${avgBill}</strong></div>
    <div class="card">Top Item: <strong>${topItem}</strong></div>
  `;
}

// ===== Render Orders =====
function renderOrders() {
  const container = document.getElementById("ordersList");
  container.innerHTML = "";

  let filtered = getFilteredOrders().slice().reverse();

  // pagination
  let start = (currentPage-1)*pageSize;
  let pageOrders = filtered.slice(start, start+pageSize);

  if (pageOrders.length === 0) {
    container.innerHTML = "<p>No orders found.</p>";
  } else {
    pageOrders.forEach((order) => {
      let date = new Date(order.date).toLocaleString();
      let index = orders.findIndex(o => o.date === order.date && o.billNo === order.billNo);
      let div = document.createElement("div");
      div.className = "order-card";
      div.innerHTML = `
        <h3>Bill No: ${order.billNo || "-"} (${order.type || "BILL"}) - ${date}</h3>
        <ul>
          ${order.items.map(i=>`<li>${i.name} - ₹${i.price} x ${i.qty} = ₹${i.price*i.qty}</li>`).join("")}
        </ul>
        <p><strong>Total: ₹${order.total}</strong></p>
        <button onclick="printInvoice(${index})">🖨 Print</button>
        <button onclick="editOrder(${index})">✏️ Edit</button>
        <button onclick="duplicateOrder(${index})">📄 Duplicate</button>
        <button onclick="deleteOrder(${index})">🗑 Delete</button>
      `;
      container.appendChild(div);
    });
  }

  // pagination controls
  let totalPages = Math.ceil(filtered.length/pageSize);
  const pg = document.getElementById("pagination");
  pg.innerHTML = "";
  if (totalPages > 1) {
    for (let i=1;i<=totalPages;i++) {
      pg.innerHTML += `<button onclick="goPage(${i})" ${i===currentPage?"style='font-weight:bold'":""}>${i}</button>`;
    }
  }

  renderSummary();
}

// ===== Pagination Navigation =====
function goPage(p) {
  currentPage = p;
  renderOrders();
}

// ===== Delete Order =====
function deleteOrder(index) {
  if (!confirm("Delete this order?")) return;
  orders.splice(index,1);
  localStorage.setItem("orders", JSON.stringify(orders));
  renderOrders();
}

// ===== Edit Order =====
function editOrder(index) {
  let order = orders[index];
  let newTotal = prompt("Enter new total amount:", order.total);
  if (!newTotal) return;
  order.total = parseFloat(newTotal);
  localStorage.setItem("orders", JSON.stringify(orders));
  renderOrders();
}

// ===== Print Invoice =====
function printInvoice(index) {
  let order = orders[index];
  let html = `
    <h2>Street Magic Restaurant</h2>
    <p>Date: ${new Date(order.date).toLocaleString()}</p>
    <p>Bill No: ${order.billNo}</p>
    <hr>
    <ul>
      ${order.items.map(i=>`<li>${i.name} - ₹${i.price} x ${i.qty} = ₹${i.price*i.qty}</li>`).join("")}
    </ul>
    <hr>
    <h3>Total: ₹${order.total}</h3>
    <p>Thank you, Visit Again!</p>
  `;
  let w = window.open("","_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

// ===== Export to PDF =====
document.getElementById("exportPDF")?.addEventListener("click",()=>{
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let y = 10;
  doc.text("Street Magic Orders Report", 10,y);
  y+=10;

  getFilteredOrders().forEach((order)=>{
    doc.text(`Bill: ${order.billNo} (${order.type}) - ${new Date(order.date).toLocaleString()}`,10,y);
    y+=8;
    order.items.forEach(i=>{
      doc.text(`  ${i.name} - ₹${i.price} x ${i.qty} = ₹${i.price*i.qty}`,10,y);
      y+=6;
    });
    doc.text(`Total: ₹${order.total}`,10,y);
    y+=10;
    if (y>280) { doc.addPage(); y=10; }
  });

  doc.save("OrdersReport.pdf");
});

// ===== Duplicate Order =====
function duplicateOrder(index) {
  let copy = JSON.parse(JSON.stringify(orders[index]));
  copy.billNo = (parseInt(localStorage.getItem("billCounter")||3940)+1);
  localStorage.setItem("billCounter", copy.billNo);
  copy.date = new Date().toISOString();
  orders.push(copy);
  localStorage.setItem("orders", JSON.stringify(orders));
  renderOrders();
}

// ===== Filters =====
document.getElementById("applyFilters")?.addEventListener("click",()=>{
  filterDate = document.getElementById("orderDate").value;
  billSearch = document.getElementById("billSearch").value;
  typeFilter = document.getElementById("typeFilter").value;
  custNameSearch = document.getElementById("custNameSearch").value;
  custPhoneSearch = document.getElementById("custPhoneSearch").value;
  minAmount = parseFloat(document.getElementById("minAmount").value) || 0;
  maxAmount = parseFloat(document.getElementById("maxAmount").value) || Infinity;
  currentPage = 1;
  renderOrders();
});

document.getElementById("clearFilter")?.addEventListener("click",()=>{
  filterDate=""; billSearch=""; typeFilter=""; custNameSearch=""; custPhoneSearch="";
  minAmount=0; maxAmount=Infinity;
  ["orderDate","billSearch","typeFilter","custNameSearch","custPhoneSearch","minAmount","maxAmount"].forEach(id=>{
    if(document.getElementById(id)) document.getElementById(id).value="";
  });
  renderOrders();
});

// ===== Export to Excel =====
document.getElementById("exportExcel")?.addEventListener("click", () => {
  let filteredOrders = getFilteredOrders();
  if (filteredOrders.length === 0) return alert("No orders to export.");

  let data = [];
  filteredOrders.forEach((order, index) => {
    order.items.forEach(item => {
      data.push({
        OrderNo: index + 1,
        Date: new Date(order.date).toLocaleString(),
        Item: item.name,
        Price: item.price,
        Quantity: item.qty,
        Total: item.price * item.qty
      });
    });
    data.push({
      OrderNo: index + 1,
      Date: "",
      Item: "TOTAL",
      Price: "",
      Quantity: "",
      Total: order.total
    });
  });

  let ws = XLSX.utils.json_to_sheet(data);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "OrdersReport.xlsx");
});

// ===== Backup & Restore =====
document.getElementById("backupOrders")?.addEventListener("click",()=>{
  let blob = new Blob([JSON.stringify(orders)],{type:"application/json"});
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "orders_backup.json";
  a.click();
});

document.getElementById("restoreBtn")?.addEventListener("click",()=>{
  document.getElementById("restoreOrders").click();
});

document.getElementById("restoreOrders")?.addEventListener("change",(e)=>{
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = ev=>{
    try {
      orders = JSON.parse(ev.target.result);
      localStorage.setItem("orders", JSON.stringify(orders));
      renderOrders();
      alert("Orders restored!");
    } catch(err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
});

// ===== Reset Orders =====
document.getElementById("resetOrders")?.addEventListener("click",()=>{
  if (!confirm("Are you sure? This will clear ALL orders and reset Bill No.")) return;
  orders = [];
  localStorage.setItem("orders", JSON.stringify(orders));
  localStorage.setItem("billCounter",3940);
  renderOrders();
});

// ===== KOT Print & Save =====
document.getElementById("kotBtn")?.addEventListener("click", () => {
  if (!cart || cart.length === 0) return alert("Cart is empty!");

  let kotBill = `
    <h2>Street Magic - KOT</h2>
    <p>${new Date().toLocaleString()}</p>
    <ul>
      ${cart.map(c => `<li>${c.name} x ${c.qty}</li>`).join("")}
    </ul>
  `;

  orders.push({ date: new Date().toISOString(), items: [...cart], total: 0, type: "KOT" });
  localStorage.setItem("orders", JSON.stringify(orders));

  let prevEl = document.getElementById("previousOrder");
  if(prevEl) prevEl.innerHTML = cart.map(c => `${c.name} x ${c.qty}`).join("<br>");

  let kotWindow = window.open("", "_blank");
  kotWindow.document.write(kotBill);
  kotWindow.document.close();
  kotWindow.print();

  cart = [];
  if(typeof renderCart==="function") renderCart();
});

// ===== Init =====
document.addEventListener("DOMContentLoaded",()=>renderOrders());

// ===== Edit Order (with items + add new + live total update) =====
function editOrder(index) {
  let order = orders[index];

  // Modal container
  let modal = document.createElement("div");
  modal.className = "modal-overlay";

  let box = document.createElement("div");
  box.className = "modal-box";

  // Build form
  box.innerHTML = `
    <h2>Edit Order - Bill No: ${order.billNo}</h2>
    <label>Total: <input type="number" id="editTotal" value="${order.total}" step="0.01" readonly/></label>
    <h3>Items:</h3>
    <div id="editItems">
      ${order.items.map((i, idx) => renderEditItem(i, idx)).join("")}
    </div>
    <button id="addItemBtn" class="btn-secondary">+ Add Item</button>
    <div class="modal-actions">
      <button id="saveEdit" class="btn-primary">💾 Save</button>
      <button id="cancelEdit" class="btn-cancel">❌ Cancel</button>
    </div>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  // Handle Add Item
  document.getElementById("addItemBtn").onclick = () => {
    let container = document.getElementById("editItems");
    let idx = container.querySelectorAll(".edit-item").length;
    container.insertAdjacentHTML("beforeend", renderEditItem({name: "", price: 0, qty: 1}, idx));
    updateLiveTotal();
  };

  // Save button
  box.querySelector("#saveEdit").onclick = () => {
    let newItems = [];
    document.querySelectorAll(".edit-item").forEach(row => {
      let name = row.querySelector(".item-name").value.trim();
      let price = parseFloat(row.querySelector(".item-price").value) || 0;
      let qty = parseInt(row.querySelector(".item-qty").value) || 1;
      if (name) newItems.push({ name, price, qty });
    });

    order.items = newItems;
    order.total = newItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    localStorage.setItem("orders", JSON.stringify(orders));
    renderOrders();
    modal.remove();
  };

  // Cancel button
  box.querySelector("#cancelEdit").onclick = () => modal.remove();

  // Live update total when inputs change
  modal.addEventListener("input", e => {
    if (e.target.classList.contains("item-price") || e.target.classList.contains("item-qty")) {
      updateLiveTotal();
    }
  });

  updateLiveTotal();
}

// ===== Helper: Render an item row =====
function renderEditItem(item, idx) {
  return `
    <div class="edit-item">
      <input type="text" class="item-name" value="${item.name}" placeholder="Item Name"/>
      <input type="number" class="item-price" value="${item.price}" step="0.01" placeholder="Price"/>
      <input type="number" class="item-qty" value="${item.qty}" placeholder="Qty"/>
      <button class="remove-item">🗑</button>
    </div>
  `;
}

// ===== Auto-update total =====
function updateLiveTotal() {
  let newTotal = 0;
  document.querySelectorAll(".edit-item").forEach(row => {
    let price = parseFloat(row.querySelector(".item-price")?.value) || 0;
    let qty = parseInt(row.querySelector(".item-qty")?.value) || 1;
    newTotal += price * qty;
  });
  let totalInput = document.getElementById("editTotal");
  if (totalInput) totalInput.value = newTotal.toFixed(2);
}

// ===== Remove item (event delegation) =====
document.addEventListener("click", e => {
  if (e.target.classList.contains("remove-item")) {
    e.target.closest(".edit-item").remove();
    updateLiveTotal();
  }
});



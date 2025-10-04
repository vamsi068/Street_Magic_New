// ================================
// 🔹 GLOBAL VARIABLES (INTEGRATED)
// ================================
let menuItems = JSON.parse(localStorage.getItem("menuItems")) || [
    { name: "Classic Burger", price: 120, category: "Food", subcategory: "Burger" },
    { name: "Chicken Pizza", price: 250, category: "Food", subcategory: "Pizza" },
    { name: "Vanilla Ice Cream", price: 80, category: "Dessert", subcategory: "Ice Cream" }
];

let menu = [{name:"Pizza", price:200, stock:10}];


let cart = []; // Current cart for the selected table/takeaway
let orders = JSON.parse(localStorage.getItem("orders")) || [];
let liveTables = JSON.parse(localStorage.getItem('liveTables')) || {}; // { "Table 1": [ {item, qty, price}, ...], "Table 2": [...] }
let editIndex = -1;
let selectedCategory = null;
let currentTable = 'Takeaway'; // Default

// DOM Elements
const cartList = document.getElementById("cartList");
const tableSelect = document.getElementById("tableSelect");
const liveTableBtn = document.getElementById('liveTableBtn');
const liveTableModal = document.getElementById('liveTableModal');
const closeTableModal = document.getElementById('closeTableModal');
const tableButtons = document.querySelectorAll('.table-btn');
const discountInput = document.getElementById("discountInput");


// ================================
// 🔹 TABLE BILLS/TOTALS MANAGEMENT (NEW)
// ================================

// 🔹 Get table data from localStorage
function getTableBills() {
    return JSON.parse(localStorage.getItem("tableBills")) || {};
}

// 🔹 Save table data to localStorage
function saveTableBills(bills) {
    localStorage.setItem("tableBills", JSON.stringify(bills));
}

// 🔹 Update table total displays in modal
function updateLiveTableTotals() {
    const bills = getTableBills();
    for (let i = 1; i <= 8; i++) {
        const key = `Table ${i}`; // keep space for data lookup
        const amount = bills[key]?.total?.toFixed(2) || '0.00';
        const el = document.getElementById(`total-Table${i}`); // ✅ no space
        if (el) el.textContent = `₹${amount}`;
    }
}



// ================================
// 🔹 LIVE TABLE MODAL (INTEGRATED)
// ================================
if (liveTableBtn) {
    // Merged: Existing click + call to updateLiveTableTotals
    liveTableBtn.addEventListener('click', () => {
        if (liveTableModal) liveTableModal.style.display = 'block';
        updateLiveTableTotals();
    });
}
if (closeTableModal) {
    // Merged: Existing close logic
    closeTableModal.addEventListener('click', () => {
        if (liveTableModal) liveTableModal.style.display = 'none';
    });
}
// Merged: Window click logic
window.onclick = e => { if (e.target === liveTableModal) liveTableModal.style.display = 'none'; };


tableButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Save previous table's cart before switching
        if (cart.length > 0 && currentTable !== 'Takeaway') {
            liveTables[currentTable] = cart;
        }

        currentTable = btn.getAttribute('data-table');
        if (tableSelect) tableSelect.value = currentTable;

        // Load new table's cart
        cart = liveTables[currentTable] || [];

        renderCart();
        updateTableStatusDisplay();
        if (liveTableModal) liveTableModal.style.display = 'none';
    });
});


function updateTableStatusDisplay() {
    tableButtons.forEach(btn => {
        const tableName = btn.getAttribute('data-table');
        const hasItems = liveTables[tableName]?.length > 0;
        btn.classList.toggle('occupied', hasItems);
        btn.classList.toggle('active-table', tableName === currentTable);
    });
    updateLiveTableTotals(); // refresh totals on any table change
}



// ================================
// 🔹 CART FUNCTIONS (MODIFIED TO SUPPORT LIVE TABLES)
// ================================

// Replaces the simplified addToCart with the original, adding save logic
function addToCart(item) {
    let existing = cart.find(c => c.name === item.name && c.price === item.price);
    if (existing) existing.qty++;
    else cart.push({...item, qty:1});
    renderCart();
    saveCartToLiveTable();
}
window.addToCart = addToCart; // for inline buttons


// Replaces the simplified updateQty with the original, adding save logic
function updateQty(key, change) {
    // Split the unique key back to name & price
    const [name, priceStr] = key.split("::");
    const price = parseFloat(priceStr);

    // Find the correct item in the cart
    let item = cart.find(c => c.name === name && c.price === price);
    if (!item) return;

    item.qty += change;
    if (item.qty <= 0) {
        cart = cart.filter(c => !(c.name === name && c.price === price));
    }

    saveCartToLiveTable();
    renderCart();
}


function saveCartToLiveTable() {
    if (currentTable !== 'Takeaway') {
        liveTables[currentTable] = cart.length > 0 ? cart : [];
        localStorage.setItem('liveTables', JSON.stringify(liveTables));
        updateTableStatusDisplay();
    }
}


// Original renderCart logic, slightly updated for clarity/DOM checks
function renderCart() {
    if (!cartList) return;
    cartList.innerHTML = "";
    let subtotal = 0;
    
    cart.forEach(c => {
        subtotal += c.price * c.qty;
        let li = document.createElement("li");
        
        // Pass item name and price for unique identification in updateQty
        const uniqueKey = `${c.name}::${c.price}`;
        
        li.innerHTML = `${c.name} - ₹${c.price} x ${c.qty}
            <span class="cart-btns">
                <button onclick="updateQty('${uniqueKey}',1)">+</button>
                <button onclick="updateQty('${uniqueKey}',-1)">-</button>
            </span>`;
        cartList.appendChild(li);
    });

    let discount = parseFloat(discountInput?.value) || 0;
    let total = subtotal - discount;

    document.getElementById("cartSubtotal").textContent = subtotal.toFixed(2);
    document.getElementById("cartDiscount").textContent = discount.toFixed(2);
    document.getElementById("cartTotal").textContent = total < 0 ? 0 : total.toFixed(2);
}
if (discountInput) discountInput.addEventListener("input", renderCart);


let billCounter = parseInt(localStorage.getItem("billCounter")) || 3940;

// ✅ Generate next Bill/KOT number
function getNextBillNumber() {
    billCounter++;
    localStorage.setItem("billCounter", billCounter);
    return billCounter;
}

// ================================
// 🔹 KOT PRINT (FIXED)
// ================================
document.getElementById("kotBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Cart is empty!");

    const table = currentTable;
    const kotNo = getNextBillNumber();   // ✅ continuous KOT number
    const now = new Date();
    const date = now.toLocaleDateString("en-GB");
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    orders.push({
        kot: true,
        kotNo,              // ✅ save unique kotNo
        billNo: kotNo,      // ✅ keep same number for lookup
        date: now.toISOString(),
        table,
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        subtotal: cart.reduce((s, c) => s + c.price * c.qty, 0),
        discount: 0,
        total: cart.reduce((s, c) => s + c.price * c.qty, 0),
    });
    localStorage.setItem("orders", JSON.stringify(orders));

    if (currentTable !== 'Takeaway') {
        liveTables[currentTable] = [];
        localStorage.setItem('liveTables', JSON.stringify(liveTables));
        updateTableStatusDisplay();
    }

    // === Print KOT
    let kotText = "      STREET MAGIC\n";
    kotText += `Date: ${date}   ${time}\n`;
    kotText += `KOT No: ${kotNo}   ${table === "Takeaway" ? "Pickup" : table}\n`;
    kotText += "--------------------------------\n";
    kotText += "No. Item                 Qty\n";
    kotText += "--------------------------------\n";

    cart.forEach((c, i) => {
        kotText += `${i + 1}. ${c.name.padEnd(22, " ")} ${c.qty}\n`;
    });

    kotText += "--------------------------------\n";
    kotText += `Total Items: ${cart.length}   Quantity: ${cart.reduce((s, c) => s + c.qty, 0)}\n`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<pre style="font-size:14px">${kotText}</pre>`);
    printWindow.document.close();
    printWindow.print();
});


// 🔹 FINAL BILL PRINT (FIXED)
// ================================
document.getElementById("printBtn")?.addEventListener("click", () => {
    if (cart.length === 0) return alert("Cart is empty!");

    const discount = parseFloat(document.getElementById("discountInput")?.value) || 0;
    const cashPaid = parseFloat(document.getElementById("cashInput")?.value) || 0;
    const onlinePaid = parseFloat(document.getElementById("onlineInput")?.value) || 0;
    const table = currentTable;

    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const total = subtotal - discount;

    if (cashPaid + onlinePaid !== total) {
        return alert(`Cash + Online must equal Total Amount (₹${total.toFixed(2)})`);
    }

    const billNo = getNextBillNumber();   // ✅ continuous Bill number

    orders.push({
        billNo,
        date: new Date().toISOString(),
        items: [...cart],
        subtotal, discount, total, cashPaid, onlinePaid, table
    });
    localStorage.setItem("orders", JSON.stringify(orders));
    renderPreviousBill();

    const bills = getTableBills();
    if (table !== 'Takeaway') {
        bills[table] = { total };
        saveTableBills(bills);
    }

    if (currentTable !== 'Takeaway') {
        delete liveTables[currentTable];
        localStorage.setItem('liveTables', JSON.stringify(liveTables));
        updateTableStatusDisplay();
    }

    // === Print Bill
    let billText = "   *** STREET MAGIC ***\n";
    billText += "------------------------------\n";
    billText += "Bill No: " + billNo + "\n";
    billText += "Date: " + new Date().toLocaleString() + "\n";
    billText += "Table: " + table + "\n";
    billText += "------------------------------\n";
    billText += "Item            Qty   Total\n";
    billText += "------------------------------\n";

    cart.forEach(c => {
        billText += c.name.padEnd(12) + String(c.qty).padStart(3) + "  " + ("₹" + (c.price * c.qty).toFixed(2)).padStart(7) + "\n";
    });

    billText += "------------------------------\n";
    billText += `Subtotal:        ₹${subtotal.toFixed(2)}\n`;
    billText += `Discount:        ₹${discount.toFixed(2)}\n`;
    billText += `TOTAL:           ₹${total.toFixed(2)}\n`;
    billText += `Cash:            ₹${cashPaid.toFixed(2)}\n`;
    billText += `Online:          ₹${onlinePaid.toFixed(2)}\n`;
    billText += "------------------------------\n";
    billText += "   Thank You, Visit Again!\n\n\n\n";

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<pre style="font-size:14px">${billText}</pre>`);
    printWindow.document.close();
    printWindow.print();

    cart = [];
    renderCart();
    updateLiveTableTotals();
});


// ================================
// 🔹 ORIGINAL CODE (UNCHANGED/RESTORED)
// ================================

// ===== DRAG & DROP =====
function enableDragDrop() {
    const items = document.querySelectorAll(".menu-item");
    const grids = document.querySelectorAll(".subcategory-grid");
    let draggedItem = null;

    items.forEach(item => {
        item.addEventListener("dragstart", e => {
            draggedItem = item;
            item.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
        });
        item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            draggedItem = null;
            saveMenuItemsOrder();
        });
    });

    grids.forEach(grid => {
        grid.addEventListener("dragover", e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(grid, e.clientY);
            if (!afterElement) grid.appendChild(draggedItem);
            else grid.insertBefore(draggedItem, afterElement);
        });
        grid.addEventListener("drop", () => {
            const idx = parseInt(draggedItem.dataset.index);
            menuItems[idx].category = grid.dataset.cat;
            menuItems[idx].subcategory = grid.dataset.sub;
        });
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".menu-item:not(.dragging)")];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function saveMenuItemsOrder() {
        const allGrids = document.querySelectorAll(".subcategory-grid");
        let newMenuItems = [];
        allGrids.forEach(grid => {
            Array.from(grid.children).forEach(itemEl => {
                const idx = parseInt(itemEl.dataset.index);
                const menuItem = menuItems[idx];
                menuItem.category = grid.dataset.cat;
                menuItem.subcategory = grid.dataset.sub;
                newMenuItems.push(menuItem);
            });
        });
        menuItems = newMenuItems;
        localStorage.setItem("menuItems", JSON.stringify(menuItems));
    }
}


// ===== Variants Handling =====
document.getElementById("addVariantBtn")?.addEventListener("click", () => {
    addVariantRow();
});

function addVariantRow(size = "", price = "") {
    const container = document.getElementById("variantsContainer");
    if (!container) return;

    let row = document.createElement("div");
    row.className = "variant-row";
    row.innerHTML = `
        <input type="text" class="variant-size" placeholder="Size (e.g., Half)" value="${size}"/>
        <input type="number" class="variant-price" placeholder="Price" value="${price}"/>
        <button type="button" class="remove-variant">x</button>
    `;

    row.querySelector(".remove-variant").addEventListener("click", () => {
        row.remove();
    });

    container.appendChild(row);
}

function getVariantsFromModal() {
    const rows = document.querySelectorAll("#variantsContainer .variant-row");
    let variants = [];
    rows.forEach(r => {
        let size = r.querySelector(".variant-size").value.trim();
        let price = parseFloat(r.querySelector(".variant-price").value);
        if (size && !isNaN(price)) {
            variants.push({ size, price });
        }
    });
    return variants;
}


// ===== Render Categories =====
function renderCategories() {
    const categories = {};
    menuItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = new Set();
        categories[item.category].add(item.subcategory);
    });

    const catList = document.getElementById("categoryList");
    if (!catList) return;
    catList.innerHTML = "";

    for (let cat in categories) {
        let li = document.createElement("li");
        li.textContent = cat;
        li.classList.add("category-item");

        let subList = document.createElement("ul");
        subList.classList.add("subcat-list");

        categories[cat].forEach(sub => {
            let subLi = document.createElement("li");
            subLi.textContent = sub;
            subLi.addEventListener("click", e => {
                e.stopPropagation();
                document.querySelectorAll("#categoryList li").forEach(c => c.classList.remove("expanded"));
                li.classList.add("expanded");
                selectedCategory = { cat, sub };
                renderMenu();
            });
            subList.appendChild(subLi);
        });

        li.appendChild(subList);
        li.addEventListener("click", e => {
            e.stopPropagation();
            document.querySelectorAll("#categoryList li").forEach(c => { if (c !== li) c.classList.remove("expanded"); });
            li.classList.toggle("expanded");
        });

        catList.appendChild(li);
    }
}

// ===== Render Menu =====
function renderMenu() {
    const container = document.getElementById("menuItems");
    if (!container) return;
    container.innerHTML = ""; 

    let filteredItems = menuItems;
    if (selectedCategory) {
        filteredItems = menuItems.filter(item =>
            item.category === selectedCategory.cat &&
            item.subcategory === selectedCategory.sub
        );
    }

    if (filteredItems.length === 0) {
        container.innerHTML = "<p>No items available</p>";
        return;
    }

    let grouped = {};
    filteredItems.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = {};
        if (!grouped[item.category][item.subcategory]) grouped[item.category][item.subcategory] = [];
        grouped[item.category][item.subcategory].push(item);
    });

    for (let cat in grouped) {
        let catDiv = document.createElement("div");
        catDiv.className = "category-section";

        let catHeader = document.createElement("div");
        catHeader.className = "category-header";
        catHeader.textContent = cat;
        catHeader.addEventListener("click", () => catDiv.classList.toggle("collapsed"));
        catDiv.appendChild(catHeader);

        for (let sub in grouped[cat]) {
            let subHeader = document.createElement("div");
            subHeader.className = "subcategory-header";
            subHeader.textContent = sub;
            catDiv.appendChild(subHeader);

            let grid = document.createElement("div");
            grid.className = "subcategory-grid";
            grid.dataset.cat = cat;
            grid.dataset.sub = sub;

            grouped[cat][sub].forEach(item => {
                let div = document.createElement("div");
                div.className = "menu-item";
                div.dataset.index = menuItems.indexOf(item);
                div.setAttribute("draggable", "true");

                div.innerHTML = `
            <h4>${item.name}</h4>
            ${
                item.variants && item.variants.length > 0
                ? ""  // hide base price if variants exist
                : `<p>₹${item.price}</p>` // show price only if no variants
            }
            <div class="variants-container">
                ${
                    item.variants && item.variants.length > 0
                    ? `<ul class="variant-list">${item.variants
                        .map((v, i) => `<li data-idx="${i}" data-name="${item.name}" data-price="${v.price}" data-size="${v.size}">${v.size} - ₹${v.price}</li>`) 
                        .join("")}</ul>`
                    : `<span class="no-variants">No Variants</span>`
                }
            </div>
            <div class="menu-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;


                // Attach variant clicks fresh each time
                div.querySelectorAll(".variant-list li").forEach(li => {
    li.addEventListener("click", e => {
        e.stopPropagation();
        const variantItem = {
            ...item,
            name: `${item.name} (${li.dataset.size})`,
            price: parseFloat(li.dataset.price)
        };
        addToCart(variantItem);
    });
});

                div.querySelector(".edit-btn").addEventListener("click", e => {
                    e.stopPropagation();
                    editMenuItem(menuItems.indexOf(item));
                });
                div.querySelector(".delete-btn").addEventListener("click", e => {
                    e.stopPropagation();
                    deleteMenuItem(menuItems.indexOf(item));
                });

                // Attach main item click (non-variant)
                div.addEventListener("click", e => {
    if (!e.target.closest(".variant-list")) {
        if (!(item.variants && item.variants.length > 0)) {
            addToCart(item);
        }
    }
});

                grid.appendChild(div);
            });

            catDiv.appendChild(grid);
        }

        container.appendChild(catDiv);
    }

    enableDragDrop();
}


// ===== Modal Handling (Original) =====
const modal = document.getElementById("menuModal");
const addMenuBtn = document.getElementById("addMenuBtn");
const closeModal = document.getElementById("closeModal");
const saveMenuItem = document.getElementById("saveMenuItem");

if(addMenuBtn) addMenuBtn.onclick = () => {
    editIndex = -1;
    document.getElementById("modalTitle").textContent = "Add Menu Item";
    clearModalFields();
    populateCategorySelect();
    if(modal) modal.style.display = "block";
};
if(closeModal) closeModal.onclick = () => {if(modal) modal.style.display = "none"};


// ===== Populate Category/Subcategory Select (Original) =====
function populateCategorySelect() {
    const categorySelect = document.getElementById("newItemCategorySelect");
    const subcategorySelect = document.getElementById("newItemSubcategorySelect");
    if (!categorySelect || !subcategorySelect) return;

    let categories = [...new Set(menuItems.map(item => item.category))];

    categorySelect.innerHTML = `<option value="">--Select--</option>`;
    categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    categorySelect.innerHTML += `<option value="__new__">+ Add New</option>`;

    subcategorySelect.innerHTML = `<option value="">--Select--</option>`;
    subcategorySelect.innerHTML += `<option value="__new__">+ Add New</option>`;
}

document.getElementById("newItemCategorySelect")?.addEventListener("change", e => {
    const input = document.getElementById("newItemCategoryNew");
    if (e.target.value === "__new__") {
        if(input) input.style.display = "block";
    }
    else {
         if(input) input.style.display = "none";
    }
    updateSubcategorySelect(e.target.value);
});

function updateSubcategorySelect(category) {
    const subcategorySelect = document.getElementById("newItemSubcategorySelect");
    if(!subcategorySelect) return;
    subcategorySelect.innerHTML = `<option value="">--Select--</option>`;

    if (category && category !== "__new__") {
        let subs = [...new Set(menuItems.filter(i => i.category === category).map(i => i.subcategory))];
        subs.forEach(sub => {
            subcategorySelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
    subcategorySelect.innerHTML += `<option value="__new__">+ Add New</option>`;
}

document.getElementById("newItemSubcategorySelect")?.addEventListener("change", e => {
    const input = document.getElementById("newItemSubcategoryNew");
    if (e.target.value === "__new__") {
        if(input) input.style.display = "block";
    }
    else {
        if(input) input.style.display = "none";
    }
});

// ===== Save Menu Item (Original) =====
if(saveMenuItem) saveMenuItem.onclick = () => {
    let name = document.getElementById("newItemName")?.value.trim();
    let price = parseFloat(document.getElementById("newItemPrice")?.value);

    let category = document.getElementById("newItemCategorySelect").value = "";
    if (category === "__new__") category = document.getElementById("newItemCategoryNew")?.value.trim();

    let subcategory = document.getElementById("newItemSubcategorySelect").value = "";
    if (subcategory === "__new__") subcategory = document.getElementById("newItemSubcategoryNew")?.value.trim();

    let variants = getVariantsFromModal();
    
    // Allow empty price only if variants exist
    if (!name || !category || !subcategory || (variants.length === 0 && isNaN(price))) return alert("Fill all fields, including a price or variants.");

    // Set base price to 0 if variants are present and price input is empty/invalid
    if(variants.length > 0 && isNaN(price)) price = 0; 
    

    const item = { name, price, category, subcategory, variants };

    if (editIndex >= 0) {
        menuItems[editIndex] = item;
    } else {
        menuItems.push(item);
    }

    localStorage.setItem("menuItems", JSON.stringify(menuItems));
    renderMenu();
    renderCategories();
    if(modal) modal.style.display = "none";
};


// ===== Edit/Delete Functions (Original) =====
function editMenuItem(idx) {
    editIndex = idx;
    const item = menuItems[idx];
    document.getElementById("modalTitle").textContent = "Edit Menu Item";
    document.getElementById("newItemName").value = item.name;
    document.getElementById("newItemPrice").value = item.price;
    populateCategorySelect();

    document.getElementById("newItemCategorySelect").value = item.category;
    updateSubcategorySelect(item.category);
    document.getElementById("newItemSubcategorySelect").value = item.subcategory;

    // Load variants
    document.getElementById("variantsContainer").innerHTML = "";
    if (item.variants && item.variants.length > 0) {
        item.variants.forEach(v => addVariantRow(v.size, v.price));
    }

    if(modal) modal.style.display = "block";
}


function deleteMenuItem(idx) {
    if (!confirm("Delete this item?")) return;
    menuItems.splice(idx,1);
    localStorage.setItem("menuItems", JSON.stringify(menuItems));
    renderMenu();
    renderCategories();
}

function clearModalFields() {
    if(document.getElementById("newItemName")) document.getElementById("newItemName").value="";
    if(document.getElementById("newItemPrice")) document.getElementById("newItemPrice").value="";
    if(document.getElementById("newItemCategoryNew")) document.getElementById("newItemCategoryNew").value="";
    if(document.getElementById("newItemSubcategoryNew")) document.getElementById("newItemSubcategoryNew").value="";
    if(document.getElementById("newItemCategoryNew")) document.getElementById("newItemCategoryNew").style.display="none";
    if(document.getElementById("newItemSubcategoryNew")) document.getElementById("newItemSubcategoryNew").style.display="none";
    if(document.getElementById("variantsContainer")) document.getElementById("variantsContainer").innerHTML = "";
}

// ===== Previous Bill (Original) =====
function renderPreviousBill() {
    const previousOrderCard = document.getElementById("previousOrderCard");
    if(!previousOrderCard) return;
    
    // Filter out KOTs if you only want true bills here
    const bills = orders.filter(o => !o.kot);
    if (bills.length === 0) return;
    const lastOrder = bills[bills.length - 1]; 
    const dateObj = new Date(lastOrder.date);
    const date = dateObj.toISOString().split("T")[0];
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const itemsHtml = lastOrder.items.map(i => 
        `<li><span>${i.name} x${i.qty}</span><span>₹${(i.price * i.qty).toFixed(2)}</span></li>`
    ).join("");

    previousOrderCard.innerHTML = `
        <h5>Previous Bill</h5>
        <div class="bill-info"><strong>Date:</strong> ${date} | <strong>Time:</strong> ${time}</div>
        <ul>${itemsHtml}</ul>
        <div class="total">Total: ₹${lastOrder.total.toFixed(2)}</div>
    `;
}

// ===== Initial Render =====
// Load the initial cart based on the default 'Takeaway' table or the last selected table if you implement that
if (tableSelect) currentTable = tableSelect.value;
cart = liveTables[currentTable] || [];

renderMenu();
renderCategories();
renderPreviousBill();
updateTableStatusDisplay(); // Initialize table status display
updateLiveTableTotals(); // Initialize table totals display
renderCart(); // Call renderCart on load


function calculateFinalBill() {
  let subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  let discount = parseFloat(document.getElementById("discountInput").value) || 0;
  let tax = parseFloat(document.getElementById("taxInput").value) || 0;
  let service = parseFloat(document.getElementById("serviceInput").value) || 0;

  let discounted = subtotal - discount;
  let taxed = discounted + (discounted * tax / 100);
  let serviced = taxed + (discounted * service / 100);

  document.getElementById("finalTotal").innerText = serviced.toFixed(2);
  return serviced;
}


function splitBillByItem() {
  let half = Math.ceil(cart.length / 2);
  let part1 = cart.slice(0, half);
  let part2 = cart.slice(half);
  alert(`Bill 1: ₹${part1.reduce((s,i)=>s+i.price*i.qty,0)} | Bill 2: ₹${part2.reduce((s,i)=>s+i.price*i.qty,0)}`);
}

function splitBillByAmount() {
  let total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  let half = total / 2;
  alert(`Bill 1: ₹${half} | Bill 2: ₹${half}`);
}

function parkBill() {
  localStorage.setItem("parkedBill", JSON.stringify(cart));
  alert("Bill parked!");
  cart = [];
  renderCart();
}

function resumeBill() {
  let saved = JSON.parse(localStorage.getItem("parkedBill"));
  if (!saved) return alert("No parked bill!");
  cart = saved;
  renderCart();
}

let tables = { 1: [], 2: [], 3: [] }; // table orders

function mergeTables(t1, t2) {
  tables[t1] = [...tables[t1], ...tables[t2]];
  tables[t2] = [];
  alert(`Merged Table ${t2} into Table ${t1}`);
}

function transferTable(from, to) {
  tables[to] = [...tables[to], ...tables[from]];
  tables[from] = [];
  alert(`Transferred Table ${from} to ${to}`);
}

let tableTimers = {};

function occupyTable(tableNo) {
  tableTimers[tableNo] = Date.now();
}

function getTableTime(tableNo) {
  if (!tableTimers[tableNo]) return "Free";
  let mins = Math.floor((Date.now() - tableTimers[tableNo]) / 60000);
  return mins + " mins";
}

function generateReport(type) {
  let now = new Date();
  let filtered = orders.filter(o=>{
    let d = new Date(o.date);
    if (type==="daily") return d.toDateString() === now.toDateString();
    if (type==="weekly") {
      let weekStart = new Date(now.setDate(now.getDate()-7));
      return d >= weekStart;
    }
  });

  let total = filtered.reduce((s,o)=>s+o.total,0);
  let items = {};
  filtered.forEach(o=>o.items.forEach(i=>{
    items[i.name] = (items[i.name]||0)+i.qty;
  }));

  document.getElementById("reportBox").innerHTML = `
    <p>Total Orders: ${filtered.length}</p>
    <p>Total Revenue: ₹${total}</p>
    <p>Top Item: ${Object.entries(items).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-"}</p>
  `;
}

function addToCart(item) {
  if (item.stock <= 0) { alert("Out of stock!"); return; }
  item.stock--;
  cart.push({...item, qty:1});
}

let customers = JSON.parse(localStorage.getItem("customers")) || {};

function saveCustomer(phone, order) {
  if (!customers[phone]) customers[phone] = { history: [], points: 0 };
  customers[phone].history.push(order);
  customers[phone].points += Math.floor(order.total/100); // ₹100 = 1pt
  localStorage.setItem("customers", JSON.stringify(customers));
}

document.getElementById("menuSearch").addEventListener("input",(e)=>{
  let query = e.target.value.toLowerCase();
  document.querySelectorAll(".menu-item").forEach(el=>{
    el.style.display = el.innerText.toLowerCase().includes(query)?"block":"none";
  });
});

document.addEventListener("keydown",(e)=>{
  if (e.ctrlKey && e.key==="p") printInvoice();
  if (e.ctrlKey && e.key==="k") kotPrint();
});

function toggleDark(){
  document.body.classList.toggle("dark");
}


function addToCart(item) {
    // Stock check if needed
    if (item.stock !== undefined && item.stock <= 0) {
        alert("Out of stock!");
        return;
    }

    let existing = cart.find(c => c.name === item.name && c.price === item.price);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({...item, qty: 1});
    }

    renderCart();
    saveCartToLiveTable();
}





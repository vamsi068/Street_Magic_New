let orders = JSON.parse(localStorage.getItem("orders")) || [];
let purchases = JSON.parse(localStorage.getItem("purchases")) || [];

// =====================
// Default Stats (Today / Month / Last Month)
// =====================
let today = new Date();
let todayStr = today.toISOString().split("T")[0];
let thisMonth = today.getMonth();
let thisYear = today.getFullYear();

let todayTotal = 0;
let monthTotal = 0;
let monthTransactions = 0;
let lastMonthTotal = 0;
let lastMonthTransactions = 0;

let salesByItemToday = {};

orders.forEach(order => {
  let orderDate = new Date(order.date);
  let orderDateStr = orderDate.toISOString().split("T")[0];

  // Today's sales
  if (orderDateStr === todayStr) {
    todayTotal += order.total;
    order.items.forEach(i => {
      if (!salesByItemToday[i.name]) salesByItemToday[i.name] = 0;
      salesByItemToday[i.name] += i.qty * i.price;
    });
  }

  // This month sales
  if (orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
    monthTotal += order.total;
    monthTransactions++;
  }

  // Last month sales
  let lastMonth = (thisMonth - 1 + 12) % 12;
  let lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  if (orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear) {
    lastMonthTotal += order.total;
    lastMonthTransactions++;
  }
});

// Daily average (based on days with sales this month)
let daysWithSales = new Set(
  orders
    .filter(o => {
      let d = new Date(o.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .map(o => new Date(o.date).toISOString().split("T")[0])
);
let dailyAvg = daysWithSales.size > 0 ? (monthTotal / daysWithSales.size) : 0;

// =====================
// Purchases (today only, used later in P/L)
// =====================
let todayPurchaseTotal = 0;
purchases.forEach(p => {
  let purchaseDate = new Date(p.date).toISOString().split("T")[0];
  if (purchaseDate === todayStr) {
    todayPurchaseTotal += p.qty * p.price;
  }
});

// =====================
// Expenses (Load / Defaults / UI binding)
// =====================
let expenses = JSON.parse(localStorage.getItem("expenses")) || {
  salaryPerDay: 500,
  rentPerMonth: 3000,
  powerPerMonth: 1200,
  otherExpances: 4000
};

// Fill input fields with current values
document.getElementById("salaryInput").value = expenses.salaryPerDay;
document.getElementById("rentInput").value = expenses.rentPerMonth;
document.getElementById("powerInput").value = expenses.powerPerMonth;
document.getElementById("salaryMonthlyInput").value = expenses.otherExpances;

// Save button event
document.getElementById("saveExpenses").addEventListener("click", () => {
  expenses.salaryPerDay = parseInt(document.getElementById("salaryInput").value) || 0;
  expenses.rentPerMonth = parseInt(document.getElementById("rentInput").value) || 0;
  expenses.powerPerMonth = parseInt(document.getElementById("powerInput").value) || 0;
  expenses.otherExpances = parseInt(document.getElementById("salaryMonthlyInput").value) || 0;

  localStorage.setItem("expenses", JSON.stringify(expenses));
  alert("Expenses updated!");
  location.reload(); // refresh to recalc profit/loss
});


// Daily calculation
let dailySalary = expenses.salaryPerDay;
let dailyRent = Math.round(expenses.rentPerMonth / 30);
let dailyPower = Math.round(expenses.powerPerMonth / 30);
let dailyOthers = Math.round(expenses.otherExpances / 30);

// Total daily expenses
let totalExpenses = dailySalary + dailyRent + dailyPower + dailyOthers;

// Profit / Loss (Sales - Purchases - Daily Expenses)
let todayProfitLoss = todayTotal - (todayPurchaseTotal + totalExpenses);

// =====================
// Update Stats in UI
// =====================
document.getElementById("todaySales").textContent = todayTotal;
document.getElementById("monthSales").textContent = monthTotal;
document.getElementById("dailyAvg").textContent = dailyAvg.toFixed(2);
document.getElementById("transactionCount").textContent = orders.length;
document.getElementById("lastMonthSales").textContent = lastMonthTotal;
document.getElementById("lastMonthCount").textContent = lastMonthTransactions;

// 🔹 Purchases + Profit/Loss + Expenses UI
document.getElementById("todayPurchase").textContent = todayPurchaseTotal;
document.getElementById("salaryExpense").textContent = dailySalary;
document.getElementById("rentExpense").textContent = dailyRent;
document.getElementById("powerExpense").textContent = dailyPower;
document.getElementById("OthersExpances").textContent = dailyOthers;



let plEl = document.getElementById("todayProfitLoss");
plEl.textContent = "₹" + todayProfitLoss;
plEl.style.color = todayProfitLoss >= 0 ? "green" : "red";

// =====================
// Filters + Category Handling
// =====================
// Collect unique categories
let categories = new Set();
orders.forEach(order => {
  order.items.forEach(item => {
    if (item.category) categories.add(item.category);
  });
});

// Populate category filter
const categoryFilter = document.getElementById("categoryFilter");
categories.forEach(cat => {
  let opt = document.createElement("option");
  opt.value = cat;
  opt.textContent = cat;
  categoryFilter.appendChild(opt);
});

// =====================
// Chart.js Setup (Sales by Item)
// =====================
const ctx = document.getElementById("salesChart").getContext("2d");
let salesChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Sales (₹)",
      data: [],
      borderWidth: 1,
      backgroundColor: "rgba(54, 162, 235, 0.7)",
      barThickness: 25,
      maxBarThickness: 30
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 50 }
      },
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 0
        }
      }
    }
  }
});

// =====================
// Apply Filters Function
// =====================
function applyFilters() {
  let startDate = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : null;
  let endDate = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : null;
  let selectedCategory = document.getElementById("categoryFilter").value;

  let filteredOrders = orders.filter(order => {
    let orderDate = new Date(order.date);
    if (startDate && orderDate < startDate) return false;
    if (endDate && orderDate > endDate) return false;
    return true;
  });

  let salesByItem = {};
  let totalSales = 0;
  let totalTransactions = 0;

  filteredOrders.forEach(order => {
    let include = false;
    order.items.forEach(item => {
      if (selectedCategory === "all" || item.category === selectedCategory) {
        include = true;
        if (!salesByItem[item.name]) salesByItem[item.name] = 0;
        salesByItem[item.name] += item.qty * item.price;
      }
    });
    if (include) {
      totalSales += order.total;
      totalTransactions++;
    }
  });

  let daysWithSales = new Set(filteredOrders.map(o => new Date(o.date).toISOString().split("T")[0]));
  let dailyAvg = daysWithSales.size > 0 ? (totalSales / daysWithSales.size) : 0;

  // Update Filtered Stats UI
  document.getElementById("filteredSales").textContent = totalSales;
  document.getElementById("filteredTransactions").textContent = totalTransactions;
  document.getElementById("filteredDailyAvg").textContent = dailyAvg.toFixed(2);

  // Update Chart
  salesChart.data.labels = Object.keys(salesByItem);
  salesChart.data.datasets[0].data = Object.values(salesByItem);
  salesChart.update();
}

document.getElementById("applyFilters").addEventListener("click", applyFilters);

// Run once on load
applyFilters();

// =====================
// Sales Trend Chart (7D / 6M)
// =====================
const ctxTrend = document.getElementById("trendChart").getContext("2d");

let trendChart = new Chart(ctxTrend, {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Sales (₹)",
      data: [],
      backgroundColor: "rgba(75, 192, 192, 0.7)",
      borderWidth: 1,
      barThickness: 25,
      maxBarThickness: 30
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } }
  }
});

// 🔹 Helper: last 7 days sales
function getLast7DaysSales() {
  let labels = [];
  let data = [];
  for (let i = 6; i >= 0; i--) {
    let d = new Date();
    d.setDate(today.getDate() - i);
    let dStr = d.toISOString().split("T")[0];
    labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
    let sum = 0;
    orders.forEach(order => {
      let oDate = new Date(order.date).toISOString().split("T")[0];
      if (oDate === dStr) sum += order.total;
    });
    data.push(sum);
  }
  return { labels, data };
}

// 🔹 Helper: last 6 months sales
function getLast6MonthsSales() {
  let labels = [];
  let data = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    labels.push(d.toLocaleString("default", { month: "short" }));
    let sum = 0;
    orders.forEach(order => {
      let oDate = new Date(order.date);
      if (oDate.getMonth() === d.getMonth() && oDate.getFullYear() === d.getFullYear()) {
        sum += order.total;
      }
    });
    data.push(sum);
  }
  return { labels, data };
}

// 🔹 Toggle Functions
function show7DTrend() {
  let { labels, data } = getLast7DaysSales();
  trendChart.data.labels = labels;
  trendChart.data.datasets[0].data = data;
  trendChart.update();
  document.getElementById("btn7d").classList.add("active");
  document.getElementById("btn6m").classList.remove("active");
}

function show6MTrend() {
  let { labels, data } = getLast6MonthsSales();
  trendChart.data.labels = labels;
  trendChart.data.datasets[0].data = data;
  trendChart.update();
  document.getElementById("btn6m").classList.add("active");
  document.getElementById("btn7d").classList.remove("active");
}

// 🔹 Event Listeners
document.getElementById("btn7d").addEventListener("click", show7DTrend);
document.getElementById("btn6m").addEventListener("click", show6MTrend);

// Default load = 7D
show7DTrend();

// =====================
// Items Sold Trend Chart (7D / 6M)
// =====================
const ctxTrendItems = document.getElementById("trendItemsChart").getContext("2d");

let trendItemsChart = new Chart(ctxTrendItems, {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Items Sold",
      data: [],
      backgroundColor: "rgba(255, 159, 64, 0.7)",
      borderWidth: 1,
      barThickness: 25,
      maxBarThickness: 30
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } }
  }
});

// 🔹 Helper: last 7 days item counts
function getLast7DaysItems() {
  let labels = [];
  let data = [];
  for (let i = 6; i >= 0; i--) {
    let d = new Date();
    d.setDate(today.getDate() - i);
    let dStr = d.toISOString().split("T")[0];
    labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
    let count = 0;
    orders.forEach(order => {
      let oDate = new Date(order.date).toISOString().split("T")[0];
      if (oDate === dStr) {
        order.items.forEach(it => count += it.qty);
      }
    });
    data.push(count);
  }
  return { labels, data };
}

// 🔹 Helper: last 6 months item counts
function getLast6MonthsItems() {
  let labels = [];
  let data = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    labels.push(d.toLocaleString("default", { month: "short" }));
    let count = 0;
    orders.forEach(order => {
      let oDate = new Date(order.date);
      if (oDate.getMonth() === d.getMonth() && oDate.getFullYear() === d.getFullYear()) {
        order.items.forEach(it => count += it.qty);
      }
    });
    data.push(count);
  }
  return { labels, data };
}

// 🔹 Toggle Functions
function show7DItems() {
  let { labels, data } = getLast7DaysItems();
  trendItemsChart.data.labels = labels;
  trendItemsChart.data.datasets[0].data = data;
  trendItemsChart.update();
  document.getElementById("btn7dItems").classList.add("active");
  document.getElementById("btn6mItems").classList.remove("active");
}

function show6MItems() {
  let { labels, data } = getLast6MonthsItems();
  trendItemsChart.data.labels = labels;
  trendItemsChart.data.datasets[0].data = data;
  trendItemsChart.update();
  document.getElementById("btn6mItems").classList.add("active");
  document.getElementById("btn7dItems").classList.remove("active");
}

// 🔹 Event Listeners
document.getElementById("btn7dItems").addEventListener("click", show7DItems);
document.getElementById("btn6mItems").addEventListener("click", show6MItems);

// Default load = 7D
show7DItems();

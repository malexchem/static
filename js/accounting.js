let transactions = [];

/* =====  LOAD REAL DATA FROM API  ===== */
async function loadTransactions() {
    try {
        const res = await fetch("https://malexoffice-bkdt.onrender.com/api/transactions");
        const data = await res.json();

        // Adjust depending on your API response structure
        transactions = data.records || data.transactions || [];

        renderTransactions(transactions);
        updateDashboardTotals(transactions);
        updateCharts(transactions);
    } catch (err) {
        console.error("Failed to load transactions", err);
    }
}

/* =====  DOM SHORTCUTS  ===== */
const transactionsTableBody = document.getElementById('transactionsTableBody');
const transactionModal = document.getElementById('transactionModal');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const closeModal = document.getElementById('closeModal');
const cancelTransaction = document.getElementById('cancelTransaction');
const saveTransaction = document.getElementById('saveTransaction');
const transactionForm = document.getElementById('transactionForm');
const typeFilter = document.getElementById('typeFilter');
const categoryFilter = document.getElementById('categoryFilter');
const dateFilter = document.getElementById('dateFilter');

/* =====  INITIALISATION  ===== */
document.addEventListener('DOMContentLoaded', () => {
   loadTransactions();
   setupEventListeners(); 
});

function updateDashboardTotals(list) {
    const totalIncome = list
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = list
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const profit = totalIncome - totalExpense;

    // ✅ Cumulative balance (assuming no opening balance)
    const balance = profit;

    document.querySelector(".financial-card.income .financial-value").innerText =
        "KSh " + totalIncome.toLocaleString();

    document.querySelector(".financial-card.expense .financial-value").innerText =
        "KSh " + totalExpense.toLocaleString();

    document.querySelector(".financial-card.profit .financial-value").innerText =
        "KSh " + profit.toLocaleString();

    // ✅ Update balance dynamically
    document.querySelector(".financial-card.balance .financial-value").innerText =
        "KSh " + balance.toLocaleString();
}

/* =====  TABLE RENDER  ===== */
function renderTransactions(list) {
    transactionsTableBody.innerHTML = '';
    list.forEach(tx => {
        const row = document.createElement('tr');
        const d = new Date(tx.date);

        const formattedDate = d.toLocaleDateString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: "Africa/Nairobi"
        });

        const formattedTime = d.toLocaleTimeString('en-US', { 
            hour: '2-digit',
            minute: '2-digit',
            timeZone: "Africa/Nairobi"
        });

        const formattedAmount = (tx.type === 'income' ? '+' : '-') + 'Ksh ' + tx.amount.toLocaleString();

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${tx.description}</td>
            <td>${tx.type}</td>
            <td>${tx.method}</td>
            <td class="transaction-amount ${tx.type}">${formattedAmount}</td>
            <td><span class="status-badge status-${tx.status}">${tx.status}</span></td>
               <td>
                <div class="action-buttons">
                    <button class="btn btn-edit btn-sm" data-id="${tx._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm" data-id="${tx._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>`;
        transactionsTableBody.appendChild(row);
    });

    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            editTransaction(id);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteTransaction(id);
        });
    });
}

function updateDashboardTotals(list) {
    const totalIncome = list
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = list
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const profit = totalIncome - totalExpense;

    document.querySelector(".financial-card.income .financial-value").innerText =
        "KSh " + totalIncome.toLocaleString();

    document.querySelector(".financial-card.expense .financial-value").innerText =
        "KSh " + totalExpense.toLocaleString();

    document.querySelector(".financial-card.profit .financial-value").innerText =
        "KSh " + profit.toLocaleString();
}

let incomeExpenseChart;
let expenseChart;

function updateCharts(list) {
    const months = {};
    
    list.forEach(t => {
        const m = new Date(t.date).getMonth();
        if (!months[m]) months[m] = { income: 0, expense: 0 };
        months[m][t.type] += Number(t.amount);
    });

    // Prepare data
    const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const incomeData = labels.map((_, i) => months[i]?.income || 0);
    const expenseData = labels.map((_, i) => months[i]?.expense || 0);

    // Destroy old instance if exists
    if (incomeExpenseChart) incomeExpenseChart.destroy();

    incomeExpenseChart = new Chart(
        document.getElementById("incomeExpenseChart"),
        {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Income",
                        data: incomeData,
                        borderColor: "#4caf50",
                        backgroundColor: "rgba(76,175,80,0.15)",
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: "Expenses",
                        data: expenseData,
                        borderColor: "#f44336",
                        backgroundColor: "rgba(244,67,54,0.15)",
                        fill: true,
                        tension: 0.3
                    }
                ]
            }
        }
    );

    // EXPENSE BREAKDOWN
    const breakdown = {};
    list.filter(t => t.type === "expense").forEach(t => {
        breakdown[t.category] = (breakdown[t.category] || 0) + Number(t.amount);
    });

    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(
        document.getElementById("expenseChart"),
        {
            type: "doughnut",
            data: {
                labels: Object.keys(breakdown),
                datasets: [
                    { data: Object.values(breakdown) }
                ]
            }
        }
    );
}


function setupEventListeners() {
    addTransactionBtn.addEventListener('click', () => transactionModal.style.display = 'flex');
    closeModal.addEventListener('click', () => transactionModal.style.display = 'none');
    cancelTransaction.addEventListener('click', () => transactionModal.style.display = 'none');

    saveTransaction.addEventListener('click', async () => {

    const type = document.getElementById('transactionType');
    const date = document.getElementById('transactionDate');
    const desc = document.getElementById('transactionDescription');
    const method = document.getElementById('transactionMethod');
    const amount = document.getElementById('transactionAmount');
    const ref = document.getElementById('transactionReference');

    const payload = {
        type: type.value,
        //date: date.value,
        description: desc.value,
        method: method.value,
        amount: Number(amount.value),
        reference: ref.value || ""
    };

    try {
        let url = "https://malexoffice-bkdt.onrender.com/api/transactions";
        let methodType = "POST";

        // If editing → use PUT
        if (currentEditingId) {
            url += "/" + currentEditingId;
            methodType = "PUT";
        }

        const res = await fetch(url, {
            method: methodType,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            alert(currentEditingId ? "Transaction updated!" : "Transaction added!");
            loadTransactions();
            transactionModal.style.display = "none";
            transactionForm.reset();
            currentEditingId = null; // reset
        } else {
            alert("Error saving transaction");
        }

    } catch (err) {
        console.error(err);
        alert("Network error");
    }
});

}


/* =====  EDIT TRANSACTION  ===== */
async function editTransaction(id) {
    try {
        const res = await fetch(`https://malexoffice-bkdt.onrender.com/api/transactions/${id}`);
        const data = await res.json();
        
        if (data.success) {
            const t = data.transaction;

            // Mark editing mode
            currentEditingId = id;

            // Populate form
            document.getElementById('transactionType').value = t.type;
            //document.getElementById('transactionDate').value = t.date.split('T')[0];
            document.getElementById('transactionDescription').value = t.description;
            document.getElementById('transactionMethod').value = t.method;
            document.getElementById('transactionAmount').value = t.amount;
            document.getElementById('transactionReference').value = t.reference || "";

            // Update modal title
            modalTitle.textContent = "Edit Transaction";

            // Show modal
            transactionModal.style.display = 'flex';
        } else {
            alert("Error loading transaction");
        }
    } catch (err) {
        console.error(err);
        alert("Network error");
    }
}


/* =====  DELETE TRANSACTION  ===== */
async function deleteTransaction(id) {
    if (confirm("Are you sure you want to delete this transaction?")) {
        try {
            const res = await fetch(`https://malexoffice-bkdt.onrender.com/api/transactions/${id}`, {
                method: 'DELETE'
            });
            
            const data = await res.json();
            if (data.success) {
                alert("Transaction deleted successfully!");
                loadTransactions(); // Refresh the list
            } else {
                alert("Error deleting transaction");
            }
        } catch (err) {
            console.error(err);
            alert("Network error");
        }
    }
}

/* =====  FILTERS  ===== */
function filterTransactions() {
    const typeVal = typeFilter.value;
    const catVal = categoryFilter.value;
    const dateVal = dateFilter.value;

    //let filtered = transactions;
    let filtered = [...transactions];

    if (typeVal !== 'all') filtered = filtered.filter(t => t.type === typeVal);
    if (catVal !== 'all') filtered = filtered.filter(t => t.category === catVal);
    if (dateVal) filtered = filtered.filter(t => t.date === dateVal);

    renderTransactions(filtered);
}
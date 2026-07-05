console.log("🚨 SCRIPT IS AWAKE AND LOADED!");

// ============================================================================
// MAIN APPLICATION SCOPE
// Wait for the HTML DOM to fully load before attaching event listeners.
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // ENGINE 1: AUTHENTICATION & USER MANAGEMENT
    // (Note: Retained Local Storage for Auth as per Lab scope)
    // ==========================================
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault(); 

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('signup-confirm-password').value;
            const terms = document.getElementById('signup-terms-check').checked;

            if (name === "") return alert("Name cannot be empty.");
            if (email === "" || !email.includes("@")) return alert("Enter a valid email.");
            if (password.length < 6) return alert("Password must be at least 6 characters.");
            if (password !== confirmPass) return alert("Passwords do not match.");
            if (!terms) return alert("You must agree to the terms.");

            const userData = { name: name, email: email, password: password };
            localStorage.setItem('ledgerUser', JSON.stringify(userData));
            
            alert("Registration successful! Please log in.");
            window.location.href = "login.html"; 
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const emailInput = document.getElementById('login-email').value.trim();
            const passwordInput = document.getElementById('login-password').value;

            const storedData = localStorage.getItem('ledgerUser');
            if (!storedData) {
                console.error("🕵️‍♂️ BACKPACK EMPTY -> No user found.");
                return alert("No account found. Please sign up first.");
            }
            
            const user = JSON.parse(storedData);

            const isEmailCorrect = emailInput.toLowerCase() === user.email.toLowerCase();
            const isPasswordCorrect = passwordInput === user.password;
            
            if (isEmailCorrect && isPasswordCorrect) {
                alert("Login successful!");
                window.location.href = "dashboard.html";
            } else {
                alert("Error: Invalid email or password. Please try again.");
            }
        });
    }

    // ==========================================
    // ENGINE 2: CRUD 'WRITE' PIPELINE (Add/Edit)
    // ==========================================
    
    const addTransactionForm = document.getElementById('add-transaction-form');
    if (addTransactionForm) {
        
        // --- STATE MANAGEMENT: THE EDIT WAITING ROOM ---
        const editItemString = localStorage.getItem('ledgerEditItem');
        if (editItemString) {
            const editItem = JSON.parse(editItemString);
            
            document.getElementById('transaction-type').value = editItem.type;
            document.getElementById('transaction-amount').value = editItem.amount;
            document.getElementById('transaction-category').value = editItem.category;
            document.getElementById('transaction-date').value = editItem.date;
            document.getElementById('transaction-description').value = editItem.description;

            const submitBtn = addTransactionForm.querySelector('.submit-btn');
            submitBtn.textContent = "Update Transaction";
            addTransactionForm.dataset.editingId = editItem.id; 
        }

        // --- SUBMIT HANDLER: API POST / PUT ---
        // Notice the 'async' keyword here. We are doing network operations.
        addTransactionForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 1. Package the payload for the backend
            const payload = {
                type: document.getElementById('transaction-type').value,
                amount: parseFloat(document.getElementById('transaction-amount').value),
                category: document.getElementById('transaction-category').value,
                date: document.getElementById('transaction-date').value,
                description: document.getElementById('transaction-description').value
            };

            try {
                // 2. Routing logic: Update (PUT) vs Create (POST)
                if (addTransactionForm.dataset.editingId) {
                    const editingId = addTransactionForm.dataset.editingId;
                    
                    // Send PUT request to Express Backend
                    await fetch(`http://localhost:5000/api/transactions/${editingId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    // Clean up waiting room
                    localStorage.removeItem('ledgerEditItem');
                    delete addTransactionForm.dataset.editingId;
                    alert("Transaction updated successfully!");
                    
                } else {
                    // Send POST request to Express Backend
                    await fetch('http://localhost:5000/api/transactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    alert("Transaction added successfully!");
                }

                // 3. Redirect back to the table
                window.location.href = "transactions.html"; 

            } catch (error) {
                console.error("🕵️‍♂️ NETWORK ERROR ->", error);
                alert("Failed to connect to the backend server.");
            }
        });
    }

    // ==========================================
    // ENGINE 3: CRUD 'READ' PIPELINE (Search, Filter, Render)
    // ==========================================
    
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
        
        /**
         * THE TEMPLATE (Render Engine)
         */
        function renderTable(data) {
            transactionList.innerHTML = ""; 
            
            if (!data || data.length === 0) {
                transactionList.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No transactions found.</td></tr>";
                return;
            }
            
            data.forEach(txn => {
                const row = document.createElement('tr');
                const amountClass = txn.type === 'Income' ? 'income-text' : 'expense-text';
                
                row.innerHTML = `
                <td>${txn.date}</td>
                <td>${txn.type}</td>
                <td>${txn.category}</td>
                <td class="${amountClass}">$${parseFloat(txn.amount).toFixed(2)}</td>
                <td>${txn.description}</td>
                <td>
                    <button class="submit-btn" onclick="editTransaction(${txn.id})" style="padding: 5px 10px; margin:0 5px 0 0; background-color: #007BFF; width:auto;">Edit</button>
                    <button class="reset-btn" onclick="deleteTransaction(${txn.id})" style="padding: 5px 10px; margin:0; width:auto;">Delete</button>
                </td>
                `;
                transactionList.appendChild(row);
            });
        }

        /**
         * THE VIEW/CONTROLLER (Data Pipeline)
         * Now uses async/await to fetch live data from the server before filtering.
         */
        async function applyFilters() {
            let transactions = [];
            
            // 1. Fetch live data from Express API
            try {
                const response = await fetch('http://localhost:5000/api/transactions');
                transactions = await response.json();
            } catch (error) {
                console.error("🕵️‍♂️ NETWORK ERROR -> Could not fetch transactions", error);
            }

            const searchArea = document.getElementById('search-bar');
            const filterArea = document.getElementById('filter-type');
            const sortArea = document.getElementById('sort-type');

            if (!searchArea || !filterArea || !sortArea) {
                renderTable(transactions);
                return;
            }

            const searchTerm = searchArea.value.toLowerCase();
            const filterValue = filterArea.value;
            const sortValue = sortArea.value;

            // Pipeline Stage 1: Dropdown Type Filter
            if (filterValue !== "All") {
                transactions = transactions.filter(txn => txn.type === filterValue);
            }

            // Pipeline Stage 2: Text Search Filter
            if (searchTerm) {
                transactions = transactions.filter(txn => 
                    txn.category.toLowerCase().includes(searchTerm) || 
                    txn.description.toLowerCase().includes(searchTerm)
                );
            }

            // Pipeline Stage 3: Sorting Algorithm
            transactions.sort((a, b) => {
                if (sortValue === 'amount-high') return b.amount - a.amount;
                if (sortValue === 'amount-low') return a.amount - b.amount;
                if (sortValue === 'date-new') return new Date(b.date) - new Date(a.date);
                if (sortValue === 'date-old') return new Date(a.date) - new Date(b.date);
            });

            // Hand processed data to the Template
            renderTable(transactions);
        }

        const searchInput = document.getElementById('search-bar');
        const filterSelect = document.getElementById('filter-type');
        const sortSelect = document.getElementById('sort-type');

        if (searchInput) {
            searchInput.addEventListener('input', applyFilters); 
            filterSelect.addEventListener('change', applyFilters); 
            sortSelect.addEventListener('change', applyFilters);
        }
        
        applyFilters(); 

    } else if (window.location.href.includes("transactions.html")) {
        console.error("🕵️‍♂️ FATAL ERROR: Cannot find <tbody id='transaction-list'> in HTML!");
    }

    // ==========================================
    // ENGINE 4: BUSINESS INTELLIGENCE DASHBOARD
    // ==========================================
    
    if (window.location.href.includes("dashboard.html")) {
        
        // Wrap dashboard logic in an async IIFE to fetch data once for all widgets
        (async function loadDashboard() {
            try {
                // 1. Fetch Master Data from Backend
                const response = await fetch('http://localhost:5000/api/transactions');
                const transactions = await response.json();

                // --- DASHBOARD SECTION A: RECENT TRANSACTIONS (Task 8) ---
                const recentList = document.getElementById('recent-transactions-list');
                if (recentList) {
                    recentList.innerHTML = ""; 
                    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
                    const topFive = sortedTransactions.slice(0, 5); 

                    if (topFive.length === 0) {
                        recentList.innerHTML = "<li>No recent transactions.</li>";
                    } else {
                        topFive.forEach(txn => {
                            const listItem = document.createElement('li');
                            const color = txn.type === 'Income' ? 'green' : 'red';
                            listItem.innerHTML = `
                                <strong>${txn.category}</strong> - 
                                <span style="color: ${color};">$${parseFloat(txn.amount).toFixed(2)}</span> 
                                <small>(${txn.date})</small>
                            `;
                            recentList.appendChild(listItem);
                        });
                    }
                } 

                // --- DASHBOARD SECTION B: MONTHLY SUMMARY (Task 9) ---
                const currentMonth = new Date().getMonth(); 
                const currentYear = new Date().getFullYear();
                let monthlyIncome = 0;
                let monthlyExpense = 0;

                transactions.forEach(txn => {
                    const txnDate = new Date(txn.date);
                    if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
                        if (txn.type === 'Income') monthlyIncome += txn.amount;
                        else if (txn.type === 'Expense') monthlyExpense += txn.amount;
                    }
                });
                
                const monthlyBalance = monthlyIncome - monthlyExpense;
                
                const mIncomeEl = document.getElementById('monthly-income');
                const mExpenseEl = document.getElementById('monthly-expense');
                const mBalanceEl = document.getElementById('monthly-balance');
                if (mIncomeEl && mExpenseEl && mBalanceEl) {
                    mIncomeEl.textContent = `$${monthlyIncome.toFixed(2)}`;
                    mExpenseEl.textContent = `$${monthlyExpense.toFixed(2)}`;
                    mBalanceEl.textContent = `$${monthlyBalance.toFixed(2)}`;
                }

                // --- DASHBOARD SECTION C: CATEGORY AGGREGATION (Task 7) ---
                const categoryStatsList = document.getElementById('category-stats-list');
                if (categoryStatsList) {
                    categoryStatsList.innerHTML = ""; 
                    const categoryTotals = {};
                    const expensesOnly = transactions.filter(txn => txn.type === 'Expense');
                    
                    expensesOnly.forEach(txn => {
                        if (categoryTotals[txn.category]) categoryTotals[txn.category] += txn.amount;
                        else categoryTotals[txn.category] = txn.amount;
                    });
                    
                    if (Object.keys(categoryTotals).length === 0) {
                        categoryStatsList.innerHTML = "<li>No expenses to analyze yet.</li>";
                    } else {
                        for (const [category, total] of Object.entries(categoryTotals)) {
                            const li = document.createElement('li');
                            li.innerHTML = `<strong>${category}:</strong> <span class="expense-text">$${total.toFixed(2)}</span>`;
                            categoryStatsList.appendChild(li);
                        }
                    }
                }

                // --- DASHBOARD SECTION D: ALL-TIME OVERVIEW STATS ---
                const dashboardIncome = document.getElementById('dashboard-income');
                const dashboardExpense = document.getElementById('dashboard-expense');
                const dashboardBalance = document.getElementById('dashboard-balance');
                
                if (dashboardIncome && dashboardExpense && dashboardBalance) {
                    let totalIncome = 0;
                    let totalExpense = 0;

                    transactions.forEach(txn => {
                        if (txn.type === 'Income') totalIncome += txn.amount;
                        else if (txn.type === 'Expense') totalExpense += txn.amount;
                    });

                    let remainingBalance = totalIncome - totalExpense;

                    dashboardIncome.textContent = `$${totalIncome.toFixed(2)}`;
                    dashboardExpense.textContent = `$${totalExpense.toFixed(2)}`;
                    dashboardBalance.textContent = `$${remainingBalance.toFixed(2)}`;
                }

                // Inject personalized welcome message (From Auth Local Storage)
                const storedUser = JSON.parse(localStorage.getItem('ledgerUser'));
                if (storedUser) {
                    const welcomeMsg = document.getElementById('welcome-message');
                    if(welcomeMsg) welcomeMsg.textContent = `Welcome Back, ${storedUser.name}!`;
                }

            } catch(error) {
                console.error("🕵️‍♂️ NETWORK ERROR -> Dashboard failed to load", error);
            }
        })(); // Self-executing async function
    }
});

// ============================================================================
// GLOBAL FUNCTIONS SCOPE
// ============================================================================

/**
 * DELETION HANDLER: API DELETE
 * Sends a DELETE request to the Express backend.
 * @param {number} id - Unique timestamp ID of the transaction
 */
async function deleteTransaction(id) {
    if(confirm("Are you sure you want to delete this transaction?")) {
        try {
            const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                window.location.reload(); 
            } else {
                alert("Failed to delete transaction from server.");
            }
        } catch (error) {
            console.error("🕵️‍♂️ NETWORK ERROR ->", error);
            alert("Could not reach the backend server.");
        }
    }
}

/**
 * EDIT HANDLER: FETCH THEN STAGE
 * Queries the backend for the specific record, stages it, and redirects.
 * @param {number} id - Unique timestamp ID of the transaction
 */
async function editTransaction(id) {
    try {
        // Fetch the fresh list from the backend
        const response = await fetch('http://localhost:5000/api/transactions');
        const transactions = await response.json();
        
        // Find the specific transaction
        const transaction = transactions.find(tnx => tnx.id === id);
        
        if (transaction) {
            // Stage in temporary storage (The "Waiting Room")
            localStorage.setItem('ledgerEditItem', JSON.stringify(transaction));
            window.location.href = "add-transaction.html";
        } else {
            alert("Transaction no longer exists on the server.");
        }
    } catch (error) {
        console.error("🕵️‍♂️ NETWORK ERROR ->", error);
    }
}
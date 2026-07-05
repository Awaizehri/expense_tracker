
console.log("🚨 SCRIPT IS AWAKE AND LOADED!");

// ============================================================================
// MAIN APPLICATION SCOPE
// Wait for the HTML DOM to fully load before attaching event listeners.
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // ENGINE 1: AUTHENTICATION & USER MANAGEMENT
    // ==========================================
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent standard HTTP form submission

            // 1. Capture and sanitize inputs
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('signup-confirm-password').value;
            const terms = document.getElementById('signup-terms-check').checked;

            // 2. Data Validation (Task 2)
            if (name === "") return alert("Name cannot be empty.");
            if (email === "" || !email.includes("@")) return alert("Enter a valid email.");
            if (password.length < 6) return alert("Password must be at least 6 characters.");
            if (password !== confirmPass) return alert("Passwords do not match.");
            if (!terms) return alert("You must agree to the terms.");

            // 3. Database Write (Task 4)
            // Serialize user object and commit to Local Storage
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

            // 1. Database Read
            const storedData = localStorage.getItem('ledgerUser');
            if (!storedData) {
                console.error("🕵️‍♂️ BACKPACK EMPTY -> No user found.");
                return alert("No account found. Please sign up first.");
            }
            
            const user = JSON.parse(storedData);

            // 2. Credential Verification (Case-insensitive email check)
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
        // If coming from the Edit button, load the cached transaction into the form
        const editItemString = localStorage.getItem('ledgerEditItem');
        if (editItemString) {
            const editItem = JSON.parse(editItemString);
            
            // Populate DOM nodes with cached data
            document.getElementById('transaction-type').value = editItem.type;
            document.getElementById('transaction-amount').value = editItem.amount;
            document.getElementById('transaction-category').value = editItem.category;
            document.getElementById('transaction-date').value = editItem.date;
            document.getElementById('transaction-description').value = editItem.description;

            // Mutate UI to reflect "Update" mode
            const submitBtn = addTransactionForm.querySelector('.submit-btn');
            submitBtn.textContent = "Update Transaction";
            addTransactionForm.dataset.editingId = editItem.id; // Store ID in DOM dataset
        }

        // --- SUBMIT HANDLER: CREATE OR UPDATE ---
        addTransactionForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Extract form payload
            const type = document.getElementById('transaction-type').value;
            const amount = parseFloat(document.getElementById('transaction-amount').value);
            const category = document.getElementById('transaction-category').value;
            const date = document.getElementById('transaction-date').value;
            const description = document.getElementById('transaction-description').value;

            let transactions = JSON.parse(localStorage.getItem('ledgerTransactions')) || [];

            // Routing logic: Update vs Create
            if (addTransactionForm.dataset.editingId) {
                // UPDATE: Locate object via ID and overwrite
                const editingId = parseInt(addTransactionForm.dataset.editingId);
                const index = transactions.findIndex(txn => txn.id === editingId);
                
                if (index !== -1) {
                    transactions[index] = { id: editingId, type: type, amount: amount, category: category, date: date, description: description };
                }
                
                // Flush cache and clean up DOM state
                localStorage.removeItem('ledgerEditItem');
                delete addTransactionForm.dataset.editingId;
                alert("Transaction updated successfully!");
                
            } else {
                // CREATE: Generate custom PK and append to array
                const transaction = { id: Date.now(), type: type, amount: amount, category: category, date: date, description: description };
                transactions.push(transaction);
                alert("Transaction added successfully!");
            }

            // Commit to storage and route to table view
            localStorage.setItem('ledgerTransactions', JSON.stringify(transactions));
            window.location.href = "transactions.html"; 
        });
    }

    // ==========================================
    // ENGINE 3: CRUD 'READ' PIPELINE (Search, Filter, Render)
    // ==========================================
    
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
        
        /**
         * THE TEMPLATE (Render Engine)
         * Dumb function: Takes a processed array and injects it into the DOM.
         */
        function renderTable(data) {
            transactionList.innerHTML = ""; // Wipe table clean
            
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
         * Pulls master data, applies UI filters, sorts, and triggers rendering.
         */
        function applyFilters() {
            let transactions = JSON.parse(localStorage.getItem('ledgerTransactions')) || [];

            const searchArea = document.getElementById('search-bar');
            const filterArea = document.getElementById('filter-type');
            const sortArea = document.getElementById('sort-type');

            // Fallback if controls are missing from DOM
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

        // --- ATTACH EVENT LISTENERS FOR LIVE FILTERING ---
        const searchInput = document.getElementById('search-bar');
        const filterSelect = document.getElementById('filter-type');
        const sortSelect = document.getElementById('sort-type');

        if (searchInput) {
            searchInput.addEventListener('input', applyFilters); // Trigger on keystroke
            filterSelect.addEventListener('change', applyFilters); // Trigger on dropdown change
            sortSelect.addEventListener('change', applyFilters);
        }
        
        // Initial population of the table on page load
        applyFilters(); 

    } else if (window.location.href.includes("transactions.html")) {
        console.error("🕵️‍♂️ FATAL ERROR: Cannot find <tbody id='transaction-list'> in HTML!");
    }

    // ==========================================
    // ENGINE 4: BUSINESS INTELLIGENCE DASHBOARD
    // ==========================================
    
    // Check if we are physically on the dashboard page before running heavy math
    if (window.location.href.includes("dashboard.html")) {
        
        let transactions = JSON.parse(localStorage.getItem('ledgerTransactions')) || [];

        // --- DASHBOARD SECTION A: RECENT TRANSACTIONS (Task 8) ---
        const recentList = document.getElementById('recent-transactions-list');
        if (recentList) {
            recentList.innerHTML = ""; 

            // Create an isolated copy of the array and order by date (Descending)
            const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
            const topFive = sortedTransactions.slice(0, 5); // Isolate Top 5

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
        // Time-series filtering for current month/year only
        const currentMonth = new Date().getMonth(); 
        const currentYear = new Date().getFullYear();

        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactions.forEach(txn => {
            const txnDate = new Date(txn.date);
            if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
                if (txn.type === 'Income') {
                    monthlyIncome += txn.amount;
                } else if (txn.type === 'Expense') {
                    monthlyExpense += txn.amount;
                }
            }
        });
        
        const monthlyBalance = monthlyIncome - monthlyExpense;
        
        // Inject monthly values to DOM
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
            
            // Tally dictionary (Simulates SQL GROUP BY logic)
            const categoryTotals = {};
            const expensesOnly = transactions.filter(txn => txn.type === 'Expense');
            
            expensesOnly.forEach(txn => {
                if (categoryTotals[txn.category]) {
                    categoryTotals[txn.category] += txn.amount; // Add to existing bucket
                } else {
                    categoryTotals[txn.category] = txn.amount;  // Create new bucket
                }
            });
            
            // Map tally dictionary to HTML list
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
    }

    // --- DASHBOARD SECTION D: ALL-TIME OVERVIEW STATS (Task 7 part 2) ---
    // This calculates the grand total of all records in the system
    const dashboardIncome = document.getElementById('dashboard-income');
    const dashboardExpense = document.getElementById('dashboard-expense');
    const dashboardBalance = document.getElementById('dashboard-balance');
    
    if (dashboardIncome && dashboardExpense && dashboardBalance) {
        let transactions = JSON.parse(localStorage.getItem('ledgerTransactions')) || [];
        
        let totalIncome = 0;
        let totalExpense = 0;

        // Aggregate loop
        transactions.forEach(txn => {
            if (txn.type === 'Income') {
                totalIncome += txn.amount;
            } else if (txn.type === 'Expense') {
                totalExpense += txn.amount;
            }
        });

        let remainingBalance = totalIncome - totalExpense;

        dashboardIncome.textContent = `$${totalIncome.toFixed(2)}`;
        dashboardExpense.textContent = `$${totalExpense.toFixed(2)}`;
        dashboardBalance.textContent = `$${remainingBalance.toFixed(2)}`;

        // Inject personalized welcome message
        const storedUser = JSON.parse(localStorage.getItem('ledgerUser'));
        if (storedUser) {
            const welcomeMsg = document.getElementById('welcome-message');
            if(welcomeMsg) welcomeMsg.textContent = `Welcome Back, ${storedUser.name}!`;
        }
    }
});

// ============================================================================
// GLOBAL FUNCTIONS SCOPE
// These must live outside DOMContentLoaded so inline HTML onclick="" can access them.
// ============================================================================

/**
 * DELETION HANDLER (Task 8/2)
 * Drops object from storage using inverse filtering.
 * @param {number} id - Unique timestamp ID of the transaction
 */
function deleteTransaction(id) {
    if(confirm("Are you sure you want to delete this transaction?")) {
        let transactions = JSON.parse(localStorage.getItem('ledgerTransactions')) || [];
        
        // Retain only elements that DO NOT match the target ID
        transactions = transactions.filter(tnx => tnx.id !== id);
        
        localStorage.setItem('ledgerTransactions', JSON.stringify(transactions));
        window.location.reload(); // Force page refresh to re-render UI
    }
}

/**
 * EDIT HANDLER (Task 3)
 * Locates target object and stages it in the Waiting Room before redirecting.
 * @param {number} id - Unique timestamp ID of the transaction
 */
function editTransaction(id) {
    let transactions = JSON.parse(localStorage.getItem('ledgerTransactions')) || [];
    
    // Find absolute target object
    const transaction = transactions.find(tnx => tnx.id === id);
    if (transaction) {
        // Stage in temporary storage (The "Waiting Room")
        localStorage.setItem('ledgerEditItem', JSON.stringify(transaction));
        // Redirect to form endpoint
        window.location.href = "add-transaction.html";
    }
}
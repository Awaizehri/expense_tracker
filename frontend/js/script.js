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
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('signup-confirm-password').value;

            if (password !== confirmPass) return alert("Passwords do not match.");

            try {
                const response = await fetch('http://localhost:5000/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }, // No token needed for signup
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Registration successful! Please log in.");
                    window.location.href = "login.html"; 
                } else {
                    alert(data.message || "Registration failed.");
                }
            } catch (error) {
                console.error("🕵️‍♂️ NETWORK ERROR ->", error);
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }, // No token needed for login
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // STORE THE DIGITAL ID BADGE (JWT)
                    localStorage.setItem('ledgerToken', data.token);
                    // Store basic user info for the UI
                    localStorage.setItem('ledgerUser', JSON.stringify(data.user)); 
                    
                    alert("Login successful!");
                    //ProjProd
                    if (data.user.role === 'admin') {
                        window.location.href = "admin-dashboard.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }
                    // window.location.href = "dashboard.html";
                } else {
                    alert(data.message || "Invalid credentials.");
                }
            } catch (error) {
                console.error("🕵️‍♂️ NETWORK ERROR ->", error);
            }
        });
    }

    // ==========================================
    // PROFILE & SECURITY ENGINE
    // ==========================================

    if (window.location.href.includes("profile.html")) {
        const storedUser = JSON.parse(localStorage.getItem('ledgerUser'));
        
        if (storedUser) {
            document.getElementById('profile-name').textContent = storedUser.name;
            document.getElementById('profile-email').textContent = storedUser.email;
            
            const role = storedUser.role.charAt(0).toUpperCase() + storedUser.role.slice(1);
            document.getElementById('profile-role').textContent = role;
        } else {
            window.location.href = "login.html";
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if(confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('ledgerToken');
                localStorage.removeItem('ledgerUser');
                window.location.href = "login.html";
            }
        });
    }

// ==========================================
    // ENGINE 5: ADMIN DASHBOARD (RBAC)
    // ==========================================
    
    if (window.location.href.includes("admin-dashboard.html")) {
        
        (async function loadAdminDashboard() {
            try {
                const token = localStorage.getItem('ledgerToken');
                const storedUser = JSON.parse(localStorage.getItem('ledgerUser'));

                // Extra Frontend Security: Kick them out if they aren't an admin
                if (!storedUser || storedUser.role !== 'admin') {
                    alert("Unauthorized access.");
                    window.location.href = "dashboard.html";
                    return;
                }

                // Greet the Admin
                const welcomeMsg = document.getElementById('admin-welcome-message');
                if (welcomeMsg) welcomeMsg.textContent = `Welcome, Administrator ${storedUser.name}`;

                // Fetch all users from the secure backend route
                const response = await fetch('http://localhost:5000/api/admin/users', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error("Failed to fetch users");

                const users = await response.json();
                const userList = document.getElementById('admin-user-list');
                
                if (userList) {
                    userList.innerHTML = "";
                    users.forEach(user => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td><strong>${user.role.toUpperCase()}</strong></td>
                            <td>
                                ${user.role !== 'admin' ? `<button class="reset-btn" onclick="deleteUserAccount('${user._id}')" style="padding: 5px 10px;">Delete User</button>` : '<em>Protected</em>'}
                            </td>
                        `;
                        userList.appendChild(row);
                    });
                }
            } catch(error) {
                console.error("🕵️‍♂️ ADMIN ERROR ->", error);
            }
        })();
    }

    // ==========================================
    // ENGINE 2: CRUD 'WRITE' PIPELINE (Add/Edit)
    // ==========================================
    
    const addTransactionForm = document.getElementById('add-transaction-form');
    if (addTransactionForm) {
        
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('editId');
        
        if (editId) {
            (async function loadEditData(){
                try {
                    const token = localStorage.getItem('ledgerToken');
                    const response = await fetch('http://localhost:5000/api/transactions', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const transactions = await response.json();

                    const editItem = transactions.find(txn => txn._id === editId);

                    if (editItem){
                        document.getElementById('transaction-type').value = editItem.type;
                        document.getElementById('transaction-amount').value = editItem.amount;
                        document.getElementById('transaction-category').value = editItem.category;
                        document.getElementById('transaction-date').value = editItem.date.split('T')[0];
                        document.getElementById('transaction-description').value = editItem.description;

                        const submitBtn = addTransactionForm.querySelector('.submit-btn');
                        submitBtn.textContent = "Update Transaction";
                    }
                } catch (error) {
                    console.error("🕵️‍♂️ ERROR -> Could not load item for editing", error);
                }
            })();
        }

        addTransactionForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const payload = {
                type: document.getElementById('transaction-type').value,
                amount: parseFloat(document.getElementById('transaction-amount').value),
                category: document.getElementById('transaction-category').value,
                date: document.getElementById('transaction-date').value,
                description: document.getElementById('transaction-description').value
            };

            try {
                const token = localStorage.getItem('ledgerToken'); // Get token before sending

                if (editId) {
                    await fetch(`http://localhost:5000/api/transactions/${editId}`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });
                    alert("Transaction updated successfully!");
                } else {
                    await fetch('http://localhost:5000/api/transactions', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });
                    alert("Transaction added successfully!");
                }

                window.location.href = "transactions.html"; 

            } catch (error) {
                console.error("🕵️‍♂️ NETWORK ERROR ->", error);
                alert("Failed to connect to the backend server.");
            }
        });
    }
                    
    // ==========================================
    // ENGINE 3: CRUD 'READ' PIPELINE
    // ==========================================
    
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
        
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
                <td>${txn.date.split('T')[0]}</td>
                <td>${txn.type}</td>
                <td>${txn.category}</td>
                <td class="${amountClass}">$${parseFloat(txn.amount).toFixed(2)}</td>
                <td>${txn.description}</td>
                <td>
                    <button class="submit-btn" onclick="editTransaction('${txn._id}')" style="padding: 5px 10px; margin:0 5px 0 0; background-color: #007BFF; width:auto;">Edit</button>
                    <button class="reset-btn" onclick="deleteTransaction('${txn._id}')" style="padding: 5px 10px; margin:0; width:auto;">Delete</button>
                </td>
                `;
                transactionList.appendChild(row);
            });
        }

        async function applyFilters() {
            let transactions = [];
            
            try {
                const token = localStorage.getItem('ledgerToken'); // Get token before fetching
                const response = await fetch('http://localhost:5000/api/transactions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
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

            if (filterValue !== "All") {
                transactions = transactions.filter(txn => txn.type === filterValue);
            }

            if (searchTerm) {
                transactions = transactions.filter(txn => 
                    txn.category.toLowerCase().includes(searchTerm) || 
                    txn.description.toLowerCase().includes(searchTerm)
                );
            }

            transactions.sort((a, b) => {
                if (sortValue === 'amount-high') return b.amount - a.amount;
                if (sortValue === 'amount-low') return a.amount - b.amount;
                if (sortValue === 'date-new') return new Date(b.date) - new Date(a.date);
                if (sortValue === 'date-old') return new Date(a.date) - new Date(b.date);
            });

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
    } 

    // ==========================================
    // ENGINE 4: BUSINESS INTELLIGENCE DASHBOARD
    // ==========================================
    
    if (window.location.href.includes("dashboard.html") && !window.location.href.includes("admin-dashboard.html")) {
        
        (async function loadDashboard() {
            try {
                const token = localStorage.getItem('ledgerToken'); // Get token
                const response = await fetch('http://localhost:5000/api/transactions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const transactions = await response.json();

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
                                <small>(${txn.date.split('T')[0]})</small>
                            `;
                            recentList.appendChild(listItem);
                        });
                    }
                } 

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

                const storedUser = JSON.parse(localStorage.getItem('ledgerUser'));
                if (storedUser) {
                    const welcomeMsg = document.getElementById('welcome-message');
                    if(welcomeMsg) welcomeMsg.textContent = `Welcome Back, ${storedUser.name}!`;
                }

            } catch(error) {
                console.error("🕵️‍♂️ NETWORK ERROR -> Dashboard failed to load", error);
            }
        })(); 
    }
});

// ============================================================================
// GLOBAL FUNCTIONS SCOPE
// ============================================================================

async function deleteTransaction(id) {
    if(confirm("Are you sure you want to delete this transaction?")) {
        try {
            const token = localStorage.getItem('ledgerToken'); // Fetch token

            const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
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

function editTransaction(id) {
    // Stateless routing: Pass the MongoDB ID directly to the URL
    window.location.href = `add-transaction.html?editId=${id}`;
}

// --- ADMIN GLOBAL FUNCTIONS ---
async function deleteUserAccount(userId) {
    if(confirm("CRITICAL WARNING: Are you sure you want to permanently delete this user account?")) {
        try {
            const token = localStorage.getItem('ledgerToken'); 

            const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (response.ok) {
                alert("User successfully deleted.");
                window.location.reload(); 
            } else {
                alert("Failed to delete user.");
            }
        } catch (error) {
            console.error("🕵️‍♂️ ADMIN ERROR ->", error);
            alert("Could not reach the backend server.");
        }
    }
}
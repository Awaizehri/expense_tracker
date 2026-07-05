const Transaction = require('../models/transactionModel'); 

// 1. GET: Fetch all transactions from the database
const getTransactions = async (req, res) => {
    try {
        // Retrieve every transaction document stored in the collection
        const transactions = await Transaction.find().sort({ createdAt: -1 }); 
        res.status(200).json(transactions); 
    } catch (err) {
        // Return a 500 Server Error if the database fails to respond
        res.status(500).json({ message: err.message });
    }
};

// 2. POST: Save a new transaction to the database
const addTransaction = async (req, res) => {
    // 1. ADD THIS LINE HERE TO DEBUG:
    // console.log("=== WHAT IS NODE ACTUALLY IMPORTING? ===", Transaction);

    try {
        const newTx = await Transaction.create(req.body); 
        res.status(201).json({ message: "Added!", data: newTx });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 3. PUT: Update an existing transaction by its ID
const updateTransaction = async (req, res) => {
    try {
        const id = req.params.id; // Expects a unique MongoDB string ID, not a number
        
        // Finds the document by ID and overwrites it with the incoming request body data.
        // { new: true } ensures the database returns the newly updated version instead of the old one.
        let updatedTx = await Transaction.findByIdAndUpdate(id, req.body, { new: true });
        
        if (updatedTx) {
            res.status(200).json({ message: "Updated!", data: updatedTx });
        } else {
            // Returns a 404 if the ID is valid but does not exist in the database
            res.status(404).json({ message: "Transaction not found!" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 4. DELETE: Remove a transaction from the database
const deleteTransaction = async (req, res) => {
    try {
        const id = req.params.id;
        
        // Completely deletes the document matching the specified ID from the database
        let deletedTx = await Transaction.findByIdAndDelete(id);
        
        if (deletedTx) {
            res.status(200).json({ message: "Deleted!" });
        } else {
            res.status(404).json({ message: "Transaction not found!" });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Export all CRUD functions for the router to use
module.exports = {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
};
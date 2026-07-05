// urls 
//creating routs/directions to each request to the server
const express = require('express');
const router = express.Router();

const {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');//to our views

router.get('/', getTransactions);               // GET /api/transactions (root => api => transactions)
router.post('/', addTransaction);               // POST /api/transactions
router.put('/:id', updateTransaction);          // PUT /api/transactions/:id (specified id)
router.delete('/:id', deleteTransaction);       // DELETE /api/transactions/:id

module.exports = router;
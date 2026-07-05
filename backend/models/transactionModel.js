const mongoose = require('mongoose');

// Define the blueprint for your transaction data
const transactionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        required: [true, 'Transaction type is required (Income or Expense)'],
        enum: ['Income', 'Expense'] // Prevents typos by restricting values
    },
    amount: { 
        type: Number, 
        required: [true, 'Amount is required'] 
    },
    category: { 
        type: String, 
        required: [true, 'Category is required'] 
    },
    date: { 
        type: Date, 
        default: Date.now // Automatically inputs today's date if left blank
    },
    description: { 
        type: String 
    }
});

//  CORRECT EXPORT: Compile the schema into a Model and export it directly
const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
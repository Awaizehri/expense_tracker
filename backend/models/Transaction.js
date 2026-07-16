
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
   // defining user to have reference key so that transactions linked to specific user (sem ProjProd)
   user:{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
   },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true }
}, { 
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Transaction', transactionSchema);
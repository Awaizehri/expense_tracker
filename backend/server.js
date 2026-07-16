//settengs & manage
// dotenv.config()
const dotenv = require('dotenv').config();
const express = require("express");
const mongoose = require('mongoose');
const cores = require("cors");

const app = express();

const PORT = process.env.PORT || 5000;

const MONGO_URI = 'mongodb://localhost:27017/expenseTracker';


// Connect to the Database (Port 27017)
mongoose.connect(MONGO_URI)
.then(() => console.log('Successfully connected to MongoDB on port 27017!'))
.catch((err) => console.error('Database connection crash:', err));

app.use(cores());

app.use(express.json());

//Defining authentication routes (sem ProjProd)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
// Defining admin routes
app.use('/api/admin', require('./routes/adminRoutes'));
//importing and connecting routes
const transactionRoutes = require('./routes/transactionRoutes')

app.use('/api/transactions', transactionRoutes);

// stating server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


// app.get('/', (req, res) =>{
//     res.send('Backend Server is Running');
// });


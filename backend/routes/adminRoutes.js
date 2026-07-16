// // routes/adminRoutes.js
// const express = require('express');
// const router = express.Router();
// const { getAllUsers, deleteUser } = require('../controllers/adminController');

// // Import both security guards
// const protect = require('../middlewares/authMiddleware');
// const adminOnly = require('../middlewares/adminMiddleware');

// // Paste this right below your imports in adminRoutes.js
// console.log("--- DEBUGGING IMPORTS ---");
// console.log("protect is a:", typeof protect);
// console.log("adminOnly is a:", typeof adminOnly);
// console.log("getAllUsers is a:", typeof getAllUsers);
// console.log("deleteUser is a:", typeof deleteUser);
// console.log("-------------------------");

// // Lock down all routes in this file with BOTH guards
// router.use(protect, adminOnly);

// // The actual routes
// router.get('/users', getAllUsers);
// router.delete('/users/:id', deleteUser);

// module.exports = router;


const express = require('express');
const router = express.Router();

// 1. Import everything (using the correct paths that just printed 'function')
const { getAllUsers, deleteUser } = require('../controllers/adminController');
const protect = require('../middlewares/authMiddleware'); // Or however you spelled it with the 's'
const adminOnly = require('../middlewares/adminMiddleware');

// 2. Lock down all routes in this file with BOTH guards
router.use(protect, adminOnly);

// 3. The actual routes
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

// 4. CRITICAL: This line hands the router back to server.js
module.exports = router;
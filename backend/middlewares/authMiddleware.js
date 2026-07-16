// // middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');
// const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

// const protect = (req, res, next) => {
//     // 1. Look for the token in the headers (Usually formatted as "Bearer <token>")
//     let token = req.header('Authorization');

//     if (!token) {
//         return res.status(401).json({ message: "Access denied. No token provided." });
//     }

//     try {
//         // 2. Strip the "Bearer " part if it exists
//         if (token.startsWith('Bearer ')) {
//             token = token.slice(7, token.length).trimLeft();
//         }

//         // 3. Verify the token using our secret key
//         const verified = jwt.verify(token, JWT_SECRET);
        
//         // 4. Attach the verified user data (ID and Role) to the request
//         req.user = verified;
        
//         // 5. Move on to the next function (the controller)
//         next();
//     } catch (error) {
//         res.status(400).json({ message: "Invalid token." });
//     }
// };

// module.exports = protect;

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (Format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify token using your secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch the user from the database and attach it to the request (minus the password)
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = protect;
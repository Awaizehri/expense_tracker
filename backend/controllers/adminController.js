// controllers/adminController.js
const User = require('../models/User');

// 1. Fetch all users (excluding their hashed passwords)
const getAllUsers = async (req, res) => {
    try {
        // .select('-password') explicitly strips the password field from the returning JSON
        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Delete a specific user account
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        
        res.status(200).json({ message: "User account deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = { getAllUsers, deleteUser };
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_this');
            
            // Try different possible field names
            const userId = decoded.userId || decoded.id || decoded._id;
            
            if (!userId) {
                return res.status(401).json({ message: 'Invalid token structure' });
            }
            
            req.user = await User.findById(userId).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }
            
            // ✅ ADDED: Check if user is active
            if (req.user.status !== 'active') {
                return res.status(403).json({ 
                    message: 'Account is ' + req.user.status + '. Please contact admin.' 
                });
            }
            
            // ✅ ADDED: Store user ID for adminController
            req.userId = userId;
            
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            
            // More specific error messages
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, please login again' });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Invalid token' });
            }
            
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// ✅ ADDED: Admin only middleware
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }
        
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ✅ ADDED: Verify token only (without role check)
const verifyToken = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_this');
            
            const userId = decoded.userId || decoded.id || decoded._id;
            
            if (!userId) {
                return res.status(401).json({ message: 'Invalid token structure' });
            }

            // ✅ IMPORTANT: Set req.user so routes can check req.user.role
            req.user = await User.findById(userId).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // ✅ DO NOT CHECK status here (para walang maapektuhan na admin verification flow)
            req.userId = userId;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ message: 'Invalid token' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
};

module.exports = { protect, authorize, isAdmin, verifyToken };
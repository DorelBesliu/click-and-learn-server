// In src/middleware/auth.js
const { admin } = require('../config/firebase');

const checkAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        const authToken = req.headers.authorization.split(' ')[1];
        try {
            req.user =  await admin.auth().verifyIdToken(authToken);
            next();
        } catch (e) {
            res.status(403).send({});
        }
    } else {
        res.status(403).send({});
    }
};

module.exports = checkAuth;

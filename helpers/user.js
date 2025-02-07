const {query} = require("./db-connector");
const getUser = async (firebaseUid) => {
    const [user] = await query('SELECT * FROM users WHERE firebase_uid = ?', [firebaseUid]);

    return user ?? {};
}

module.exports = { getUser };


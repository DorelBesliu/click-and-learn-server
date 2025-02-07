const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: '52.58.104.176',
    user: 'besliu_tudor',
    password: 'Tudor@1234',
    database: 'click-and-learn',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function for executing queries
const query = async (sql, values) => {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(sql, values);
        connection.release();
        return results;
    } catch (error) {
        throw error;
    }
};

module.exports = { query };

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
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

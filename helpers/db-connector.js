const mysql = require("mysql2/promise");

const poolConfig = {
    host: '127.0.0.1',
    user: 'besliu_tudor',
    password: 'Tudor@1234',
    database: 'click-and-learn',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}

console.log({ poolConfig });

const pool = mysql.createPool(poolConfig);

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

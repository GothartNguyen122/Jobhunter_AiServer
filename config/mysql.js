const mysql = require('mysql2/promise');
require('dotenv').config();

class MySQLConnection {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST ,
        port: process.env.MYSQL_PORT ,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE || 'jobhunter',
        charset: 'utf8mb4'
      });
      
      console.log('✅ MySQL connection established successfully');
      return this.connection;
    } catch (error) {
      console.error('❌ MySQL connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('🔌 MySQL connection closed');
    }
  }

  async query(sql, params = []) {
    if (!this.connection) {
      await this.connect();
    }
    
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ MySQL query error:', error.message);
      throw error;
    }
  }

  async getConnection() {
    if (!this.connection) {
      await this.connect();
    }
    return this.connection;
  }
}

// Export singleton instance
module.exports = new MySQLConnection();

if (require.main === module) {
  (async () => {
    const db = require('./mysql'); // hoặc './tên-file-của-bạn'
    try {
      const connection = await db.connect();

      // test query
      const result = await db.query('SELECT NOW() AS `current_time`');

      console.log('✅ Query test result:', result);

      await db.disconnect();
      console.log('🚀 Test completed successfully');
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  })();
}


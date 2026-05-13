const { sequelize } = require('./models/index');

async function fix() {
    try {
        await sequelize.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_viewed_notices DATETIME DEFAULT CURRENT_TIMESTAMP;");
        console.log("Column last_viewed_notices added successfully.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await sequelize.close();
    }
}

fix();

/**
 * Add User to StorageFlows table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('StorageFlows', 'UserId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: { model: 'Users', key: 'id' },
            // CHECK ME
            onDelete: 'SET NULL',
            // CHECK ME
            onUpdate: 'CASCADE'
        })
    },
    down: async (context) => {
    }
}

/**
 * Add 3rd party broker credentials table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('BrokerCredentials', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, allowNull: false },
            host: { type: DataTypes.STRING, allowNull: false },
            port: { type: DataTypes.INTEGER, allowNull: false, default: 1883 },
            protocol: { type: DataTypes.STRING, allowNull: false, default: 'mqtt:' },
            protocolVersion: { type: DataTypes.INTEGER, allowNull: false, default: 4 },
            ssl: { type: DataTypes.BOOLEAN, allowNull: false, default: false },
            verifySSL: { type: DataTypes.BOOLEAN, allowNull: false, default: false },
            clientId: { type: DataTypes.STRING, allowNull: false },
            credentials: { type: DataTypes.TEXT, allowNull: false },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })
        await context.addIndex('BrokerCredentials', { name: 'broker_name_team_unique', fields: ['name', 'TeamId'], unique: true })
    },
    down: async (context) => {
    }
}

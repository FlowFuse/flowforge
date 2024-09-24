/**
 * A Project's Flow
 * @namespace forge.db.models.StorageFlow
 */
const { DataTypes } = require('sequelize')

/*
 * This currently does the bare minimum, not history or user tracking
 */

module.exports = {
    name: 'StorageFlow',
    schema: {
        flow: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' }
    },
    associations: function (M) {
        this.belongsTo(M.Project)
        this.belongsTo(M.User)
    },
    finders: function (M) {
        return {
            static: {
                byProject: async (project) => {
                    return this.findOne({
                        where: { ProjectId: project },
                        attributes: ['id', 'flow', 'updatedAt', 'UserId']
                    })
                }
            }
        }
    }
}

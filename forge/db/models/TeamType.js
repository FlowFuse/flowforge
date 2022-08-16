/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes, literal, Op } = require('sequelize')

module.exports = {
    name: 'TeamType',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
        description: { type: DataTypes.TEXT },
        properties: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('properties', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('properties') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    associations: function (M) {
        this.hasMany(M.Team)
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.TeamType.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id }
                    })
                },
                byName: async function (name) {
                    return self.findOne({
                        where: { name }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 30
                    if (pagination.cursor) {
                        where.id = { [Op.gt]: M.Team.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        order: [['id', 'ASC']],
                        limit,
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                         SELECT COUNT(*)
                                         FROM "Teams" AS "team"
                                         WHERE
                                         "team"."TeamTypeId" = "TeamType"."id"
                                     )`),
                                    'teamCount'
                                ]
                            ]
                        }
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count: count,
                        types: rows
                    }
                }
            },
            instance: {
                teamCount: async function () {
                    return await M.Team.count({ where: { TeamTypeId: this.id } })
                }
            }
        }
    }
}

const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Team model', function () {
    // Use standard test data.
    let app

    describe('model properties', async function () {
        let pt1, pt2, pt3
        let d1, d2
        let ATeam
        let smallerTeamType
        let biggerTeamType
        before(async function () {
            app = await setup({})

            pt1 = await app.db.models.ProjectType.create({ name: 'pt1', properties: {}, active: true })
            pt2 = await app.db.models.ProjectType.create({ name: 'pt2', properties: {}, active: true })
            pt3 = await app.db.models.ProjectType.create({ name: 'pt3', properties: {}, active: true })

            // Modify the default teamType to have some limits to test against
            const teamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const teamTypeProperties = { ...teamType.properties }
            teamTypeProperties.users.limit = 2
            teamTypeProperties.instances = {
                [pt1.hashid]: { active: true, limit: 2 },
                [pt2.hashid]: { active: true, limit: 7 },
                [pt3.hashid]: { active: false }
            }
            teamTypeProperties.devices.limit = 2
            teamType.properties = teamTypeProperties
            await teamType.save()
            ATeam = await app.db.models.Team.findOne({ where: { name: 'ATeam' } })

            d1 = await app.db.models.Device.create({ name: 'd1', type: 't1', credentialSecret: '' })
            await ATeam.addDevice(d1)
            d2 = await app.db.models.Device.create({ name: 'd2', type: 't1', credentialSecret: '' })
            await ATeam.addDevice(d2)

            // Create a new teamType with stricter limits
            smallerTeamType = await app.db.models.TeamType.create({
                name: 'smaller-team-type',
                description: 'team type description',
                active: true,
                order: 1,
                properties: {
                    instances: {
                        [pt1.hashid]: { active: false },
                        [pt2.hashid]: { active: true, limit: 2 },
                        [pt3.hashid]: { active: true }
                    },
                    devices: { limit: 1 },
                    users: { limit: 1 },
                    features: { }
                }
            })

            biggerTeamType = await app.db.models.TeamType.create({
                name: 'bigger-team-type',
                description: 'team type description',
                active: true,
                order: 1,
                properties: {
                    instances: {
                        [pt1.hashid]: { active: true },
                        [pt2.hashid]: { active: true },
                        [pt3.hashid]: { active: true }
                    },
                    devices: { },
                    users: { },
                    features: { }
                }
            })
        })
        after(async function () {
            if (app) {
                await app.close()
                app = null
            }
        })
        it('instanceCount reports correct counts', async function () {
            const p1 = await app.db.models.Project.create({ name: 'testProject1', type: '', url: '' })
            await p1.setProjectType(pt1)
            await p1.setTeam(ATeam)

            const p2 = await app.db.models.Project.create({ name: 'testProject2', type: '', url: '' })
            await p2.setProjectType(pt1)
            await p2.setTeam(ATeam)

            const p3 = await app.db.models.Project.create({ name: 'testProject3', type: '', url: '' })
            await p3.setProjectType(pt2)
            await p3.setTeam(ATeam)

            const allCount = await ATeam.instanceCount()
            allCount.should.equal(3)

            // Check the function works with all ways to specify a type
            ;(await ATeam.instanceCount(pt1)).should.equal(2)
            ;(await ATeam.instanceCount(pt1.id)).should.equal(2)
            ;(await ATeam.instanceCount(pt1.hashid)).should.equal(2)

            const pt2Count = await ATeam.instanceCount(pt2.hashid)
            pt2Count.should.equal(1)

            const countsByType = await ATeam.instanceCountByType()
            countsByType.should.have.property(pt1.hashid, 2)
            countsByType.should.have.property(pt2.hashid, 1)
        })

        it('getUserLimit', async function () {
            const userLimit = await ATeam.getUserLimit()
            userLimit.should.equal(2)
        })
        it('getDeviceLimit', async function () {
            const deviceLimit = await ATeam.getDeviceLimit()
            deviceLimit.should.equal(2)
        })
        it('isInstanceTypeAvailable', async function () {
            // Check the function handles all the ways an instance type
            // might be provided - object, id or hashid.
            ;(await ATeam.isInstanceTypeAvailable(pt1)).should.be.true()
            ;(await ATeam.isInstanceTypeAvailable(pt1.hashid)).should.be.true()
            ;(await ATeam.isInstanceTypeAvailable(pt1.id)).should.be.true()
            ;(await ATeam.isInstanceTypeAvailable(pt2)).should.be.true()
            ;(await ATeam.isInstanceTypeAvailable(pt2.hashid)).should.be.true()
            ;(await ATeam.isInstanceTypeAvailable(pt2.id)).should.be.true()
            ;(await ATeam.isInstanceTypeAvailable(pt3)).should.be.false()
            ;(await ATeam.isInstanceTypeAvailable(pt3.hashid)).should.be.false()
            ;(await ATeam.isInstanceTypeAvailable(pt3.id)).should.be.false()
        })
        it('getInstanceTypeLimit', async function () {
            // Check the function handles all the ways an instance type
            // might be provided - object, id or hashid.
            ;(await ATeam.getInstanceTypeLimit(pt1)).should.equal(2)
            ;(await ATeam.getInstanceTypeLimit(pt1.hashid)).should.equal(2)
            ;(await ATeam.getInstanceTypeLimit(pt1.id)).should.equal(2)
            ;(await ATeam.getInstanceTypeLimit(pt2)).should.equal(7)
            ;(await ATeam.getInstanceTypeLimit(pt2.hashid)).should.equal(7)
            ;(await ATeam.getInstanceTypeLimit(pt2.id)).should.equal(7)
            ;(await ATeam.getInstanceTypeLimit(pt3)).should.equal(0)
            ;(await ATeam.getInstanceTypeLimit(pt3.hashid)).should.equal(0)
            ;(await ATeam.getInstanceTypeLimit(pt3.id)).should.equal(0)
        })
        it('checkInstanceTypeCreateAllowed', async function () {
            await ATeam.checkInstanceTypeCreateAllowed(pt1).should.be.rejected() // 2 vs 2
            await ATeam.checkInstanceTypeCreateAllowed(pt2).should.be.resolved() // 1 vs 7
            await ATeam.checkInstanceTypeCreateAllowed(pt3).should.be.rejected() // 0 vs 0
        })

        it('checkInstanceStartAllowed', async function () {
            await ATeam.checkInstanceStartAllowed(pt1).should.be.resolved()
            await ATeam.checkInstanceStartAllowed(pt2).should.be.resolved()
            await ATeam.checkInstanceStartAllowed(pt3).should.be.resolved()
        })

        it('checkTeamTypeUpdateAllowed rejects changing type to smaller type', async function () {
            let error
            try {
                await ATeam.checkTeamTypeUpdateAllowed(smallerTeamType)
            } catch (err) {
                error = err
            }
            should.exist(error, 'error not thrown')
            error.code.should.equal('invalid_request')
            error.should.have.property('errors')
            error.errors.should.have.length(3)
            error.errors.sort((A, B) => A.code.localeCompare(B.code))
            error.errors[0].should.have.property('code', 'device_limit_reached')
            error.errors[0].should.have.property('limit', 1)
            error.errors[0].should.have.property('count', 2)
            error.errors[1].should.have.property('code', 'instance_limit_reached')
            error.errors[1].should.have.property('limit', 0)
            error.errors[1].should.have.property('count', 2)
            error.errors[1].should.have.property('type', pt1.hashid)
            error.errors[2].should.have.property('code', 'member_limit_reached')
            error.errors[2].should.have.property('limit', 1)
            error.errors[2].should.have.property('count', 2)
        })
        it('checkTeamTypeUpdateAllowed allows changing type to bigger type', async function () {
            await ATeam.checkTeamTypeUpdateAllowed(biggerTeamType)
        })
        it('checkDeviceCreateAllowed', async function () {
            await ATeam.checkDeviceCreateAllowed().should.be.rejected() // Already at the limit

            // Remove a device
            await d1.destroy()

            // Check we can now create a device
            await ATeam.checkDeviceCreateAllowed().should.be.resolved()
        })

        it('updateTeamType applies type change', async function () {
            await ATeam.updateTeamType(biggerTeamType)
            const reloadedTeam = await app.db.models.Team.findOne({ where: { name: 'ATeam' } })
            reloadedTeam.TeamTypeId.should.equal(biggerTeamType.id)
        })
    })
    describe('License limits', function () {
        afterEach(async function () {
            if (app) {
                await app.close()
                app = null
            }
        })
        it('Permits overage when licensed', async function () {
            // This license has limit of 4 teams (3 created by default test setup)
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo0LCJwcm9qZWN0cyI6NTAsImRldmljZXMiOjUwLCJkZXYiOnRydWUsImlhdCI6MTY2MjYzMTU4N30.J6ceWv3SdFC-J_dt05geeQZHosD1D102u54tVLeu_4EwRO5OYGiqMxFW3mx5pygod3xNT68e2Wq8A7wNVCt3Rg'
            app = await setup({ license })
            // Default setup creates 3 teams
            ;(await app.db.models.Team.count()).should.equal(3)

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })

            await app.db.models.Team.create({ name: 'T4', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(4)

            await app.db.models.Team.create({ name: 'T5', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(5)
        })
        it('Does not permit overage when unlicensed', async function () {
            app = await setup({ })
            app.license.defaults.teams = 4 // override default

            // Default setup creates 3 teams
            ;(await app.db.models.Team.count()).should.equal(3)

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })

            await app.db.models.Team.create({ name: 'T4', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(4)

            try {
                await app.db.models.Team.create({ name: 'T5', TeamTypeId: defaultTeamType.id })
                return Promise.reject(new Error('able to create team that exceeds limit'))
            } catch (err) { }

            await app.db.models.Team.destroy({ where: { name: 'T4' } })
            ;(await app.db.models.Team.count()).should.equal(3)

            await app.db.models.Team.create({ name: 'T5', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(4)
        })
    })
})

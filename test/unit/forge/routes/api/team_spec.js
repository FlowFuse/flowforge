const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        await TestObjects.BTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })
    describe.skip('Team API', function async () {
        beforeEach(async function () {
            app = await setup()

            // Alice create in setup()
            TestObjects.alice = await app.db.models.User.byUsername('alice')
            TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

            TestObjects.tokens = {}
            await login('alice', 'aaPassword')
            await login('bob', 'bbPassword')
            await login('chris', 'ccPassword')
        })

        describe('Get team details', async function () {
            // GET /api/v1/teams/:teamId
            // - Must be admin or team owner/member
        })

        describe('Get team details by slug', async function () {
            // GET /api/v1/teams/:teamId?slug=<teamSlug>
            // - Must be admin or team owner/member
        })

        describe('Get list of teams', async function () {
            // GET /api/v1/teams/:teamId
            // - Admin only
        })

        describe('Get list of a teams projects', async function () {
            // GET /api/v1/teams/:teamId/projects
            // - Admin/Owner/Member
        })

        describe('Create team', async function () {
            // POST /api/v1/teams
            // - Admin/Owner/Member
        })

        describe('Delete team', async function () {
            // DELETE /api/v1/teams/:teamId
            // - Admin/Owner/Member
            // - should fail if team owns projects
        })

        describe('Edit team details', async function () {
            // PUT /api/v1/teams/:teamId
        })

        describe('Get current users membership', async function () {
            // GET /api/v1/teams/:teamId/user
        })

        describe('Get team audit-log', async function () {
            // GET /api/v1/teams/:teamId/audit-log
        })
    })
    describe('license limits', async function () {
        it('limits how many teams can be created according to license', async function () {
            // This license has limit of 4 teams (1 created by default test setup)
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo0LCJwcm9qZWN0cyI6NTAsImRldmljZXMiOjUwLCJkZXYiOnRydWUsImlhdCI6MTY2MjYzMTU4N30.J6ceWv3SdFC-J_dt05geeQZHosD1D102u54tVLeu_4EwRO5OYGiqMxFW3mx5pygod3xNT68e2Wq8A7wNVCt3Rg'
            app = await setup({ license })
            // Alice create in setup()
            TestObjects.alice = await app.db.models.User.byUsername('alice')
            TestObjects.defaultTeamType = await app.db.models.TeamType.findOne()
            TestObjects.tokens = {}
            await login('alice', 'aaPassword')

            // Check we're at the starting point we expect
            ;(await app.db.models.Team.count()).should.equal(1)

            for (let i = 0; i < 3; i++) {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/teams',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: `t${i}`,
                        slug: `t${i}`,
                        type: TestObjects.defaultTeamType.hashid
                    }
                })
                response.statusCode.should.equal(200)
            }

            ;(await app.db.models.Team.count()).should.equal(4)

            const failResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/teams',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 't2',
                    slug: 't2',
                    type: TestObjects.defaultTeamType.hashid
                }
            })
            failResponse.statusCode.should.equal(400)
            failResponse.json().error.should.match(/license limit/)
        })
    })

    describe('Create team', async function () {
        // POST /api/v1/teams
        // - Admin/Owner/Member
    })

    describe('Delete team', async function () {
        // DELETE /api/v1/teams/:teamId
        // - Admin/Owner/Member
        // - should fail if team owns projects

        it('removes pending invitations', async function () {
            // Alice invites Chris to TeamA
            // Delete TeamB
            await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    user: 'chris'
                }
            })
            const inviteListA = (await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()
            inviteListA.should.have.property('count', 1)
            const deleteResult = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            deleteResult.statusCode.should.equal(200)
            const inviteListChris = (await app.inject({
                method: 'GET',
                url: '/api/v1/user/invitations',
                cookies: { sid: TestObjects.tokens.chris }
            })).json()
            inviteListChris.should.have.property('count', 0)
        })
    })

    describe('Edit team details', async function () {
        // PUT /api/v1/teams/:teamId
    })

    describe('Get current users membership', async function () {
        // GET /api/v1/teams/:teamId/user
    })

    describe('Get team audit-log', async function () {
        // GET /api/v1/teams/:teamId/audit-log
    })
})

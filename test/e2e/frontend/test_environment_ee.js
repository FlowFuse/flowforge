/* eslint-disable n/no-process-exit */
'use strict'

const TestModelFactory = require('../../lib/TestModelFactory')

const app = require('./environments/standard')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

;(async function () {
    const PORT = 3002

    const flowforge = await app({
        trialMode: true
    }, {
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
        host: 'localhost',
        port: PORT,
        billing: {
            stripe: {
                key: 1234,
                team_product: 'defaultteamprod',
                team_price: 'defaultteamprice',
                new_customer_free_credit: 1000,
                teams: {
                    starter: {
                        product: 'starterteamprod',
                        price: 'starterteampprice'
                    }
                }
            }
        },
        email: {
            enabled: true,
            debug: true,
            smtp: {
                host: 'localhost',
                port: 1026,
                webPort: 8026,
                secure: false,
                debug: true
            }
        }
    })

    const factory = new TestModelFactory(flowforge)

    // Enable Device Group feature for default team type
    const defaultTeamType = await flowforge.db.models.TeamType.findOne({ where: { name: 'starter' } })
    const defaultTeamTypeProperties = defaultTeamType.properties
    defaultTeamTypeProperties.features.deviceGroups = true
    defaultTeamTypeProperties.features.protectedInstance = true
    defaultTeamTypeProperties.features.teamHttpSecurity = true
    defaultTeamType.properties = defaultTeamTypeProperties
    await defaultTeamType.save()

    // setup team
    const trialTeam = await factory.createTeam({ name: 'TTeam' })
    // create trial subscription for the team
    await factory.createTrialSubscription(trialTeam, 5)

    // setup user
    const userTerry = await factory.createUser({ username: 'terry', name: 'Terry Organa', email: 'terry@example.com', password: 'ttPassword', email_verified: true, password_expired: false })

    await trialTeam.addUser(userTerry, { through: { role: Roles.Owner } })
    // assign user to the trial team

    await factory.createTeamType({
        name: 'Second Team Type',
        description: 'team type description',
        active: true,
        order: 2,
        properties: { instances: {}, devices: {}, users: {}, features: {} }
    })

    // create a snapshot on DeviceB
    const deviceB = flowforge.applicationDevices.find((device) => device.name === 'application-device-b')
    await factory.createDeviceSnapshot({ name: 'application-device-b snapshot 1' }, deviceB, userTerry)

    flowforge.listen({ port: PORT }, function (err, address) {
        console.info(`EE Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()

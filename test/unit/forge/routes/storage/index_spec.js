const should = require('should')

const setup = require('../setup')

describe('Storage API', function () {
    let app
    let tokens
    let project
    let project2
    let tokens2

    before(async function () {
        app = await setup()
        project = app.project
        tokens = await project.refreshAuthTokens()

        project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
        await app.team.addProject(project2)
        tokens2 = await project2.refreshAuthTokens()

        await app.db.models.StorageFlow.create({
            flow: JSON.stringify([]),
            ProjectId: project.id
        })
        await app.db.models.StorageCredentials.create({
            credentials: JSON.stringify({}),
            ProjectId: project.id
        })
        await app.db.models.StorageSettings.create({
            settings: JSON.stringify({}),
            ProjectId: project.id
        })
        await app.db.models.StorageSession.create({
            sessions: JSON.stringify({}),
            ProjectId: project.id
        })
    })

    after(async function () {
        await app.close()
    })

    function describeAuthTests (urlPath, postPayload = {}) {
        it('GET Rejects invalid token ' + urlPath, async function () {
            const url = `/storage/${project.id}${urlPath}`
            const response = await app.inject({
                method: 'GET',
                url,
                headers: {
                    authorization: `Bearer ${tokens2.token}`
                }
            })
            response.statusCode.should.equal(404)
        })
        it('POST Rejects invalid token ' + urlPath, async function () {
            const url = `/storage/${project.id}${urlPath}`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${tokens2.token}`
                },
                payload: postPayload
            })
            response.statusCode.should.equal(404)
        })
    }

    describe('Project Settings', function () {
        it('Rejects unknown token', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: 'Bearer 123'
                }
            })
            response.statusCode.should.equal(401)
        })
        it('Rejects missing token', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL
            })
            response.statusCode.should.equal(401)
        })
        it('Rejects invalid project', async function () {
            const settingsURL = '/api/v1/projects/123/settings'
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            response.statusCode.should.equal(404)
        })
        it('Rejects invalid token', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${tokens2.token}`
                }
            })
            response.statusCode.should.equal(404)
        })
        it('Get Project Settings', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const newSettings = response.json()
            should(newSettings).have.property('storageURL')
            should(newSettings).have.property('forgeURL')
        })
    })

    describe('/flows', function () {
        describeAuthTests('/flows')

        it('Save Flow', async function () {
            const newFlow = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
            const flowURL = `/storage/${project.id}/flows`
            await app.inject({
                method: 'POST',
                url: flowURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                },
                payload: newFlow
            })
            const response = await app.inject({
                method: 'GET',
                url: flowURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const flow = response.json()
            should(flow).eqls(newFlow)
        })

        it('Save Flow with user', async function () {
            const newFlow = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
            const flowURL = `/storage/${project.id}/flows`
            await app.inject({
                method: 'POST',
                url: flowURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`,
                    'ff-user': app.adminUser.hashid
                },
                payload: newFlow
            })
            const response = await app.inject({
                method: 'GET',
                url: flowURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const flow = response.json()
            should(flow).eqls(newFlow)
            const dbFlow = await app.db.models.StorageFlow.byProject(project.id)
            dbFlow.should.have.property('UserId', app.adminUser.id)
        })
    })

    describe('/credentials', function () {
        describeAuthTests('/credentials')

        it('Get Credentials', async function () {
            const credsURL = `/storage/${project.id}/credentials`
            const response = await app.inject({
                method: 'GET',
                url: credsURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const creds = response.json()
            should(creds).eqls({})
        })

        it('Save Credentials', async function () {
            const newCreds = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
            const credsURL = `/storage/${project.id}/credentials`
            await app.inject({
                method: 'POST',
                url: credsURL,
                payload: newCreds,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const response = await app.inject({
                method: 'GET',
                url: credsURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const creds = response.json()
            should(creds).eqls(newCreds)
        })
    })

    describe('/settings', function () {
        describeAuthTests('/settings')

        it('Get Runtime Settings', async function () {
            this.timeout(10000)
            const settingsURL = `/storage/${project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const settings = response.json()
            should(settings).eqls({})
        })
    })

    describe('/sessions', function () {
        describeAuthTests('/sessions')

        it('Get Sessions', async function () {
            this.timeout(10000)
            const sessionURL = `/storage/${project.id}/sessions`
            const response = await app.inject({
                method: 'GET',
                url: sessionURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const sessions = response.json()
            should(sessions).eqls({})
        })

        it('Save Sessions', async function () {
            const newSessions = [{ id: '1', type: 'tab', label: 'tab1', disabled: false, info: '' }]
            const sessionURL = `/storage/${project.id}/sessions`
            await app.inject({
                method: 'POST',
                url: sessionURL,
                payload: newSessions,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const response = await app.inject({
                method: 'GET',
                url: sessionURL,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const sessions = response.json()
            should(sessions).eqls(newSessions)
        })
    })

    describe('/library', function () {
        describeAuthTests('/library/functions', { name: 'test', meta: {}, body: 'foo' })

        afterEach(async function () {
            await app.db.models.StorageLibrary.destroy({ where: {} })
        })

        it('Add to Library', async function () {
            this.timeout(10000)
            const funcText = '\nreturn msg;'
            const libraryURL = `/storage/${project.id}/library/functions`
            await app.inject({
                method: 'POST',
                url: libraryURL,
                payload: {
                    name: 'test',
                    meta: {},
                    body: funcText
                },
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const response = await app.inject({
                method: 'GET',
                url: `${libraryURL}?name=test`,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const libraryEntry = response.payload
            should(libraryEntry).equal('\nreturn msg;')
        })

        it('Add to Library with path', async function () {
            const funcText = '\nreturn msg;'
            const libraryURL = `/storage/${project.id}/library/functions`
            await app.inject({
                method: 'POST',
                url: libraryURL,
                payload: {
                    name: 'test/foo/bar',
                    meta: {},
                    body: funcText
                },
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const response = await app.inject({
                method: 'GET',
                url: `${libraryURL}?name=test`,
                headers: {
                    authorization: `Bearer ${tokens.token}`
                }
            })
            const libraryEntry = response.json()
            libraryEntry.should.eql(['foo'])
        })

        it('Add multiple entries to library', async function () {
            const funcText = '\nreturn msg;'
            const libraryURL = `/storage/${project.id}/library/functions`

            async function addToLibrary (name) {
                return await app.inject({
                    method: 'POST',
                    url: libraryURL,
                    payload: {
                        name,
                        meta: { metaName: name },
                        body: funcText
                    },
                    headers: {
                        authorization: `Bearer ${tokens.token}`
                    }
                })
            }

            async function getFromLibrary (name) {
                return (await app.inject({
                    method: 'GET',
                    url: `${libraryURL}?name=${name}`,
                    headers: {
                        authorization: `Bearer ${tokens.token}`
                    }
                })).json()
            }
            /*
              Library file structure:
                ├── bar3
                └── test
                    └── foo
                        ├── bar
                        └── bar2
            */

            await addToLibrary('test/foo/bar')
            await addToLibrary('test/foo/bar2')
            await addToLibrary('bar3')

            const libraryEntry = await getFromLibrary('')
            libraryEntry.should.have.length(2)
            libraryEntry[0].should.have.property('fn', 'bar3')
            libraryEntry[0].should.have.property('metaName', 'bar3')
            libraryEntry[1].should.eql('test')

            const libraryEntry1 = await getFromLibrary('test')
            libraryEntry1.should.eql(['foo'])
            const libraryEntry2 = await getFromLibrary('test/foo')
            libraryEntry2.should.have.length(2)
            libraryEntry2[0].should.have.property('fn', 'bar')
            libraryEntry2[0].should.have.property('metaName', 'test/foo/bar')
            libraryEntry2[1].should.have.property('fn', 'bar2')
            libraryEntry2[1].should.have.property('metaName', 'test/foo/bar2')
        })
    })
})

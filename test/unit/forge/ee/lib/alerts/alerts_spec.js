const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('./setup')

describe('Instance Alerts emails', function () {
    // Use standard test data.
    let app
    /** @type {localTransport} */
    let inbox = null

    before(async function () {
        app = await setup()
        inbox = app.config.email.transport
        await login('alice', 'aaPassword')
    })
    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        inbox.messages = []
        sinon.restore()
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        app.TestObjects.tokens[username] = response.cookies[0].value
    }

    describe('Alerts', function () {
        it('Owner notified of crash', async function () {
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'crashed')
            inbox.messages.should.have.length(1)
        })
        it('Crashed, via api (no logs)', async function () {
            sinon.spy(app.postoffice, 'send')
            const response = await app.inject({
                method: 'POST',
                url: `/logging/${app.TestObjects.instance.id}/audit`,
                payload: {
                    event: 'crashed',
                    error: {
                        code: 'crashed',
                        error: 'instance crashed'
                    }
                },
                headers: {
                    authorization: `Bearer ${app.TestObjects.tokens.instance}`
                }
            })
            response.statusCode.should.equal(200)
            inbox.messages.should.have.length(1)
            // ensure correct template was used
            app.postoffice.send.calledOnce.should.be.true()
            app.postoffice.send.firstCall.args[1].should.equal('Crashed')
            // ensure the logs section is not rendered
            inbox.messages[0].html.should.not.match(/\n.*Logs\.\.\./)
        })
        it('Crashed, generic, via api (including logs)', async function () {
            sinon.spy(app.postoffice, 'send')
            const response = await app.inject({
                method: 'POST',
                url: `/logging/${app.TestObjects.instance.id}/audit`,
                payload: {
                    event: 'crashed',
                    info: {
                        code: 1,
                        signal: null,
                        info: 'non zero exit code'
                    },
                    __launcherLog: [
                        { ts: 1647987742001, level: 'info', msg: 'info message 1' }, // 2022-03-22T22:22:22.001Z
                        { ts: 1647987742002, level: 'error', msg: 'error message 1' } // 2022-03-22T22:22:22.002Z
                    ],
                    error: {
                        code: 'crashed',
                        error: 'instance crashed'
                    }
                },
                headers: {
                    authorization: `Bearer ${app.TestObjects.tokens.instance}`
                }
            })
            response.statusCode.should.equal(200)

            inbox.messages.should.have.length(1)
            // use regex to ensure there is <p>\n.*Logs...
            inbox.messages[0].html.should.match(/<p>\n.*Logs\.\.\./)
            inbox.messages[0].html.should.match(/<td>info message 1<\/td>/)
            inbox.messages[0].html.should.match(/<td>error message 1<\/td>/)
            inbox.messages[0].text.should.match(/\n.*Logs\.\.\./)
            inbox.messages[0].text.should.match(/\nTimestamp: 2022-03-22 22:22:22/)
            inbox.messages[0].text.should.match(/\nSeverity: info/)
            inbox.messages[0].text.should.match(/\nMessage: info message 1/)
            inbox.messages[0].text.should.match(/\nTimestamp: 2022-03-22 22:22:22/)
            inbox.messages[0].text.should.match(/\nSeverity: error/)
            inbox.messages[0].text.should.match(/\nMessage: error message 1/)
            // ensure correct template was used
            app.postoffice.send.calledOnce.should.be.true()
            app.postoffice.send.firstCall.args[1].should.equal('Crashed')
        })
        it('Crashed, out-of-memory, via api (including logs)', async function () {
            sinon.spy(app.postoffice, 'send')
            const response = await app.inject({
                method: 'POST',
                url: `/logging/${app.TestObjects.instance.id}/audit`,
                payload: {
                    event: 'crashed',
                    info: {
                        code: 134,
                        signal: null,
                        info: 'non zero exit code'
                    },
                    __launcherLog: [
                        { ts: 1647987742001, level: 'info', msg: 'info message 1' }, // 2022-03-22T22:22:22.001Z
                        { ts: 1647987742002, level: 'error', msg: 'v8::internal::heap::' } // 2022-03-22T22:22:22.002Z
                    ],
                    error: {
                        code: 'crashed',
                        error: 'instance crashed'
                    }
                },
                headers: {
                    authorization: `Bearer ${app.TestObjects.tokens.instance}`
                }
            })
            response.statusCode.should.equal(200)

            inbox.messages.should.have.length(1)
            // use regex to ensure there is <p>\n.*Logs...
            inbox.messages[0].html.should.match(/<p>\n.*Logs\.\.\./)
            inbox.messages[0].html.should.match(/<td>info message 1<\/td>/)
            inbox.messages[0].html.should.match(/<td>v8::internal::heap::<\/td>/)
            inbox.messages[0].text.should.match(/\n.*Logs\.\.\./)
            inbox.messages[0].text.should.match(/\nTimestamp: 2022-03-22 22:22:22/)
            inbox.messages[0].text.should.match(/\nSeverity: info/)
            inbox.messages[0].text.should.match(/\nMessage: info message 1/)
            inbox.messages[0].text.should.match(/\nTimestamp: 2022-03-22 22:22:22/)
            inbox.messages[0].text.should.match(/\nSeverity: error/)
            inbox.messages[0].text.should.match(/\nMessage: v8::internal::heap::/)

            // ensure correct template was used
            app.postoffice.send.calledOnce.should.be.true()
            app.postoffice.send.firstCall.args[1].should.equal('Crashed-out-of-memory')
        })
        it('Crashed, uncaught-exception, via api (including logs)', async function () {
            sinon.spy(app.postoffice, 'send')
            const response = await app.inject({
                method: 'POST',
                url: `/logging/${app.TestObjects.instance.id}/audit`,
                payload: {
                    event: 'crashed',
                    info: {
                        code: 1,
                        signal: null,
                        info: 'non zero exit code'
                    },
                    __launcherLog: [
                        { ts: 1647987742001, level: 'info', msg: 'info message 1' }, // 2022-03-22T22:22:22.001Z
                        { ts: 1647987742002, level: 'error', msg: 'uncaught exception' } // 2022-03-22T22:22:22.002Z
                    ],
                    error: {
                        code: 'crashed',
                        error: 'instance crashed'
                    }
                },
                headers: {
                    authorization: `Bearer ${app.TestObjects.tokens.instance}`
                }
            })
            response.statusCode.should.equal(200)

            inbox.messages.should.have.length(1)
            inbox.messages[0].html.should.match(/<p>\n.*Logs\.\.\./)
            inbox.messages[0].html.should.match(/<td>info message 1<\/td>/)
            inbox.messages[0].html.should.match(/<td>uncaught exception<\/td>/)
            inbox.messages[0].text.should.match(/\n.*Logs\.\.\./)
            inbox.messages[0].text.should.match(/\nTimestamp: 2022-03-22 22:22:22/)
            inbox.messages[0].text.should.match(/\nSeverity: info/)
            inbox.messages[0].text.should.match(/\nMessage: info message 1/)
            inbox.messages[0].text.should.match(/\nTimestamp: 2022-03-22 22:22:22/)
            inbox.messages[0].text.should.match(/\nSeverity: error/)
            inbox.messages[0].text.should.match(/\nMessage: uncaught exception/)
            // ensure correct template was used
            app.postoffice.send.calledOnce.should.be.true()
            app.postoffice.send.firstCall.args[1].should.equal('Crashed-uncaught-exception')
        })
        it('Owner notified of safe-mode', async function () {
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'safe-mode')
            inbox.messages.should.have.length(1)
        })
        it('Both notified of safe-mode', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.TestObjects.instance.id}`,
                payload: {
                    settings: {
                        emailAlerts: {
                            recipients: 'both'
                        }
                    }
                },
                cookies: { sid: app.TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'crashed')
            inbox.messages.should.have.length(2)
        })
        it('Member notified of safe-mode', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.TestObjects.instance.id}`,
                payload: {
                    settings: {
                        emailAlerts: {
                            recipients: 'members'
                        }
                    }
                },
                cookies: { sid: app.TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'crashed')
            inbox.messages.should.have.length(1)
        })
    })
})

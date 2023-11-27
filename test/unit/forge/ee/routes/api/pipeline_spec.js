const should = require('should')
const sinon = require('sinon')
const { v4: uuidv4 } = require('uuid')

const { createSnapshot } = require('../../../../../../forge/services/snapshots')
const { addFlowsToProject } = require('../../../../../lib/Snapshots.js')
const TestModelFactory = require('../../../../../lib/TestModelFactory.js')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Pipelines API', function () {
    const sandbox = sinon.createSandbox()

    const TestObjects = { tokens: {} }

    let app

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

    before(async function () {
        app = await setup()
        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')

        const factory = new TestModelFactory(app)

        TestObjects.factory = factory

        TestObjects.instanceOne = app.instance

        TestObjects.instanceTwo = await TestObjects.factory.createInstance(
            { name: 'instance-two' },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )

        TestObjects.team = app.team
        TestObjects.application = app.application
        TestObjects.stack = app.stack
        TestObjects.template = app.template
        TestObjects.projectType = app.projectType
        TestObjects.user = app.user

        TestObjects.device = await TestObjects.factory.createDevice({ name: 'device-a', type: 'type2' }, app.team, null, app.application)

        const userPez = await TestObjects.factory.createUser({
            admin: false,
            username: 'pez',
            name: 'Pez Cuckow',
            email: 'pez@example.com',
            password: 'ppPassword'
        })

        const team1 = await TestObjects.factory.createTeam({ name: 'PTeam' })
        await team1.addUser(userPez, { through: { role: Roles.Owner } })

        await login('pez', 'ppPassword')

        await login('alice', 'aaPassword')
    })

    after(async function () {
        await app.close()
        sandbox.restore()
    })
    beforeEach(async function () {
        TestObjects.pipeline = await app.factory.createPipeline({ name: 'new-pipeline' }, app.application)
        TestObjects.stageOne = await app.factory.createPipelineStage({ name: 'stage-one', instanceId: app.instance.id }, TestObjects.pipeline)

        TestObjects.pipelineDevices = await app.factory.createPipeline({ name: 'new-pipeline-devices' }, app.application)
        TestObjects.pipelineDevicesStageOne = await app.factory.createPipelineStage({ name: 'stage-one-devices', deviceId: TestObjects.device.id }, TestObjects.pipeline)
    })
    afterEach(async function () {
        await app.db.models.PipelineStage.destroy({ where: {} })
        await app.db.models.Pipeline.destroy({ where: {} })
    })

    describe('Create Pipeline Stage', function () {
        describe('With instance', function () {
            it('Should create a new pipeline stage', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        instanceId: TestObjects.instanceTwo.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'stage-two')
                body.should.have.property('instances')
                body.instances[0].should.have.property('name', 'instance-two')

                response.statusCode.should.equal(200)
            })

            describe('Validates that the pipeline is correct', function () {
                it('Rejects a pipeline stage without an instance', async function () {
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two'
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'unexpected_error')
                    body.should.have.property('error').match(/instanceId/)

                    response.statusCode.should.equal(500)
                })

                it('Rejects a pipeline stage if the instance is already in use', async function () {
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            instanceId: TestObjects.instanceOne.hashid // in use
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'unexpected_error')
                    body.should.have.property('error').match(/instanceId/)

                    response.statusCode.should.equal(500)
                })
            })
        })

        describe('With device', function () {
            it('Should create a pipeline stage')
            describe('Validates that the pipeline is correct', function () {
                it('Rejects a pipeline stage without an device')
                it('Rejects a pipeline stage if the device is already in use')
            })
        })

        describe('With either device or instance', function () {
            describe('When a previous stage is passed', function () {
                it('Should set the previous stages nextStage to the newly created pipeline stage', async function () {
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            instanceId: TestObjects.instanceTwo.id,
                            source: TestObjects.stageOne.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('id')
                    body.should.have.property('name', 'stage-two')

                    const stageOne = await TestObjects.stageOne.reload()
                    const stageTwo = await app.db.models.PipelineStage.byId(body.id)

                    stageOne.NextStageId.should.equal(stageTwo.id)

                    response.statusCode.should.equal(200)
                })
            })
        })

        describe('With both device and instance', function () {
            it('Rejects the request gracefully')
        })
    })

    describe('Get Pipeline Stage', function () {
        it('Should return a single pipeline stage with an instance', async function () {
            const pipelineId = TestObjects.pipeline.hashid
            const stageId = TestObjects.stageOne.hashid

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()

            body.should.have.property('id')
            body.should.have.property('name', 'stage-one')
            body.should.have.property('instances')
            body.instances[0].should.have.property('name', 'project1')

            response.statusCode.should.equal(200)
        })

        it('Should return a single pipeline stage with a device')
    })

    describe('Update Pipeline Stage', function () {
        describe('With a new name', function () {
            it('Should update a single pipeline stage with a new name', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        name: 'New Name'
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'New Name')
                body.should.have.property('instances')
                body.instances[0].should.have.property('name', 'project1')

                response.statusCode.should.equal(200)
            })
        })

        describe('With a new instance', function () {
            it('Should unassign the old instance and assign the new one', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: TestObjects.instanceTwo.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('instances')
                body.instances.should.have.length(1)
                body.instances[0].should.have.property('name', 'instance-two')

                response.statusCode.should.equal(200)
            })

            it('Should validate the instance ID', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const fakeUUID = uuidv4()

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: fakeUUID
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'unexpected_error')
                body.should.have.property('error').match(/instanceId/)

                response.statusCode.should.equal(500)
            })

            it('Should require the instance to be part of the same application', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const otherApplication = await TestObjects.factory.createApplication({
                    name: 'other-application'
                }, TestObjects.team)

                const otherApplicationInstance = await TestObjects.factory.createInstance(
                    { name: 'other-application-instance' },
                    otherApplication,
                    TestObjects.stack,
                    TestObjects.template,
                    TestObjects.projectType,
                    { start: false }
                )

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: otherApplicationInstance.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_instancesHaveSameApplication')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(400)
            })

            it('Should require the instance to be owned by the same team', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                // Create a new team
                const team1 = await TestObjects.factory.createTeam({ name: 'BTeam' })
                await team1.addUser(TestObjects.user, { through: { role: Roles.Owner } })

                await TestObjects.factory.createSubscription(team1)

                const template = await TestObjects.factory.createProjectTemplate(
                    { name: 'template-two', settings: {}, policy: {} },
                    TestObjects.user
                )

                const projectType = await TestObjects.factory.createProjectType({
                    name: 'projectType2',
                    description: 'default project type',
                    properties: {
                        billingProductId: 'product_123',
                        billingPriceId: 'price_123'
                    }
                })

                const stack = await TestObjects.factory.createStack({ name: 'stack2' }, projectType)

                const application = await TestObjects.factory.createApplication({ name: 'application-1' }, team1)

                const instance = await TestObjects.factory.createInstance(
                    { name: 'other-teams-instance' },
                    application,
                    stack,
                    template,
                    projectType,
                    { start: false }
                )

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: instance.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_instancesHaveSameApplication')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(400)
            })

            it('Should unassign the old device')
        })

        describe('With a new device', function () {
            it('Should unassign the old device and assign the new one')
            it('Should require the device to be part of the same application')
            it('Should unassign the old instance')
        })
    })

    describe('Delete Pipeline Stage', function () {
        it('should destroy the pipeline stage, but not touch the assigned instance', async function () {
            const pipelineId = TestObjects.pipeline.hashid
            const stageId = TestObjects.stageOne.hashid

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('status', 'okay')
            response.statusCode.should.equal(200)

            should(await app.db.models.PipelineStage.byId(stageId)).equal(null)
        })

        it('should destroy the pipeline stage, but not touch the assigned device')

        describe('When there is a pipeline before and after', function () {
            it('should re-connect the previous to the next pipeline', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                // 1 -> 2 -> 3 delete 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
                await TestObjects.stageOne.reload()
                TestObjects.stageThree = await TestObjects.factory.createPipelineStage({ name: 'stage-three', deviceId: TestObjects.device.id, source: TestObjects.stageTwo.hashid }, TestObjects.pipeline)
                await TestObjects.stageTwo.reload()

                should(TestObjects.stageOne.NextStageId).equal(TestObjects.stageTwo.id)
                should(TestObjects.stageTwo.NextStageId).equal(TestObjects.stageThree.id)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${TestObjects.stageTwo.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                should(await app.db.models.PipelineStage.byId(TestObjects.stageTwo.id)).equal(null)

                const stageOne = await TestObjects.stageOne.reload()

                should(stageOne.NextStageId).equal(TestObjects.stageThree.id)
            })
        })

        describe('When there is a pipeline after', function () {
            it('should set the previousStages nextStage to null', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                // 1 -> 2 delete 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.device.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
                await TestObjects.stageOne.reload()

                should(TestObjects.stageOne.NextStageId).equal(TestObjects.stageTwo.id)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${TestObjects.stageTwo.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const stageOne = await TestObjects.stageOne.reload()

                should(stageOne.NextStageId).equal(null)
            })
        })
    })

    describe('Create Pipeline', function () {
        describe('With a name and application ID', function () {
            it('Should create a new pipeline within the passed application', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        applicationId,
                        name: pipelineName
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', pipelineName)
                body.should.have.property('stages', [])

                response.statusCode.should.equal(200)
            })
        })

        describe('With no name', function () {
            it('Should fail validation', async function () {
                const applicationId = TestObjects.application.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        applicationId
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/Name is required/)

                response.statusCode.should.equal(400)
            })

            it('Should fail validation when blank', async function () {
                const applicationId = TestObjects.application.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        name: ' ',
                        applicationId
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/Name must not be blank/)

                response.statusCode.should.equal(400)
            })
        })

        describe('With out an application', function () {
            it('Should fail validation without application ID', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = ''

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')

                response.statusCode.should.equal(404)
            })

            it('Should fail validation when application is not found', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = 'application-that-does-not-exist'

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')

                response.statusCode.should.equal(404)
            })
        })

        describe('For an application owned by another team', function () {
            it('Should fail validation', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid // we are logged in as pez, but this is owned by alice

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
                    },
                    cookies: { sid: TestObjects.tokens.pez }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')

                response.statusCode.should.equal(404)
            })
        })

        describe('When not logged in', function () {
            it('Should prevent creation entirely', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid // this is owned by alice

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
                    }
                })

                const body = await response.json()

                body.should.have.property('code', 'unauthorized')

                response.statusCode.should.equal(401)
            })
        })
    })

    describe('Delete Pipeline', function () {
        describe('When passed an application and pipeline ID', function () {
            it('Should destroy the pipeline', async function () {
                const pipeline = await TestObjects.factory.createPipeline({
                    name: 'Test owned by Alice'
                }, TestObjects.application)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipeline.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const foundPipeline = await app.db.models.Pipeline.findOne({
                    where: {
                        id: pipeline.id
                    }
                })

                should(foundPipeline).equal(null)
            })

            it('Also destroys all stages within the pipeline', async function () {
                const pipeline = TestObjects.pipeline
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, pipeline)

                const stages = await TestObjects.pipeline.stages()

                stages.length.should.equal(3, 'should start with three pipeline stages')

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipeline.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const foundPipeline = await app.db.models.Pipeline.findOne({
                    where: {
                        id: pipeline.id
                    }
                })

                should(foundPipeline).equal(null)

                const foundPipelineStages = await app.db.models.PipelineStage.byPipeline(pipeline.id)
                foundPipelineStages.length.should.equal(0)
            })
        })

        describe('With no pipeline ID', function () {
            it('Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/pipelines/',
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })

        describe('With a pipeline that does not exist', function () {
            it('Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/pipelines/doesnotexist',
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })

        describe('For an pipeline that is owned by another team', function () {
            it('Should fail validation', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
                    cookies: { sid: TestObjects.tokens.pez }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)

                const foundPipeline = await app.db.models.Pipeline.findOne({
                    where: {
                        id: TestObjects.pipeline.id
                    }
                })

                should(foundPipeline).not.equal(null)
            })
        })
    })

    describe('Update Pipeline', function () {
        describe('When given a new name', function () {
            it('Should update the name of the pipeline', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: { name: 'new-name' }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('name', 'new-name')
                response.statusCode.should.equal(200)

                await TestObjects.pipeline.reload()

                TestObjects.pipeline.name.should.equal('new-name')
            })
        })

        describe('With no name', function () {
            it('Unset - Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: {}
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/Name is required/)
                response.statusCode.should.equal(400)
            })

            it('Blank - Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: {
                            name: ''
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/not be blank/)
                response.statusCode.should.equal(400)
            })

            it('String of spaces - Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: {
                            name: '    '
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/not be blank/)
                response.statusCode.should.equal(400)
            })
        })

        describe('Owned by another team', function () {
            it('Should fail validation', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        name: 'haxor'
                    },
                    cookies: { sid: TestObjects.tokens.pez }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })
    })

    describe('Deploy Pipeline Stage', function () {
        async function isDeployComplete (instance) {
            const instanceStatusResponse = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${instance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()

            return instanceStatusResponse?.meta?.isDeploying === false
        }

        function waitForDeployToComplete (instance) {
            return new Promise((resolve, reject) => {
                const refreshIntervalId = setInterval(async () => {
                    if (await isDeployComplete(instance)) {
                        clearInterval(refreshIntervalId)
                        resolve()
                    }
                }, 250)
            })
        }

        beforeEach(async function () {
            TestObjects.tokens.instanceOne = (await TestObjects.instanceOne.refreshAuthTokens()).token
        })

        describe('With action=create_snapshot', function () {
            describe('With valid input', function () {
                describe('For instance=>instance', function () {
                    it('Creates a snapshot of the source instance, and copies to the target instance', async function () {
                    // Setup an initial configuration
                        const setupResult = await addFlowsToProject(app,
                            TestObjects.instanceOne.id,
                            TestObjects.tokens.instanceOne,
                            TestObjects.tokens.alice,
                            [{ id: 'node1' }], // flows
                            { testCreds: 'abc' }, // credentials
                            'key1', // key
                            // settings
                            {
                                httpAdminRoot: '/test-red',
                                dashboardUI: '/test-dash',
                                palette: {
                                    modules: [
                                        { name: 'module1', version: '1.0.0' }
                                    ]
                                },
                                env: [
                                    { name: 'one', value: 'a' },
                                    { name: 'two', value: 'b' }
                                ]
                            }
                        )

                        // ensure setup was successful before generating a snapshot & performing rollback
                        setupResult.flowsAddResponse.statusCode.should.equal(200)
                        setupResult.credentialsCreateResponse.statusCode.should.equal(200)
                        setupResult.storageSettingsResponse.statusCode.should.equal(200)
                        setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

                        // 1 -> 2
                        TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                        const response = await app.inject({
                            method: 'PUT',
                            url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                            cookies: { sid: TestObjects.tokens.alice }
                        })

                        const body = await response.json()
                        body.should.have.property('status', 'importing')

                        // Wait for the deploy to complete
                        await waitForDeployToComplete(TestObjects.instanceTwo)

                        // Now actually check things worked
                        // Snapshot created in stage 1
                        // Snapshot created in stage 2, flows created, and set as target
                        const sourceStageSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                        sourceStageSnapshots.should.have.lengthOf(1)
                        sourceStageSnapshots[0].name.should.match(/Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                        sourceStageSnapshots[0].description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)

                        // Get the snapshot for instance 2 post deploy
                        const targetStageSnapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                        targetStageSnapshots.should.have.lengthOf(1)

                        const targetSnapshot = targetStageSnapshots[0]

                        targetSnapshot.name.should.match(/Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                        targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)

                        targetSnapshot.flows.should.have.property('flows')
                        targetSnapshot.flows.flows.should.have.lengthOf(1)
                        targetSnapshot.flows.flows[0].should.have.property('id', 'node1')
                        targetSnapshot.flows.should.have.property('credentials')
                        targetSnapshot.flows.credentials.should.have.property('$')
                        targetSnapshot.settings.should.have.property('settings')
                        targetSnapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
                        targetSnapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
                        targetSnapshot.settings.should.have.property('env')
                        targetSnapshot.settings.env.should.have.property('one', 'a')
                        targetSnapshot.settings.env.should.have.property('two', 'b')
                        targetSnapshot.settings.should.have.property('modules')
                    })
                })

                describe('For device=>instance', function () {
                    it('Should fail gracefully as creating snapshots of devices at deploy time is not supported')
                })

                describe('For device=>device', function () {
                    it('Should fail gracefully as creating snapshots of devices at deploy time is not supported')
                })

                describe('For instance=>device', function () {
                    it('Creates a snapshot of the source instance, and copies to the target device')
                })
            })

            describe('With invalid source stages', function () {
                it('Should fail gracefully when not set', async function () {
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages//deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'not_found')
                    response.statusCode.should.equal(404)
                })

                it('Should fail gracefully when not found', async function () {
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/invalid/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'not_found')
                    response.statusCode.should.equal(404)
                })

                it('Should fail gracefully if the stage is not part of the pipeline', async function () {
                    TestObjects.pipeline2 = await TestObjects.factory.createPipeline({ name: 'new-pipeline-2' }, TestObjects.application)
                    TestObjects.pl2StageOne = await TestObjects.factory.createPipelineStage({ name: 'pl2-stage-one', instanceId: TestObjects.instanceOne.id }, TestObjects.pipeline2)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.pl2StageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'invalid_stage')
                    response.statusCode.should.equal(400)
                })
            })
        })

        describe('With action=prompt', function () {
            beforeEach(async function () {
                await TestObjects.stageOne.update({ action: 'prompt' })
            })

            afterEach(async function () {
                await app.db.models.ProjectSnapshot.destroy({
                    where: {
                        ProjectId: [TestObjects.instanceOne.id, TestObjects.instanceTwo.id]
                    }
                })
            })

            describe('With invalid input', function () {
                it('Should require the user passing in a snapshot ID to copy to the target instance', async function () {
                // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('code', 'invalid_source_snapshot')
                    response.statusCode.should.equal(400)
                })

                it('Should fail gracefully if the passed in instance snapshot ID is not from the correct pipeline stage', async function () {
                // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    const snapshotFromOtherInstance = await createSnapshot(app, TestObjects.instanceTwo, TestObjects.user, {
                        name: 'Oldest Existing Snapshot Created In Test',
                        description: 'This was the first snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: snapshotFromOtherInstance.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('code', 'invalid_source_snapshot')
                    response.statusCode.should.equal(400)
                })

                it('Should fail gracefully if the passed in device snapshot ID is not from the correct pipeline stage')
            })

            describe('For instance=>instance', function () {
                it('Should copy the existing selected instance snapshot to the target instance', async function () {
                // Setup an initial configuration

                    const setupResult = await addFlowsToProject(app,
                        TestObjects.instanceOne.id,
                        TestObjects.tokens.instanceOne,
                        TestObjects.tokens.alice,
                        [{ id: 'node1' }], // flows
                        { testCreds: 'abc' }, // credentials
                        'key1', // key
                        // settings
                        {
                            httpAdminRoot: '/test-red',
                            dashboardUI: '/test-dash',
                            palette: {
                                modules: [
                                    { name: 'module1', version: '1.0.0' }
                                ]
                            },
                            env: [
                                { name: 'one', value: 'a' },
                                { name: 'two', value: 'b' }
                            ]
                        }
                    )

                    // Ensure setup was successful
                    setupResult.flowsAddResponse.statusCode.should.equal(200)
                    setupResult.credentialsCreateResponse.statusCode.should.equal(200)
                    setupResult.storageSettingsResponse.statusCode.should.equal(200)
                    setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Oldest Existing Snapshot Created In Test',
                        description: 'This was the first snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    // This one has custom props to validate against
                    const existingSnapshot = await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Existing Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false, // no need to deploy to devices of the source
                        flows: { custom: 'custom-flows' },
                        credentials: { custom: 'custom-creds' },
                        settings: {
                            modules: { custom: 'custom-module' },
                            env: { custom: 'custom-env' }
                        }
                    })

                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Another Existing Snapshot Created In Test',
                        description: 'This was the last snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: existingSnapshot.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceInstanceSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                    sourceInstanceSnapshots.should.have.lengthOf(3)

                    // Snapshot created in stage 2, flows created, and set as target

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/Existing Snapshot Created In Test - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)
                    targetSnapshot.description.should.match(/This was the second snapshot created as part of the test process/)

                    targetSnapshot.flows.should.have.property('flows')
                    targetSnapshot.flows.flows.should.match({ custom: 'custom-flows' })

                    targetSnapshot.flows.should.have.property('credentials')
                    targetSnapshot.flows.credentials.should.have.property('$')

                    targetSnapshot.settings.should.have.property('settings')
                    targetSnapshot.settings.modules.should.have.property('custom', 'custom-module')
                    targetSnapshot.settings.env.should.have.property('custom', 'custom-env')
                })
            })

            describe('For device=>instance', function () {
                it('Should copy the existing selected device snapshot to the target instance')
            })

            describe('For device=>device', function () {
                it('Should copy the existing selected device snapshot to the target device')
            })

            describe('For instance=>device', function () {
                it('Should copy the existing selected instance snapshot to the target instance')
            })
        })

        describe('With action=use_latest_snapshot', function () {
            beforeEach(async function () {
                await TestObjects.stageOne.update({ action: 'use_latest_snapshot' })
            })

            afterEach(async function () {
                await app.db.models.ProjectSnapshot.destroy({
                    where: {
                        ProjectId: TestObjects.instanceOne.id
                    }
                })
            })

            describe('For instance=>instance', function () {
                it('Copies the existing instance snapshot to the next stages instance', async function () {
                    // Setup an initial configuration
                    const setupResult = await addFlowsToProject(app,
                        TestObjects.instanceOne.id,
                        TestObjects.tokens.instanceOne,
                        TestObjects.tokens.alice,
                        [{ id: 'node1' }], // flows
                        { testCreds: 'abc' }, // credentials
                        'key1', // key
                        // settings
                        {
                            httpAdminRoot: '/test-red',
                            dashboardUI: '/test-dash',
                            palette: {
                                modules: [
                                    { name: 'module1', version: '1.0.0' }
                                ]
                            },
                            env: [
                                { name: 'one', value: 'a' },
                                { name: 'two', value: 'b' }
                            ]
                        }
                    )

                    // Ensure setup was successful
                    setupResult.flowsAddResponse.statusCode.should.equal(200)
                    setupResult.credentialsCreateResponse.statusCode.should.equal(200)
                    setupResult.storageSettingsResponse.statusCode.should.equal(200)
                    setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

                    await TestObjects.stageOne.update({ action: 'use_latest_snapshot' })

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Oldest Snapshot Created In Test',
                        description: 'This was the first snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    // This one has custom props to validate against
                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Latest Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false, // no need to deploy to devices of the source
                        flows: { custom: 'custom-flows' },
                        credentials: { custom: 'custom-creds' },
                        settings: {
                            modules: { custom: 'custom-module' },
                            env: { custom: 'custom-env' }
                        }
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceInstanceSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                    sourceInstanceSnapshots.should.have.lengthOf(2)

                    // Snapshot created in stage 2, flows created, and set as target

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/Latest Snapshot Created In Test - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)
                    targetSnapshot.description.should.match(/This was the second snapshot created as part of the test process/)

                    targetSnapshot.flows.should.have.property('flows')
                    targetSnapshot.flows.flows.should.match({ custom: 'custom-flows' })

                    targetSnapshot.flows.should.have.property('credentials')
                    targetSnapshot.flows.credentials.should.have.property('$')

                    targetSnapshot.settings.should.have.property('settings')
                    targetSnapshot.settings.modules.should.have.property('custom', 'custom-module')
                    targetSnapshot.settings.env.should.have.property('custom', 'custom-env')
                })
            })

            describe('For device=>instance', function () {
                it('Copies the existing device snapshot to the next stages instance')
            })

            describe('For device=>device', function () {
                it('Copies the existing device snapshot to the next stages device')
            })

            describe('For instance=>device', function () {
                it('Copies the existing instance snapshot to the next stages device')
            })

            it('Fails gracefully if the source instance has no snapshots', async function () {
                // 1 -> 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_source_instance')
                response.statusCode.should.equal(400)
            })

            it('Fails gracefully if the source device has no snapshots')
        })
    })
})

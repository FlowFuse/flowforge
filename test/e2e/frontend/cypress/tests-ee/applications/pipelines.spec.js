describe('FlowForge - Application - DevOps Pipelines', () => {
    let application
    let team
    function loadApplication (teamName, applicationName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === applicationName
                )
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
        loadApplication('BTeam', 'application-2')
    })

    it('can navigate to the /pipelines page with EE license', () => {
        cy.visit(`/team/${team.slug}/applications/${application.id}`)
        cy.get('[data-nav="application-pipelines"]').should('exist').click()

        cy.url().should('include', `/applications/${application.id}/pipelines`)
    })

    it('can create pipelines containing stages', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-el="empty-state"] [data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        cy.get('[data-el="pipelines-list"]').should('contain', PIPELINE_NAME)

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        // First stage should not have 'do nothing' as an option
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Do nothing")').should('not.exist')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Create new instance snapshot")').click()

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options .ff-option').click()

        // Last stage should have 'do nothing' as an option
        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Do nothing")').should('exist')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:last').click()

        cy.get('[data-action="add-stage"]').click()

        // Tidy Up
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('Stage 1')
            cy.contains('Stage 2')

            cy.get('[data-action="delete-pipeline"]').click()
        })

        cy.get('[data-el="platform-dialog"]')
            .should('be.visible')
            .within(() => {
                /* eslint-disable cypress/require-data-selectors */
                cy.get('.ff-dialog-header').contains('Delete Pipeline')
                cy.get('button.ff-btn.ff-btn--danger').click()
                /* eslint-enable */
            })
    })

    it('can edit the instance assigned to a stage', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')
        cy.intercept('POST', '/api/v1/pipelines/*/stages').as('createPipelineStage')

        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-el="empty-state"] [data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type(`Stage 1 for ${PIPELINE_NAME}`)

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:last').click() // prompt

        cy.get('[data-action="add-stage"]').click()

        cy.wait('@createPipelineStage')

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('instance-2-1')
            cy.get('[data-action="stage-edit"]').click()
        })

        // Stage Edit Form
        cy.get('[data-form="stage-name"] input').should(($input) => {
            const stageName = $input.val()
            expect(stageName).to.equal(`Stage 1 for ${PIPELINE_NAME}`)
        })

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-option-content.active').should('contain', 'instance-2-1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:last').click()

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-option-content.active').should('contain', 'instance-2-with-devices')

        // First stage should not have 'do nothing' as an option
        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Do nothing")').should('not.exist')
        cy.get('[data-form="stage-action"] .ff-option-content.active').should('contain', 'Prompt to select instance snapshot')

        cy.get('[data-action="add-stage"]').click()

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('instance-2-with-devices')
        })
    })

    it('can push from one stage to another, creating a new snapshot', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        // Select Instance for Stage 1
        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        // Select "Create new Snapshot"
        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Create new instance snapshot")').click() // prompt

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:first').click()

        cy.get('[data-action="add-stage"]').click()

        /// Push from stage 1 to stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-el="ff-pipeline-stage"]:contains("Stage 1")').within(() => {
                cy.get('[data-action="stage-run"]').click()
            })
        })

        cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').should('be.visible')
        cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').within(() => {
            // confirm push

            /* eslint-disable cypress/require-data-selectors */
            cy.get('button.ff-btn.ff-btn--primary').click()
            /* eslint-enable */
        })

        // Tidy Up
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('Stage 1')
            cy.contains('Stage 2')

            cy.get('[data-action="delete-pipeline"]').click()
        })

        cy.get('[data-el="platform-dialog"]')
            .should('be.visible')
            .within(() => {
                /* eslint-disable cypress/require-data-selectors */
                cy.get('.ff-dialog-header').contains('Delete Pipeline')
                cy.get('button.ff-btn.ff-btn--danger').click()
                /* eslint-enable */
            })
    })

    it('can push from one stage to another, prompting for snapshot', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Prompt")').click() // prompt

        cy.get('[data-action="add-stage"]').click()

        let instance
        cy.request('GET', '/api/v1/user/teams').then((response) => {
            const team = response.body.teams.find((team) => team.name === 'BTeam')

            return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
        }).then((response) => {
            instance = response.body.projects.find((project) => project.name === 'instance-2-1')

            return cy.request('POST', `/api/v1/projects/${instance.id}/snapshots`, {
                name: `Snapshot 1 for ${PIPELINE_NAME} test`,
                description: 'Description',
                setAsTarget: false
            })
        }).then((response) => {
            return cy.request('POST', `/api/v1/projects/${instance.id}/snapshots`, {
                name: `Snapshot 2 for ${PIPELINE_NAME} test`,
                description: 'Description 2',
                setAsTarget: false
            })
        }).then((response) => {
            // Add stage 2
            cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
                cy.get('[data-action="add-stage"]').click()
            })

            cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

            cy.get('[data-form="stage-instance"] .ff-listbox').click()
            cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
            cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

            cy.get('[data-form="stage-action"] .ff-listbox').click()
            cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
            cy.get('[data-form="stage-action"] .ff-options > .ff-option:first').click()

            cy.get('[data-action="add-stage"]').click()

            /// Push from stage 1 to stage 2
            cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
                cy.get('[data-el="ff-pipeline-stage"]:contains("Stage 1")').within(() => {
                    cy.get('[data-action="stage-run"]').click()
                })
            })

            cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').should('be.visible')
            cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').within(() => {
                cy.get('[data-form="snapshot-select"]').click()
                cy.get(`[data-form="snapshot-select"] .ff-dropdown-options:contains("Snapshot 2 for ${PIPELINE_NAME} test")`).click()

                /* eslint-disable cypress/require-data-selectors */
                cy.get('button.ff-btn.ff-btn--primary').click()
                /* eslint-enable */
            })

            // Tidy Up
            cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
                cy.contains('Stage 1')
                cy.contains('Stage 2')

                cy.get('[data-action="delete-pipeline"]').click()
            })

            cy.get('[data-el="platform-dialog"]')
                .should('be.visible')
                .within(() => {
                    /* eslint-disable cypress/require-data-selectors */
                    cy.get('.ff-dialog-header').contains('Delete Pipeline')
                    cy.get('button.ff-btn.ff-btn--danger').click()
                    /* eslint-enable */
                })
        })
    })

    it('can push from one stage containing a device to an instance with use_active_snapshot', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-type"]').find('.ff-tile-selection-option[data-form="tile-selection-option-device"]').click()

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-device"] .ff-listbox').click()
        cy.get('[data-form="stage-device"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-device"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("active")').click() // Use active snapshot

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:first').click()

        cy.get('[data-action="add-stage"]').click()

        /// Push from stage 1 to stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-el="ff-pipeline-stage"]:contains("Stage 1")').within(() => {
                cy.get('[data-action="stage-run"]').click()
            })
        })

        cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').should('be.visible')
        cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').within(() => {
            /* eslint-disable cypress/require-data-selectors */
            cy.get('button.ff-btn.ff-btn--primary').click()
            /* eslint-enable */
        })

        // Tidy Up
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('Stage 1')
            cy.contains('Stage 2')

            cy.get('[data-action="delete-pipeline"]').click()
        })

        cy.get('[data-el="platform-dialog"]')
            .should('be.visible')
            .within(() => {
                /* eslint-disable cypress/require-data-selectors */
                cy.get('.ff-dialog-header').contains('Delete Pipeline')
                cy.get('button.ff-btn.ff-btn--danger').click()
                /* eslint-enable */
            })
    })

    it('cannot push to a device in development mode', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines', function (req) {
            req.continue((res) => {
                res.body.pipelines.forEach((pipeline) => {
                    pipeline.stages.forEach((stage) => {
                        stage.devices?.forEach((device) => {
                            device.mode = 'developer'
                            device.isDeploying = false
                        })
                    })
                })
            })
        }).as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')
        cy.intercept('GET', '/api/v1/applications/*/devices', function (req) {
            req.continue((res) => {
                res.body.devices = res.body.devices.map((device) => {
                    device.mode = 'developer'
                    device.isDeploying = false
                    return device
                })
            })
        }).as('getDevice')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Create new instance snapshot")').click()

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })
        cy.get('[data-form="stage-type"]').find('.ff-tile-selection-option[data-form="tile-selection-option-device"]').click()

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        cy.get('[data-form="stage-device"] .ff-listbox').click()
        cy.get('[data-form="stage-device"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-device"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("active")').click() // Use active snapshot

        cy.get('[data-action="add-stage"]').click()

        /// Push from stage 1 to stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-el="ff-pipeline-stage"]:contains("Stage 1")').within(() => {
                cy.get('[data-action="stage-run"].ff-disabled').should('exist')
            })

            cy.get('[data-el="ff-pipeline-stage"]:contains("Stage 2")').within(() => {
                cy.get('[data-action="stage-run"].ff-disabled').should('exist')
                cy.get('[data-el="stage-banner-error"]').contains('Device in Dev Mode')
            })
        })

        // Not possible to deploy, no dialog should be visible even after the click
        cy.get('[data-el="deploy-stage-dialog"].ff-dialog-container--open').should('not.exist')

        // Tidy Up
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('Stage 1')
            cy.contains('Stage 2')

            cy.get('[data-action="delete-pipeline"]').click()
        })

        cy.get('[data-el="platform-dialog"]')
            .should('be.visible')
            .within(() => {
                /* eslint-disable cypress/require-data-selectors */
                cy.get('.ff-dialog-header').contains('Delete Pipeline')
                cy.get('button.ff-btn.ff-btn--danger').click()
                /* eslint-enable */
            })
    })

    it('cannot select device group in the first stage of a pipeline', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        // Device group tile is disabled
        cy.get('[data-form="stage-type"]').find('.ff-tile-selection-option[data-form="tile-selection-option-device-group"]').should('have.class', 'disabled')
    })

    it('cannot add any more stages after a device group', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Create new instance snapshot")').click()

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-type"]').find('.ff-tile-selection-option[data-form="tile-selection-option-device-group"]').click()

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')
        // stage-action should not be present for device group
        cy.get('[data-form="stage-action"]').should('not.exist')

        // select 1st element for stage-device-group
        cy.get('[data-form="stage-device-group"] .ff-listbox').click()
        cy.get('[data-form="stage-device-group"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-device-group"] .ff-options > .ff-option:first').click()

        cy.get('[data-action="add-stage"]').click()

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            // now there is a device group at the end stage, check to ensure add-stage is not be present
            cy.get('[data-action="add-stage"]').should('not.exist')
        })
    })

    it('can create a new device group', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        /// Create stages ready to push between
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`
        const GROUP_NAME = `Group 1 - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Create new instance snapshot")').click()

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2 with device group
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        // Device groups field hidden to start
        cy.get('[data-form="stage-device-group-name"]').should('not.exist')
        cy.get('[data-form="stage-device-group-description"]').should('not.exist')

        // Select device Group
        cy.get('[data-form="stage-type"]').find('.ff-tile-selection-option[data-form="tile-selection-option-device-group"]').click()

        // Select create new
        cy.get('[data-form="stage-device-group"] .ff-listbox').click()
        cy.get('[data-form="stage-device-group"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-device-group"] .ff-options > .ff-option:contains("Create")').click()

        // Device groups field hidden to start
        cy.get('[data-form="stage-device-group-name"]').type(GROUP_NAME)
        cy.get('[data-form="stage-device-group-description"]').type(`Description for group ${GROUP_NAME}`)

        cy.get('[data-action="add-stage"]').click()

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-el="ff-pipeline-stage"]:contains("Stage 2")').within(() => {
                cy.contains('Group 1').click()
            })
        })

        // On device group page
        cy.get('[data-nav="application-device-group-settings"]').click()

        cy.get('[data-el="application-device-group-name"] input').should('have.value', GROUP_NAME)
        cy.get('[data-el="application-device-group-description"] input').should('have.value', `Description for group ${GROUP_NAME}`)
    })

    it('can not push to a protected instance', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        // Protect Instance
        cy.visit(`/team/${team.slug}/applications/${application.id}`)
        cy.get('[data-el="cloud-instances"] table tbody tr:nth-of-type(2)').click()
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-el="section-side-menu"] li:nth-of-type(4)').click()
        cy.get('[data-nav="enable-protect"]').click()

        cy.get('[data-el="protected-pill"]')

        cy.get('[data-nav="disable-protect"]')

        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        // Create pipeline
        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        cy.get('[data-el="pipelines-list"]').should('contain', PIPELINE_NAME)

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:contains("Create new instance snapshot")').click()

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        cy.get('[data-form="stage-instance"] .ff-listbox').click()
        cy.get('[data-form="stage-instance"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-options > .ff-option:first').click()

        cy.get('[data-form="stage-action"] .ff-listbox').click()
        cy.get('[data-form="stage-action"] .ff-options').should('be.visible')
        cy.get('[data-form="stage-action"] .ff-options > .ff-option:last').click()

        cy.get('[data-action="add-stage"]').click()

        cy.logout()
        cy.login('eddy', 'eePassword')

        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-el="protected-marker"]').should('exist')
            cy.get('[data-el="ff-pipeline-stage"]:first [data-action="stage-run"]').should('have.class', 'ff-disabled')
        })

        cy.logout()
        cy.login('bob', 'bbPassword')

        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-el="ff-pipeline-stage"]:first [data-action="stage-run"]').should('not.have.class', 'ff-disabled')
        })

        // Tidy Up
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('Stage 1')
            cy.contains('Stage 2')

            cy.get('[data-action="delete-pipeline"]').click()
        })

        cy.get('[data-el="platform-dialog"]')
            .should('be.visible')
            .within(() => {
                /* eslint-disable cypress/require-data-selectors */
                cy.get('.ff-dialog-header').contains('Delete Pipeline')
                cy.get('button.ff-btn.ff-btn--danger').click()
                /* eslint-enable */
            })

        // Remove Protected status
        cy.visit(`/team/${team.slug}/applications/${application.id}`)
        cy.get('[data-el="cloud-instances"] table tbody tr:nth-of-type(2)').click()
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-el="section-side-menu"] li:nth-of-type(4)').click()
        cy.get('[data-nav="disable-protect"]').click()
    })

    it('should hide the pipelines tab from users with viewer roles', () => {
        cy.intercept('GET', '/api/v1/teams/*/user', { role: 10 }).as('getTeamRole')

        cy.visit(`/team/${team.slug}/applications/${application.id}`)

        cy.get('[data-nav="application-pipelines"]').should('not.exist')
    })

    it('should redirect viewer users to the instances overview when accessing the applications pipelines page', () => {
        cy.intercept('GET', '/api/v1/teams/*/user', { role: 10 }).as('getTeamRole')

        cy.visit(`/team/${team.slug}/applications/${application.id}/devices`)

        cy.url().should('include', '/devices')

        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)

        cy.url().should('include', '/instances')
    })
})

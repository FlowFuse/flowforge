describe('FlowForge - Applications', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/instance-types')
        cy.wait('@getInstanceTypes')
    })

    describe('can be created', () => {
        it('without error - including instance', () => {
            const ID = Math.random().toString(36).substring(2, 7)
            const APPLICATION_NAME = `new-application-${ID}`
            const APPLICATION_DESCRIPTION = `new-description-${ID}`
            const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/applications/create`)

                cy.intercept('POST', '/api/*/applications').as('createApplication')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                cy.intercept('GET', '/api/*/stacks*').as('loadStacks')
                cy.get('[data-action="create-project"]').should('be.disabled')

                cy.get('[data-form="application-name"] input').clear()
                cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)
                cy.get('[data-form="application-description"] input').clear()
                cy.get('[data-form="application-description"] input').type(APPLICATION_DESCRIPTION)

                // Pre-fills name
                cy.get('[data-form="project-name"] input').should(($input) => {
                    const projectName = $input.val()
                    expect(projectName.length).to.be.above(0)
                })

                cy.get('[data-form="project-name"] input').clear()
                cy.get('[data-form="project-name"] input').type(INSTANCE_NAME)
                cy.get('[data-action="create-project"]').should('be.disabled')

                cy.get('[data-form="project-type"]').contains('type1').click()
                cy.get('[data-action="create-project"]').should('not.be.disabled') // stack is auto selected

                cy.wait('@loadStacks')

                cy.get('[data-form="project-template"]').should('exist') // template section visible for create

                cy.get('[data-action="create-project"]').should('not.be.disabled').click()

                cy.wait('@createApplication')
                cy.wait('@createInstance')

                cy.contains(APPLICATION_NAME)
                cy.contains(INSTANCE_NAME)

                cy.url().should('include', '/instance/')

                // now navigate to the Applications view and check the description is present alongside the application name
                cy.visit(`/team/${team.slug}/applications`)
                // div.ff-application-list--app should have the app name and description
                cy.get('[data-action="view-application"]').contains(APPLICATION_NAME)
                cy.get('[data-action="view-application"]').contains(APPLICATION_DESCRIPTION)
            })
        })

        it('without error', () => {
            const ID = Math.random().toString(36).substring(2, 7)
            const APPLICATION_NAME = `new-application-${ID}`
            const APPLICATION_DESCRIPTION = `new-description-${ID}`

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/applications/create`)

                cy.intercept('POST', '/api/*/applications').as('createApplication')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                cy.intercept('GET', '/api/*/stacks*').as('loadStacks')
                cy.get('[data-action="create-project"]').should('be.disabled')

                cy.get('[data-form="project-name"] input').should('be.visible')

                cy.get('[data-form="create-instance"] span.checkbox').click()

                cy.get('[data-form="project-name"] input').should('not.exist')

                cy.get('[data-form="application-name"] input').clear()
                cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)
                cy.get('[data-form="application-description"] input').clear()
                cy.get('[data-form="application-description"] input').type(APPLICATION_DESCRIPTION)

                cy.get('[data-action="create-project"]').should('be.enabled').click()

                cy.wait('@createApplication')

                cy.contains(APPLICATION_NAME)

                cy.url().should('include', '/applications/')
            })
        })

        it('handles instance creation failing gracefully', () => {
            const APPLICATION_NAME = `new-application-${Math.random().toString(36).substring(2, 7)}`
            const IN_USE_INSTANCE_NAME = 'instance-1-1'
            const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/applications/create`)

                cy.intercept('POST', '/api/*/applications').as('createApplication')
                cy.intercept('POST', '/api/*/projects').as('createInstance')

                cy.get('[data-action="create-project"]').should('be.disabled')

                cy.get('[data-form="application-name"] input').clear()
                cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)

                cy.get('[data-form="project-name"] input').clear()
                cy.get('[data-form="project-name"] input').type(IN_USE_INSTANCE_NAME)

                cy.get('[data-form="project-type"]').contains('type1').click()
                cy.get('[data-action="create-project"]').click()

                cy.wait('@createApplication')
                cy.wait('@createInstance')

                cy.get('[data-form="project-name"]').contains('name in use')

                cy.get('[data-form="project-name"] input').clear()
                cy.get('[data-form="project-name"] input').type(INSTANCE_NAME)

                cy.get('[data-action="create-project"]').click()

                cy.wait('@createInstance')

                cy.contains(APPLICATION_NAME)
                cy.contains(INSTANCE_NAME)
            })
        })

        it('should have a back button', () => {
            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/applications/create`)

                cy.url().should('contain', '/applications/create')

                cy.get('[data-nav="back"]').should('exist')
                cy.get('[data-nav="back"]').contains('Back to Dashboard')

                cy.get('[data-nav="back"]').click()

                cy.url().should('match', /^.*\/team\/.*\/applications/)
            })
        })
    })

    it('can be viewed', () => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.visit('/')

        cy.get('[data-nav="team-applications"]')

        cy.wait('@getTeamApplications')

        cy.contains('application-1').click()

        cy.wait('@getApplication')

        cy.get('[data-el="banner-project-as-admin"]').should('not.exist')

        cy.get('[data-action="open-editor"]').should('exist')
    })

    it('are not permitted to have a duplicate project name during creation', () => {
        cy.request('GET', 'api/v1/teams', { failOnStatusCode: false }).then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/applications/create`)

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)

            cy.get('[data-form="project-name"] input').clear()
            cy.get('[data-form="project-name"] input').type('instance-1-1')
            cy.get('[data-form="project-type"]').contains('type1').click()

            cy.get('[data-action="create-project"]').click()

            cy.get('[data-form="project-name"] [data-el="form-row-error"]').contains('name in use')
        })
    })

    it('can be updated', () => {
        const START_ID = Math.random().toString(36).substring(2, 7)
        const START_APPLICATION_NAME = `new-application-${START_ID}`
        const START_APPLICATION_DESCRIPTION = `new-description-${START_ID}`
        const UPDATED_ID = Math.random().toString(36).substring(2, 7)
        const UPDATED_APPLICATION_NAME = `updated-application-${UPDATED_ID}`
        const UPDATED_APPLICATION_DESCRIPTION = `updated-description-${UPDATED_ID}`

        let team
        cy.request('GET', 'api/v1/teams')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('POST', '/api/v1/applications', {
                    name: START_APPLICATION_NAME,
                    description: START_APPLICATION_DESCRIPTION,
                    teamId: team.id
                })
            })
            .then((response) => {
                cy.intercept('GET', '/api/*/applications/*').as('getApplication')

                cy.visit('/')

                cy.get('[data-nav="team-applications"]')

                cy.wait('@getTeamApplications')

                cy.contains(START_APPLICATION_NAME).click()

                cy.wait('@getApplication')

                cy.get('[data-nav="application-settings"]').click()

                cy.get('[data-el="application-settings"]').within(() => {
                    cy.get('[data-action="application-edit"]').click()

                    cy.get('[data-form="application-name"] input[type="text"]').clear()
                    cy.get('[data-form="application-name"] input[type="text"]').type(UPDATED_APPLICATION_NAME)
                    cy.get('[data-form="application-description"] input[type="text"]').clear()
                    cy.get('[data-form="application-description"] input[type="text"]').type(UPDATED_APPLICATION_DESCRIPTION)

                    cy.get('[data-form="submit"]').click()
                })

                // Name updated on application page
                cy.get('[data-el="page-name"]').contains(UPDATED_APPLICATION_NAME)

                cy.get('[data-nav="team-applications"]').click()

                // Name updated on team page
                cy.wait('@getTeamApplications')

                cy.contains(UPDATED_APPLICATION_NAME).should('exist')
                cy.contains(START_APPLICATION_NAME).should('not.exist')
                cy.contains(START_APPLICATION_DESCRIPTION).should('not.exist')

                // now navigate to the Applications view and check the UPDATED description is present alongside the application name
                cy.visit(`/team/${team.slug}/applications`)
                // div.ff-application-list--app should have the app name and description
                cy.get('[data-action="view-application"]').contains(UPDATED_APPLICATION_NAME)
                cy.get('[data-action="view-application"]').contains(UPDATED_APPLICATION_DESCRIPTION)
            })
    })

    it('can be deleted', () => {
        const APPLICATION_NAME = `new-application-${Math.random().toString(36).substring(2, 7)}`

        cy.intercept('DELETE', '/api/*/applications/*').as('deleteProject')

        let team
        cy.request('GET', 'api/v1/teams')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('POST', '/api/v1/applications', {
                    name: APPLICATION_NAME,
                    teamId: team.id
                })
            })
            .then((response) => {
                cy.intercept('GET', '/api/*/applications/*').as('getApplication')

                const application = response.body
                cy.visit(`/team/${team.slug}/applications/${application.id}/settings`)
                cy.wait('@getApplication')

                cy.get('[data-el="delete-application-dialog"]').should('not.be.visible')
                cy.get('[data-action="delete-application"]').click()

                cy.get('[data-el="delete-application-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Application')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="application-name"] input[type="text"]').type(APPLICATION_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()
                    })

                cy.wait('@deleteProject')

                cy.url().should('include', `/team/${team.slug}/applications`)
            })
    })

    it('check if application has instances, then delete application button should be disabled, and if application has no instances, the button should be enabled', () => {
        let team
        let applications
        cy.request('GET', 'api/v1/teams')
            .then((res) => res.body.teams)
            .then((res) => {
                team = res.find(team => team.slug === 'ateam')
            })
            .then(() => cy.request('GET', `/api/v1/teams/${team.id}/applications`))
            .then((res) => res.body.applications)
            .then((res) => {
                applications = res
            })
            .then(() => {
                // find an application with instances
                const application = applications.find(app => app.instances.length > 1)
                cy.visit(`/team/${team.slug}/applications/${application.id}/settings`)

                // check that the delete application button is disabled
                cy.get('[data-action="delete-application"]').should('be.disabled')
            })
            .then(() => {
                // find an application with instances
                const application = applications.find(app => app.instances.length === 0)
                cy.visit(`/team/${team.slug}/applications/${application.id}/settings`)

                // check that the delete application button is not disabled
                cy.get('[data-action="delete-application"]').should('not.be.disabled')
            })
    })

    it('should display the back button when creating an instance from the application page', () => {
        cy.visit('/')
        cy.get('[data-action="view-application"]').first().click()

        cy.get('[data-action="create-instance"]').should('exist')
        cy.get('[data-action="create-instance"]').should('not.be.disabled')
        cy.get('[data-action="create-instance"]').click()

        cy.get('[data-nav="back"]').should('exist')
        cy.get('[data-nav="back"]').contains('Back')
        cy.get('[data-nav="back"]').click()

        cy.url().should('match', /^.*\/team\/.*\/applications\/.*\/instances/)
    })
})

describe('FlowForge stores audit logs for an application', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('when it is created', () => {
        cy.get('.ff-audit-entry').contains('Application Created')
    })

    it('when it is updated', () => {
        cy.get('.ff-audit-entry').contains('Application Modified')
    })

    it('when it is deleted', () => {
        cy.get('.ff-audit-entry').contains('Application Deleted')
    })
})

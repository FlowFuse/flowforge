describe('FlowForge - Instance Settings - DevOps', () => {
    let team
    function navigateToInstanceSettings (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const project = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/team/${team.slug}/instances/${project.id}/settings/general`)
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/').as('getProjects')
    })

    it('does not show Instance actions to non-Owners of a team', () => {
        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToInstanceSettings('ATeam', 'instance-1-1')

        cy.get('[data-action="change-stack"]').should('not.exist')
        cy.get('[data-nav="copy-project"]').should('not.exist')
        cy.get('[data-action="import-instance"]').should('not.exist')
        cy.get('[data-nav="change-instance-settings"]').should('not.exist')
        cy.get('[data-action="suspend-instance"]').should('not.exist')
        cy.get('[data-action="delete-instance"]').should('not.exist')
    })

    it('does show Instance actions to Owners of a team', () => {
        cy.login('alice', 'aaPassword')
        cy.home()
        navigateToInstanceSettings('ATeam', 'instance-1-1')

        cy.get('[data-action="change-stack"]').should('exist')
        cy.get('[data-nav="copy-project"]').should('exist')
        cy.get('[data-action="import-instance"]').should('exist')
        cy.get('[data-nav="change-instance-settings"]').should('exist')
        cy.get('[data-action="suspend-instance"]').should('exist')
        cy.get('[data-action="delete-instance"]').should('exist')
    })

    it('allows flow/creds/secret to be imported', () => {
        cy.intercept('POST', '/api/*/projects/*/import', (req) => {
            expect(req.body).to.have.property('flows')
            expect(req.body).to.have.property('credentials')
            expect(req.body).to.have.property('credsSecret')
            req.reply({
                statusCode: 200,
                body: { status: 'okay' }
            })
        }).as('importInstance')
        cy.login('alice', 'aaPassword')
        cy.home()
        navigateToInstanceSettings('ATeam', 'instance-1-1')

        cy.get('[data-action="import-instance"]').click()

        cy.get('[data-el="dialog-import-instance"]').should('be.visible').within(() => {
            cy.get('[data-form="instance-creds-secret"] input').should('be.disabled')
            cy.get('[data-form="instance-flow-file"] input').selectFile({
                contents: Cypress.Buffer.from('[]'),
                fileName: 'flows.json',
                lastModified: Date.now()
            })
            cy.get('[data-form="instance-creds-file"] input').selectFile({
                contents: Cypress.Buffer.from('{}'),
                fileName: 'flows_cred.json',
                lastModified: Date.now()
            })
            cy.get('[data-form="instance-creds-secret"] input').should('not.be.disabled')
            cy.get('[data-form="instance-creds-secret"] input').type('CRED_SECRET')
            // eslint-disable-next-line cypress/require-data-selectors
            cy.get('button.ff-btn.ff-btn--danger').click()
        })
        cy.wait('@importInstance')
    })
})

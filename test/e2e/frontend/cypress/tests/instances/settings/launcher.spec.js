/// <reference types="Cypress" />
describe('FlowFuse - Instance - Settings - Launcher', () => {
    function navigateToInstanceSettings (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const project = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/instance/${project.id}/settings/general`)
                cy.wait('@getInstance')
            })
    }

    function getForm () {
        return cy.get('[data-el="launcher-settings-form"]')
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/').as('getProjects')
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')
        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('can set health check value', () => {
        cy.intercept('PUT', '/api/*/projects/*').as('updateInstance')

        navigateToInstanceSettings('BTeam', 'instance-2-1')

        // locate and click on the launcher tab
        cy.get('[data-el="section-side-menu"] li').contains('Launcher').click()

        // wait for url /instance/***/settings/launcher
        cy.url().should('include', 'settings/launcher')

        // // ensure the first child's title is correct
        getForm().should('exist')
        getForm().first('div').should('exist')
        getForm().first('div').get('[data-el="form-row-title"]').contains('Health check interval (ms)').should('exist')
        // ensure the first child's numeric input exists
        getForm().first('div').get('.ff-input > input[type=number]').should('exist')

        // Change value & save
        const randomBetween6789and9876 = Math.floor(Math.random() * (9876 - 6789 + 1)) + 6789
        getForm().first('div').get('.ff-input > input[type=number]').clear()
        getForm().first('div').get('.ff-input > input[type=number]').type(randomBetween6789and9876)
        cy.get('[data-action="save-settings"]').click()
        cy.wait('@updateInstance')

        // refresh page
        navigateToInstanceSettings('BTeam', 'instance-2-1')
        cy.get('[data-el="section-side-menu"] li').contains('Launcher').click()

        // check value is restored
        cy.get('[data-el="launcher-settings-form"]').first().get('.ff-input > input[type=number]').should('have.value', randomBetween6789and9876)
    })
})

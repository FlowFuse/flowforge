describe('FlowFuse EE - HTTP Auth tokens', () => {
    let instance

    function navigateToInstanceSettings (teamName, instanceName) {
        let team
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                instance = response.body.projects.find(
                    (app) => app.name === instanceName
                )
                cy.visit(`/team/${team.slug}/instances/${instance.id}/settings`)
                cy.wait('@getInstance')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('show Token Settings', () => {
        cy.intercept('PUT', '/api/*/projects/*').as('updateInstance')
        navigateToInstanceSettings('BTeam', 'instance-2-1')

        cy.get('[data-nav="security"').click()
        cy.get('[data-el="http-auth-option-ff"]').click()

        cy.get('[data-action="new-token"]').should('exist')
        cy.get('[data-action="new-token"] span:first').click()

        cy.get('[data-el="http-token-diag"] input[type="text"]').type('Test Token')
        cy.get('[data-el="http-token-diag"] [data-action="dialog-confirm"]').click()

        cy.get('[data-action="token-confirmation-done"]').click()

        cy.get('[data-el="tokens-table"] table tbody tr td:first').contains('Test Token')
    })
})

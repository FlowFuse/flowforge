describe('FlowForge - Instance - Logs', () => {
    let instance
    let team
    function navigateToInstanceLogs (teamName, instanceName) {
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
                cy.visit(`/team/${team.slug}/instances/${instance.id}/logs`)
                cy.wait('@getInstance')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/logs?*', {
            body: {
                meta: {},
                log: []
            }
        }).as('getLogsUpdates')

        cy.intercept('GET', '/api/*/projects/*').as('getInstance')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('load all logs by default', () => {
        // mock the API response with well-defined logs
        cy.intercept('GET', '/api/*/projects/*/logs', {
            body: {
                meta: {},
                log: [
                    { level: 'info', msg: 'Updated flows', ts: '16874362594840001' }
                ]
            }
        }).as('getLogs')

        navigateToInstanceLogs('BTeam', 'instance-2-1')
        cy.wait('@getLogs')

        cy.get('[data-el="instance-log-row"]').should('have.length', 1)
        cy.get('[data-el="select-ha-replica"]').should('not.exist')
    })

    it('display a marker to indicuate with HA replica the logs are from, if present', () => {
        // Modify our Instance so that HA is enabled
        cy.intercept('GET', '/api/*/projects/*', (req) => {
            req.continue((res) => {
                // intercept the response and update the HA settings
                res.body.ha = {
                    replicas: ['123', '456']
                }
            })
        }).as('getInstance')

        // mock the API response with well-defined logs
        cy.intercept('GET', '/api/*/projects/*/logs', {
            body: {
                meta: {},
                log: [
                    { src: '123', level: 'info', msg: 'Created flows', ts: '16874362594840000' },
                    { src: '123', level: 'info', msg: 'Updated flows', ts: '16874362594840001' },
                    { src: '456', level: 'info', msg: 'Updated flows', ts: '16874362594840001' }
                ]
            }
        }).as('getLogs')

        navigateToInstanceLogs('BTeam', 'instance-2-1')
        cy.wait('@getLogs')

        // should load our stubbed logs
        cy.get('[data-el="instance-log-row"]').should('have.length', 3)

        cy.get('[data-el="select-ha-replica"]').should('exist')
        // open dropdown
        cy.get('[data-el="select-ha-replica"]').click()
        // check we have 3 options
        cy.get('[data-el="select-ha-replica"] .ff-option').should('have.length', 3)
        // select the first HA Replica
        cy.get('[data-el="select-ha-replica"] .ff-option').eq(1).click()

        // logs should now be filtered to the 3 we've defined for first replica
        cy.get('[data-el="instance-log-row"]').should('have.length', 2)

        // open dropdown and select "All"
        cy.get('[data-el="select-ha-replica"]').click()
        cy.get('[data-el="select-ha-replica"] .ff-option').eq(0).click()

        // logs should be restored
        cy.get('[data-el="instance-log-row"]').should('have.length', 3)
    })
})

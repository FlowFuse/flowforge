describe('FlowForge - Instance - Devices', () => {
    let team
    function navigateToProject (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/team/${team.slug}/instances/${instance.id}/devices`)
                cy.wait('@getInstanceRemoteInstances')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/devices').as('getInstanceRemoteInstances') // TODO currently waiting on project API, rather than instances

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('shows a placeholder message when no devices have been added to the project', () => {
        navigateToProject('BTeam', 'instance-2-1')

        cy.get('[data-el="devices-section"]').get('[data-el="instance-no-devices"]').should('exist')
    })

    it('provides functionality to assign a snapshot', () => {
        navigateToProject('BTeam', 'instance-2-with-devices')

        cy.get('[data-action="change-target-snapshot"]').contains('none')

        cy.get('button[data-action="change-target-snapshot"]').click()

        cy.get('[data-el="snapshot-assign-dialog"]').should('be.visible')
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').should('be.disabled')

        cy.get('[data-form="snapshot-select"]').click()
        cy.get('[data-form="snapshot-select"] .ff-dropdown-option:first').click()

        // Button enabled
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').should('not.be.disabled')

        // Click Assign
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').click()

        cy.get('[data-action="change-target-snapshot"]').contains('snapshot 3')

        // Dialog updates
        cy.get('button[data-action="change-target-snapshot"]').click()
        cy.get('[data-form="snapshot-select"]').click()
        cy.get('[data-form="snapshot-select"] .ff-dropdown-options').contains('snapshot 3 (active)')

        // Reset
        cy.get('[data-form="snapshot-select"] .ff-dropdown-option:last').click()
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').click()
        cy.get('[data-action="change-target-snapshot"]').contains('snapshot 1')
    })
})

describe('FlowForge shows audit logs', () => {
    let team
    function navigateToInstance (teamName, projectName) {
        cy.intercept('GET', '/api/*/projects/*/audit-log*').as('getInstanceAuditLog')

        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/team/${team.slug}/instances/${instance.id}/audit-log`)
                cy.wait('@getInstanceAuditLog')
            })
    }

    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToInstance('BTeam', 'instance-2-with-devices')
    })

    it('for when a snapshot is set as the device target', () => {
        cy.get('.ff-audit-entry').contains('Device Target Set')
    })
})

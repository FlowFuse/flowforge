describe('FlowForge - Instance - Assets', () => {
    let team
    function navigateToProject (teamName, projectName, tab = 'overview') {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )

                cy.wrap(team.id).as('teamId')

                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === projectName
                )

                cy.wrap(instance.id).as('instanceId')

                cy.visit(`/team/${team.slug}/instances/${instance.id}/${tab}`)

                cy.wait('@getAuditLog')
            })
    }

    beforeEach(() => {
        // we're waiting on the audit-log call to be sure the page has loaded
        cy.intercept('GET', '/api/*/projects/*/audit-log*')
            .as('getAuditLog')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('displays the assets tab and menu but in a disabled state alongside the upgrade banner', () => {
        navigateToProject('BTeam', 'instance-2-1')
        cy.get('[data-nav="instance-assets"]').should('be.visible')
        cy.get('[data-nav="instance-assets"]').click()

        cy.get('[data-el="page-banner-feature-unavailable"]').should('be.visible')
        cy.get('[data-el="page-banner-feature-unavailable"]')
            .contains('This is a FlowFuse Enterprise feature. Please upgrade your instance of FlowFuse in order to use it.')

        cy.get('[data-form="search"] input').should('be.visible')
        cy.get('[data-form="search"] input').should('be.disabled')

        cy.get('[data-action="refresh-items"]').should('be.visible')
        cy.get('[data-action="refresh-items"]').should('be.disabled')

        cy.get('[data-action="add-folder"]').should('be.visible')
        cy.get('[data-action="add-folder"]').should('be.disabled')

        cy.get('[data-action="upload-file"]').should('be.visible')
        cy.get('[data-action="upload-file"]').should('be.disabled')
    })

    it('doesn\'t display the assets tab to users with team permissions lesser than member', () => {
        cy.intercept('GET', '/api/*/teams/*/user', { role: 10 }).as('getTeamRole')

        navigateToProject('BTeam', 'instance-2-1')

        cy.get('[data-nav="instance-assets"]').should('not.exist')
    })

    it('redirects users without permissions to the instance overview when they try an access the assets tab manually', () => {
        cy.intercept('GET', '/api/*/teams/*/user', { role: 10 }).as('getTeamRole')

        navigateToProject('BTeam', 'instance-2-1')

        cy.get('@instanceId')
            .then(instanceId => {
                cy.visit(`/team/${team.slug}/instances/${instanceId}/assets`)
                cy.url().should('include', `/instances/${instanceId}/overview`)
            })
    })
})

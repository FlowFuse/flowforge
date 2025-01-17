describe('FlowForge - Team', () => {
    let teamTypeId
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.intercept('GET', '/api/v1/teams/*/applications*').as('getTeamApplications')
        cy.intercept('DELETE', '/api/v1/teams/*').as('deleteTeam')
        cy.intercept('PUT', '/api/v1/teams/*').as('updateTeam')
    })

    describe('Suspend Team', () => {
        it('can suspend/unsuspend a team', () => {
            const TEAM_NAME = `new-team-${Math.random().toString(36).substring(2, 7)}`
            let team
            cy.request('GET', 'api/v1/team-types').then(response => {
                teamTypeId = response.body.types[0].id
                return cy.request('POST', 'api/v1/teams', {
                    name: TEAM_NAME,
                    type: teamTypeId
                })
            }).then((response) => {
                team = response.body
                cy.visit(`team/${team.slug}`)
                cy.visit(`team/${team.slug}/settings/danger`)
                cy.wait('@getTeamApplications')
                cy.get('[data-action="suspend-team"]').should('not.be.disabled')
                cy.get('[data-action="unsuspend-team"]').should('not.exist')

                cy.get('[data-action="suspend-team"]').click()

                cy.get('[data-el="suspend-team-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Suspend Team')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="team-name"] input[type="text"]').type(TEAM_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()

                        cy.wait('@updateTeam')
                    })
            }).then(() => {
                cy.visit(`team/${team.slug}/settings/danger`)
                cy.get('[data-el="banner-team-suspended"]').should('be.visible')

                cy.get('[data-action="suspend-team"]').should('not.exist')
                cy.get('[data-action="unsuspend-team"]').should('not.be.disabled')

                cy.get('[data-action="unsuspend-team"]').click()

                cy.wait('@updateTeam')
            }).then(() => {
                cy.visit(`team/${team.slug}`)
                cy.get('[data-el="banner-team-suspended"]').should('not.exist')
            })
        })
    })

    describe('Delete Team', () => {
        it('can delete empty team', () => {
            const TEAM_NAME = `new-team-${Math.random().toString(36).substring(2, 7)}`
            let team
            cy.request('GET', 'api/v1/team-types').then(response => {
                teamTypeId = response.body.types[0].id
                return cy.request('POST', 'api/v1/teams', {
                    name: TEAM_NAME,
                    type: teamTypeId
                })
            }).then((response) => {
                team = response.body
                cy.visit(`team/${team.slug}`)
                cy.visit(`team/${team.slug}/settings/danger`)
                // cy.get('[data-action="delete-team"]').should('be.disabled')
                cy.wait('@getTeamApplications')
                cy.get('[data-action="delete-team"]').should('not.be.disabled')

                cy.get('[data-action="delete-team"]').click()

                cy.get('[data-el="delete-team-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Team')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="team-name"] input[type="text"]').type(TEAM_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()

                        cy.wait('@deleteTeam')
                    })
            }).then(() => {
                cy.request('GET', 'api/v1/teams')
            }).then(response => {
                const teams = response.body.teams
                const oldTeam = teams.find(t => t.id === team.id)
                cy.wrap(oldTeam).should('be.a', 'undefined')
            })
        })

        it('can delete team with only empty application', () => {
            let team
            const TEAM_NAME = `new-team-${Math.random().toString(36).substring(2, 7)}`
            const APP_NAME = `new-app-${Math.random().toString(36).substring(2, 7)}`
            cy.request('GET', 'api/v1/team-types').then(response => {
                teamTypeId = response.body.types[0].id
                return cy.request('POST', 'api/v1/teams', {
                    name: TEAM_NAME,
                    type: teamTypeId
                })
            }).then((response) => {
                team = response.body
                return cy.request('POST', 'api/v1/applications', {
                    name: APP_NAME,
                    teamId: team.id
                })
            }).then(response => {
                cy.visit(`team/${team.slug}`)
                cy.visit(`team/${team.slug}/settings/danger`)
                // cy.get('[data-action="delete-team"]').should('be.disabled')
                cy.wait('@getTeamApplications')
                cy.get('[data-action="delete-team"]').should('not.be.disabled')
                cy.get('[data-action="delete-team"]').click()

                cy.get('[data-el="delete-team-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Team')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="team-name"] input[type="text"]').type(TEAM_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()

                        cy.wait('@deleteTeam')
                    })
            })
        })
    })
})

describe('Navigation', () => {
    it('correctly changes the team when navigating via url between teams', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.get('[data-action="team-selection"].ff-dropdown.ff-dropdown--closed.ff-team-selection')
            .within(() => {
                cy.contains('ATeam')
            })
        cy.contains('application-1')

        cy.get('[data-nav="team-instances"]').click()
        cy.contains('instance-1-1')
        cy.contains('instance-1-2')

        cy.visit('/team/bteam/applications')

        cy.get('[data-action="team-selection"].ff-dropdown.ff-dropdown--closed.ff-team-selection')
            .within(() => {
                cy.contains('BTeam')
            })
        cy.contains('application-2')

        cy.get('[data-nav="team-instances"]').click()
        cy.contains('instance-2-1')
        cy.contains('instance-2-with-devices')
    })

    it('correctly changes the team when manually selecting a different team', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.get('[data-action="team-selection"].ff-dropdown.ff-dropdown--closed.ff-team-selection')
            .within(() => {
                cy.contains('ATeam')
            })
        cy.contains('application-1')

        cy.get('[data-nav="team-instances"]').click()
        cy.contains('instance-1-1')
        cy.contains('instance-1-2')

        cy.get('[data-action="team-selection"].ff-dropdown.ff-dropdown--closed.ff-team-selection').click()
        cy.get('[data-action="switch-team"]').contains('BTeam').parent().click()

        cy.get('[data-action="team-selection"].ff-dropdown.ff-dropdown--closed.ff-team-selection')
            .within(() => {
                cy.contains('BTeam')
            })
        cy.contains('application-2')

        cy.get('[data-nav="team-instances"]').click()
        cy.contains('instance-2-1')
        cy.contains('instance-2-with-devices')
    })

    it('should display the back button when creating a team', () => {
        cy.login('alice', 'aaPassword')

        cy.visit('/team/create')

        cy.url().should('contain', '/team/create')

        cy.get('[data-nav="back"]').should('exist')
        cy.get('[data-nav="back"]').contains('Back to Dashboard')

        cy.get('[data-nav="back"]').click()

        cy.url().should('match', /^.*\/team\/.*\/applications/)
    })
})

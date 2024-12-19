describe('FlowForge - Version History', () => {
    let projectId
    let team

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', '/api/v1/teams/')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                projectId = response.body.projects[0].id
            })
    })

    it('has the version history tab and can access the timeline and snapshots pages', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', {
            meta: {},
            count: 0,
            snapshots: []
        }).as('getProjectSnapshots')
        cy.visit(`/team/${team.slug}/instances/${projectId}/overview`)

        cy.get('[data-nav="instance-version-history"]').click()

        // check that the snapshots tab is default, data not important
        cy.contains('Create your First Snapshot')

        // manually switch to the timeline tab
        cy.get('[data-nav="page-toggle"]').contains('Timeline').click()

        // check that the timeline tab is default, data not important
        cy.contains('Timeline Not Available')

        cy.get('[data-action="import-snapshot"]').should('exist').should('not.be.disabled')
        cy.get('[data-action="create-snapshot"]').should('exist').should('not.be.disabled')

        cy.get('[data-nav="page-toggle"]').within(() => {
            cy.contains('Timeline').should('exist').should('not.be.disabled')
            cy.contains('Snapshots').should('exist').should('not.be.disabled')

            cy.contains('Snapshots').click()
        })

        cy.wait('@getProjectSnapshots')

        cy.contains('Create your First Snapshot')
    })

    it('The Timeline is not available for non licensed users', () => {
        const spy = cy.spy().as('historyRequest')
        cy.intercept('GET', '/api/*/projects/*/history', spy)
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/timeline`)

        cy.contains('This is a FlowFuse Enterprise feature. Please upgrade your instance of FlowFuse in order to use it.')
        cy.contains('Timeline Not Available')

        cy.get('@historyRequest').should('not.have.been.called')
    })
})

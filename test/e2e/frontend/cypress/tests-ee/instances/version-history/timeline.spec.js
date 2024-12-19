import fullSnapshot from '../../../fixtures/version-history/snapshots/instance2-full-snapshot2.json'
import flowsSetEvent from '../../../fixtures/version-history/timeline/flows-set.json'
import projectCreatedEvent from '../../../fixtures/version-history/timeline/project-created.json'
import projectSettingsUpdated from '../../../fixtures/version-history/timeline/project-settings-updated.json'
import projectSnapshotCreated from '../../../fixtures/version-history/timeline/project-snapshot-created.json'
import projectSnapshotImportedManual
    from '../../../fixtures/version-history/timeline/project-snapshot-imported_manual.json'
import projectSnapshotImportedPipeline
    from '../../../fixtures/version-history/timeline/project-snapshot-imported_pipeline.json'
import projectSnapshotRolledBack from '../../../fixtures/version-history/timeline/project-snapshot-rolled-back.json'

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

    it('The Timeline is not available for teams without the timeline feature enabled', () => {
        const spy = cy.spy().as('historyRequest')
        cy.intercept('GET', '/api/*/projects/*/history', spy)
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/timeline`)

        cy.contains('This feature is not available for your current Team. Please upgrade your Team in order to use it.')
        cy.contains('Timeline Not Available')

        cy.get('@historyRequest').should('not.have.been.called')
    })

    describe('Timeline Feature enabled teams', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 50 }).as('getTeamRole')
            cy.intercept('GET', '/api/*/teams/slug/*', (req) => {
                req.reply((response) => {
                    // ensure we keep bom enabled
                    response.body.type.properties.features.projectHistory = true
                    return response
                })
            }).as('getTeam')

            cy.login('alice', 'aaPassword')
        })

        it('have access to the timeline feature and correctly renders timeline events', () => {
            cy.intercept('GET', '/api/*/projects/*/history?*', {
                meta: {},
                count: 0,
                timeline: [
                    projectSnapshotRolledBack,
                    projectSnapshotImportedPipeline,
                    projectSettingsUpdated,
                    projectSnapshotCreated,
                    flowsSetEvent,
                    projectSnapshotImportedManual,
                    projectCreatedEvent
                ]
            }).as('getHistory')

            cy.visit('/')

            cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/timeline`)

            cy.wait('@getHistory')

            cy.get('[data-el="timeline-list"]').children().should('have.length', 7)

            cy.get('[data-el="timeline-list"] li').contains('Snapshot Restored: Auto Snapshot - 2024-10-16 10:59:38')
            cy.get('[data-el="timeline-list"] li').contains('Qui-Gon Jinn')

            cy.get('[data-el="timeline-list"] li').contains('Tatooine CNC Shop Snapshot deployed from instance-1-1')
            cy.get('[data-el="timeline-list"] li').contains('Princess Amidala')

            cy.get('[data-el="timeline-list"] li').contains('Instance Settings Updated')
            cy.get('[data-el="timeline-list"] li').contains('Ahsoka Tano')

            cy.get('[data-el="timeline-list"] li').contains('Snapshot Captured: Auto Snapshot - 2024-10-18 12:41:28')
            cy.get('[data-el="timeline-list"] li').contains('Mace Windu')

            cy.get('[data-el="timeline-list"] li').contains('Flows Deployed From Editor')
            cy.get('[data-el="timeline-list"] li').contains('Lando Calrissian')

            cy.get('[data-el="timeline-list"] li').contains('Imported Tatooine CNC Shop snapshot')
            cy.get('[data-el="timeline-list"] li').contains('Princess Amidala')

            cy.get('[data-el="timeline-list"] li').contains('Instance Created')
            cy.get('[data-el="timeline-list"] li').contains('Mon Mothma')
        })

        it('can interact with timeline events', () => {
            cy.intercept('GET', '/api/*/projects/*/history?*', {
                meta: {},
                count: 0,
                timeline: [
                    projectSnapshotRolledBack,
                    projectSnapshotImportedPipeline,
                    projectSettingsUpdated,
                    projectSnapshotCreated,
                    flowsSetEvent,
                    projectSnapshotImportedManual,
                    projectCreatedEvent
                ]
            }).as('getHistory')

            cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/timeline`)

            cy.wait('@getTeam')
            cy.wait('@getHistory')

            // it can view restored snapshots
            cy.intercept('GET', '/api/v1/snapshots/*/full', fullSnapshot).as('getSnapshot')
            cy.get('[data-el="dialog-view-snapshot"]').should('not.be.visible')
            cy.contains('Auto Snapshot - 2024-10-16 10:59:38').click()
            cy.wait('@getSnapshot')
            cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
                .within(() => {
                    cy.get('[data-action="dialog-confirm"]').click()
                })

            // it can view the pipeline deployed snapshot
            cy.get('[data-el="dialog-view-snapshot"]').should('not.be.visible')
            cy.get('[data-el="timeline-list"]')
                .contains('Tatooine CNC Shop Snapshot deployed from instance-1-1')
                .within(() => {
                    cy.contains('Tatooine CNC Shop').click()
                })
            cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
                .within(() => {
                    cy.get('[data-action="dialog-confirm"]').click()
                })

            // it can view the pipeline source instance
            cy.get('[data-el="timeline-list"]')
                .contains('Tatooine CNC Shop Snapshot deployed from instance-1-1')
                .within(() => {
                    cy.contains('instance-1-1').click()
                    cy.url().should('match', /^.*\/instances\/.*\/overview/)
                })
            cy.go('back')

            // it can view created snapshots
            cy.get('[data-el="dialog-view-snapshot"]').should('not.be.visible')
            cy.get('[data-el="timeline-list"]')
                .contains('Snapshot Captured: Auto Snapshot - 2024-10-18 12:41:28')
                .within(() => {
                    cy.contains('Auto Snapshot - 2024-10-18 12:41:28').click()
                })
            cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
                .within(() => {
                    cy.get('[data-action="dialog-confirm"]').click()
                })

            // auto snapshots have the kebab menu available
            cy.get('[data-el="timeline-list"]')
                .contains('Snapshot Captured: Auto Snapshot - 2024-10-18 12:41:28')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="kebab-menu"]').should('exist')
                })

            // it can view manually imported snapshots
            cy.get('[data-el="dialog-view-snapshot"]').should('not.be.visible')
            cy.get('[data-el="timeline-list"]')
                .contains('Imported Tatooine CNC Shop snapshot')
                .within(() => {
                    cy.contains('Tatooine CNC Shop').click()
                })
            cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
                .within(() => {
                    cy.get('[data-action="dialog-confirm"]').click()
                })

            // manual snapshots have the kebab menu available
            cy.get('[data-el="timeline-list"]')
                .contains('Imported Tatooine CNC Shop snapshot')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="kebab-menu"]').should('exist')
                })
        })

        it('uploading a snapshot from the timeline page reloads the timeline', () => {
            cy.fixture('version-history/snapshots/snapshot-with-credentials.json', null).as('snapshot')
            cy.intercept('GET', '/api/*/projects/*/history?*', {
                meta: {},
                count: 0,
                timeline: [
                    projectSnapshotRolledBack,
                    projectSnapshotImportedPipeline,
                    projectSettingsUpdated,
                    projectSnapshotCreated,
                    flowsSetEvent,
                    projectSnapshotImportedManual,
                    projectCreatedEvent
                ]
            }).as('getHistory')

            cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/timeline`)

            cy.wait('@getTeam')
            cy.wait('@getHistory')

            cy.get('[data-el="dialog-import-snapshot"]').should('not.be.visible')
            cy.get('[data-action="import-snapshot"]').click()
            cy.get('[data-el="dialog-import-snapshot"]').should('be.visible')
            // upload the snapshot file that has credentials (the credentials secret field should become visible)
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="file"]').selectFile({ contents: '@snapshot' }, { force: true }) // force because the input is hidden
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').type('correct secret')
            cy.get('[data-el="dialog-import-snapshot"] [data-action="dialog-confirm"]').click()

            cy.wait('@getHistory') // waiting for the getHistory call is enough
        })

        it('creating a snapshot from the timeline page reloads the timeline', () => {
            cy.intercept('GET', '/api/*/projects/*/history?*', {
                meta: {},
                count: 0,
                timeline: [
                    projectSnapshotRolledBack,
                    projectSnapshotImportedPipeline,
                    projectSettingsUpdated,
                    projectSnapshotCreated,
                    flowsSetEvent,
                    projectSnapshotImportedManual,
                    projectCreatedEvent
                ]
            }).as('getHistory')

            cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/timeline`)

            cy.wait('@getTeam')
            cy.wait('@getHistory')

            cy.get('[data-el="dialog-create-snapshot"]').should('not.be.visible')
            cy.get('[data-action="create-snapshot"]').click()
            cy.get('[data-el="dialog-create-snapshot"]').should('be.visible')

            cy.get('[data-el="dialog-create-snapshot"] [data-form="snapshot-name"] input[type="text"]').type('snapshot1')
            cy.get('[data-el="dialog-create-snapshot"] [data-form="snapshot-description"] textarea').type('snapshot1 description')
            cy.get('[data-el="dialog-create-snapshot"] [data-action="dialog-confirm"]').click()

            cy.wait('@getHistory') // waiting for the getHistory call is enough
        })
    })
})

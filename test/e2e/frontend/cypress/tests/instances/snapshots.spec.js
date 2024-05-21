/// <reference types="cypress" />
import instanceSnapshots from '../../fixtures/snapshots/instance-snapshots.json'
import instanceSnapshot from '../../fixtures/snapshots/instance2-full-snapshot2.json'
const IDX_DEPLOY_SNAPSHOT = 0
const IDX_VIEW_SNAPSHOT = 1
const IDX_DOWNLOAD_SNAPSHOT = 2
const IDX_DOWNLOAD_PACKAGE = 3
const IDX_SET_TARGET = 4
const IDX_DELETE_SNAPSHOT = 5

describe('FlowForge - Instance Snapshots', () => {
    let projectId
    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', '/api/v1/teams/')
            .then((response) => {
                const team = response.body.teams[0]
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                projectId = response.body.projects[0].id
                cy.visit(`/instance/${projectId}/snapshots`)
                cy.wait('@getProjectSnapshots')
            })
    })

    it('shows a placeholder message when no snapshots have been created', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', { count: 0, snapshots: [] }).as('getEmptyProjectSnapshots')
        cy.visit(`/instance/${projectId}/snapshots`)
        cy.wait('@getEmptyProjectSnapshots')
        cy.get('main').contains('Create your First Snapshot')
    })

    it('provides functionality to create a snapshot', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', { count: 0, snapshots: [] }).as('snapshotData')
        cy.visit(`/instance/${projectId}/snapshots`)
        cy.wait('@snapshotData')

        cy.get('button[data-action="create-snapshot"]').click()

        cy.get('[data-el="dialog-create-snapshot"]').should('be.visible')
        cy.get('.ff-dialog-header').contains('Create Snapshot')
        // disabled primary button by default
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').should('be.disabled')

        cy.get('[data-form="snapshot-name"] input[type="text"]').type('snapshot1')
        // inserting snapshot name is enough to enable button
        cy.get('[data-el="dialog-create-snapshot"] button.ff-btn.ff-btn--primary').should('not.be.disabled')
        cy.get('[data-form="snapshot-description"] textarea').type('snapshot1 description')

        // click "Create"
        cy.get('[data-el="dialog-create-snapshot"] button.ff-btn.ff-btn--primary').click()
        cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot1')
    })

    it('offers correct options in snapshot table kebab menu', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', instanceSnapshots).as('snapshotData')
        cy.visit(`/instance/${projectId}/snapshots`)
        cy.wait('@snapshotData')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()

        // check the options are present
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', 6)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).contains('Deploy Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_SET_TARGET).contains('Set as Device Target')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
    })

    it('provides functionality to view a snapshot', () => {
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceSnapshot).as('fullSnapshot')
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')

        // check the snapshot name in the dialog header
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-header').contains('instance-2 snapshot-2')

        // check the flow renders an SVG in the content section
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-content svg').should('exist')
    })

    it('download snapshot', () => {
        // ensure the downloads folder is empty before the test
        cy.task('clearDownloads')

        cy.intercept('POST', '/api/*/snapshots/*/export').as('exportSnapshot')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Download Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).click()

        // wait for SnapshotExportDialog dialog to appear
        cy.get('[data-el="dialog-export-snapshot"]').should('be.visible')

        // by default, the secret should be populated with a random string and the download button should be enabled
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').invoke('val').should('not.be.empty')
        cy.get('[data-el="dialog-export-snapshot"] button').contains('Download').should('not.be.disabled')

        // capture the value of the snapshot secret, operate the secret refresh button, and check the secret has changed
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').invoke('val').then((secret) => {
            // operate the secret refresh button
            cy.get('[data-el="dialog-export-snapshot"] [data-el="refresh"]').click()
            // check secret has changed
            cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').invoke('val').should('not.eq', secret)
        })

        // check validation "Secret is required"
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-el="form-row-error"]').contains('Secret is required')

        // check validation "Secret must be at least 8 characters"
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').type('1234567')
        cy.get('[data-el="dialog-export-snapshot"] [data-el="form-row-error"]').contains('Secret must be at least 8 characters')

        // check validation "Secret cannot start or end with a space"
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').type('1234567 ')
        cy.get('[data-el="dialog-export-snapshot"] [data-el="form-row-error"]').contains('Secret cannot start or end with a space')
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').type(' 1234567')
        cy.get('[data-el="dialog-export-snapshot"] [data-el="form-row-error"]').contains('Secret cannot start or end with a space')
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').type('                   ')
        cy.get('[data-el="dialog-export-snapshot"] [data-el="form-row-error"]').contains('Secret cannot start or end with a space')

        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').type('a valid secret')

        // operate the data-action="dialog-confirm" button
        cy.get('[data-el="dialog-export-snapshot"] [data-action="dialog-confirm"]').click()

        // wait for `api/v1/snapshots/*/export` to respond
        cy.wait('@exportSnapshot').then(interception => {
            // At this point, the endpoint has returned but occasionally, the test fails as the file is not yet written to the filesystem.
            // To counter this, there is a short 250ms wait to allow time for the file to be written to the filesystem.
            // A better solution would be to use a cy.command (named waitForFileDownload) that polls the downloads folder
            // and calls `cy.wait` with timeout and retry. This would allow the test to wait for the file in a more reliable way.
            // For now, a small delay here gets the job done.
            cy.wait(250) // eslint-disable-line cypress/no-unnecessary-waiting

            const response = interception.response.body
            // check the downloaded file
            const downloadsFolder = Cypress.config('downloadsFolder')
            // generate the expected snapshot filename structure
            cy.task('fileExists', { dir: downloadsFolder, fileRE: `snapshot-${response.id}-\\d{8}-\\d{6}\\.json` })
        })
    })

    it('download snapshot package.json', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', instanceSnapshots).as('snapshotData')
        cy.intercept('GET', '/api/*/snapshots/*', instanceSnapshot).as('instanceSnapshot')
        cy.visit(`/instance/${projectId}/snapshots`)
        cy.wait('@snapshotData')

        // ensure package.json does not exist in the downloads folder before the test
        cy.task('clearDownloads')
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Download Package.json option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).click()

        cy.wait('@instanceSnapshot').then(interception => {
            // At this point, the endpoint has returned but occasionally, the test fails as the file is not yet written to the filesystem.
            // To counter this, there is a short 250ms wait to allow time for the file to be written to the filesystem.
            // A better solution would be to use a cy.command (named waitForFileDownload) that polls the downloads folder
            // and calls `cy.wait` with timeout and retry. This would allow the test to wait for the file in a more reliable way.
            // For now, a small delay here gets the job done.
            cy.wait(250) // eslint-disable-line cypress/no-unnecessary-waiting
            const downloadsFolder = Cypress.config('downloadsFolder')
            cy.task('fileExists', { dir: downloadsFolder, file: 'package.json' })
        })
    })

    it('can delete a snapshot', () => {
        cy.intercept('DELETE', '/api/*/snapshots/*').as('deleteSnapshot')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Delete option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] .ff-dialog-header').contains('Delete Snapshot')

        cy.get('[data-el="snapshots"] tbody').find('tr').its('length').then((count) => {
            // Click "Delete"
            cy.get('[data-el="platform-dialog"] .ff-btn--danger').click()
            cy.wait('@deleteSnapshot')
            if (count === 1) {
                cy.get('main').contains('Create your First Snapshot')
            } else {
                cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', count - 1)
            }
        })
    })

    it('upload snapshot with credentials', () => {
        cy.fixture('snapshots/snapshot-with-credentials.json', null).as('snapshot')
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        // click data-action="import-snapshot" to open the dialog
        cy.get('[data-action="import-snapshot"]').click()

        cy.get('[data-el="dialog-import-snapshot"]').should('be.visible')

        // check the dialog header
        cy.get('[data-el="dialog-import-snapshot"] .ff-dialog-header').contains('Upload Snapshot')

        // upload the snapshot file that has credentials (the credentials secret field should become visible)
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="file"]').selectFile({ contents: '@snapshot' }, { force: true }) // force because the input is hidden

        // check file field input text is the filename
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="text"]').should('have.value', 'snapshot-with-credentials.json')
        // check name field is the name from within the snapshot file
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').should('have.value', 'application device snapshot 1')

        // check validation of name field
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] [data-el="form-row-error"]').should('contain.text', 'Name is required')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').type('uploaded snapshot1')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"]').should('not.contain', '[data-el="form-row-error"]')

        // check validation of secret field
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').type('bad secret')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.contain', '[data-el="form-row-error"]')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] [data-el="form-row-error"]').should('contain.text', 'Secret is required')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').type('correct secret')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.contain', '[data-el="form-row-error"]')

        // set a description
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-description"] textarea').type('snapshot1 description')

        // click import button
        cy.get('[data-el="dialog-import-snapshot"] [data-action="dialog-confirm"]').click()

        cy.wait('@importSnapshot')

        // check the snapshot is now in the table
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('uploaded snapshot1')
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot1 description')
    })

    it('upload snapshot without credentials', () => {
        cy.fixture('snapshots/instance2-full-snapshot2.json', null).as('snapshot')
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        // click data-action="import-snapshot" to open the dialog
        cy.get('[data-action="import-snapshot"]').click()

        cy.get('[data-el="dialog-import-snapshot"]').should('be.visible')

        // check the dialog header
        cy.get('[data-el="dialog-import-snapshot"] .ff-dialog-header').contains('Upload Snapshot')

        // upload the snapshot file that has credentials (the credentials secret field should become visible)
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="file"]').selectFile({ contents: '@snapshot' }, { force: true }) // force because the input is hidden

        // check file field input text is the filename
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="text"]').should('have.value', 'instance2-full-snapshot2.json')
        // check name field is the name from within the snapshot file
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').should('have.value', 'instance-2 snapshot-2')

        // check credentials secret field is not visible
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.exist')

        // check validation of name field
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] [data-el="form-row-error"]').should('contain.text', 'Name is required')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').type('uploaded snapshot2')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"]').should('not.contain', '[data-el="form-row-error"]')

        // set a description
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-description"] textarea').type('snapshot2 description')

        // click import button
        cy.get('[data-el="dialog-import-snapshot"] [data-action="dialog-confirm"]').click()

        cy.wait('@importSnapshot')

        // check the snapshot is now in the table
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('uploaded snapshot2')
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot2 description')
    })
})

describe('FlowForge shows audit logs', () => {
    function navigateToProject (teamName, projectName) {
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
                cy.visit(`/instance/${project.id}/audit-log`)
            })
    }

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        navigateToProject('ATeam', 'instance-1-1')
    })

    it('for when a snapshot is created', () => {
        cy.get('.ff-audit-entry').contains('Instance Snapshot Created')
    })
    it('for when a snapshot is deleted', () => {
        cy.get('.ff-audit-entry').contains('Instance Snapshot Deleted')
    })
    it('for when a snapshot is exported', () => {
        cy.get('.ff-audit-entry').contains('Instance Snapshot Exported')
    })
    it('for when a snapshot is imported', () => {
        cy.get('.ff-audit-entry').contains('Snapshot Imported')
    })
})

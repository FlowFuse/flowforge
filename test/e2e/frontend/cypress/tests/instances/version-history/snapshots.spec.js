/// <reference types="cypress" />
import should from 'should'

import instanceSnapshots from '../../../fixtures/version-history/snapshots/instance-snapshots.json'
import instanceFullSnapshot from '../../../fixtures/version-history/snapshots/instance2-full-snapshot2.json'
import instanceSnapshot from '../../../fixtures/version-history/snapshots/instance2-snapshot2.json'
// import instanceFullSnapshot from '../../fixtures/snapshots/snapshot-with-credentials.json'
let idx = 0
const IDX_DEPLOY_SNAPSHOT = idx++
const IDX_EDIT_SNAPSHOT = idx++
const IDX_VIEW_SNAPSHOT = idx++
const IDX_COMPARE_SNAPSHOT = idx++
const IDX_DOWNLOAD_SNAPSHOT = idx++
const IDX_DOWNLOAD_PACKAGE = idx++
const IDX_SET_TARGET = idx++
const IDX_DELETE_SNAPSHOT = idx++
const MENU_ITEM_COUNT = idx

describe('FlowForge - Instance Snapshots', () => {
    let projectId
    let team
    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', '/api/v1/teams/')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                projectId = response.body.projects[0].id
                cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/snapshots`)
                cy.wait('@getProjectSnapshots')
            })
    })

    it('shows a placeholder message when no snapshots have been created', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', { count: 0, snapshots: [] }).as('getEmptyProjectSnapshots')
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/snapshots`)
        cy.wait('@getEmptyProjectSnapshots')
        cy.get('[data-el="empty-state"]').contains('h1', 'Create your First Snapshot')
    })

    it('provides functionality to create a snapshot', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', { count: 0, snapshots: [] }).as('snapshotData')
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/snapshots`)
        cy.wait('@snapshotData')

        cy.get('[data-action="create-snapshot"]').click()

        cy.get('[data-el="dialog-create-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-create-snapshot"] .ff-dialog-header').contains('Create Snapshot')
        // disabled primary button by default
        cy.get('[data-el="dialog-create-snapshot"] .ff-dialog-box button.ff-btn.ff-btn--primary').should('be.disabled')

        cy.get('[data-el="dialog-create-snapshot"] [data-form="snapshot-name"] input[type="text"]').type('snapshot1')
        // inserting snapshot name is enough to enable button
        cy.get('[data-el="dialog-create-snapshot"] button.ff-btn.ff-btn--primary').should('not.be.disabled')
        cy.get('[data-el="dialog-create-snapshot"] [data-form="snapshot-description"] textarea').type('snapshot1 description')

        cy.intercept('GET', '/api/*/projects/*/snapshots', {
            count: 1,
            snapshots: [{
                ...instanceSnapshot,
                name: 'snapshot1'
            }]
        }).as('snapshotData')
        // click "Create"
        cy.get('[data-el="dialog-create-snapshot"] button.ff-btn.ff-btn--primary').click()
        cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot1')
    })

    it('offers correct options in snapshot table kebab menu', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', instanceSnapshots).as('snapshotData')
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/snapshots`)
        cy.wait('@snapshotData')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()

        // check the options are present
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', MENU_ITEM_COUNT)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).contains('Restore Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).contains('Edit Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_SET_TARGET).contains('Set as Device Target')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
    })

    it('provides functionality to view a snapshot', () => {
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')
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

    it('provides functionality to edit a snapshot', () => {
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')
        cy.intercept('PUT', '/api/*/snapshots/*', {}).as('updateSnapshot')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Edit Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).click()

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-edit-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-edit-snapshot"] .ff-dialog-header').contains('Edit Snapshot: snapshot1') // brittle! (depends on prior test / ordered execution)
        // check the edit form is present
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-edit"]').should('exist')
        // check the buttons are present
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-confirm"]').should('exist').should('be.enabled')
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-cancel"]').should('exist').should('be.enabled')

        // clear the snapshot name
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-name"] input').clear()
        // the confirm button should be disabled
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-confirm"]').should('be.disabled')

        // enter a new snapshot name and description
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-name"] input').type('Edited Snapshot Name!!!')
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-description"] textarea').clear()
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-description"] textarea').type('Edited Snapshot Description!!!')
        // the confirm button should be enabled
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-confirm"]').should('be.enabled').click()

        cy.wait('@updateSnapshot').then((interception) => {
            expect(interception.request.body.name).to.equal('Edited Snapshot Name!!!')
            expect(interception.request.body.description).to.equal('Edited Snapshot Description!!!')
        })

        // check the snapshot name is updated in the table
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('Edited Snapshot Name!!!')
    })

    it('provides functionality to compare snapshots', () => {
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        cy.get('[data-el="dialog-compare-snapshot"]').should('be.visible')

        // check the snapshot name in the dialog header
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-header').contains('instance-2 snapshot-2')

        // initially, the compare button should be disabled
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').should('be.disabled')

        // select the snapshot to compare with
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"]').click()
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] .ff-options > .ff-option:first').click()
        // click compare button
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').click()
        cy.wait('@fullSnapshot')

        // check the flow renders an SVG in the content section
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-content svg').should('exist')
    })

    function prepareDownloadSnapshot (projectId, name) {
        // if (!testSnapshotUploaded) {
        // first upload a known snapshot so that download tests can be run against it
        // directly POST to api/v1/snapshots/import the upload1.json snapshot
        cy.fixture('version-history/snapshots/upload-for-download.json').then((snapshot) => {
            snapshot.name = name
            cy.request('POST', '/api/v1/snapshots/import', {
                ownerId: projectId,
                ownerType: 'instance',
                snapshot,
                credentialSecret: 'correct secret',
                components: { flows: true, credentials: true, env: true }
            })
        })
        // ensure the downloads folder is empty before the test
        cy.task('clearDownloads')
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('snapshotData')
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/snapshots`)
        cy.wait('@snapshotData')
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Download Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).click()
        // wait for SnapshotExportDialog dialog to appear
        cy.get('[data-el="dialog-export-snapshot"]').should('be.visible')
    }

    it('download snapshot options and validation work as expected', () => {
        // Premise: the snapshot has components and these can be included or excluded from the download as per users choice
        // Rules:
        // - By default, all components are included
        // - The download button is enabled, the secret field is visible and populated with a random string
        // - Excluding flows and/or credentials should hide the secret field
        // - Excluding flows component disables the credentials component
        // - Excluding env should disable the radio buttons
        // - Excluding all components should disable the download & a validation message should appear

        prepareDownloadSnapshot(projectId, 'a-snapshot')

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

        // download button should be enabled & secret field should be visible and populated
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').type('a valid secret')
        cy.get('[data-el="dialog-export-snapshot"] button').contains('Download').should('not.be.disabled')
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"]').should('exist')
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"] input').invoke('val').should('not.be.empty')

        // check the component options are present & default state
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"]').should('exist')
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"]').within(() => {
            cy.get('[data-form="component-flows"]').contains('Flows')
            cy.get('[data-form="component-flows"] input[type="checkbox"]').should('be.checked')

            cy.get('[data-form="component-credentials"]').contains('Credentials')
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('be.checked')
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('not.be.disabled')

            cy.get('[data-form="component-environment-variables"]').contains('Environment Variables')
            cy.get('[data-form="component-environment-variables"] input[type="checkbox"]').should('be.checked')

            cy.get('[data-form="component-environment-variables-options"]').should('exist')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').should('have.length', 2)

            // by default, the first radio button should be checked
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(0).should('not.be.disabled')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(0).contains('Keys and Values')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn span.checkbox').eq(0).should('have.attr', 'checked', 'checked')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).should('not.be.disabled')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).contains('Keys Only')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).contains('Keys Only').should('not.have.attr', 'checked')
        })

        // now, click the `flows` check which should disable the `credentials` field (no flows, no creds!). Also, the secret field should be hidden
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"]').within(() => {
            cy.get('[data-form="component-flows"] .ff-checkbox').click()
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('be.disabled')
            cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"]').should('not.exist')
        })

        // now, click the `environment variables`, the `key and values` & `keys only` radio buttons should be disabled
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"]').within(() => {
            cy.get('[data-form="component-environment-variables"] .ff-checkbox').click()
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(0).should('have.attr', 'disabled')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).should('have.attr', 'disabled')
        })

        // ensure the validation message appears when all components are excluded & the download button is disabled
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"] [data-el="form-row-error"]').contains('At least one component must be selected')
        cy.get('[data-el="dialog-export-snapshot"] button').contains('Download').should('be.disabled')

        // re-check the flows (the validation should clear), then uncheck credentials
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"]').within(() => {
            cy.get('[data-form="component-flows"] .ff-checkbox').click()
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('not.be.disabled')
            cy.get('[data-form="component-credentials"] .ff-checkbox').click() // exclude credentials
        })
        // validation message should be gone, secret field should be hidden and download button should be enabled
        cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"] [data-el="form-row-error"]').should('not.exist')
        cy.get('[data-el="dialog-export-snapshot"] [data-form="snapshot-secret"]').should('not.exist')
        cy.get('[data-el="dialog-export-snapshot"] button').contains('Download').should('not.be.disabled')
    })

    function downloadSnapshotWithComponentOptionsTest (excludeFlows, excludeCredentials, excludeEnv, envKeysOnly) {
        const nameBuilder = ['for-download']
        nameBuilder.push(excludeFlows ? 'exclude-flows' : 'include-flows')
        nameBuilder.push(excludeCredentials ? 'exclude-creds' : 'include-creds')
        nameBuilder.push(excludeEnv ? 'exclude-env' : 'include-env')
        if (!excludeEnv) {
            nameBuilder.push(envKeysOnly ? 'keys-only' : 'keys-and-values')
        }
        const name = nameBuilder.join(' ')

        prepareDownloadSnapshot(projectId, name)
        cy.intercept('POST', '/api/*/snapshots/*/export').as('exportSnapshot')

        if (excludeFlows) {
            cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"] [data-form="component-flows"] .ff-checkbox').click()
        }
        if (excludeCredentials) {
            cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"] [data-form="component-credentials"] .ff-checkbox').click()
        }
        if (excludeEnv) {
            cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"] [data-form="component-environment-variables"] .ff-checkbox').click()
        } else if (envKeysOnly) {
            cy.get('[data-el="dialog-export-snapshot"] [data-form="export-snapshot-components"] [data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).click()
        }
        // click the `Download` button
        cy.get('[data-el="dialog-export-snapshot"] button').contains('Download').click()
        const downloadsFolder = Cypress.config('downloadsFolder')
        cy.wait('@exportSnapshot').then(interception => {
            cy.wait(250) // eslint-disable-line cypress/no-unnecessary-waiting
            const response = interception.response.body
            return cy.task('fileExists', { dir: downloadsFolder, fileRE: `snapshot-${response.id}-\\d{8}-\\d{6}\\.json` })
        }).then((filename) => {
            return cy.readFile(`${downloadsFolder}/${filename}`)
        }).then((packageObject) => {
            expect(packageObject).to.have.property('name', name) // ensure we get the correct snapshot
            expect(packageObject.flows).to.have.keys('flows', 'credentials')
            if (excludeFlows) {
                expect(packageObject.flows).to.have.property('flows').and.to.be.an('array').and.to.have.length(0)
            } else {
                expect(packageObject.flows).to.have.property('flows').and.to.be.an('array').and.to.have.length(4)
            }
            expect(packageObject.flows).to.have.property('credentials').and.to.be.an('object')
            if (excludeFlows || excludeCredentials) {
                expect(packageObject.flows.credentials).to.deep.equal({})
            } else {
                expect(packageObject.flows.credentials).to.have.property('$')
            }
            expect(packageObject.settings).to.have.property('env')
            if (excludeEnv) {
                expect(packageObject.settings.env || {}).to.deep.equal({})
            } else if (envKeysOnly) {
                expect(packageObject.settings.env).to.deep.equal({ key1: '', key2: '' })
            } else {
                expect(packageObject.settings.env).to.deep.equal({ key1: 'value1', key2: 'value2' })
            }
        })
    }

    it('download full snapshot, include all', () => {
        downloadSnapshotWithComponentOptionsTest(false, false, false, false)
    })

    it('download snapshot, exclude flows', () => {
        downloadSnapshotWithComponentOptionsTest(true, false, false, false)
    })

    it('download snapshot, exclude credentials', () => {
        downloadSnapshotWithComponentOptionsTest(false, true, false, false)
    })

    it('download snapshot, exclude env', () => {
        downloadSnapshotWithComponentOptionsTest(false, false, true, false)
    })

    it('download snapshot, env keys only', () => {
        downloadSnapshotWithComponentOptionsTest(false, false, false, true)
    })

    it('download snapshot package.json', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', instanceSnapshots).as('snapshotData')
        cy.intercept('GET', '/api/*/snapshots/*', instanceSnapshot).as('instanceSnapshot')
        cy.visit(`/team/${team.slug}/instances/${projectId}/version-history/snapshots`)
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
            return cy.readFile(`${downloadsFolder}/package.json`)
        }).then((packageObject) => {
            expect(packageObject).to.have.property('name', 'instance-2')
            expect(packageObject).to.have.property('description')
            expect(packageObject).to.have.property('dependencies')
            expect(packageObject.dependencies).to.have.property('node-red')
            expect(packageObject.dependencies).to.have.property('@flowfuse/nr-project-nodes')
            expect(packageObject.dependencies).to.have.property('@flowfuse/node-red-dashboard')
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
                cy.get('[data-el="empty-state"]').contains('h1', 'Create your First Snapshot')
            } else {
                cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', count - 1)
            }
        })
    })

    it('upload snapshot options and validation work as expected', () => {
        // Premise: the snapshot has components and these can be included or excluded from the download as per users choice
        // Rules:
        // - By default, all components are included
        // - The upload button is enabled, the secret field is visible
        // - excluding flows and/or credentials should hide the secret field
        // - excluding flows component disables the credentials component
        // - Excluding all components should disable the upload & a validation message should appear
        // - Excluding env should disable the radio buttons

        cy.fixture('version-history/snapshots/snapshot-with-credentials.json', null).as('snapshot')
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

        // Upload button should be enabled & secret field should be visible and populated
        cy.get('[data-el="dialog-import-snapshot"] button').contains('Upload').should('not.be.disabled')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('exist')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').invoke('val').should('not.be.empty')

        // check the component options are present & default state
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"]').should('exist')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"]').within(() => {
            cy.get('[data-form="component-flows"]').contains('Flows')
            cy.get('[data-form="component-flows"] input[type="checkbox"]').should('be.checked')

            cy.get('[data-form="component-credentials"]').contains('Credentials')
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('be.checked')
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('not.be.disabled')

            cy.get('[data-form="component-environment-variables"]').contains('Environment Variables')
            cy.get('[data-form="component-environment-variables"] input[type="checkbox"]').should('be.checked')

            cy.get('[data-form="component-environment-variables-options"]').should('exist')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').should('have.length', 2)

            // by default, the first radio button should be checked
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(0).should('not.be.disabled')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(0).contains('Keys and Values')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn span.checkbox').eq(0).should('have.attr', 'checked', 'checked')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).should('not.be.disabled')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).contains('Keys Only')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).contains('Keys Only').should('not.have.attr', 'checked')
        })

        // now, click the `flows` check which should disable the `credentials` field (no flows, no creds!). Also, the secret field should be hidden
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"]').within(() => {
            cy.get('[data-form="component-flows"] .ff-checkbox').click()
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('be.disabled')
        })
        cy.get('[data-form="import-snapshot-secret"]').should('not.exist')

        // now, click the `environment variables`, the `key and values` & `keys only` radio buttons should be disabled
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"]').within(() => {
            cy.get('[data-form="component-environment-variables"] .ff-checkbox').click()
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(0).should('have.attr', 'disabled')
            cy.get('[data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).should('have.attr', 'disabled')
            cy.get('[data-el="form-row-error"]').contains('At least one component must be selected')
        })
        cy.get('[data-el="dialog-import-snapshot"] button').contains('Upload').should('be.disabled')

        // re-check the flows (the validation should clear), then disable credentials, the secret field should not be shown
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"]').within(() => {
            cy.get('[data-form="component-flows"] .ff-checkbox').click()
            cy.get('[data-form="component-credentials"] input[type="checkbox"]').should('not.be.disabled')
            cy.get('[data-form="component-credentials"] .ff-checkbox').click() // exclude credentials
            cy.get('[data-el="form-row-error"]').should('not.exist') // validation message should be gone
            cy.get('[data-form="import-snapshot-secret"]').should('not.exist') // secret field should be hidden
        })
        cy.get('[data-el="dialog-import-snapshot"] button').contains('Upload').should('not.be.disabled') // Upload button should be re-enabled now
    })

    function uploadWithComponentOptionsTest (excludeFlows, excludeCredentials, excludeEnv, envKeysOnly, fixture) {
        const summary = [excludeFlows, excludeCredentials, excludeEnv, envKeysOnly].map((v) => v ? 'exclude' : 'include').join('-')
        const fixtureFilename = fixture.split('/').pop()
        let fixtureHasCredentials = true
        cy.fixture(fixture, 'utf8', { timeout: 5000 }).as('snapshot-' + summary).then((snapshot) => {
            if (!snapshot.flows.credentials || Object.hasOwnProperty.call(snapshot.flows.credentials, '$') === false) {
                fixtureHasCredentials = false
            }
        })
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        // click data-action="import-snapshot" to open the dialog
        cy.get('[data-action="import-snapshot"]').click()

        cy.get('[data-el="dialog-import-snapshot"]').should('be.visible')

        // check the dialog header
        cy.get('[data-el="dialog-import-snapshot"] .ff-dialog-header').contains('Upload Snapshot')

        // upload the snapshot file that has credentials (the credentials secret field be visible since the snapshot has credentials)
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="file"]').selectFile(
            { contents: '@snapshot-' + summary, filename: fixture },
            { force: true } // force because the input is hidden
        )

        // check file field input text is the filename
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="text"]').should('have.value', fixtureFilename)
        // check name field is the name from within the snapshot file
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').should('have.value', fixtureFilename)

        // set a unique name and description
        const time = new Date().toISOString()
        const name = `name @ ${time}`
        const desc = `description @ ${time}`
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').type(name)
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-description"] textarea').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-description"] textarea').type(desc)

        // if the fixture doesnt contain credentials, the secret field should not be visible
        if (fixtureHasCredentials === false) {
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.exist')
        }

        // set the component options
        if (excludeFlows) {
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"] [data-form="component-flows"] .ff-checkbox').click()
        }
        if (fixtureHasCredentials && excludeCredentials === true) {
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"] [data-form="component-credentials"] .ff-checkbox').click()
        }
        if (excludeEnv) {
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"] [data-form="component-environment-variables"] .ff-checkbox').click()
        } else if (envKeysOnly) {
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-components"] [data-form="component-environment-variables-options"] .ff-radio-btn').eq(1).click()
        }
        if (fixtureHasCredentials && excludeFlows === false && excludeCredentials === false) {
            cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').type('correct secret')
        }

        // click import button
        cy.get('[data-el="dialog-import-snapshot"] [data-action="dialog-confirm"]').click()

        cy.wait('@importSnapshot').then(interception => {
            const body = interception.request.body
            should(body.snapshot.name).equal(name)
            should(body.snapshot.description).equal(desc)
            if (fixtureHasCredentials && excludeFlows === false && excludeCredentials === false) {
                should(body.credentialSecret).equal('correct secret')
            }
            should(body.components).have.property('credentials', !excludeCredentials)
            should(body.components).have.property('flows', !excludeFlows)
            should(body.components).have.property('envVars', excludeEnv ? false : (envKeysOnly ? 'keys' : 'all'))
            should(body.snapshot.flows.flows).be.an.Array()
            if (excludeFlows) {
                should(body.snapshot.flows.flows).have.length(0)
            } else {
                should(body.snapshot.flows.flows).have.length(4)
            }
            if (fixtureHasCredentials) {
                should(body.snapshot.flows.credentials).be.an.Object()
                if (excludeFlows || excludeCredentials) {
                    should(body.snapshot.flows.credentials).not.have.property('$')
                } else {
                    should(body.snapshot.flows.credentials).have.property('$')
                }
            }
            should(body.snapshot.settings.env).be.an.Object()
            if (excludeEnv) {
                should(body.snapshot.settings.env).not.have.property('key1')
                should(body.snapshot.settings.env).not.have.property('key2')
            } else if (envKeysOnly) {
                should(body.snapshot.settings.env).have.property('key1', '')
                should(body.snapshot.settings.env).have.property('key2', '')
            } else {
                should(body.snapshot.settings.env).have.property('key1', 'value1')
                should(body.snapshot.settings.env).have.property('key2', 'value2')
            }
        })

        // check the topmost snapshot is the one just uploaded
        cy.get('[data-el="snapshots"] tbody').find('tr').eq(0).contains(name)
        cy.get('[data-el="snapshots"] tbody').find('tr').eq(0).contains(desc)
    }

    it('upload full snapshot, include all', () => {
        uploadWithComponentOptionsTest(false, false, false, false, 'version-history/snapshots/upload1.json')
    })

    it('upload full snapshot, exclude flows', () => {
        uploadWithComponentOptionsTest(true, false, false, false, 'version-history/snapshots/upload2.json')
    })

    it('upload full snapshot, exclude credentials', () => {
        uploadWithComponentOptionsTest(false, true, false, false, 'version-history/snapshots/upload3.json')
    })

    it('upload full snapshot, exclude env', () => {
        uploadWithComponentOptionsTest(false, false, true, false, 'version-history/snapshots/upload4.json')
    })

    it('upload full snapshot, env keys only', () => {
        uploadWithComponentOptionsTest(false, false, false, true, 'version-history/snapshots/upload5.json')
    })

    it('upload snapshot which has no credentials', () => {
        uploadWithComponentOptionsTest(false, null, false, false, 'version-history/snapshots/upload6.json')
    })

    it('Can rollback a snapshot', () => {
        // Premise: Ensure the rollback endpoint is available and callable
        // (NOTE: this is not testing the full mechanics of the rollback feature, only to prevent repeat regression. See #2032)
        cy.intercept('POST', '/api/*/projects/*/actions/rollback').as('rollbackSnapshot')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Rollback Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] .ff-dialog-header').contains('Restore Snapshot')

        // find .ff-btn--danger with text "Confirm" and click it
        cy.get('[data-el="platform-dialog"] .ff-btn--danger').contains('Confirm').click()

        // check body sent to /api/*/projects/*/actions/rollback
        cy.wait('@rollbackSnapshot').then(interception => {
            const body = interception.request.body
            expect(body).to.have.property('snapshot')
            expect(body.snapshot).to.be.a('string')
        })
    })
})

describe('FlowForge shows audit logs', () => {
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
                const project = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/team/${team.slug}/instances/${project.id}/audit-log`)
            })
    }

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        navigateToProject('ATeam', 'instance-1-1')
    })

    it('for when a snapshot is created', () => {
        cy.get('[data-el="accordion"] .ff-audit-entry').contains('Instance Snapshot Created', { includeShadowDom: true, force: true }) // force check to inspect items off screen
    })
    it('for when a snapshot is deleted', () => {
        cy.get('[data-el="accordion"] .ff-audit-entry').contains('Instance Snapshot Deleted', { includeShadowDom: true, force: true }) // force check to inspect items off screen
    })
    it('for when a snapshot is exported', () => {
        cy.get('[data-el="accordion"] .ff-audit-entry').contains('Instance Snapshot Exported', { includeShadowDom: true, force: true }) // force check to inspect items off screen
    })
    it('for when a snapshot is imported', () => {
        cy.get('[data-el="accordion"] .ff-audit-entry').contains('Snapshot Imported', { includeShadowDom: true, force: true }) // force check to inspect items off screen
    })
})

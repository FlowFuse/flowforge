import multipleBlueprints from '../../fixtures/blueprints/multiple-blueprints.json'
import singleBlueprint from '../../fixtures/blueprints/single-blueprint.json'

const canPreviewBlueprintByClickingTheBlueprintTile = () => {
    cy.get('[data-el="flow-view-dialog"].preview-main-blueprint').should('not.be.visible')
    cy.get('[data-action="click-small-blueprint-tile"]').should('exist')
    cy.get('[data-action="click-small-blueprint-tile"]').click()
    cy.get('[data-el="flow-view-dialog"].preview-main-blueprint').should('be.visible')
    cy.get('[data-el="flow-view-dialog"].preview-main-blueprint').within(() => {
        cy.get('[data-action="dialog-confirm"]').click()
    })
}

const canPreviewBlueprintByClickingThePreviewBlueprintButton = () => {
    cy.get('[data-el="flow-view-dialog"].preview-main-blueprint').should('not.be.visible')
    cy.get('[data-action="blueprint-actions"]').should('exist')
    cy.get('[data-action="blueprint-actions"]').contains('Preview Blueprint').click()
    cy.get('[data-el="flow-view-dialog"].preview-main-blueprint').should('be.visible')
    cy.get('[data-el="flow-view-dialog"].preview-main-blueprint').within(() => {
        cy.get('[data-action="dialog-confirm"]').click()
    })
}

describe('FlowForge - Blueprints', () => {
    // Blueprint Details
    const NAME = 'Test Blueprint'
    const CATEGORY = 'Category A'
    const ICON = 'cog'
    const ORDER = 0
    const DESCRIPTION = 'This is a test blueprint'

    const FLOWS = '{ "flows": [] }'
    const MODULES = '{}'

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('should be available in the Admin navigation', () => {
        cy.visit('/admin/overview')
        cy.get('[data-nav="admin-flow-blueprints"]').should('exist')
        cy.get('[data-nav="admin-flow-blueprints"] [data-el="premium-feature"]').should('not.exist')
    })

    it('should not be accessible in OS version', () => {
        cy.visit('/admin/flow-blueprints')
        cy.url().should('include', '/admin/flow-blueprints')
    })

    it('can be created', () => {
        cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')

        cy.visit('/admin/flow-blueprints')

        cy.wait('@getFlowBlueprints').then(({ response }) => {
            const blueprintCount = response.body.blueprints.filter(bl => bl.active).length
            const name = `${NAME} (NEW)`
            cy.get('[data-el="create-blueprint-dialog"]').should('not.be.visible')
            cy.get('[data-action="create-flow-blueprint"]').click()
            cy.get('[data-el="create-blueprint-dialog"]').should('be.visible')

            cy.get('[data-el="create-blueprint-dialog"] [data-form="confirm-dialog"]').should('be.disabled')

            cy.get('[data-el="create-blueprint-dialog"] [data-form="name"] input[type="text"]').type(name)
            cy.get('[data-el="create-blueprint-dialog"] [data-form="default"] label.ff-checkbox').click()
            cy.get('[data-el="create-blueprint-dialog"] [data-form="category"] input[type="text"]').type(CATEGORY)
            cy.get('[data-el="create-blueprint-dialog"] [data-form="icon"] input[type="text"]').type(ICON)
            cy.get('[data-el="create-blueprint-dialog"] [data-form="order"] input[type="number"]').type(ORDER)
            cy.get('[data-el="create-blueprint-dialog"] [data-form="description"] textarea').type(DESCRIPTION)

            cy.get('[data-el="create-blueprint-dialog"] [data-form="flows"] textarea')
                .type(FLOWS, { parseSpecialCharSequences: false })
            cy.get('[data-el="create-blueprint-dialog"] [data-form="modules"] textarea')
                .type(MODULES, { parseSpecialCharSequences: false })

            cy.get('[data-el="create-blueprint-dialog"] [data-form="confirm-dialog"]').should('not.be.disabled')
            cy.get('[data-el="create-blueprint-dialog"] [data-form="confirm-dialog"]').click()

            cy.get('[data-el="create-blueprint-dialog"]').should('not.be.visible')

            // check the blueprint was created
            cy.get('[data-el="blueprints"] [data-el="blueprint-tile"]').its('length').should('eq', blueprintCount + 1)
            cy.get('[data-el="blueprints"] [data-el="blueprint-tile"]').should('contain', name)
            cy.get('[data-el="blueprints"] [data-el="blueprint-tile"]').should('contain', DESCRIPTION)
        })
    })

    it('cannot change Blueprint if only 1 is available be used when creating an Instance', () => {
        cy.intercept('GET', '/api/*/flow-blueprints*', singleBlueprint).as('getFlowBlueprints')
        cy.visit('/team/ateam/instances/create')

        cy.get('[data-form="blueprint"]').should('exist')
        cy.get('[data-form="blueprint"]').contains(singleBlueprint.blueprints[0].name)

        canPreviewBlueprintByClickingTheBlueprintTile()

        cy.get('[data-action="blueprint-actions"]').should('not.exist')

        cy.get('[data-form="project-name"]').should('exist')
        cy.get('[data-form="project-type"]').should('exist')
    })

    it('can change Blueprint if more than 1 are available when creating an Instance', () => {
        cy.intercept('GET', '/api/*/flow-blueprints*', multipleBlueprints).as('getFlowBlueprints')
        cy.visit('/team/ateam/instances/create')

        cy.get('[data-form="blueprint"]').should('exist')
        cy.get('[data-form="blueprint"]').contains(multipleBlueprints.blueprints[0].name)

        canPreviewBlueprintByClickingTheBlueprintTile()
        canPreviewBlueprintByClickingThePreviewBlueprintButton()

        cy.get('[data-action="blueprint-actions"]').should('exist')
        cy.get('[data-action="blueprint-actions"]').contains('Choose a different Blueprint').click()

        // check we have two blueprint groups
        cy.get('[data-form="blueprint-group"]')
            .its('length')
            .should('eq', 2)
        // and one blueprint in the first group, and 2 in the second
        cy.get('[data-form="blueprint-group"]')
            .first()
            .find('[data-el="blueprint-tile"]')
            .its('length')
            .should('eq', 1)

        cy.get('[data-form="blueprint-group"]')
            .eq(1)
            .find('[data-el="blueprint-tile"]')
            .its('length')
            .should('eq', 2)

        // select the second blueprint
        cy.get('[data-form="blueprint-group"]')
            .eq(1)
            .find('[data-el="blueprint-tile"] [data-action="select-blueprint"]')
            .first()
            .click()

        cy.get('[data-el=blueprint-selector-dialog]').within(() => {
            cy.get('[data-action="dialog-confirm"]').click()
        })

        // check our newly selected blueprint is now in the blueprint preview with the CreateInstance form
        cy.get('[data-form="blueprint"]').contains(multipleBlueprints.blueprints[1].name)
    })

    it('are included in the POST request when creating an Instance', () => {
        const INSTANCE_NAME = 'test-instance'
        let defaultBlueprint = null
        cy.intercept('POST', '/api/*/projects', 'success').as('createInstance')
        cy.intercept('GET', '/api/*/flow-blueprints*', singleBlueprint).as('getFlowBlueprints')

        cy.visit('/team/ateam/instances/create')

        cy.wait('@getFlowBlueprints')
            .then(({ response }) => {
                // get default blueprint
                const blueprints = response.body.blueprints
                defaultBlueprint = blueprints.find((blueprint) => blueprint.default) || blueprints[0]

                cy.get('[data-form="blueprint"]').should('exist')
                cy.get('[data-form="blueprint"]').contains(defaultBlueprint.name)

                canPreviewBlueprintByClickingTheBlueprintTile()

                // fill out form

                // select application
                cy.get('[data-form="application-id"]').click()
                cy.get('[data-form="application-id"] .ff-options').should('be.visible')
                cy.get('[data-form="application-id"] .ff-options > .ff-option').first().click()

                // give instance a name
                cy.get('[data-form="project-name"] input').clear()
                cy.get('[data-form="project-name"] input').type(INSTANCE_NAME)

                // select instance type
                cy.get('[data-form="project-type"]').contains('type1').click()

                cy.get('[data-form="project-template"]').should('exist') // template section visible for create

                cy.get('[data-action="create-project"]').should('not.be.disabled').click()

                return cy.wait('@createInstance')
            })
            .then((interception) => {
                const requestBody = interception.request.body
                cy.wrap(requestBody).its('flowBlueprintId').should('eq', defaultBlueprint.id)
            })
    })

    it('can display blueprint flow previews', () => {
        cy.intercept('GET', '/api/*/flow-blueprints*', {
            meta: {},
            ...multipleBlueprints
        }).as('getFlowBlueprints')

        cy.visit('/admin/flow-blueprints')

        cy.wait('@getFlowBlueprints')

        cy.get('[data-el="flow-view-dialog"]').should('not.be.visible')

        cy.get('[data-el="blueprint-tile"]').each(($div) => cy.wrap($div).within(() => {
            cy.get('[data-action="show-blueprint"]').click()
            cy.get('[data-el="flow-view-dialog"]').should('be.visible')
            cy.get('[data-action="dialog-confirm"]').click()
            cy.get('[data-el="flow-view-dialog"]').should('not.be.visible')
        }))
    })

    it('can export blueprints', () => {
        cy.task('clearDownloads')
        cy.visit('/admin/flow-blueprints')

        cy.get('[data-action="export-flow-blueprints"]').click()

        // wait for the file to be downloaded
        cy.wait(250) // eslint-disable-line cypress/no-unnecessary-waiting

        // generate the expected snapshot filename structure
        cy.task('fileExists', {
            dir: Cypress.config('downloadsFolder'),
            fileRE: /blueprints_export_*/
        })
    })

    it('can import blueprints from a file', () => {
        cy.visit('/admin/flow-blueprints')

        cy.get('[data-action="import-flow-blueprints"]').click()

        cy.get('[data-action="dialog-confirm"]').should('be.disabled')

        // uploading file containing invalid JSON
        cy.get('[data-action="upload"]').click()
        cy.get('[data-el="upload-input"]', { force: true }).selectFile({
            contents: Cypress.Buffer.from('invalid-JSON'),
            fileName: 'file.txt',
            lastModified: Date.now()
        }, { force: true })

        cy.get('[data-el="input-textarea"]').should('be.disabled')
        cy.get('[data-el="form-row-error"]').should('contain', 'Invalid JSON')
        cy.get('[data-action="dialog-confirm"').should('be.disabled')

        cy.get('[data-action="clear-file"]').click()

        cy.get('[data-el="form-row-error"]').should('not.exist')
        cy.get('[data-action="dialog-confirm"').should('be.disabled')
        cy.get('[data-el="input-textarea"]').should('not.be.disabled')

        // uploading file containing valid JSON, but not valid blueprint
        cy.get('[data-action="upload"]').click()
        cy.get('[data-el="upload-input"]', { force: true }).selectFile({
            contents: Cypress.Buffer.from('{}'),
            fileName: 'file.txt',
            lastModified: Date.now()
        }, { force: true })
        cy.get('[data-el="form-row-error"]').should('not.exist')

        cy.get('[data-el="input-textarea"]').should('be.disabled')
        cy.get('[data-action="dialog-confirm"]').should('not.be.disabled')
        cy.get('[data-action="dialog-confirm"').should('not.be.disabled')

        // uploading file containing valid Blueprint JSON
        cy.get('[data-action="clear-file"]').click()
        cy.get('[data-el="upload-input"]', { force: true }).selectFile({
            contents: Cypress.Buffer.from(JSON.stringify([{ ...singleBlueprint.blueprints, name: 'IMPORTED BLUEPRINT' }])),
            fileName: 'file.txt',
            lastModified: Date.now()
        }, { force: true })
        cy.get('[data-el="form-row-error"]').should('not.exist')
        cy.get('[data-el="input-textarea"]').should('be.disabled')
        cy.get('[data-dialog="import-flow-blueprints"]').within(() => {
            cy.get('[data-action="dialog-confirm"]').click()
        })

        cy.contains('Blueprints successfully imported!')
        cy.get('[data-el="blueprints"]').contains('IMPORTED BLUEPRINT')
    })

    it('can import copied blueprints', () => {
        cy.visit('/admin/flow-blueprints')

        cy.get('[data-action="import-flow-blueprints"]').click()

        cy.get('[data-action="dialog-confirm"]').should('be.disabled')

        cy.get('[data-el="input-textarea"]').type('invalid-json')
        cy.get('[data-el="form-row-error"]').should('contain', 'Invalid JSON')
        cy.get('[data-action="upload"]').should('be.disabled')
        cy.get('[data-action="dialog-confirm"').should('be.disabled')

        cy.get('[data-action="clear-input"]').click()
        cy.get('[data-el="form-row-error"]').should('not.exist')
        cy.get('[data-action="upload"]').should('not.be.disabled')
        cy.get('[data-action="dialog-confirm"').should('be.disabled')

        cy.get('[data-el="input-textarea"]').type('{}')
        cy.get('[data-el="form-row-error"]').should('not.exist')
        cy.get('[data-action="upload"]').should('be.disabled')
        cy.get('[data-action="dialog-confirm"').should('not.be.disabled')

        cy.get('[data-action="clear-input"]').click()
        cy.get('[data-el="input-textarea"]')
            .invoke('val', JSON.stringify([{ ...singleBlueprint.blueprints, name: 'ANOTHER IMPORTED BLUEPRINT' }]))
            .trigger('input')

        cy.get('[data-dialog="import-flow-blueprints"]').within(() => {
            cy.get('[data-action="dialog-confirm"]').click()
        })

        cy.contains('Blueprints successfully imported!')
        cy.get('[data-el="blueprints"]').contains('ANOTHER IMPORTED BLUEPRINT')
    })
})

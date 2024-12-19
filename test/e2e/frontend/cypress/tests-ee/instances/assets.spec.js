function interceptTeamFeature () {
    cy.intercept('GET', '/api/*/teams/slug/*', (req) => req.reply(res => {
        res.body = {
            ...res.body,
            ...{
                type: {
                    properties: {
                        features: { staticAssets: true }
                    }
                }
            }
        }
        return res
    }))
        .as('getTeam')
}

function interceptInstanceMeta (body = {}) {
    cy.intercept('GET', '/api/*/projects/*', (req) => req.reply(res => {
        // this.instance?.meta?.versions?.launcher
        res.body = {
            ...res.body,
            ...{
                meta: {
                    versions: {
                        launcher: '2.8.0'
                    }
                }
            },
            ...body
        }
        return res
    })).as('getInstanceStatus')
}

function interceptFiles (files = [], directory = '', count = 0, meta = {}) {
    cy.intercept('GET', '/api/*/projects/*/files/_/', ({
        meta,
        files,
        count
    })).as('getFiles')
}

describe('FlowForge - Instance - Assets', () => {
    function navigateToProject (teamName, projectName, tab = 'overview') {
        let team
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
                cy.visit(`/team/${team.slug}/instances/${instance.id}/${tab}`)
                cy.wait('@getUser')
            })
    }

    beforeEach(() => {
        // we're intercepting the user call to be sure the page has loaded
        cy.intercept('GET', '/api/*/teams/*/user')
            .as('getUser')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('displays the assets tab and menu but in a disabled state alongside the team upgrade banner', () => {
        navigateToProject('BTeam', 'instance-2-1')

        cy.get('[data-nav="instance-assets"]').should('be.visible')
        cy.get('[data-nav="instance-assets"]').click()

        cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('be.visible')
        cy.get('[data-el="page-banner-feature-unavailable-to-team"]')
            .contains('This feature is not available for your current Team. Please upgrade your Team in order to use it.')

        cy.get('[data-form="search"] input').should('be.visible')
        cy.get('[data-form="search"] input').should('be.disabled')

        cy.get('[data-action="refresh-items"]').should('be.visible')
        cy.get('[data-action="refresh-items"]').should('be.disabled')

        cy.get('[data-action="add-folder"]').should('be.visible')
        cy.get('[data-action="add-folder"]').should('be.disabled')

        cy.get('[data-action="upload-file"]').should('be.visible')
        cy.get('[data-action="upload-file"]').should('be.disabled')
    })

    it('shows a disabled state alongside the incompatible nr launcher version banner', () => {
        interceptTeamFeature()

        navigateToProject('BTeam', 'instance-2-1', 'assets')

        cy.wait('@getTeam')

        cy.get('[data-el="page-banner-feature-unavailable"]').should('be.visible')
        cy.get('[data-el="page-banner-feature-unavailable"]')
            .contains('You are using an incompatible Launcher Version. You need to upgrade to => 2.8.0 in order to use this feature..')

        cy.get('[data-form="search"] input').should('be.visible')
        cy.get('[data-form="search"] input').should('be.disabled')

        cy.get('[data-action="refresh-items"]').should('be.visible')
        cy.get('[data-action="refresh-items"]').should('be.disabled')

        cy.get('[data-action="add-folder"]').should('be.visible')
        cy.get('[data-action="add-folder"]').should('be.disabled')

        cy.get('[data-action="upload-file"]').should('be.visible')
        cy.get('[data-action="upload-file"]').should('be.disabled')
    })

    it('can display an enabled file browser', () => {
        interceptTeamFeature()
        interceptInstanceMeta()
        interceptFiles()

        navigateToProject('BTeam', 'instance-2-1', 'assets')

        cy.wait('@getTeam')
        cy.wait('@getInstanceStatus')

        cy.get('[data-el="page-banner-feature-unavailable"]').should('not.exist')

        cy.get('[data-form="search"] input').should('be.visible')
        cy.get('[data-form="search"] input').should('not.be.disabled')

        cy.get('[data-action="refresh-items"]').should('be.visible')
        cy.get('[data-action="refresh-items"]').should('not.be.disabled')

        cy.get('[data-action="add-folder"]').should('be.visible')
        cy.get('[data-action="add-folder"]').should('not.be.disabled')

        cy.get('[data-action="upload-file"]').should('be.visible')
        cy.get('[data-action="upload-file"]').should('not.be.disabled')
    })

    describe('can manipulate an instances assets', () => {
        beforeEach(() => {
            interceptTeamFeature()
            interceptInstanceMeta()

            navigateToProject('BTeam', 'instance-2-1', 'assets')
        })

        it('can upload a file', () => {
            interceptFiles()
            cy.wait('@getFiles')

            cy.get('[data-el="upload-file-dialog"]').should('not.be.visible')

            cy.get('[data-action="upload-file"]').click()

            cy.get('[data-el="upload-file-dialog"]').should('be.visible')

            cy.get('[data-el="upload-input"]').as('fileInput')
            cy.fixture('files/rick.png').as('file')
            cy.get('@fileInput').selectFile({ contents: '@file' }, { force: true }) // force because the input is hidden

            cy.intercept('POST', '/api/*/projects/*/files/_/*', '').as('uploadFile')
            interceptFiles(
                [
                    { name: 'rick.png', lastModified: new Date(), type: 'file', size: 131088 }
                ],
                '',
                1
            )
            cy.get('[data-el="upload-file-dialog"] [data-action="dialog-confirm"]').click()
            cy.wait('@uploadFile')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"]').contains('rick.png')
        })

        it('can delete a file', () => {
            interceptFiles(
                [
                    { name: 'rick.png', lastModified: new Date(), type: 'file', size: 131088 }
                ],
                '',
                1
            )
            cy.wait('@getFiles')

            cy.get('[data-el="platform-dialog"]').should('not.be.visible')

            cy.intercept('DELETE', '/api/*/projects/*/files/_/*', '').as('deleteFile')

            cy.get('[data-el="files-table"]').within(() => {
                cy.get('[data-el="kebab-menu"]').as('kebabMenu')
                cy.get('@kebabMenu').click()
                cy.get('@kebabMenu').within(() => {
                    cy.get('[data-action="delete-file"]').click()
                })
            })

            interceptFiles([], '', 0, {})

            cy.get('[data-el="platform-dialog"]').should('be.visible')
            cy.get('[data-el="platform-dialog"]').within(() => {
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@deleteFile')
            cy.wait('@getFiles')
        })

        it('can create a folder', () => {
            interceptFiles()
            cy.wait('@getFiles')

            cy.get('[data-el="new-folder-dialog"]').should('not.be.visible')

            cy.get('[data-action="add-folder"]').click()

            cy.get('[data-el="new-folder-dialog"]').should('be.visible')

            cy.intercept('POST', '/api/*/projects/*/files/_/', { path: 'hello world' }).as('createFolder')
            interceptFiles([{ name: 'hello world', type: 'directory', lastModified: new Date() }])

            cy.get('[data-el="new-folder-dialog"] input').type('Hello Folder!')
            cy.get('[data-el="new-folder-dialog"] [data-action="dialog-confirm"]').click()

            cy.intercept('@createFolder')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"]').contains('hello world')
        })

        it('can delete a folder', () => {
            interceptFiles([{ name: 'hello world', type: 'directory', lastModified: new Date() }])
            cy.wait('@getFiles')

            cy.get('[data-el="platform-dialog"]').should('not.be.visible')

            cy.intercept('DELETE', '/api/*/projects/*/files/_/*', '').as('deleteFolder')

            cy.get('[data-el="files-table"]').within(() => {
                cy.get('[data-el="kebab-menu"]').as('kebabMenu')
                cy.get('@kebabMenu').click()
                cy.get('@kebabMenu').within(() => {
                    cy.get('[data-action="delete-folder"]').click()
                })
            })
            interceptFiles([], '', 0, {})

            cy.get('[data-el="platform-dialog"]').should('be.visible')
            cy.get('[data-el="platform-dialog"]').within(() => {
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@deleteFolder')
            cy.wait('@getFiles')
        })

        it('can edit a folder', () => {
            interceptFiles([{ name: 'hello world', type: 'directory', lastModified: new Date() }])
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"]').within(() => {
                cy.get('[data-el="kebab-menu"]').as('kebabMenu')
                cy.get('@kebabMenu').click()
                cy.get('@kebabMenu').within(() => {
                    cy.get('[data-action="edit-folder"]').click()
                })
            })

            cy.intercept('PUT', '/api/*/projects/*/files/_/*', 'hello world updated').as('updateFolder')
            interceptFiles([{ name: 'hello world updated', type: 'directory', lastModified: new Date() }])

            cy.get('[data-el="edit-folder-dialog"]').should('be.visible')
            cy.get('[data-el="edit-folder-dialog"] input').should('have.value', 'hello world')
            cy.get('[data-el="edit-folder-dialog"] input').type(' updated')
            cy.get('[data-el="edit-folder-dialog"]').within(() => {
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@updateFolder')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"]').contains('hello world updated')
        })

        it('can refresh the assets list', () => {
            interceptFiles([{ name: 'hello world', type: 'directory', lastModified: new Date() }])
            cy.wait('@getFiles')

            cy.get('[data-action="refresh-items"]').click()

            cy.wait('@getFiles')
        })

        it('can search through the assets list', () => {
            interceptFiles([
                { name: 'hello world', type: 'directory', lastModified: new Date() },
                { name: 'important.json', type: 'file', lastModified: new Date() },
                { name: 'rick.png', type: 'file', lastModified: new Date() },
                { name: 'calls.csv', type: 'file', lastModified: new Date() }
            ])
            cy.wait('@getFiles')

            cy.get('[data-form="search"] input').as('searchInput')

            cy.get('[data-el="files-table"] table tbody tr').should('have.length', 4)

            cy.get('@searchInput').type('rick')
            cy.get('[data-el="files-table"] table tbody tr').should('have.length', 1)
            cy.get('[data-el="files-table"] table tbody tr').contains('rick.png')

            cy.get('@searchInput').clear()

            cy.get('@searchInput').type('ll')
            cy.get('[data-el="files-table"] table tbody tr').should('have.length', 2)
            cy.get('[data-el="files-table"] table tbody tr').contains('calls.csv')
            cy.get('[data-el="files-table"] table tbody tr').contains('hello world')
        })

        it('can navigate through the folder structure', () => {
            interceptFiles([
                { name: 'hello_world', type: 'directory', lastModified: new Date() }
            ])
            cy.wait('@getFiles')

            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"]').contains('Storage')

            cy.get('[data-el="files-table"] table tbody tr').contains('hello_world').click()
            cy.wait('@getNestedFiles')

            cy.get('[data-el="files-table"] table tbody').contains('No files in \'hello_world\'')

            cy.get('[data-el="folder-breadcrumbs"]').contains('hello_world')

            cy.get('[data-action="navigate-back"]').click()

            cy.get('[data-el="folder-breadcrumbs"]').should('not.contain', 'hello_world')

            cy.get('[data-el="files-table"] table tbody').contains('hello_world')
        })
    })

    describe('the Folder Breadcrumbs', () => {
        beforeEach(() => {
            interceptTeamFeature()
            interceptInstanceMeta()

            navigateToProject('BTeam', 'instance-2-1', 'assets')
        })

        it('displays a disabled visibility selector on the default root folder and correct folder path', () => {
            interceptFiles([
                { name: 'hello_world', type: 'directory', lastModified: new Date() }
            ])
            cy.wait('@getFiles')

            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]').should('have.attr', 'data-headlessui-state', 'disabled')
            cy.get('[data-el="folder-breadcrumbs"]').contains('Storage')
            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(4) .path').should('be.empty')
        })

        it('displays an enabled visibility selector on nested folders and correct folder path', () => {
            interceptFiles([
                { name: 'hello_world', type: 'directory', lastModified: new Date() }
            ])
            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')
            cy.wait('@getFiles')

            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]').should('have.attr', 'data-headlessui-state', 'disabled')

            cy.get('[data-el="folder-breadcrumbs"]').contains('Storage')
            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(4) .path').should('be.empty')

            cy.get('[data-el="files-table"] table tbody tr').contains('hello_world').click()
            cy.wait('@getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"] .ff-options')
                .should('be.visible')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(2)').contains('hello_world')
            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(4)').contains('hello_world/')
            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(5)').contains('Not Available')
        })

        it('prevents users to set private visibility when the folder is private', () => {
            const spy = cy.spy().as('updateVisibilityCall')
            cy.intercept('PUT', '/api/*/projects/*/files/_/hello_world', spy)
            interceptFiles([
                { name: 'hello_world', type: 'directory', lastModified: new Date() }
            ])
            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"] table tbody tr').contains('hello_world').click()
            cy.wait('@getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"] .ff-options')
                .should('be.visible')
                .within(() => {
                    cy.get('[data-action="select-private"]').click()
                    cy.get('@updateVisibilityCall').should('not.have.been.called')
                })
        })

        it('allows users to set private visibility when the folder is public', () => {
            const spy = cy.spy().as('updateVisibilityCall')
            cy.intercept('PUT', '/api/*/projects/*/files/_/hello_world', spy)
            interceptFiles([
                {
                    name: 'hello_world',
                    type: 'directory',
                    lastModified: new Date(),
                    share: {
                        root: 'hello_public'
                    }
                }
            ])
            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"] table tbody tr').contains('hello_world').click()
            cy.wait('@getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"] .ff-options')
                .should('be.visible')
                .within(() => {
                    cy.get('[data-action="select-private"]').click()
                    cy.get('@updateVisibilityCall').should('have.been.called', 1)
                })
        })

        it('allows users to set public visibility when the directory is private', () => {
            cy.intercept('PUT', '/api/*/projects/*/files/_/hello_world', { }).as('updateVisibility')
            interceptFiles([
                {
                    name: 'hello_world',
                    type: 'directory',
                    lastModified: new Date()
                }
            ])
            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"] table tbody tr').contains('hello_world').click()
            cy.wait('@getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"] .ff-options')
                .should('be.visible')
                .within(() => {
                    cy.get('[data-action="select-public"]').click()
                })

            cy.get('[data-el="select-static-path-dialog"]')
                .should('be.visible')
            cy.get('[data-el="select-static-path-dialog"] input').type('public_path')
            cy.get('[data-el="select-static-path-dialog"]').within(() => {
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@updateVisibility')
            cy.get('[data-el="notification-alert"]').should('be.visible')
            cy.get('[data-el="notification-alert"]').contains('Instance settings successfully updated. Restart the instance to apply the changes.')
        })

        it('allows users to set public visibility when the directory is public', () => {
            cy.intercept('PUT', '/api/*/projects/*/files/_/hello_world', { }).as('updateVisibility')
            interceptFiles([
                {
                    name: 'hello_world',
                    type: 'directory',
                    lastModified: new Date(),
                    share: {
                        root: 'public-path'
                    }
                }
            ])
            cy.intercept('GET', '/api/*/projects/*/files/_/hello_world', ({
                meta: { },
                files: [],
                count: 0
            })).as('getNestedFiles')
            cy.wait('@getFiles')

            cy.get('[data-el="files-table"] table tbody tr').contains('hello_world').click()
            cy.wait('@getNestedFiles')

            cy.get('[data-el="folder-breadcrumbs"]').contains('public-path/')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]')
                .click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"] .ff-options')
                .should('be.visible')
                .within(() => {
                    cy.get('[data-action="select-public"]').click()
                })

            cy.get('[data-el="select-static-path-dialog"]')
                .should('be.visible')
            cy.get('[data-el="select-static-path-dialog"] input').type('public_path')
            cy.get('[data-el="select-static-path-dialog"]').within(() => {
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@updateVisibility')
            cy.get('[data-el="notification-alert"]').should('be.visible')
            cy.get('[data-el="notification-alert"]').contains('Instance settings successfully updated. Restart the instance to apply the changes.')
        })

        it('is disabled when the instance state is not running', () => {
            interceptInstanceMeta({ meta: { state: 'suspended' } })

            cy.get('[data-el="status-badge-suspended"]').should('exist')
            cy.get('[data-el="files-table"]').contains('The instance must be running to access its assets.')

            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]').click()
            cy.get('[data-el="folder-breadcrumbs"] [data-el="visibility-selector"]').should('have.attr', 'data-headlessui-state', 'disabled')

            // checking folder path
            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(4)').contains('Not Available')

            // checking Base URL
            cy.get('[data-el="folder-breadcrumbs"] [data-el="ff-data-cell"]:nth-child(5)').contains('Not Available')
        })
    })
})

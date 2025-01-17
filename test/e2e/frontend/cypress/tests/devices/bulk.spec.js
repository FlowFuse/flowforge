/* eslint-disable cypress/require-data-selectors */
/// <reference types="cypress" />

// NOTE: The tests in this file can only be run once per test run because the
// devices are defined in the backend and are not reset between tests
const deviceName1 = 'team2-unassigned-device-bulk-test-1'
const deviceName2 = 'assigned-device-d-bulk-test-2'
const deviceName3 = 'application-device-c-bulk-test-3'

describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    describe('bulk operations', () => {
        describe('move', () => {
            it('should enable/disable actions dropdown based on selection', () => {
                // ensure "select all" checkbox is unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure all devices are unselected
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
                })
                // ensure the actions dropdown is disabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('be.disabled')

                // select a single device
                cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                // ensure "select all" checkbox is still unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure the actions dropdown is enabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
            })

            moveTo('application')
            moveTo('instance')
            moveTo('unassigned')

            /**
             * Moves devices ending in "bulk-test-#" (where # is 1 ~ 3) to the specified kind (application, instance, unassigned)
             */
            function moveTo (kind) {
                let options = {
                    moveTo: 'application-2',
                    menuToOpen: 'menu-move to application',
                    dialog: 'assign-device-to-application-dialog',
                    dialogText1: 'The following devices will be affected by this operation:',
                    dialogText2: 'Select the Node-RED application you want to move the devices to'
                }
                if (kind === 'instance') {
                    options = {
                        moveTo: 'instance-2-1',
                        menuToOpen: 'menu-move to instance',
                        dialog: 'assign-device-to-instance-dialog',
                        dialogText1: 'The following devices will be affected by this operation:',
                        dialogText2: 'Select the Node-RED instance you want to move the devices to'
                    }
                } else if (kind === 'unassigned') {
                    options = {
                        moveTo: 'Unassigned',
                        menuToOpen: 'menu-unassign',
                        dialog: 'team-bulk-device-unassign-dialog',
                        dialogText1: 'The following devices will be removed from their current assignment:',
                        dialogText2: 'This will stop the flows running on the devices.'
                    }
                }

                it(`should move selected devices to ${kind}`, () => {
                    // intercept the devices API call and store the response data
                    cy.intercept('/api/*/teams/*/devices*').as('getDevices')
                    // refresh the page to ensure the devices are loaded
                    cy.visit('/team/bteam/devices')
                    cy.reload()
                    cy.wait(['@getDevices'])

                    // wait for the table items to be updated
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName1).should('exist')
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName2).should('exist')
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName3).should('exist')

                    // click the 3 devices checkboxes
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName1).parent().parent().find('.checkbox').click()
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName2).parent().parent().find('.checkbox').click()
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName3).parent().parent().find('.checkbox').click()

                    // ensure 3 devices are selected
                    cy.get('[data-el="devices-browser"] tbody tr input[type="checkbox"]:checked').should('have.length', 3)

                    // ensure the action dropdown is now enabled
                    cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
                    cy.get('[data-el="bulk-actions-dropdown"] button').click()

                    // ensure the menu contains the "Move to application", "Move to instance" and "Unassign" options
                    cy.get('[data-action="menu-move to application"]').should('be.visible')
                    cy.get('[data-action="menu-move to instance"]').should('be.visible')
                    cy.get('[data-action="menu-unassign"]').should('be.visible')

                    // click the "Move to _kind_" button
                    cy.get(`[data-action="${options.menuToOpen}"]`).click()

                    // ensure the dialog is visible and has the correct number of devices listed
                    cy.get(`[data-el="${options.dialog}"]`).should('be.visible')
                    cy.get(`[data-el="${options.dialog}"]`).within(() => {
                        // has correct text
                        cy.get('p').contains(options.dialogText1)
                        cy.get('p').contains(options.dialogText2)

                        // has 3 devices
                        cy.get('ul li').should('have.length', 3)
                        cy.get('ul li').contains(deviceName1)
                        cy.get('ul li').contains(deviceName2)
                        cy.get('ul li').contains(deviceName3)

                        if (kind === 'application' || kind === 'instance') {
                            // select 'application-2'
                            cy.get('[data-form="application"] .ff-listbox').should('be.visible')
                            cy.get('[data-form="application"]').within(() => {
                                // eslint-disable-next-line cypress/require-data-selectors
                                cy.get('.ff-listbox').should('not.be.disabled')
                                cy.get('.ff-listbox').click()
                                // eslint-disable-next-line cypress/require-data-selectors
                                cy.get('.ff-options > .ff-option').contains('application-2').click()
                            })
                            if (kind === 'instance') {
                                // Select 'instance-2-1'
                                cy.get('[data-form="instance"] .ff-listbox').should('be.visible')
                                cy.get('[data-form="instance"]').within(() => {
                                    cy.get('.ff-listbox').should('not.be.disabled')
                                    cy.get('.ff-listbox').click()
                                    // eslint-disable-next-line cypress/require-data-selectors
                                    cy.get('.ff-options > .ff-option').contains('instance-2-1').click()
                                })
                            }
                        }
                        // click the button
                        cy.get('[data-action="dialog-confirm"]').click()

                        // wait for dialog to close: should no longer be in the DOM
                        cy.get(`[data-el="${options.dialog}"]`).should('not.exist')
                    })

                    // check the table columns for the moved devices
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName1).parent().parent().find('td').eq(5).contains(options.moveTo)
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName2).parent().parent().find('td').eq(5).contains(options.moveTo)
                    cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName3).parent().parent().find('td').eq(5).contains(options.moveTo)
                })
            }
        })

        // NOTE: The delete tests are last because they delete the temporary "bulk-test-#" devices that are used in the other tests above
        describe('delete', () => {
            it('should enable/disable bulk delete', () => {
                // ensure "select all" checkbox is unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure all devices are unselected
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
                })
                // ensure the actions dropdown is disabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('be.disabled')

                // select a single device
                cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                // ensure "select all" checkbox is still unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure the actions dropdown is enabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
            })

            it('should display list of devices to delete', () => {
                // intercept the devices API call and store the response data
                cy.intercept('/api/*/teams/*/devices*').as('getDevices')
                // refresh the page to ensure the devices are loaded
                cy.visit('/team/bteam/devices')
                cy.reload()

                // wait for the devices API call to complete
                cy.wait(['@getDevices'])

                // wait for the table items to be present - this is necessary because the table is loaded asynchronously
                // get the count of rows in the table
                cy.get('[data-el="devices-browser"] tbody tr').its('length').should('be.gte', 3)

                // select a single device
                cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                // click the menu then click the "Delete" button
                cy.get('[data-el="bulk-actions-dropdown"] button').click()
                cy.get('[data-action="menu-delete"]').click()

                // ensure the dialog is visible
                cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                // ensure the dialog has the correct header
                cy.get('[data-el="team-bulk-device-delete-dialog"] .ff-dialog-header').contains('Confirm Device Delete')
                // ensure the dialog has the correct text
                cy.get('[data-el="team-bulk-device-delete-dialog"] p').contains('The following device will be deleted:')
                // ensure the dialog has the correct number of devices
                cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').should('have.length', 1)

                // click the "Cancel" button
                cy.get('[data-el="team-bulk-device-delete-dialog"] button').contains('Cancel').click()
                cy.get('[data-el="team-bulk-device-delete-dialog"]').should('not.be.visible')

                // select all devices
                cy.get('[data-el="devices-browser"] thead .checkbox').click()

                // ensure all devices are selected
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    cy.wrap($tr).find('input[type="checkbox"]').should('be.checked')
                })
                // cy.get('[data-el="devices-browser"] tbody tr input[type="checkbox"]:checked').should('have.length', devices.length)

                // ensure the delete button is now enabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
                cy.get('[data-el="bulk-actions-dropdown"] button').click()
                cy.get('[data-action="menu-delete"]').click()

                // ensure the dialog is visible and each device in the table is listed in the dialog
                cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    // get device name from the row, column(1) > div(1) > span(0)
                    const deviceName = $tr.find('td').eq(1).find('div').eq(1).find('span').eq(0).text()
                    let deviceId = $tr.find('td').eq(1).find('div').eq(1).find('span').eq(1).text()
                    deviceId = deviceId.replace('id: ', '').trim()
                    cy.log(deviceId)
                    cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').contains(deviceName)
                    cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').contains(deviceId)
                })
            })

            it('should delete selected devices', () => {
                // intercept the devices API call and store the response data
                cy.intercept('/api/*/teams/*/devices*').as('getDevices')
                // refresh the page to ensure the devices are loaded
                cy.visit('/team/bteam/devices')
                cy.reload()
                cy.wait(['@getDevices'])

                // wait for the table items to be updated
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName1).should('exist')
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName2).should('exist')
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName3).should('exist')

                // click the 3 devices checkboxes
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName1).parent().parent().find('.checkbox').click()
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName2).parent().parent().find('.checkbox').click()
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName3).parent().parent().find('.checkbox').click()

                // ensure 3 devices are selected
                cy.get('[data-el="devices-browser"] tbody tr input[type="checkbox"]:checked').should('have.length', 3)

                // click the menu then click the "Delete" button
                cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
                cy.get('[data-el="bulk-actions-dropdown"] button').click()
                cy.get('[data-action="menu-delete"]').should('be.visible')
                cy.get('[data-action="menu-delete"]').click()

                // click the dialog "Confirm" button
                cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                cy.get('[data-el="team-bulk-device-delete-dialog"] button').contains('Confirm').click()

                // wait for the devices API call to complete
                cy.wait(['@getDevices'])

                // cy.get('[data-el="devices-browser"] tbody tr') should not contain the device1, device2, device3
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName1).should('not.exist')
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName2).should('not.exist')
                cy.get('[data-el="devices-browser"] tbody tr').contains(deviceName3).should('not.exist')

                // ensure all rows are unselected
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
                })
            })
        })
    })
})

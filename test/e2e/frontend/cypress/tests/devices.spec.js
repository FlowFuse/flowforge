import deviceOffline from '../fixtures/device-offline.json'
import deviceRunning from '../fixtures/device-running.json'

describe('FlowForge - Team Devices', () => {
    describe('team with no devices', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/devices').as('getDevices')
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    const team = response.body.teams[0]
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevices')
                })
        })

        it('shows a placeholder message when no devices have been created', () => {
            cy.get('main').contains('Connect your First Remote Instance')
        })

        it('provides functionality to register a device', () => {
            cy.intercept('POST', '/api/*/devices').as('registerDevice')

            cy.get('button[data-action="register-device"]').click()

            cy.get('.ff-dialog-box').should('be.visible')
            cy.get('.ff-dialog-header').contains('Add Remote Instance')
            // disabled primary button by default
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').contains('Add').should('be.disabled')

            cy.get('[data-form="device-name"] input[type="text"]').type('device1')
            // inserting device name is enough to enable button
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').should('not.be.disabled')
            cy.get('[data-form="device-type"] input[type="text"]').type('typeA')

            // click "Register"
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').contains('Add').click()

            cy.wait('@registerDevice')

            // show user the device config
            cy.get('.ff-dialog-box').should('be.visible')
            cy.get('.ff-dialog-header').contains('Device Agent Configuration')

            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 1)
            cy.get('[data-el="devices-browser"] tbody').find('tr').contains('device1')
        })

        it('can delete a device', () => {
            cy.intercept('DELETE', '/api/*/devices/*').as('deleteDevice')

            // click kebab menu in row 1
            cy.get('[data-el="devices-browser"] tbody').find('.ff-kebab-menu').eq(0).click()
            // click the 4th option (Delete Device)
            cy.get('[data-el="devices-browser"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').contains('Delete Device').click()

            cy.get('.ff-dialog-box').should('be.visible')
            cy.get('.ff-dialog-header').contains('Delete Device')

            // Click "Delete"
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').contains('Delete').click()

            cy.wait('@deleteDevice')

            cy.get('main').contains('Connect your First Remote Instance')
        })

        it('can load multiple pages of devices when the API paginates', function () {
            // Mock active and inactive stacks having multiple pages
            cy.intercept('GET', '/api/v1/teams/*/devices*', {
                count: 2,
                meta: { next_cursor: 'next' },
                devices: [deviceOffline]
            }).as('getDevicesPaginated')

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    const team = response.body.teams[0]
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevicesPaginated')
                })

            // Load more active
            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 1)

            cy.intercept('GET', '/api/v1/teams/*/devices?cursor=next', {
                count: 2,
                meta: { next_cursor: null },
                devices: [{ ...deviceOffline, ...{ id: 2, name: 'device-2' } }]
            }).as('getDevicesNextPage')

            cy.get('[data-action="load-more"]').click()

            cy.wait('@getDevicesNextPage')

            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 2)
            cy.get('[data-el="devices-browser"] tbody').contains('td', 'device-2')

            cy.get('[data-action="load-more"]').should('not.exist')
        })
    })

    describe('team with devices', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/devices').as('getDevices')
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.request('GET', '/api/v1/user/teams')
                .then((response) => {
                    const team = response.body.teams.find((team) => team.name === 'BTeam')
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevices')
                })
        })

        describe('with a single page (client side filtering)', () => {
            it('can filter the device browser by "last seen" values', () => {
            // ensure we have something "last seen" in the past 1.5 mins
                deviceRunning.lastSeenAt = (new Date()).toISOString()
                cy.intercept('GET', '/api/v1/teams/*/devices*', {
                    count: 2,
                    meta: {},
                    devices: [deviceOffline, deviceRunning]
                }).as('getDevicesNextPage')

                cy.visit('/team/bteam/devices')
                cy.contains('device-1')
                cy.contains('device-2')

                // apply filter
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--never').click()
                cy.contains('device-1')
                cy.contains('device-2').should('not.exist')

                // select different filter value
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1').should('not.exist')
                cy.contains('device-2')

                // reverse the filter
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1')
                cy.contains('device-2')
            })

            it('can filter the device browser by "status" values', () => {
            // ensure we have something "last seen" in the past 1.5 mins
                deviceRunning.lastSeenAt = (new Date()).toISOString()
                cy.intercept('GET', '/api/v1/teams/*/devices*', {
                    count: 2,
                    meta: {},
                    devices: [deviceOffline, deviceRunning]
                }).as('getDevicesNextPage')

                cy.visit('/team/bteam/devices')
                cy.contains('device-1')
                cy.contains('device-2')

                // apply filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--offline').click()
                cy.contains('device-1')
                cy.contains('device-2').should('not.exist')

                // select different filter value
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1').should('not.exist')
                cy.contains('device-2')

                // reverse the filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1')
                cy.contains('device-2')
            })
        })

        describe('with a multiple pages page (server side filtering)', () => {
            it('can filter the device browser by "last seen" values', () => {
                const secondOfflineDevice = { ...deviceOffline, name: 'device-3', id: 3 }

                deviceRunning.lastSeenAt = (new Date()).toISOString()
                cy.intercept('GET', '/api/v1/teams/*/devices', {
                    count: 3,
                    meta: { next_cursor: 'next' },
                    devices: [deviceOffline, deviceRunning]
                }).as('getDevicesWithTwoPages')

                cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                    count: 3,
                    devices: [deviceOffline, deviceRunning, secondOfflineDevice]
                }).as('getDeviceStatus')

                cy.visit('/team/bteam/devices')
                cy.wait('@getDevicesWithTwoPages')
                cy.contains('device-1') // offline
                cy.contains('device-2') // online

                cy.intercept('GET', '/api/v1/teams/*/devices?filters=lastseen%3Anever', {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceOffline, secondOfflineDevice]
                }).as('getDevicesFiltered')

                // apply filter
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--never').click()
                cy.wait('@getDevicesFiltered')
                cy.contains('device-1') // offline
                cy.contains('device-2').should('not.exist') // online
                cy.contains('device-3') // offline

                cy.intercept('GET', '/api/v1/teams/*/devices?filters=lastseen%3Arunning', {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceRunning]
                }).as('getDevicesFiltered')

                // select different filter value
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1').should('not.exist') // offline
                cy.contains('device-2') // online
                cy.contains('device-3').should('not.exist') // offline

                // remove the filter
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.wait('@getDevicesWithTwoPages')
                cy.contains('device-1') // offline
                cy.contains('device-2') // online
                cy.contains('device-3').should('not.exist') // not on first page
            })

            it('can filter the device browser by "status" values', () => {
                const secondOfflineDevice = { ...deviceOffline, name: 'device-3', id: '3' }
                cy.intercept('GET', '/api/v1/teams/*/devices', {
                    count: 3,
                    meta: { next_cursor: 'next' },
                    devices: [deviceOffline, deviceRunning]
                }).as('getDevicesWithTwoPages')

                cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                    count: 3,
                    devices: [deviceOffline, deviceRunning, secondOfflineDevice]
                }).as('getDeviceStatus')

                cy.visit('/team/bteam/devices')
                cy.wait('@getDevicesWithTwoPages')
                cy.contains('device-1') // offline
                cy.contains('device-2') // running

                cy.intercept('GET', '/api/v1/teams/*/devices?filters=status%3Aoffline', {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceOffline, secondOfflineDevice]
                }).as('getDevicesFiltered')

                // apply filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--offline').click()
                cy.wait('@getDevicesFiltered')
                cy.contains('device-1') // offline
                cy.contains('device-2').should('not.exist') // running
                cy.contains('device-3') // offline

                cy.intercept('GET', '/api/v1/teams/*/devices?filters=status%3Arunning', {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceRunning]
                }).as('getDevicesFiltered')

                // select different filter value
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1').should('not.exist') // offline
                cy.contains('device-2') // running
                cy.contains('device-3').should('not.exist') // offline

                // remove the filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1') // offline
                cy.contains('device-2') // running
                cy.contains('device-3').should('not.exist') // back to first page only
            })
        })

        it('can assign and unassign devices to instances', () => {
            let selectedInstance

            cy.intercept('PUT', '/api/v1/devices/*').as('updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.get('.ff-kebab-menu').click()
                    cy.get('.ff-kebab-menu .ff-kebab-options').find('[data-action="device-assign-to-instance"]').click()
                })
            })

            // Dialog
            cy.get('[data-el="assign-device-to-instance-dialog"]')
                .should('be.visible')

            cy.get('[data-el="assign-device-to-instance-dialog"]')
                .within(() => {
                    // Application dropdown
                    cy.get('[data-form="application"]').within(() => {
                        cy.get('[data-el="dropdown"]').should('not.be.disabled')
                        cy.get('.ff-listbox').click()

                        // Click first Application
                        cy.get('.ff-options > .ff-option:first').click()
                    })

                    // Instance dropdown
                    cy.get('[data-form="instance"]').within(() => {
                        cy.get('.ff-listbox').should('not.be.disabled')
                        cy.get('.ff-listbox').click()

                        // Grab name of first instance
                        cy.get('.ff-options').should('be.visible')
                        cy.get('.ff-options > .ff-option:first').invoke('text').then((text) => {
                            selectedInstance = text
                        })

                        // Click first instance
                        cy.get('.ff-options > .ff-option:first').click()
                    })

                    cy.get('.ff-btn--primary').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.contains(selectedInstance)

                    cy.get('.ff-kebab-menu').click()
                    cy.get('.ff-kebab-menu .ff-kebab-options').find('[data-action="device-remove-from-instance"]').click()
                })
            })

            // Remove dialog
            cy.get('[data-el="platform-dialog"]')
                .should('be.visible')

            cy.get('[data-el="platform-dialog"]')
                .within(() => {
                    cy.get('.ff-btn--danger').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').should('not.have.text', selectedInstance)
            })

            // Option to re-assign is still available
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.get('.ff-kebab-menu').click()
                    cy.get('.ff-kebab-menu .ff-kebab-options').find('[data-action="device-assign-to-instance"]')
                })
            })
        })

        it('can assign and unassign devices to application', () => {
            let selectedApplication

            cy.intercept('PUT', '/api/v1/devices/*').as('updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.get('.ff-kebab-menu').click()
                    cy.get('.ff-kebab-menu .ff-kebab-options').find('[data-action="device-assign-to-application"]').click()
                })
            })

            // Dialog
            cy.get('[data-el="assign-device-to-application-dialog"]')
                .should('be.visible')

            cy.get('[data-el="assign-device-to-application-dialog"]')
                .within(() => {
                    // Instance dropdown
                    cy.get('[data-form="application"]').within(() => {
                        cy.get('.ff-listbox').should('not.be.disabled')
                        cy.get('.ff-listbox').click()

                        // Grab name of first application
                        cy.get('.ff-options').should('be.visible')
                        cy.get('.ff-options > .ff-option:first').invoke('text').then((text) => {
                            selectedApplication = text
                        })
                        cy.get('.ff-options > .ff-option:first').click()
                    })
                    // chose the first application by clicking the primary button within the dialog
                    cy.get('.ff-btn--primary').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.contains(selectedApplication)

                    cy.get('.ff-kebab-menu').click()
                    cy.get('.ff-kebab-menu .ff-kebab-options').find('[data-action="device-remove-from-application"]').click()
                })
            })

            // Remove dialog
            cy.get('[data-el="platform-dialog"]')
                .should('be.visible')

            cy.get('[data-el="platform-dialog"]')
                .within(() => {
                    cy.get('.ff-btn--danger').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').should('not.have.text', selectedApplication)
            })

            // Option to re-assign is still available
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.get('.ff-kebab-menu').click()
                    cy.get('.ff-kebab-menu .ff-kebab-options').find('[data-action="device-assign-to-application"]')
                })
            })
        })
    })
})

describe('FlowForge stores device audit logs', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('when a device is registered', () => {
        cy.get('.ff-audit-entry').contains('New Device Created')
    })

    it('when a device is deleted', () => {
        cy.get('.ff-audit-entry').contains('Device Deleted')
    })
})

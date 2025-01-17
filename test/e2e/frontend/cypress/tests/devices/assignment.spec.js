describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('should inform users if it is assigned to an Instance', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-el="device-assigned-instance"]').should('exist')
    })

    it('should inform users if it is assigned to an Application', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="device-assigned-application"]').should('exist')
    })

    it('should inform users if they are not assigned to an instance or Application', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
    })

    it('should provide an option to "Assign" their device if unassigned', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').should('exist')
    })

    it('should provide an option to "Assign" their device if unassigned', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').should('exist')
    })
})

describe('FlowForge - Team - Devices - Create', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('creates the Device unassigned', () => {
        const deviceName = 'new-device-unassigned--' + Date.now()
        cy.intercept('GET', '/api/v1/teams/*/devices*').as('getDevices')
        cy.intercept('GET', '/api/v1/teams/*/applications*').as('getApplications')

        cy.wait(['@getDevices', '@getApplications'])

        cy.get('[data-action="register-device"]').click()

        // ensure team-device-create-dialog is visible
        cy.get('[data-el="team-device-create-dialog"]').should('be.visible')
        cy.get('[data-el="team-device-create-dialog"]').within(() => {
            // enter a name for the device
            cy.get('[data-form="device-name"] input').click()
            cy.get('[data-form="device-name"] input').type(deviceName)

            // ensure the application selector is visible (dont select anything)
            cy.get('[data-form="application"]').should('be.visible')

            // click the "Add" button
            cy.get('[data-action="dialog-confirm"]').click()
        })

        // check the dialog has closed
        cy.get('[data-el="platform-dialog"]').should('not.be.visible')

        // check the device is in the list
        cy.wait('@getDevices').then(() => {
            // check the table (last row) has the device name (2nd td)
            cy.get('[data-el="devices-browser"] tbody tr:last-child td:nth-child(2)').contains(deviceName)
            // 2nd last column is the application name - should be unassigned
            cy.get('[data-el="devices-browser"] tbody tr:last-child td:nth-last-child(2)').contains('Unassigned')
        })
    })

    it('creates and assigns the Device to the selected Application', () => {
        const deviceName = 'new-device-assigned--' + Date.now()
        cy.intercept('GET', '/api/v1/teams/*/devices*').as('getDevices')
        cy.intercept('GET', '/api/v1/teams/*/applications*').as('getApplications')

        cy.wait(['@getDevices', '@getApplications'])

        cy.get('[data-action="register-device"]').click()

        // ensure team-device-create-dialog is visible
        cy.get('[data-el="team-device-create-dialog"]').should('be.visible')
        cy.get('[data-el="team-device-create-dialog"]').within(() => {
            // enter a name for the device
            cy.get('[data-form="device-name"] input').click()
            cy.get('[data-form="device-name"] input').type(deviceName)

            // ensure the application selector is visible
            cy.get('[data-form="application"]').should('be.visible')

            cy.get('[data-form="application"]').within(() => {
                // eslint-disable-next-line cypress/require-data-selectors
                cy.get('.ff-listbox').should('not.be.disabled')
                cy.get('.ff-listbox').click()

                // Click item with label 'application-2'
                // eslint-disable-next-line cypress/require-data-selectors
                cy.get('.ff-options > .ff-option').contains('application-2').click()
            })

            // click the "Add" button
            cy.get('[data-action="dialog-confirm"]').click()
        })

        // check the dialog has closed
        cy.get('[data-el="platform-dialog"]').should('not.be.visible')

        // check the device is in the list and is assigned to the application
        cy.wait('@getDevices').then(() => {
            // check the table (last row) has the device name (2nd td)
            cy.get('[data-el="devices-browser"] tbody tr:last-child td:nth-child(2)').contains(deviceName)
            // 2nd last column is the application name
            cy.get('[data-el="devices-browser"] tbody tr:last-child td:nth-last-child(2)').contains('application-2')
        })
    })
})

describe('FlowForge - Application - Devices - Create', () => {
    function navigateToApplicationDevices (teamName, appName) {
        let team
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                const application = response.body.applications.find(
                    (application) => application.name === appName
                )
                cy.visit(`/team/${team.slug}/applications/${application.id}/devices`)
                cy.wait(['@getApplicationDevices'])
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/v1/applications/*/devices').as('getApplicationDevices')
        cy.login('bob', 'bbPassword')
    })

    it('creates the Device and assigned it to the current application', () => {
        navigateToApplicationDevices('BTeam', 'application-2')
        const deviceName = 'new-device-auto-assigned--' + Date.now()
        cy.get('[data-action="register-device"]').click()

        // ensure team-device-create-dialog is visible
        cy.get('[data-el="team-device-create-dialog"]').should('be.visible')
        cy.get('[data-el="team-device-create-dialog"]').within(() => {
            // enter a name for the device
            cy.get('[data-form="device-name"] input').click()
            cy.get('[data-form="device-name"] input').type(deviceName)

            // ensure the application selector does NOT exist in the dialog
            // (app choice should not be rendered because we are doing this from the app-devices page)
            cy.get('[data-form="application"]').should('not.exist')

            // click the "Add" button
            cy.get('[data-action="dialog-confirm"]').click()
        })

        // check the dialog has closed
        cy.get('[data-el="platform-dialog"]').should('not.be.visible')

        // check the device is in the list
        // check the table has a row with the device name and that is is unassigned
        cy.get('[data-el="devices-browser"] tbody tr td').contains(deviceName)
    })

    it('application assigned Device has palette settings', () => {
        navigateToApplicationDevices('BTeam', 'application-2')
        cy.get('[data-el="devices-browser"] tbody tr:last-child td a').click()
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-el="section-side-menu"] li [data-nav="palette"]').should('exist')
        cy.get('[data-nav="palette"]').click()
    })
})

describe('FlowForge - Devices - Assign', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('provides an option to the user to choose an Instance or Application', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').click()
        cy.get('[data-el="assignment-dialog"]').click()
    })

    it('successfully assigns the Device to an Instance when that selection is made', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').click()

        // check the dialog is open
        cy.get('[data-el="assignment-dialog"]').should('be.visible')
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').should('be.disabled')
        // Choose "Instance"
        cy.get('[data-form="assign-to-instance"]').click()
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').click()

        // check the dialog has closed
        cy.get('[data-el="assignment-dialog"]').should('not.be.visible')
        cy.get('[data-el="assignment-dialog-instance"]').should('be.visible')

        cy.get('[data-el="assignment-dialog-instance"] [data-form="application"] .ff-listbox').click()
        cy.get('[data-el="assignment-dialog-instance"] [data-form="application"] .ff-options > .ff-option').eq(0).click()

        cy.get('[data-el="assignment-dialog-instance"] [data-form="instance"] .ff-listbox').click()
        cy.get('[data-el="assignment-dialog-instance"] [data-form="instance"] .ff-options > .ff-option').eq(0).click()

        cy.get('[data-el="assignment-dialog-instance"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-instance"]').should('exist')
        })
    })

    it('provides an unassign option for the Device assigned to an Instance in the Device Settings', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-instance"]').should('exist')

        // Go to "Settings"
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-action="unassign-device"]').click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-instance"]').should('not.exist')
            cy.get('[data-el="device-assigned-none"]').should('exist')
        })
    })

    it('successfully assigns the Device to an Application when that selection is made', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').click()

        // check the dialog is open
        cy.get('[data-el="assignment-dialog"]').should('be.visible')
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').should('be.disabled')
        // Choose "Application"
        cy.get('[data-form="assign-to-application"]').click()
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').click()

        // check the dialog has closed
        cy.get('[data-el="assignment-dialog"]').should('not.be.visible')
        cy.get('[data-el="assignment-dialog-application"]').should('be.visible')

        cy.get('[data-el="assignment-dialog-application"] [data-form="application"] .ff-listbox').click()
        cy.get('[data-el="assignment-dialog-application"] [data-form="application"] .ff-options > .ff-option').eq(0).click()

        cy.get('[data-el="assignment-dialog-application"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-application"]').should('exist')
        })
    })

    it('provides an unassign option for the Device assigned to an Application in the Device Settings', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-application"]').should('exist')

        // Go to "Settings"
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-action="unassign-device"]').click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-application"]').should('not.exist')
            cy.get('[data-el="device-assigned-none"]').should('exist')
        })
    })
})

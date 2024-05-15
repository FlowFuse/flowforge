/// <reference types="cypress" />

import deviceSnapshots from '../../fixtures/snapshots/device-snapshots.json'
import deviceFullSnapshot from '../../fixtures/snapshots/device2-full-snapshot1.json'

const IDX_VIEW_SNAPSHOT = 0
// const IDX_DELETE_SNAPSHOT = 1

describe('FlowForge - Devices - With Billing', () => {
    beforeEach(() => {
        cy.enableBilling()
        cy.intercept('/api/*/settings', (req) => {
            req.reply((response) => {
                // ensure we keep billing enabled
                response.body.features.billing = true
                // fake MQTT connection
                response.body.features.deviceEditor = true
                return response
            })
        }).as('getSettings')

        cy.login('bob', 'bbPassword')

        cy.visit('/team/bteam/devices')
    })

    it('doesn\'t show a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-nav="device-snapshots"]').should('not.exist')
    })

    it('shows a "Snapshots" tab for unassigned devices', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="device-snapshots"]').should('exist')
    })

    it('empty state informs users they need to bind the Device to an Application for unassigned devices on the "Snapshot" tab', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.contains('A device must first be assigned to an Application')
    })

    it('shows a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').should('exist')
    })

    it('empty state informs users they need to be in Developer Mode for Devices assigned to an Application on the "Snapshot" tab', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.contains('A device must be in developer mode and online to create a snapshot.')
    })

    it('doesn\'t show any "Premium Feature Only" guidance if billing is enabled', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.get('[data-el="page-banner-feature-unavailable"]').should('not.exist')
    })

    it('shows only Snapshots for this device by default', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.get('[data-el="empty-state"]').should('exist')
    })

    it('allows for users to view all Snapshots for this Device from it\'s parent Application', () => {
        let snapshots = 3

        cy.intercept('/api/*/applications/*/snapshots', (req) => {
            req.reply((response) => {
                snapshots = response.body.count
                return response
            })
        }).as('getDeviceSnapshots')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

        cy.get('[data-form="device-only-snapshots"]').click()

        cy.wait('@getDeviceSnapshots').then(() => {
            cy.get('[data-el="empty-state"]').should('not.exist')
            cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', snapshots)
        })
    })

    it('provides functionality to view a snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', deviceSnapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-header').contains(deviceFullSnapshot.name)
        // check an SVG in present the content section
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-content svg').should('exist')
    })
})

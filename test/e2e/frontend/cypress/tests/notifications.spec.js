const aliceInviteToATeam = require('../fixtures/notifications/alice-invites-to-ateam.json')
const announcement = require('../fixtures/notifications/announcement.json')
const bobInviteToATeam = require('../fixtures/notifications/bob-invites-to-bteam.json')
const eddyAcceptedInvite = require('../fixtures/notifications/eddy-accepted-invite-to-ateam.json')
const instanceCrash = require('../fixtures/notifications/instance-crashed.json')

describe('FlowForge - Notifications', () => {
    describe('Team Invitations', () => {
        describe('appear as notification messages', () => {
            it('to users that have no team memberships', () => {
                cy.login('dave', 'ddPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 2,
                    notifications: [
                        {
                            ...aliceInviteToATeam,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                        },
                        {
                            ...bobInviteToATeam,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                        }
                    ]
                }).as('getNotifications')

                cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

                cy.intercept('/api/*/admin/stats').as('getAdminStats')
                cy.intercept('/api/*/admin/license').as('getAdminLicense')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getNotifications')

                cy.get('[data-el="right-drawer"]').should('not.be.visible')

                cy.get('[data-el="desktop-nav-right"]').within(() => {
                    cy.get('[data-el="notifications-button"]')
                        .should('exist')
                        .contains(2)

                    cy.get('[data-el="notifications-button"]').click()
                })

                cy.get('[data-el="right-drawer"]').should('be.visible')

                cy.get('[data-el="right-drawer"]').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 2)
                    cy.get('[data-el="invitation-message"]').contains('Team Invitation')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by "alice" to join "ATeam".')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by "bob" to join "BTeam".')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()
                    cy.wait('@markInvitationRead')
                    cy.url().should('include', 'account/teams/invitations')
                })

                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(1)
            })

            it('to users that are part of teams', () => {
                cy.login('bob', 'bbPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 1,
                    notifications: [
                        {
                            id: '1',
                            type: 'team-invite',
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            read: false,
                            data: {
                                invite: {
                                    id: 'abcd1'
                                },
                                team: {
                                    id: 'gY9GQjDb2k',
                                    name: 'Alice\'s team'
                                },
                                invitor: {
                                    username: 'alice'
                                },
                                role: 30
                            }
                        }
                    ]
                }).as('getNotifications')

                cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getNotifications')

                cy.get('[data-el="right-drawer"]').should('not.be.visible')

                cy.get('[data-el="desktop-nav-right"]').within(() => {
                    cy.get('[data-el="notifications-button"]')
                        .should('exist')
                        .contains(1)

                    cy.get('[data-el="notifications-button"]').click()
                })

                cy.get('[data-el="right-drawer"]').should('be.visible')

                cy.get('[data-el="right-drawer"]').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 1)
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by "alice" to join "Alice\'s team".')
                    cy.get('[data-el="invitation-message"]').contains('1 hour ago')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()

                    cy.wait('@markInvitationRead')

                    cy.url().should('include', 'account/teams/invitations')
                })
                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(1).should('not.exist')
            })

            it('shows a user accepted invitation notification', () => {
                cy.login('alice', 'aaPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 2,
                    notifications: [
                        {
                            ...eddyAcceptedInvite,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                        }
                    ]
                }).as('getNotifications')

                cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

                cy.intercept('/api/*/admin/stats').as('getAdminStats')
                cy.intercept('/api/*/admin/license').as('getAdminLicense')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getNotifications')

                cy.get('[data-el="desktop-nav-right"]').within(() => {
                    cy.get('[data-el="notifications-button"]')
                        .should('exist')
                        .contains(1)

                    cy.get('[data-el="notifications-button"]').click()
                })

                cy.get('[data-el="right-drawer"]').should('be.visible')

                cy.get('[data-el="right-drawer"]').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 1)

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation: Accepted')
                    cy.get('[data-el="invitation-message"]').contains('"eddy" has accepted your invitation to join "Alice\'s Team" as a "dashboard".')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()
                    cy.wait('@markInvitationRead')
                    cy.url().should('include', '/members/general')
                })
            })
        })
    })

    describe('Instance Crashes', () => {
        it('appear as notification messages', () => {
            cy.login('alice', 'aaPassword')

            cy.intercept('/api/*/user').as('getUser')
            cy.intercept('/api/*/settings').as('getSettings')
            cy.intercept('/api/*/user/teams').as('getTeams')
            cy.intercept('/api/*/user/notifications', {
                meta: {},
                count: 1,
                notifications: [
                    {
                        ...instanceCrash,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                    }
                ]
            }).as('getNotifications')

            cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

            cy.intercept('/api/*/admin/stats').as('getAdminStats')
            cy.intercept('/api/*/admin/license').as('getAdminLicense')

            cy.visit('/')

            cy.wait('@getUser')
            cy.wait('@getSettings')
            cy.wait('@getTeams')
            cy.wait('@getNotifications')

            cy.get('[data-el="desktop-nav-right"]').within(() => {
                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(2)

                cy.get('[data-el="notifications-button"]').click()
            })

            cy.get('[data-el="right-drawer"]').should('be.visible')

            cy.get('[data-el="right-drawer"]').within(() => {
                cy.get('[data-el="notifications-drawer"]')

                cy.get('[data-el="generic-notification"]').should('have.length', 1)

                cy.get('[data-el="generic-notification"]').contains('Node-RED Instance Crashed')
                cy.get('[data-el="generic-notification"]').contains('"instance-1-1" has crashed')

                cy.get('[data-el="generic-notification"]').contains('Node-RED Instance Crashed').click()
                cy.wait('@markInvitationRead')
                cy.url().should('match', /instances\/.*\/overview/)
            })
        })
    })

    describe('Platform Announcements', () => {
        it('appear as notification messages', () => {
            cy.login('alice', 'aaPassword')

            cy.intercept('/api/*/user').as('getUser')
            cy.intercept('/api/*/settings').as('getSettings')
            cy.intercept('/api/*/user/teams').as('getTeams')
            cy.intercept('/api/*/user/notifications', {
                meta: {},
                count: 1,
                notifications: [
                    {
                        ...announcement,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                    }
                ]
            }).as('getNotifications')

            cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

            cy.intercept('/api/*/admin/stats').as('getAdminStats')
            cy.intercept('/api/*/admin/license').as('getAdminLicense')

            cy.visit('/')

            cy.wait('@getUser')
            cy.wait('@getSettings')
            cy.wait('@getTeams')
            cy.wait('@getNotifications')

            cy.get('[data-el="desktop-nav-right"]').within(() => {
                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(1)

                cy.get('[data-el="notifications-button"]').click()
            })

            cy.get('[data-el="right-drawer"]').should('be.visible')

            cy.get('[data-el="right-drawer"]').within(() => {
                cy.get('[data-el="notifications-drawer"]')

                cy.get('[data-el="generic-notification"]').should('have.length', 1)

                cy.get('[data-el="generic-notification"]').contains('Platform Wide Notification')
                cy.get('[data-el="generic-notification"]').contains('Hello, I\'m your friendly neighborhood platform wide notification.')

                cy.get('[data-el="generic-notification"]').contains('Platform Wide Notification').click()
                cy.wait('@markInvitationRead')
                cy.url().should('match', /applications\/application-id\/instances/i)
            })
        })
    })

    describe('Can preform bulk actions', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')

            cy.intercept('/api/*/user').as('getUser')
            cy.intercept('/api/*/settings').as('getSettings')
            cy.intercept('/api/*/user/teams').as('getTeams')

            cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

            cy.intercept('/api/*/admin/stats').as('getAdminStats')
            cy.intercept('/api/*/admin/license').as('getAdminLicense')

            cy.visit('/')
        })

        it('has all of the action buttons disabled when no notifications are present', () => {
            cy.intercept('/api/*/user/notifications', {
                meta: {},
                count: 0,
                notifications: []
            }).as('getNotifications')

            cy.wait('@getUser')
            cy.wait('@getSettings')
            cy.wait('@getTeams')
            cy.wait('@getNotifications')

            cy.get('[data-el="desktop-nav-right"]').within(() => {
                cy.get('[data-el="notifications-button"]').click()
            })

            cy.get('[data-el="right-drawer"]').should('be.visible')

            cy.get('[data-el="notifications-drawer"]').within(() => {
                cy.get('[data-action="select-all"]').should('have.class', 'disabled')
                cy.get('[data-action="deselect-all"]').should('have.class', 'disabled')
                cy.get('[data-action="mark-as-read"]').should('have.class', 'disabled')
                cy.get('[data-action="mark-as-unread"]').should('have.class', 'disabled')
            })
        })

        it('can select and deselect notifications', () => {
            cy.intercept('/api/*/user/notifications', {
                meta: {},
                count: 4,
                notifications: [
                    {
                        ...aliceInviteToATeam,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                    },
                    {
                        ...bobInviteToATeam,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                    },
                    {
                        ...eddyAcceptedInvite,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                        read: true
                    },
                    {
                        ...instanceCrash,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                    }
                ]
            }).as('getNotifications')

            cy.wait('@getUser')
            cy.wait('@getSettings')
            cy.wait('@getTeams')
            cy.wait('@getNotifications')

            cy.get('[data-el="desktop-nav-right"]').within(() => {
                cy.get('[data-el="notifications-button"]').click()
            })

            cy.get('[data-el="right-drawer"]').should('be.visible')

            cy.get('[data-el="notifications-drawer"]').within(() => {
                // has 4 notifications available, should be able to select all but not deselect or mark as read/unread
                cy.get('[data-action="select-all"]').should('not.have.class', 'disabled')
                cy.get('[data-action="deselect-all"]').should('have.class', 'disabled')
                cy.get('[data-action="mark-as-read"]').should('have.class', 'disabled')
                cy.get('[data-action="mark-as-unread"]').should('have.class', 'disabled')

                // select one read notification
                //      select all should be enabled because we have other notifications that can be selected
                //      deselect should be enabled
                //      mark as read should be enabled
                //      mark as unread should be disabled
                //      notification should have class selected?
                cy.get('[data-el="messages-wrapper"] [data-el="message"]').should('have.length', 3)
                cy.get('[data-el="messages-wrapper"] [data-el="message"]:first-of-type [data-action="select-notification"]')
                    .click()
                cy.get('[data-action="select-all"]').should('not.have.class', 'disabled')
                cy.get('[data-action="deselect-all"]').should('not.have.class', 'disabled')
                cy.get('[data-action="mark-as-read"]').should('not.have.class', 'disabled')
                cy.get('[data-action="mark-as-unread"]').should('have.class', 'disabled')
                cy.get('[data-el="messages-wrapper"] [data-el="message"] .selected').should('have.length', 1)

                // clicking select all will select all notifications
                cy.get('[data-action="select-all"]').click()
                cy.get('[data-action="select-all"]').should('have.class', 'disabled')
                cy.get('[data-action="deselect-all"]').should('not.have.class', 'disabled')
                cy.get('[data-el="messages-wrapper"] [data-el="message"] .selected').should('have.length', 3)

                // clicking deselect all will select all notifications
                cy.get('[data-action="deselect-all"]').click()
                cy.get('[data-action="deselect-all"]').should('have.class', 'disabled')
                cy.get('[data-action="select-all"]').should('not.have.class', 'disabled')
                cy.get('[data-el="messages-wrapper"] [data-el="message"] .selected').should('have.length', 0)

                // selecting all and showing read notifications allows you to select more
                cy.get('[data-action="select-all"]').click()
                cy.get('[data-action="select-all"]').should('have.class', 'disabled')
                cy.get('[data-action="deselect-all"]').should('not.have.class', 'disabled')
                cy.get('[data-el="messages-wrapper"] [data-el="message"] .selected').should('have.length', 3)
                cy.get('[data-action="mark-as-read"]').should('not.have.class', 'disabled')
                cy.get('[data-action="mark-as-unread"]').should('have.class', 'disabled')
                cy.get('[data-action="show-read-check"]').click()
                cy.get('[data-action="select-all"]').should('not.have.class', 'disabled')

                // selecting unread notifications will enable the mark as unread button
                cy.get('[data-action="select-all"]').click()
                cy.get('[data-action="select-all"]').should('have.class', 'disabled')
                cy.get('[data-action="mark-as-unread"]').should('not.have.class', 'disabled')

                // marking notifications as read will preform an api call and refresh the notifications list
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 4,
                    notifications: [
                        {
                            ...aliceInviteToATeam,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            read: true
                        },
                        {
                            ...bobInviteToATeam,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            read: true
                        },
                        {
                            ...eddyAcceptedInvite,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            read: true
                        },
                        {
                            ...instanceCrash,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            read: true
                        }
                    ]
                }).as('getNotifications')
                cy.get('[data-action="mark-as-read"]').click()

                // selecting only read notifications will enable the mark as unread button and keep the mark as read button disabled
                cy.get('[data-action="select-all"]').click()
                cy.get('[data-action="select-all"]').should('have.class', 'disabled')
                cy.get('[data-action="mark-as-unread"]').should('not.have.class', 'disabled')
                cy.get('[data-action="mark-as-read"]').should('have.class', 'disabled')
            })
        })
    })
})

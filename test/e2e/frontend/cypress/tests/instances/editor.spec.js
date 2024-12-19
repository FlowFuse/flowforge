describe('FlowForge - Instance editor', () => {
    let team
    function navigateToInstance (teamName, instanceName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === instanceName
                )
                cy.visit(`/team/${team.slug}/instances/${instance.id}/`)
            })
    }

    it('Preserves the initial behavior if uses an unsupported launcher version', () => {
        cy.intercept(
            'GET',
            '/api/*/projects/*',
            (req) => req.reply(res => {
                res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.0' } } } }
                return res
            })).as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()

        navigateToInstance('ATeam', 'instance-1-1')

        cy.wait('@getProjects')

        cy.get('[data-action="open-editor"]')
            .children()
            .should('exist')
    })

    it('Alters the open-editor button and opens the immersive editor when the launcher supports it', () => {
        cy.intercept(
            'GET',
            '/api/*/projects/*',
            (req) => req.reply(res => {
                res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.6.0', 'node-red': '4.0.2' } } } }
                return res
            })).as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()

        navigateToInstance('ATeam', 'instance-1-1')

        cy.wait('@getProjects')

        cy.get('[data-action="open-editor"]')
            .children()
            .should('exist')

        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen')
        })

        cy.get('[data-action="open-editor"]').click()

        cy.get('@windowOpen').should('be.calledWithMatch', /\/instance\/.*\/editor/)
    })

    it('has working drawer navigation tabs', () => {
        cy.intercept(
            'GET',
            '/api/*/projects/*',
            (req) => req.reply(res => {
                res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.1' } } } }
                return res
            })).as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()

        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === 'ATeam'
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === 'instance-1-1'
                )
                cy.visit(`/team/${team.slug}/instances/${instance.id}/editor`)
            })

        cy.get('[data-el="editor-iframe"]')
            .should('exist')

        cy.get('[data-el="tabs-drawer"]').as('tabs-wrapper').should('exist')
        cy.get('@tabs-wrapper').contains('Info')
        cy.get('@tabs-wrapper').contains('Recent Activity')
        cy.get('@tabs-wrapper').contains('Specs')

        cy.get('[data-nav="instance-remote"]').as('remote-tab').should('exist')
        cy.get('@remote-tab').click()
        cy.get('@tabs-wrapper').contains('Devices')
        cy.get('@tabs-wrapper').contains('A list of all edge devices registered to this instance.')

        cy.get('[data-nav="instance-version-history"]').as('snapshots-tab').should('exist')
        cy.get('@snapshots-tab').click()
        cy.url().should('match', /^.*\/instances\/.*\/version-history\/snapshots/) // defaults to snapshots if no feature/team enabled

        cy.get('[data-nav="instance-activity"]').as('activity-tab').should('exist')
        cy.get('@activity-tab').click()
        cy.get('@tabs-wrapper').contains('Audit Log')
        cy.get('@tabs-wrapper').contains('Filters')
        cy.get('@tabs-wrapper').contains('Event Type')
        cy.get('@tabs-wrapper').contains('User')

        cy.get('[data-nav="instance-logs"]').as('logs-tab').should('exist')
        cy.get('@logs-tab').click()
        cy.get('@tabs-wrapper').contains('Node-RED Logs')
        cy.get('@tabs-wrapper').contains('Fake Log Entry')

        cy.get('[data-nav="instance-settings"]').as('settings-tab').should('exist')
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('@tabs-wrapper').contains('Settings')
        cy.get('@tabs-wrapper').contains('General')
        cy.get('@tabs-wrapper').contains('Environment')
        cy.get('@tabs-wrapper').contains('Editor')
        cy.get('@tabs-wrapper').contains('Security')
        cy.get('@tabs-wrapper').contains('Palette')

        cy.get('[data-nav="instance-overview"]').click()
        cy.get('@tabs-wrapper').contains('Info')
        cy.get('@tabs-wrapper').contains('Recent Activity')
        cy.get('@tabs-wrapper').contains('Specs')

        cy.get('@tabs-wrapper').get('.logo').click()
        cy.get('[data-el="page-name"]').contains('instance-1-1')
    })

    describe('The Immersive editor', () => {
        it('doesn\'t display the dashboard button if there isn\'t a configured dashboard', () => {
            cy.intercept(
                'GET',
                '/api/*/projects/*',
                (req) => req.reply(res => {
                    res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.1' } } } }
                    return res
                })).as('getProjects')

            cy.login('bob', 'bbPassword')
            cy.home()

            cy.request('GET', '/api/v1/user/teams')
                .then((response) => {
                    team = response.body.teams.find(
                        (team) => team.name === 'ATeam'
                    )
                    return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
                })
                .then((response) => {
                    const instance = response.body.projects.find(
                        (project) => project.name === 'instance-1-1'
                    )
                    cy.visit(`/team/${team.slug}/instances/${instance.id}/editor`)
                })

            cy.get('[data-el="tabs-drawer"]').within(() => {
                cy.get('[data-action="open-dashboard"]').should('not.exist')
            })
        })

        it('displays the dashboard button if there\'s a configured dashboard available', () => {
            cy.intercept(
                'GET',
                '/api/*/projects/*',
                (req) => req.reply(res => {
                    res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.1' } }, settings: { dashboard2UI: '/dashboard' } } }
                    return res
                })).as('getProjects')

            cy.login('bob', 'bbPassword')
            cy.home()

            cy.request('GET', '/api/v1/user/teams')
                .then((response) => {
                    team = response.body.teams.find(
                        (team) => team.name === 'ATeam'
                    )
                    return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
                })
                .then((response) => {
                    const instance = response.body.projects.find(
                        (project) => project.name === 'instance-1-1'
                    )
                    cy.visit(`/team/${team.slug}/instances/${instance.id}/editor`)
                })

            cy.get('[data-el="tabs-drawer"]').within(() => {
                cy.get('[data-action="open-dashboard"]').should('exist')
            })
        })

        it('displays a disabled dashboard button if there\'s a configured dashboard available but the instance is unavailable', () => {
            cy.intercept(
                'GET',
                '/api/*/projects/*',
                (req) => req.reply(res => {
                    res.body = {
                        ...res.body,
                        ...{
                            meta: {
                                versions: { launcher: '2.3.1' },
                                state: 'suspended'
                            },
                            settings: { dashboard2UI: '/dashboard' }
                        }
                    }
                    return res
                })).as('getProjects')

            cy.login('bob', 'bbPassword')
            cy.home()

            cy.request('GET', '/api/v1/user/teams')
                .then((response) => {
                    team = response.body.teams.find(
                        (team) => team.name === 'ATeam'
                    )
                    return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
                })
                .then((response) => {
                    const instance = response.body.projects.find(
                        (project) => project.name === 'instance-1-1'
                    )
                    cy.visit(`/team/${team.slug}/instances/${instance.id}/editor`)
                })

            cy.get('[data-el="tabs-drawer"]').within(() => {
                // cy.get('[data-action="open-dashboard"]').should('exist').should('be.disabled')
                // anchors with disabled attribute fail the above assertion! so we need to check the attribute directly
                cy.get('[data-action="open-dashboard"]').should('exist').should('have.attr', 'disabled')
            })
        })
    })
})

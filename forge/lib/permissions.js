const { Roles } = require('./roles.js')
const Permissions = {
    /**
     * OS Permissions
     */
    // User Actions
    'user:create': { description: 'Create User', role: Roles.Admin },
    'user:list': { description: 'List platform users', role: Roles.Admin },
    'user:read': { description: 'View user Information', role: Roles.Admin, self: true },
    'user:edit': { description: 'Edit User Information', role: Roles.Admin, self: true },
    'user:delete': { description: 'Delete User', role: Roles.Admin, self: true },
    'user:team:list': { description: 'List a Users teams', role: Roles.Admin, self: true },
    'user:announcements:manage': { description: 'Manage platform wide announcements', role: Roles.Admin },
    // Team Scoped Actions
    'team:create': { description: 'Create Team' },
    'team:list': { description: 'List Teams', role: Roles.Admin },
    'team:read': { description: 'View a Team', role: Roles.Dashboard },
    'team:edit': { description: 'Edit Team', role: Roles.Owner },
    'team:delete': { description: 'Delete Team', role: Roles.Owner },
    'team:audit-log': { description: 'Access Team Audit Log', role: Roles.Owner },
    'team:device:bulk-delete': { description: 'Delete Devices', role: Roles.Owner },
    'team:device:bulk-edit': { description: 'Edit Devices', role: Roles.Owner },
    // Team Auto Device Provisioning Tokens
    'team:device:provisioning-token:create': { description: 'Create a Team Auto Device Provisioning Token', role: Roles.Owner },
    'team:device:provisioning-token:edit': { description: 'Edit a Team Auto Device Provisioning Token', role: Roles.Owner },
    'team:device:provisioning-token:list': { description: 'List Team Auto Device Provisioning Tokens', role: Roles.Owner },
    'team:device:provisioning-token:delete': { description: 'Delete a Team Auto Device Provisioning Token', role: Roles.Owner },
    // Team Members
    'team:user:add': { description: 'Add Members', role: Roles.Admin },
    'team:user:list': { description: 'List Team Members', role: Roles.Viewer },
    'team:user:invite': { description: 'Invite Members', role: Roles.Owner },
    'team:user:remove': { description: 'Remove Member', role: Roles.Owner, self: true },
    'team:user:change-role': { description: 'Modify Member role', role: Roles.Owner },

    'team:search': { description: 'Search a Teams resources', role: Roles.Viewer },

    // Applications
    'application:audit-log': { description: 'Access Application Audit Log', role: Roles.Owner },
    // Projects
    'team:projects:list': { description: 'List Team Projects', role: Roles.Viewer },
    'project:create': { description: 'Create Project', role: Roles.Owner },
    'project:delete': { description: 'Delete Project', role: Roles.Owner },
    'project:read': { description: 'View a Project', role: Roles.Viewer },
    'project:transfer': { description: 'Transfer Project', role: Roles.Owner },
    'project:change-status': { description: 'Start/Stop Project', role: Roles.Owner },
    'project:edit': { description: 'Edit Project Settings', role: Roles.Owner },
    'project:edit-env': { description: 'Edit Project Environment Variables', role: Roles.Member },
    'project:log': { description: 'Access Project Log', role: Roles.Viewer },
    'project:audit-log': { description: 'Access Project Audit Log', role: Roles.Viewer },
    // Project Editor
    'project:flows:view': { description: 'View Project Flows', role: Roles.Viewer },
    'project:flows:edit': { description: 'Edit Project Flows', role: Roles.Member },
    'project:flows:http': { description: 'Access http endpoints of an Instance', role: Roles.Dashboard },
    // Snapshots
    'project:snapshot:create': { description: 'Create Project Snapshot', role: Roles.Member },
    'project:snapshot:list': { description: 'List Project Snapshots', role: Roles.Viewer },
    'project:snapshot:read': { description: 'View a Project Snapshot', role: Roles.Viewer },
    'project:snapshot:delete': { description: 'Delete Project Snapshot', role: Roles.Owner },
    'project:snapshot:rollback': { description: 'Rollback Project Snapshot', role: Roles.Member },
    'project:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member },
    'project:snapshot:export': { description: 'Export Project Snapshot', role: Roles.Member },
    // Templates
    'template:create': { description: 'Create a Template', role: Roles.Admin },
    'template:list': { description: 'List all Templates' },
    'template:read': { description: 'View a Template' },
    'template:delete': { description: 'Delete a Template', role: Roles.Admin },
    'template:edit': { description: 'Edit a Template', role: Roles.Admin },
    // Stacks
    'stack:create': { description: 'Create a Stack', role: Roles.Admin },
    'stack:list': { description: 'List all Stacks' },
    'stack:read': { description: 'View a Stack' },
    'stack:delete': { description: 'Delete a Stack', role: Roles.Admin },
    'stack:edit': { description: 'Edit a Stack', role: Roles.Admin },
    // Devices
    'team:device:list': { description: 'List Team Devices', role: Roles.Viewer },
    'device:list': { description: 'List Devices', role: Roles.Admin },
    'device:create': { description: 'Create a Device', role: Roles.Owner },
    'device:provision': { description: 'Provision a Device', role: null },
    'device:read': { description: 'View a Device', role: Roles.Viewer },
    'device:delete': { description: 'Delete a Device', role: Roles.Owner },
    'device:edit': { description: 'Edit a Device', role: Roles.Owner },
    'device:edit-env': { description: 'Edit Device Environment Variables', role: Roles.Member },
    'device:change-status': { description: 'Start/Stop a Device', role: Roles.Owner },
    'device:snapshot:create': { description: 'Create Device Snapshot', role: Roles.Member },
    'device:snapshot:list': { description: 'List Device Snapshots', role: Roles.Viewer },
    'device:snapshot:read': { description: 'View a Device Snapshot', role: Roles.Viewer },
    'device:snapshot:delete': { description: 'Delete Device Snapshot', role: Roles.Owner },
    'device:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member },
    'device:audit-log': { description: 'View a Device Audit Log', role: Roles.Viewer },

    // Snapshots (common)
    'snapshot:meta': { description: 'View a Snapshot', role: Roles.Viewer },
    'snapshot:full': { description: 'View full snapshot details excluding credentials', role: Roles.Member },
    'snapshot:export': { description: 'Export a snapshot including credentials', role: Roles.Member },
    'snapshot:edit': { description: 'Edit a Snapshot', role: Roles.Owner },
    'snapshot:delete': { description: 'Delete a Snapshot', role: Roles.Owner },
    'snapshot:import': { description: 'Import a Snapshot', role: Roles.Owner },

    // Project Types
    'project-type:create': { description: 'Create a ProjectType', role: Roles.Admin },
    'project-type:list': { description: 'List all ProjectTypes' },
    'project-type:read': { description: 'View a ProjectType' },
    'project-type:delete': { description: 'Delete a ProjectType', role: Roles.Admin },
    'project-type:edit': { description: 'Edit a ProjectType', role: Roles.Admin },

    // Team Types
    'team-type:create': { description: 'Create a TeamType', role: Roles.Admin },
    'team-type:list': { description: 'List all TeamTypes' },
    'team-type:read': { description: 'View a TeamType' },
    'team-type:delete': { description: 'Delete a TeamType', role: Roles.Admin },
    'team-type:edit': { description: 'Edit a TeamType', role: Roles.Admin },

    'settings:edit': { description: 'Edit platform settings', role: Roles.Admin },
    'license:read': { description: 'View license information', role: Roles.Admin },
    'license:edit': { description: 'Edit license information', role: Roles.Admin },

    'invitation:list': { description: 'List all invitations', role: Roles.Admin },

    'platform:debug': { description: 'View platform debug information', role: Roles.Admin },
    'platform:stats': { description: 'View platform stats information', role: Roles.Admin },
    'platform:stats:token': { description: 'Create/Delete platform stats token', role: Roles.Admin },
    'platform:audit-log': { description: 'View platform audit log', role: Roles.Admin },

    /**
     * EE Permissions
     */

    // Projects
    'project:history': { description: 'View project history', role: Roles.Member },

    // Application
    'application:bom': { description: 'Get the Application Bill of Materials', role: Roles.Owner },

    // Team
    'team:bom': { description: 'Get the Team Bill of Materials', role: Roles.Owner },
    'team:device-group:list': { description: 'List Team device groups', role: Roles.Member },

    // Device Groups
    'application:device-group:create': { description: 'Create a device group', role: Roles.Owner },
    'application:device-group:list': { description: 'List device groups', role: Roles.Member },
    'application:device-group:update': { description: 'Update a device group', role: Roles.Owner },
    'application:device-group:delete': { description: 'Delete a device group', role: Roles.Owner },
    'application:device-group:read': { description: 'View a device group', role: Roles.Member },
    'application:device-group:membership:update': { description: 'Update a device group membership', role: Roles.Owner },

    // Device Editor
    'device:editor': { description: 'Access the Device Editor', role: Roles.Member },

    // Team Billing
    'team:billing:manual': { description: 'Setups up manual billing on a team', role: Roles.Admin },
    'team:billing:trial': { description: 'Modify team trial settings', role: Roles.Admin },

    // Flow Blueprints
    'flow-blueprint:create': { description: 'Create a Flow Blueprint', role: Roles.Admin },
    'flow-blueprint:list': { description: 'List all Flow Blueprints' },
    'flow-blueprint:read': { description: 'View a Flow Blueprint' },
    'flow-blueprint:delete': { description: 'Delete a Flow Blueprint', role: Roles.Admin },
    'flow-blueprint:edit': { description: 'Edit a Flow Blueprint', role: Roles.Admin },

    // Library
    'library:entry:create': { description: 'Create entries in a team library', role: Roles.Member },
    'library:entry:list': { description: 'List entries in a team library', role: Roles.Member },
    'library:entry:delete': { description: 'Delete an entry in a team library', role: Roles.Member },

    // Pipeline
    'pipeline:read': { description: 'View a pipeline', role: Roles.Member },
    'pipeline:create': { description: 'Create a pipeline', role: Roles.Owner },
    'pipeline:edit': { description: 'Edit a pipeline', role: Roles.Owner },
    'pipeline:delete': { description: 'Delete a pipeline', role: Roles.Owner },
    'application:pipeline:list': { description: 'List pipelines within an application', role: Roles.Member },
    'team:pipeline:list': { description: 'List pipelines within a team', role: Roles.Member },

    // SAML
    'saml-provider:create': { description: 'Create a SAML Provider', role: Roles.Admin },
    'saml-provider:list': { description: 'List all SAML Providers', role: Roles.Admin },
    'saml-provider:read': { description: 'View a SAML Provider', role: Roles.Admin },
    'saml-provider:delete': { description: 'Delete a SAML Provider', role: Roles.Admin },
    'saml-provider:edit': { description: 'Edit a SAML Provider', role: Roles.Admin },

    // Static Assets
    'project:files:list': { description: 'List files under a project', role: Roles.Member },
    'project:files:create': { description: 'Upload files to a project', role: Roles.Member },
    'project:files:edit': { description: 'Modify files in a project', role: Roles.Member },
    'project:files:delete': { description: 'Delete files in a project', role: Roles.Member },

    // Team Broker
    'broker:clients:list': { description: 'List Team Broker clients', role: Roles.Member },
    'broker:clients:create': { description: 'Create Team Broker clients', role: Roles.Owner },
    'broker:clients:edit': { description: 'Edit Team Broker clients', role: Roles.Owner },
    'broker:clients:delete': { description: 'Delete Team Broker clients', role: Roles.Owner },
    'broker:topics:list': { description: 'List active Team Broker topics', role: Roles.Member },

    // 3rd Party Broker
    'broker:credentials:list': { description: 'List 3rd Party Broker credentials', role: Roles.Owner },
    'broker:credentials:create': { description: '', role: Roles.Owner },
    'broker:credentials:edit': { description: '', role: Roles.Owner },
    'broker:credentials:delete': { description: '', role: Roles.Owner }
}

module.exports = {
    Permissions
}

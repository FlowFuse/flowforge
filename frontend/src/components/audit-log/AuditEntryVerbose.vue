<template>
    <!-- -->
    <template v-if="error">
        <label>Error: </label>
    </template>
    <!-- Team Scoped Events -->
    <template v-if="entry.event === 'team.created' || entry.event === 'platform.team.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">Team '{{ entry.body.team?.name }}' has been created.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.deleted' || entry.event === 'platform.team.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">Team '{{ entry.body.team?.name }}' has been deleted.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>

    <!-- Team User Events -->
    <template v-else-if="entry.event === 'team.user.added' || entry.event === 'user.added'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been added to the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.removed' || entry.event === 'user.removed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been removed from the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invited' || entry.event === 'user.invited'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been invited to the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.uninvited' || entry.event === 'user.uninvited'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has been uninvited from the team.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invite.accepted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has accepted the invite to join the team{{ entry.body.role ? ` as a ${entry.body.role}` : '' }}.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.invite.rejected'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user.name }}' has rejected the invite to join the team{{ entry.body.role ? ` as a ${entry.body.role}` : '' }}.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.user.role-changed' || entry.event === 'user.roleChanged'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">The role for '{{ entry.body.user.name }}' has been changed <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>

    <!-- Team Settings Events -->
    <template v-else-if="entry.event === 'team.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.updates">The following updates have been made to the team settings: <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">Updates not found in audit entry.</span>
    </template>

    <!-- Team Type Events -->
    <template v-else-if="entry.event === 'team.type.changed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <!-- <span v-if="!error && entry.body?.updates">The team type changed from '{{ entry.body.updates.typeName?.old || entry.body.updates.type.old }}' to '{{ entry.body.updates.typeName?.new || entry.body.updates.type.new }}'.</span> -->
        <span v-if="!error && entry.body?.info">The team type changed from '{{ entry.body.info.old.name }}' to '{{ entry.body.info.new.name }}'.</span>
        <span v-else-if="!error">Details not found in audit entry.</span>
    </template>

    <!-- Team Device Developer Mode -->
    <template v-else-if="entry.event === 'team.device.developer-mode.enabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Developer Mode has been enabled for the Device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.developer-mode.disabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Developer Mode has been disabled for the Device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.remote-access.enabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Remote Access has been enabled for device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.remote-access.disabled'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Remote Access has been disabled for device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>

    <!-- Team Device Events -->
    <template v-else-if="entry.event === 'team.device.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been created.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been deleted.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been assigned to the {{ entry.body.application ? 'Application' : 'Instance' }} '{{ entry.body.application ? entry.body.application.name : entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Device '{{ entry.body.device?.name }}' has been unassigned from the {{ entry.body.application ? 'Application' : 'Instance' }} '{{ entry.body.application ? entry.body.application.name : entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.credentials-generated' || entry.event === 'team.device.credentialsGenerated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device">Credentials generated for Device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>

    <!-- Team Device Auto Provisioning Tokens Events -->
    <template v-else-if="entry.event === 'team.device.provisioning.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">Token name '{{ entry.body.info.tokenName }}' was generated.</span>
        <span v-else-if="!error">Provisioning data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.provisioning.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">Token name '{{ entry.body.info.tokenName }}' with ID '{{ entry.body.info.tokenId }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Provisioning data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'team.device.provisioning.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.info">Token Name '{{ entry.body.info.tokenName }}' with ID '{{ entry.body.info.tokenId }}' was deleted.</span>
        <span v-else-if="!error">Provisioning data not found in audit entry.</span>
    </template>

    <!-- Account Scoped Events -->
    <template v-else-if="entry.event === 'account.register'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">'{{ entry.body.user?.username }}' has registered on FlowFuse.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.login' || entry.event === 'auth.login'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger?.name">User '{{ entry.trigger.name }}' has logged in.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.logout' || entry.event === 'auth.logout'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger?.name">User '{{ entry.trigger.name }}' has logged out.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.forgot-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">'{{ entry.body.user?.name }}' has forgotten their password.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.reset-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">'{{ entry.body.user?.name }}' has reset their password.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.auto-create-team'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">The team '{{ entry.body.team?.name }}' has been created and verified.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.request-token'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">A token has been requested.</span>
    </template>
    <template v-else-if="entry.event === 'account.verify.verify-token'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error">The request token has been verified successfully.</span>
    </template>
    <template v-else-if="entry.event === 'user.updated-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user?.name }}' has been updated, with the following changes:</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.updated-password'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user?.name }}' has updated their password</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.invite.accepted' || entry.event === 'user.invite.accept' || entry.event === 'user.invitations.accept-invite'">
        <!-- TODO: Add team/invite data to this event -->
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user">User '{{ entry.trigger.user?.name }}' has accepted the invite.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.invite.deleted' || entry.event === 'user.invite.delete' || entry.event === 'user.invitations.delete-invite'">
        <!-- TODO: Add team/invite data to this event -->
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user">User '{{ entry.trigger.user?.name }}' has deleted the invite.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.created-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user && entry.body.user">User '{{ entry.trigger.user?.name }}' has created a new user, '{{ entry.body.user?.name }}'.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'user.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body?.user?.name }}' has deleted their account.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'users.deleted-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.trigger.user && entry.body.user">User '{{ entry.trigger.user?.name }}' has deleted the user, '{{ entry.body.user?.name }}'.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'users.updated-user'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.user">User '{{ entry.body.user?.name }}' has been updated, with the following changes {{ entry.body.updates }}.</span>
        <span v-else-if="!error">User data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'users.auto-created-team'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.team">Team '{{ entry.body.team?.name }}' has been created for the User '{{ entry.body.user?.name }}'.</span>
        <span v-else-if="!error">Team data not found in audit entry.</span>
    </template>

    <!-- Billing Events -->
    <template v-else-if="entry.event === 'billing.session.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession">A billing session has been created with Stripe.</span>
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'billing.session.completed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession">The billing session has been completed via Stripe.</span>
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'billing.subscription.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.billingSession" />
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'billing.subscription.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body.updates[0]?.key === 'status'">Subscription status updated to '{{ entry.body.updates[0].new }}'</span>
        <span v-else-if="!error && entry.body.updates">Subscription status updated: '{{ entry.body.updates[0] }}'</span>
        <span v-else-if="!error">Billing data not found in audit entry.</span>
    </template>

    <!-- Platform License Events -->
    <template v-else-if="entry.event === 'platform.license.applied' || entry.event === 'platform.licence.apply'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">A new license has been applied with the following details: {{ entry.body.license }}</span>
        <span v-else-if="!error">License data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.license.inspected' || entry.event === 'platform.licence.inspect'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.license">A license was inspected with the following details: {{ entry.body.license }}</span>
        <span v-else-if="!error">License data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.license.overage'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && typeof entry.body?.info === 'object'">Type: '{{ entry.body.info.resource }}', Limit: {{ entry.body.info.limit }}, Count: {{ entry.body.info.count }}</span>
        <span v-else-if="!error">License data not found in audit entry.</span>
    </template>
    <!-- Platform instance type Events -->
    <template v-else-if="entry.event === 'platform.project-type.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">A new instance type '{{ entry.body.projectType }}' has been created.</span>
        <span v-else-if="!error">Instance Type data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.project-type.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">Instance type '{{ entry.body.projectType }}' has been deleted.</span>
        <span v-else-if="!error">Instance Type data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.project-type.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.projectType">Instance type '{{ entry.body.projectType }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Instance Type data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">Stack '{{ entry.body.stack.name }}' has been created.</span>
        <span v-else-if="!error">Stack data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">Stack '{{ entry.body.stack.name }}' has been deleted.</span>
        <span v-else-if="!error">Stack data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.stack.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.stack">Stack '{{ entry.body.stack.name }}' has been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Stack data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'platform.settings.updated' || entry.event === 'platform.settings.update'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.updates">Platform settings have been updated with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Update data not found in audit entry.</span>
    </template>

    <!-- Application Events -->
    <template v-else-if="entry.event === 'application.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">Application {{ entry.body.application?.name }} was created {{ entry.body.team ? `in Team '${entry.body.team.name}'` : '' }}</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.updates">The following updates have been made to the Application: <AuditEntryUpdates :updates="entry.body.updates" />.</span>
        <span v-else-if="!error">Updates not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">Application {{ entry.body.application?.name }} was deleted {{ entry.body.team ? `in Team '${entry.body.team.name}'` : '' }}</span>
        <span v-else-if="!error">Application data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline">DevOps Pipeline '{{ entry.body.pipeline?.name }}' has been created {{ entry.body.application ? `in Application '${entry.body.application.name}'` : '' }}</span>
        <span v-else-if="!error">Pipeline data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline">DevOps Pipeline '{{ entry.body.pipeline?.name }}' was updated {{ entry.body.application ? `in Application '${entry.body.application.name}'` : '' }} with the following changes: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Pipeline data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline">DevOps Pipeline '{{ entry.body.pipeline?.name }}' was deleted {{ entry.body.application ? `in Application '${entry.body.application.name}'` : '' }}</span>
        <span v-else-if="!error">Pipeline data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.pipeline.stage-added'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.pipeline && entry.body?.pipelineStage">Pipeline Stage '{{ entry.body.pipelineStage?.name }}' was added to the DevOps Pipeline '{{ entry.body.pipeline?.name }}' {{ entry.body.application ? `in Application '${entry.body.application.name}'` : '' }}</span>
        <span v-else-if="!error">Pipeline data not found in audit entry.</span>
    </template>

    <!-- Application Device Events -->
    <template v-else-if="entry.event === 'application.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">Device '{{ entry.body.device?.name }}' was assigned to Application '{{ entry.body.application?.name }}'</span>
        <span v-else-if="!error">Application data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.application">Device '{{ entry.body.device?.name }}' was unassigned from Application '{{ entry.body.application?.name }}'</span>
        <span v-else-if="!error">Application data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been been created from Application owned Device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device or Snapshot data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been been deleted for Application owned Device '{{ entry.body.device?.name }}'.</span>
        <span v-else-if="!error">Device or Snapshot data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'application.device.snapshot.device-target-set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.device && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been set as the target for Application owned device '{{ entry.body.device.name }}'.</span>
        <span v-else-if="!error">Device data not found in audit entry.</span>
    </template>

    <!-- Instance Events -->
    <template v-else-if="entry.event === 'project.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance {{ entry.body.project?.name }} was created {{ entry.body.team ? `in Team '${entry.body.team.name}'` : '' }}</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance {{ entry.body.project?.name }} was deleted {{ entry.body.team ? `in Team '${entry.body.team.name}'` : '' }}</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.duplicated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.sourceProject && entry.body.project">Instance '{{ entry.body.sourceProject?.name }}' was duplicated to a new Instance '{{ entry.body.project.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.started'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance '{{ entry.body.project?.name }}' was started.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.start-failed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Something went wrong, and we were unable to start Instance '{{ entry.body.project.name }}'. Please check the logs to find out more.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.stopped'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance '{{ entry.body.project.name }}' was stopped.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.restarted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance '{{ entry.body.project.name }}' was restarted.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.suspended'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance '{{ entry.body.project.name }}' was suspended.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.copied'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.targetProject">Instance '{{ entry.body.project.name }}' was copied to '{{ entry.body.targetProject.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.imported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body?.sourceProject">Instance '{{ entry.body.sourceProject.name }}' was copied to '{{ entry.body.project.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.assigned-to-pipeline-stage'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance '{{ entry.body.project.name }}' was assigned to the '{{ entry.body.pipelineStage.name }}' Stage in the '{{ entry.body.pipeline.name }}' Pipeline</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.device.assigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Device '{{ entry.body.device?.name }}' was assigned to Instance '{{ entry.body.project?.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.device.unassigned'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Device '{{ entry.body.device?.name }}' was unassigned from Instance '{{ entry.body.project?.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.type.changed'">
        <label>Instance Type Changed</label>
        <span v-if="!error && entry.body?.project">The type for Instance '{{ entry.body.project?.name }}' has been changed to Type '{{ entry.body.projectType?.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.stack.changed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">The stack for Instance '{{ entry.body.project?.name }}' has been changed to Stack '{{ entry.body.stack?.name }}'</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.stack.restart'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">The stack for Instance '{{ entry.body.project?.name }}' has been restarted</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.settings.updated'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project">Instance '{{ entry.body.project?.name }}' has had the following changes made to its settings: <AuditEntryUpdates :updates="entry.body.updates" /></span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">A new Snapshot '{{ entry.body.snapshot?.name }}' has been created for Instance '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.device.snapshot.created'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">A new Snapshot '{{ entry.body.snapshot?.name }}' has been created from Device '{{ entry.body.device?.name }}' for Instance '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.rolled-back' || entry.event === 'project.snapshot.rollback'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Instance '{{ entry.body.project?.name }}' has been rolled back to the Snapshot '{{ entry.body.snapshot?.name }}'.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.deleted'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been deleted in Instance '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.device-target-set' || entry.event === 'project.snapshot.deviceTarget'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been set as the device target for Instance '{{ entry.body.project?.name }}'.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>
    <template v-else-if="entry.event === 'project.snapshot.imported'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="!error && entry.body?.project && entry.body.snapshot">Snapshot '{{ entry.body.snapshot?.name }}' has been imported for Instance '{{ entry.body.project?.name }}' from Instance '{{ entry.body.sourceProject?.name }}'.</span>
        <span v-else-if="!error">Instance data not found in audit entry.</span>
    </template>

    <!-- Node-RED Events -->
    <template v-else-if="entry.event === 'crashed'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Something has gone wrong. Check the instance logs to investigate further.</span>
    </template>
    <template v-else-if="entry.event === 'stopped'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Something has gone wrong. Check the instance logs to investigate further.</span>
    </template>
    <template v-else-if="entry.event === 'settings.update'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Node-RED editor user settings have been updated.</span>
    </template>
    <template v-else-if="entry.event === 'flows.set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>A new flow has been deployed</span>
    </template>
    <template v-else-if="entry.event === 'library.set'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>A flow or function has been saved to the Library</span>
    </template>
    <template v-else-if="entry.event === 'nodes.install'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Nodes have been installed via the "Manage Palette" option inside Node-RED</span>
    </template>
    <template v-else-if="entry.event === 'nodes.remove'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span>Nodes have been removed via the "Manage Palette" option inside Node-RED</span>
    </template>
    <template v-else-if="entry.event === 'context.delete'">
        <label>{{ AuditEvents[entry.event] }}</label>
        <span v-if="entry.body?.context?.scope && entry.body?.context?.store && entry.body?.context?.key">Context key '{{ entry.body.context.scope }}.{{ entry.body.context.key }}' was deleted from context store '{{ entry.body.context.store }}' inside Node-RED.</span>
        <span v-else>A Context data entry was deleted inside Node-RED. {{ JSON.stringify(entry.body || {}) }} </span>
    </template>

    <template v-else-if="entry.event === 'resource.cpu'">
        <label>Instance High CPU usage</label>
        <span>Instance has spent more than {{ Math.floor(entry.body.interval / 60) }} minutes at more than {{ entry.body.threshold }}% of CPU limit</span>
    </template>

    <template v-else-if="entry.event === 'resource.memory'">
        <label>Instance High Memory usage</label>
        <span>Instance has spent more than {{ Math.floor(entry.body.interval / 60) }} minutes at more than {{ entry.body.threshold }}% of Memory limit</span>
    </template>

    <!-- Catch All -->
    <template v-else>
        <label>{{ AuditEvents[entry.event] }}: {{ entry.event }}</label>
        <span>We have no details available for this event type</span>
    </template>

    <template v-if="error">
        <details class="ff-audit-entry--error">
            <summary>
                <ChevronRightIcon class="ff-icon ff-icon-sm" />
                Show Error
            </summary>
            <span>
                {{ entry.body }}
                <ChevronDownIcon class="ff-icon ff-icon-sm" />
            </span>
        </details>
    </template>
</template>

<script>
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/solid'

import AuditEventsService from '../../services/audit-events.js'

import AuditEntryUpdates from './AuditEntryUpdates.vue'

export default {
    name: 'AuditEntryVerbose',
    props: {
        entry: {
            type: Object,
            required: true
        }
    },
    computed: {
        error: function () {
            return this.entry.body?.error !== undefined
        }
    },
    setup () {
        const AuditEvents = AuditEventsService.get()

        return {
            AuditEvents
        }
    },
    components: {
        ChevronRightIcon,
        ChevronDownIcon,
        AuditEntryUpdates
    }
}
</script>

const sanitiseObjectIds = (obj) => {
    if (obj && obj.hashid) {
        obj.id = obj.hashid
        delete obj.hashid
    }
    return obj
}
module.exports = function (app) {
    app.addSchema({
        $id: 'AuditLogEntry',
        type: 'object',
        properties: {
            id: { type: 'string' },
            createdAt: { type: 'string' },
            username: { type: 'string' },
            event: { type: 'string' },
            scope: { type: 'object', additionalProperties: true },
            trigger: { type: 'object', additionalProperties: true },
            body: { type: 'object', additionalProperties: true }
        }
    })
    app.addSchema({
        $id: 'AuditLogEntryList',
        type: 'array',
        items: {
            $ref: 'AuditLogEntry'
        }
    })
    app.addSchema({
        $id: 'AuditLogQueryParams',
        type: 'object',
        properties: {
            // `event` can be a string or an array of strings (e.g. ['project.snapshot.device-target-set', 'project.snapshot.deviceTarget'])
            // this is to handle legacy log entries that have multiple events
            // One such example is the legacy entry 'project.snapshot.deviceTarget' which is now called 'project.snapshot.device-target-set'
            // this results in a querystring of ?event=project.snapshot.deviceTarget&event=project.snapshot.device-target-set
            event: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            username: { type: 'string' }
        }
    })
    function auditLog (logEntries) {
        logEntries.log = logEntries.log.map(e => {
            e = app.auditLog.formatters.formatLogEntry(e)
            const scope = e.scope
            if (scope.type !== 'platform' && scope.type !== 'project') {
                const model = `${scope.type[0].toUpperCase()}${scope.type.slice(1)}`
                if (app.db.models[model]) {
                    scope.id = app.db.models[model].encodeHashid(scope.id)
                }
            }
            return {
                id: e.hashid,
                createdAt: e.createdAt,
                username: e.User ? e.User.username : null, // Kept for compatibility. To remove once UI complete
                event: e.event,
                scope,
                trigger: sanitiseObjectIds(e.trigger),
                body: e.body
            }
        })
        return logEntries
    }

    return {
        auditLog
    }
}

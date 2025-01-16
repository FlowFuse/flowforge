module.exports = {
    credentials: function (app, credentials) {
        const filtered = []
        credentials.forEach(c => {
            filtered.push(this.clean(app, c))
        })
        return filtered
    },
    clean: function (app, cred) {
        const result = cred.toJSON()
        const cleaned = {
            id: result.hashid,
            name: result.name,
            host: result.host,
            port: result.port,
            protocol: result.protocol,
            ssl: result.ssl,
            verifySSL: result.verifySSL,
            clientId: result.clientId
        }
        return cleaned
    }
}

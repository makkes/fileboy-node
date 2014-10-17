var config = require('config');
var xmpp = require('node-xmpp-client');
var crypto = require('crypto');

var codes = {};
var CODE_LIFETIME = 30000;

function authenticate(req, res, next) {
    var session = req.session;
    if (session.user) {
        next();
    } else {
        res.redirect("/login?return=" + encodeURIComponent(req.url));
    }
}

function codeMatches(jid, code) {
    return codes[jid] && codes[jid].code === code;
}

function deleteCode(jid) {
    delete codes[jid];
}

function getOrCreateCode(jid) {
    if (!codes[jid]) {
        var entry = {
            code: crypto.randomBytes(3).toString('hex'),
            generated: new Date()
        };
        codes[jid] = entry;
    }
    return codes[jid];
}

function tidyCodes() {
    Object.keys(codes).forEach(function(jid) {
        var now = new Date();
        if (now - codes[jid].generated > CODE_LIFETIME) {
            delete codes[jid];
        }
    });
}

function sendCode(code, receiver) {
    var client = new xmpp.Client({
        jid: config.get('codeSender.jid'),
        password: config.get('codeSender.password')
    });
    client.addListener('online', function(data) {
        var stanza = new xmpp.Stanza.Element('message', {
            to: receiver,
            type: 'chat'
        }).c('body').t(code);
        client.send(stanza);
        setTimeout(client.end, 1000);
    });
    client.addListener('error', function(err) {
        console.log("Error", err);
    });

}

module.exports = {
    authenticate: authenticate,
    tidyCodes: tidyCodes,
    sendCode: sendCode,
    codes: codes,
    getOrCreateCode: getOrCreateCode,
    codeMatches: codeMatches,
    deleteCode: deleteCode
};

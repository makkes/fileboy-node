var config = require('config');
var xmpp = require('node-xmpp-client');
var crypto = require('crypto');
var url = require('url');
var nodemailer = require('nodemailer');

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

function codeMatches(uid, code) {
    return codes[uid] && codes[uid].code === code;
}

function deleteCode(uid) {
    delete codes[uid];
}

function getOrCreateCode(uid) {
    if (config.get("codeLogin.adminUIDs").indexOf(uid) === -1) {
        return;
    }
    if (!codes[uid]) {
        var entry = {
            code: crypto.randomBytes(3).toString('hex'),
            generated: new Date()
        };
        codes[uid] = entry;
    }
    return codes[uid];
}

function tidyCodes() {
    Object.keys(codes).forEach(function(uid) {
        var now = new Date();
        if (now - codes[uid].generated > CODE_LIFETIME) {
            delete codes[uid];
        }
    });
}

var transports = {
    xmpp: xmppTransport,
    pushbullet: pushbulletTransport,
    mailto: emailTransport
};

function sendCode(code, receiverURIString, cb) {
    var receiverURI = url.parse(receiverURIString);
    var transport = receiverURI.protocol.substring(0, receiverURI.protocol.length - 1);
    if (!transports[transport]) {
        throw new Error("Unknown transport " + transport);
    }
    transports[transport](code, receiverURI, config.get('codeLogin.transports')[transport], cb);
}

function emailTransport(code, receiverURI, transportConfig, cb) {
    var transporter = nodemailer.createTransport({
        service: transportConfig.service,
        auth: {
            user: transportConfig.auth.user,
            pass: transportConfig.auth.pass
        }
    });
    var mailOptions = {
        from: transportConfig.sender,
        to: receiverURI.auth + "@" + receiverURI.host,
        subject: "Fileboy Access Code",
        text: code
    };
    transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
            console.log(err);
            cb("Error sending code");
        } else {
            cb();
        }
    });
}

function pushbulletTransport(code, receiverURI, transportConfig, cb) {
    var request = require('request');

    request.post({
            uri: "https://api.pushbullet.com/v2/pushes",
            json: true,
            body: {
                device_iden: transportConfig.device_iden, // Firefox
                type: "note",
                title: "Fileboy Access Code",
                body: code
            }
        },

        function(err, resp, body) {
            if (err || resp.statusCode !== 200) {
                console.log(err, resp.statusCode, body);
                cb("Error pushing code");
            } else {
                cb();
            }
        }
    ).auth(transportConfig.accessToken, "", true);
}

function xmppTransport(code, receiverURI, transportConfig, cb) {
    var client = new xmpp.Client({
        jid: transportConfig.sender.jid,
        password: transportConfig.sender.password
    });
    client.addListener('online', function(data) {
        var stanza = new xmpp.Stanza.Element('message', {
            to: receiverURI.auth + "@" + receiverURI.host,
            type: 'chat'
        }).c('body').t(code);
        client.send(stanza);
        setTimeout(function() {
            client.end();
            cb();
        }, 1000);
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

var path = require('path');
var express = require('express');
var session = require('express-session');
var app = express();
var swig = require('swig');
var busboy = require('connect-busboy');
var fs = require('fs');
var config = require('config');
var uuid = require('node-uuid');
var bodyParser = require('body-parser');
var moment = require('moment');

var track = require('./track');
var helpers = require('./helpers');
var guest = require('./guest');
var login = require('./login');
var migrations = require('./migrations');

swig.setDefaults({
    cache: false
});
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

/**
 * Middleware
 */

app.use(session({
    secret: config.get('session-secret'),
    resave: false,
    unset: 'destroy'
}));
if (config.get('codeLoginEnabled')) {
    app.use(["/$", "/upload", "/delete"], login.authenticate('user'));
    app.use(["/admin"], login.authenticate('admin'));
}
app.use(function(req, res, next) {
    app.set("user", login.loggedInUser(req));
    next();
});
app.use("/uploads", track.track_download);
app.use("/uploads", express.static(config.get('upload-folder')));
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/fonts', express.static(__dirname + '/fonts'));
app.use(busboy());
app.use(bodyParser.urlencoded({
    extended: true
}));

function check_pass(req, res, next) {
    guest.is_invited(req.params.pass, function(err, invited) {
        if (invited) {
            next();
        } else {
            res.status(403).send("Forbidden").end();
        }
    });
}

function revoke_pass(req, res, next) {
    guest.revoke(req.params.pass, function() {
        next();
    });
}

function sanitizeRedirectTarget(target) {
    var sanitized = target || "/";
    if (sanitized.substr(0, 2) === "//") {
        sanitized = sanitized.substr(1);
    }
    return sanitized;
}

function sortByFieldDescending(array, field) {
    var res = array.slice();
    res.sort(function(a, b) {
        if (a[field] < b[field]) {
            return 1;
        }
        if (a[field] > b[field]) {
            return -1;
        }
        return 0;
    });
    return res;
}

/**
 * guest URLs (not protected by proxy)
 */

app.post("/guest/upload/:pass", check_pass, upload, revoke_pass);
app.get("/guest/:pass", function(req, res) {
    var pass = req.params.pass;
    guest.is_invited(pass, function(err, invited) {
        if (invited) {
            res.render('index', {
                upload_url: "/guest/upload/" + pass
            });
        } else {
            res.status(403).send("Forbidden").end();
        }
    });
});

/**
 * public URLs
 */

app.get("/logout", function(req, res, next) {
    req.session = null;
    res.redirect("/");
});

app.get("/login", function(req, res, next) {
    if (req.query.uid && req.query.code) {
        var uid = req.query.uid,
            code = req.query.code,
            target = req.query.target || "/";
        if (login.login(uid, code, req)) {
            res.redirect(sanitizeRedirectTarget(target));
        } else {
            res.status(403).send("forbidden").end();
        }
    } else {
        res.render('login', {
            transports: config.codeLogin && Object.keys(config.codeLogin.transports)
        });
    }
});

app.post("/login", function(req, res, next) {
    var uid = req.body.uid,
        code = req.body.code;
    if (login.login(uid, code, req)) {
        res.send("ok").end();
    } else {
        res.status(403).send("forbidden").end();
    }
});

app.get("/code/:uid/:transport", function(req, res, next) {
    var entry = login.getOrCreateCode(req.params.uid),
        baseUrl = config.get("base-url");
    if (!entry) {
        res.send("ok").end(); // do not reveal information about existance of accounts
        return;
    }

    login.sendCode(entry.code, req.params.uid, req.params.transport, req.query.target, baseUrl, function(err) {
        if (err) {
            console.log(err); // do not reveal information about existance of accounts
        }
        res.send("ok").end();
    });
});


/**
 * protected URLs
 */


app.get("/", function(req, res) {
    res.render('index', {
        upload_url: config.get("upload-url")
    });
});

app.get("/users/me", login.authenticate("user"), function(req, res, next) {
    res.render('me', {
        user: login.loggedInUser(req)
    });
});

app.post("/upload", upload);

function upload(req, res, next) {
    req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        var newdir = uuid.v4();
        var newpath = path.join(config.get("upload-folder"), newdir);
        var newfile = path.basename(filename);
        fs.mkdir(newpath, function() {
            var newCanonicalPath = path.join(newpath, newfile);
            file.pipe(fs.createWriteStream(newCanonicalPath));
            req.busboy.on('finish', function() {
                res.json({
                    url: config.get("base-url") + "/uploads/" + newdir + "/" + newfile
                });
                res.end();
                track.track_upload(login.loggedInUser(req).uid, path.join('/', newdir, newfile), function(err) {
                    next();
                });
            });
        });
    });
    req.pipe(req.busboy);
}

app.get("/my/files", login.authenticate("user"), render_files.bind(null, false));
app.get("/admin", fetch_guest_passes, render_files.bind(null, true));

function fetch_guest_passes(req, res, next) {
    guest.get_all(function(err, guest_passes) {
        if (!err) {
            req.guest_passes = guest_passes;
        }
        next();
    });
}

function render_files(admin, req, res) {
    var getterFunc = admin ? track.get_all_files : track.get_files.bind(null, login.loggedInUser(req).uid);
    getterFunc(function(err, files) {
        var result = [],
            total_size = 0;
        var pending = files.length;
        if (pending === 0) {
            res.render('myfiles', {
                files: [],
                total_size: 0,
                show_uploader: admin,
                show_guest_passes: admin,
                guest_passes: req.guest_passes
            });
        }
        files.forEach(function(file) {
            helpers.info(file, function(err, info) {
                pending--;
                if (!err) {
                    result.push(info);
                    total_size += info.size;
                }
                if (pending === 0) {
                    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
                    res.render('myfiles', {
                        files: sortByFieldDescending(result, "timestamp"),
                        show_uploader: admin,
                        show_guest_passes: admin,
                        total_size: total_size,
                        guest_passes: req.guest_passes
                    });
                }
            });
        });
    });
}

app.post("/delete", function(req, res) {
    var file_parts = req.param('file_path').split("/");
    relative_path = file_parts[file_parts.length - 2] + "/" + file_parts[file_parts.length - 1];
    track.get_file("/" + decodeURIComponent(relative_path), function(err, row) {
        var loggedInUser = login.loggedInUser(req);
        if (loggedInUser.roles.indexOf("admin") === -1 && loggedInUser.uid !== row.uploader) {
            res.status(403).send("Missing privileges").end();
            return;
        }
        file_path = decodeURIComponent(path.resolve(path.join(config.get("upload-folder"), relative_path)));
        track.delete_stats("/" + relative_path, function(err) {
            fs.unlink(file_path, function(err) {
                fs.rmdir(path.resolve(path.join(config.get("upload-folder"), file_parts[file_parts.length - 2])), function(err) {
                    res.send("ok");
                });
            });
        });
    });
});

app.get("/admin/invite", function(req, res) {
    var guest_pass = uuid.v4();
    guest.insert(guest_pass, function(err, pass) {
        res.json({
            url: config.get("base-url") + "/guest/" + pass.guest_pass,
            passes: pass.passes_count
        });
    });
});

app.get("/admin/revoke_passes", function(req, res) {
    guest.revoke_all(function(err, count) {
        res.send(count.toString());
    });
});

app.get("/admin/sessions", function(req, res, next) {
    var sessions = req.sessionStore.sessions;
    var result = [];
    Object.keys(sessions).forEach(function(sessionKey) {
        var session = JSON.parse(sessions[sessionKey]);
        if (session && session.user) {
            result.push({
                uid: session.user.uid,
                loggedIn: moment(session.user.loggedIn).format('LLL')
            });
        }
    });
    res.render('sessions', {
        sessions: result
    });
});

/**
 * Startup
 */

var server = app.listen(3000, function() {
    var address = server.address();
    console.log("Listening on %s:%d", address.address, address.port);
    helpers.ensure_path(config.get("upload-folder"), function(err) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        helpers.init_db(config.get("database"), function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            } else {
                migrations.run(config.get("database"), function(err) {
                    if (err) {
                        console.log(err);
                        process.exit(1);
                    }
                });
            }
        });
    });
    setInterval(login.tidyCodes, 5000);
});

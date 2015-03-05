var sqlite3 = require('sqlite3');
var config = require('config');
var fs = require('fs');
var helpers = require('./helpers');

var migrations = [
    createVersionTable,
    insertUploaderColumn,
    insertDateColumn,
    migrateDates,
    migrateUIDs
];

function run(dbfile, callback) {
    // backup database
    try {
        fs.writeFileSync(dbfile + ".bkp", fs.readFileSync(dbfile));
    } catch (err) {
        callback(err);
        return;
    }
    var db = new sqlite3.Database(dbfile);

    function runMigrations(startIdx, callback) {
        if (startIdx >= migrations.length) {
            callback(null, --startIdx);
            return;
        }
        migrations[startIdx](db, function(err) {
            if (err) {
                callback(new Error("Error with migration " + startIdx + ": " + err));
                return;
            }
            runMigrations(++startIdx, callback);
        });
    }

    db.get("SELECT number FROM version ORDER BY number DESC LIMIT 1", function(err, row) {
        var currentVersion = row && row.number || -1;
        runMigrations(++currentVersion, function(err, latestVersion) {
            if (err) {
                callback(err);
            } else {
                if (latestVersion >= currentVersion) {
                    db.run("INSERT INTO version(number) VALUES(?)", latestVersion, function(err2) {
                        db.close();
                        callback(err2);
                    });
                }
            }
        });
    });
}

function migrateUIDs(db, callback) {
    var usersByURI = {};
    console.log(config.codeLogin);
    if (!config.codeLogin) {
        callback();
        return;
    }
    Object.keys(config.codeLogin.users).forEach(function(uid) {
        Object.keys(config.codeLogin.users[uid].transports).forEach(function(transport) {
            usersByURI[transport + ":" + config.codeLogin.users[uid].transports[transport]] = uid;
        });
    });
    db.all("SELECT file, uploader FROM stats", function(err, rows) {
        if (err) {
            callback(err);
            return;
        }
        rows.forEach(function(row) {
            if (row.uploader && usersByURI[row.uploader]) {
                db.run("UPDATE stats SET uploader = ? WHERE file = ?", usersByURI[row.uploader], row.file);
            }
        });
        callback();
    });
}

function migrateDates(db, callback) {
    helpers.walk(config.get("upload-folder"), function(err, results) {
        var files = results.length;
        var currentFile = 0;
        results.forEach(function(file) {
            fs.stat(file, function(err, stat) {
                var date = stat.ctime.getTime();
                currentFile++;
                file = file.replace(config.get("upload-folder"), "");
                db.run("UPDATE stats SET date = ? WHERE file = ?", date, file);
                if (currentFile >= results.length) {
                    callback();
                }
            });
        });
    });
}

function insertDateColumn(db, callback) {
    db.run("ALTER TABLE stats ADD COLUMN date INTEGER", function(err) {
        callback(err);
    });
}

function createVersionTable(db, callback) {
    db.run("CREATE TABLE version(number integer)", function(err) {
        callback();
    });
}

function insertUploaderColumn(db, callback) {
    db.run("ALTER TABLE stats ADD COLUMN uploader TEXT", function(err) {
        callback(err);
    });
}

module.exports = {
    run: run
};

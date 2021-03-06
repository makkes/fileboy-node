var filesize = require('filesize');
var path = require('path');
var moment = require('moment');
var config = require('config');
var fs = require('fs');
var sqlite = require('sqlite3');

/**
 * Helpers
 */

function init_db(dbfile, callback) {
    fs.exists(dbfile, function(exists) {
        if (exists) {
            callback();
            return;
        }
        var db = new sqlite.Database(dbfile, function(err) {
            if (err) {
                callback(err);
                return;
            }
        });
        fs.readFile('schema.sql', 'utf8', function(err, data) {
            var lines = data.split("\n");
            db.serialize(function() {
                lines.forEach(function(line) {
                    if (line) {
                        db.run(line);
                    }
                });
            });
            db.close();
            callback();
        });
    });
}

function ensure_path(p, done) {
    fs.exists(p, function(exists) {
        if (!exists) {
            fs.mkdir(p, done);
        } else {
            done();
        }
    });
}

function walk(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) {
            return done(err);
        }
        var pending = list.length;
        if (!pending) {
            return done(null, results);
        }
        list.forEach(function(file) {
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        if (!--pending) {
                            done(null, results);
                        }
                    });
                } else {
                    results.push(file);
                    if (!--pending) {
                        done(null, results);
                    }
                }
            });
        });
    });
}

function info(dbFile, callback) {
    fs.stat(config.get('upload-folder') + "/" + decodeURIComponent(dbFile.file), function(err, stat) {
        if (err) {
            console.log(err);
            callback(err);
            return;
        }
        mtime = moment(stat.mtime);
        callback(null, {
            url: config.get("base-url") + "/uploads/" + dbFile.file,
            name: decodeURIComponent(path.basename(dbFile.file)),
            size: stat.size,
            print_size: filesize(stat.size),
            time: mtime.format("LLL"),
            timestamp: mtime.format("X"),
            downloads: dbFile.downloads || 0,
            uploader: dbFile.uploader || ""
        });
    });
}

module.exports = {
    info: info,
    walk: walk,
    ensure_path: ensure_path,
    init_db: init_db
};

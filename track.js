var config = require('config');
var sqlite3 = require('sqlite3');

function get_files(user, callback) {
    var db = new sqlite3.Database(config.get("database"));
    var stmt = db.prepare('SELECT * FROM stats WHERE uploader = ?');
    stmt.all(user, function(err, rows) {
        stmt.finalize();
        db.close();
        callback(null, rows);
    });
}

/** 
 * TODO: mostly redundant with get_files
 */

function get_all_files(callback) {
    var db = new sqlite3.Database(config.get("database"));
    db.all("SELECT * FROM stats", function(err, rows) {
        db.close();
        callback(null, rows);
    });
}

function get_file(path, callback) {
    var db = new sqlite3.Database(config.get("database"));
    var stmt = db.prepare('SELECT * FROM stats WHERE file = ?');
    stmt.get(path, function(err, row) {
        stmt.finalize();
        db.close();
        callback(null, row);
    });
}

function track_upload(user, file, callback) {
    var db = new sqlite3.Database(config.get("database"));
    var stmt = db.prepare('INSERT INTO stats(file, uploader, downloads, date) VALUES(?, ?, ?, ?)');
    stmt.run(file, user, 0, Date.now(), function(err) {
        stmt.finalize();
        db.close();
        callback();
    });
}

function track_download(req, res, next) {
    var filename = decodeURIComponent(req.url);
    var db = new sqlite3.Database(config.get("database"));
    var stmt = db.prepare('SELECT downloads FROM stats WHERE file = ?');
    stmt.get(filename, function(err, row) {
        stmt.finalize();
        if (!row) {
            stmt = db.prepare('INSERT INTO stats(file, uploader, downloads) VALUES(?, ?, ?)');
            stmt.run(filename, "", 1, function(err) {
                stmt.finalize();
                db.close();
            });
        } else {
            stmt = db.prepare('UPDATE stats SET downloads = downloads + 1 WHERE file = ?');
            stmt.run(filename, function(err) {
                stmt.finalize();
                db.close();
            });
        }
    });
    next();
}

function delete_stats(file, callback) {
    var db = new sqlite3.Database(config.get("database"));
    db.run("DELETE FROM stats WHERE file = ?", file, function(err) {
        db.close();
        callback(err);
    });
}

module.exports = {
    delete_stats: delete_stats,
    get_all_files: get_all_files,
    track_download: track_download,
    track_upload: track_upload,
    get_files: get_files,
    get_file: get_file
};

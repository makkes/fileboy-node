var config = require('config');
var sqlite3 = require('sqlite3');

function track_upload(user, file, callback) {
    var db = new sqlite3.Database(config.get("database"));
    var stmt = db.prepare('INSERT INTO stats(file, uploader, downloads) VALUES(?, ?, ?)');
    stmt.run(file, user, 0, function(err) {
        stmt.finalize();
        db.close();
        callback();
    });
}

function track_download(req, res, next) {
    var filename = req.url;
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

function get_download_stats(callback) {
    var res = {};
    var db = new sqlite3.Database(config.get("database"));
    db.all("SELECT * FROM stats", function(err, rows) {
        db.close();
        rows.forEach(function(row) {
            res[row.file] = row.downloads;
        });
        callback(res);
    });
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
    get_download_stats: get_download_stats,
    track_download: track_download,
    track_upload: track_upload
};

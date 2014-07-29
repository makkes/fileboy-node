var sqlite3 = require('sqlite3');
var config = require('config');

function get_count(callback) {
    var db = new sqlite3.Database(config.get("database"));
    db.get('SELECT COUNT(*) AS count FROM guest_passes', function(err, res) {
        callback(undefined, res.count);
    });
}

function get_all(callback) {
    var db = new sqlite3.Database(config.get("database"));
    var res = [];
    db.all("SELECT guest_pass from guest_passes", function(err, rows) {
        db.close();
        rows.forEach(function(row) {
            res.push(row.guest_pass);
        });
        callback(err, res);
    });
}

function insert(pass, callback) {
    var db = new sqlite3.Database(config.get("database"));
    db.run('INSERT INTO guest_passes VALUES (?)', pass, function(err) {
        get_count(function(err, count) {
            callback(undefined, {
                guest_pass: pass,
                passes_count: count
            });
        });
    });
}

function revoke_all(callback) {
    var db = new sqlite3.Database(config.get("database"));
    db.run('DELETE FROM guest_passes', function(err) {
        get_count(function(err2, count) {
            callback(err2, count);
        });
    });
}

function revoke(pass, done) {
    var db = new sqlite3.Database(config.get("database"));
    db.run('DELETE FROM guest_passes WHERE guest_pass = ?', pass, function(err) {
        done();
    });
}

function is_invited(pass, callback) {
    var db = new sqlite3.Database(config.get("database"));
    db.get('SELECT * FROM guest_passes WHERE guest_pass = ?', pass, function(err, res) {
        callback(err, res !== undefined);
    });
}

module.exports = {
    get_all: get_all,
    insert: insert,
    revoke_all: revoke_all,
    is_invited: is_invited,
    revoke: revoke
};

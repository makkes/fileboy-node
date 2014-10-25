var sqlite3 = require('sqlite3');

var migrations = [
    createVersionTable,
    insertUploaderColumn
];

function run(dbfile, callback) {
    var db = new sqlite3.Database(dbfile);

    function runMigrations(startIdx, callback) {
        if (startIdx >= migrations.length) {
            callback(null, startIdx);
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
        var currentVersion = row && row.number || 0;
        runMigrations(currentVersion, function(err, latestVersion) {
            if (err) {
                callback(err);
            } else {
                db.run("INSERT INTO version(number) VALUES(?)", latestVersion, function(err2) {
                    db.close();
                    callback(err2);
                });
            }
        });
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

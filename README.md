Fileboy
=======

Simple one-click hosting application.

Fileboy is the solution to a problem I had quite often in the last months: I
wanted to share some file with a friend or colleague but didn't want to use some
third-party hosting provider (privacy concerns) or Dropbox (too cumbersome).  So
I made fileboy: Go to fileboy, drop your files, copy URLs,
send them to your friend/colleague/whatever.

Additionally you can let someone upload a file to your Fileboy instance by
generating a one-time guest pass.

I built the app myself mostly for learning purposes (and I didn't test it in
IE). If you're interested in production ready self-hosted file-sharing instead
have a look at [sparkleshare](http://sparkleshare.org/).

This is the Node.js-based implementation of the original
[Fileboy](https://github.com/makkes/fileboy), which is written in Python.

Screenshots
===========

* [Upload view](https://fileboy.makk.es/uploads/f675d70cf1fc48b3938ce36c93846c9b/fileboy.png)
* [Admin view](https://fileboy.makk.es/uploads/4ab84bfd8f35440b82d91e9a2a955f57/fileboy_admin.png)

Installation
============

* Clone this repo
* Install required modules: `npm install`
* Run: `npm start`

Then you're ready to access the application at
[http://localhost:3000](http://localhost:3000). To see a list of all uploaded
files and manage guest passes go to
[http://localhost:3000/admin](http://localhost:3000/admin).

Guest passes
============

You can create guest passes/invitations from the admin view. Those are stored in
an SQLite database on the server. The database is automatically initialized on
server startup.

Configuration
=============

All possible configuration parameters can be examined in the file
`config/default.json`. You can override all these settings in a custom file and
set the `NODE_ENV` environment variable to the file's name (without suffix).

Here's a short explanation of the most commonly changed parameters:

* `upload-folder`: All uploaded files will land here.
* `base-url`: Set this to the public URL that users use to access the application.
* `database`: File name of the SQLite database used for guest passes
* `session-secret`: Used for signing users' cookies.

Security
========

Fileboy can be run with no authorization/authentication at all or via
authentication using a combination of Jabber ID (JID) and a one-time code.

If you want the JID+Code combination, set the `codeLoginEnabled` configuration
parameter to `true` and set `codeSender` as well as `adminJIDs` appropriately.

If you do not want fileboy to handle authorization for you, just run it behing
an HTTP proxy with authentication for uploads. This is a sample nginx
configuration:

    server {
        listen              443;
        server_name         SOME_DOMAIN_NAME;

        access_log logs/fileboy_access.log;
        error_log logs/fileboy_error.log;

        ssl                 on;
        ssl_certificate     ssl/CERTFILE;
        ssl_certificate_key ssl/KEYFILE;
        ssl_protocols       SSLv3 TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        location / {
            auth_basic 'Private space';
            auth_basic_user_file /PATH/TO/.htpasswd;

            client_max_body_size 100m;

            proxy_pass http://HOST:PORT;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwared-For $proxy_add_x_forwarded_for;

            location ~ /(guest|css|js|fonts)/ {
                auth_basic off;
                proxy_pass http://HOST:PORT;
            }

            location /uploads/ {
                auth_basic off;
                root /PATH/TO/UPLOADS/;
            }

        }
    }

Shutter Plugin
==============

There's a plugin for the screenshot program
[Shutter](http://shutter-project.org/) included in this package; it's located
in plugins/shutter/. Just place the Fileboy.pm file in the shutter upload
plugin directory (usually
/usr/share/shutter/resources/system/upload_plugins/upload) and adapt the URL in
line 84 to your needs. Per default the plugin uses HTTP basic authentication.
You can modify username/password from within Shutter.

Please be aware that this plugin does not work in conjunction with the JID+Code
authentication option of fileboy.

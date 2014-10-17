(function() {
    window.onload = function() {
        var formElem = document.querySelector('form.jid');
        var jidElem = document.querySelector('#jid'),
            submitElem = document.querySelector('form.jid .submit');
        formElem.addEventListener('submit', function(ev) {

            var codeErrorElem = document.querySelector('form.code .error'),
                jidErrorElem = formElem.querySelector('.error'),
                jid = jidElem.value;

            jidErrorElem.style.display = "none";
            ev.preventDefault();

            $(document).ajaxError(function(event, jqXHR, ajaxSettings, error) {
                if (jqXHR.status === 403) {
                    if (ajaxSettings.url === "/login") {
                        codeErrorElem.innerHTML = "Wrong code";
                        codeErrorElem.style.display = '';
                    } else if (ajaxSettings.url.substring(0, 6) === "/code/") {
                        jidErrorElem.innerHTML = "Wrong JID";
                        jidErrorElem.style.display = '';
                        jidElem.disabled = false;
                        submitElem.disabled = false;
                    }
                }
            });
            $.ajax({
                url: "/code/" + jid,
                type: "GET"
            }).done(function() {
                var codeFormElem = document.querySelector('form.code');
                codeFormElem.style.display = "block";
                document.querySelector('#code').focus();
                codeFormElem.addEventListener('submit', function(ev) {
                    codeErrorElem.style.display = "none";
                    var code = document.querySelector('#code').value;
                    ev.preventDefault();
                    $.ajax({
                        url: "/login",
                        type: "POST",
                        data: {
                            jid: jid,
                            code: code
                        }
                    }).done(function() {
                        console.log("logged in");
                        window.location.replace(findURIParameter('return') || "/");
                    });
                });
            });
        });
        document.querySelector('#jid').focus();
    };

    function findURIParameter(parameter) {
        var tmp, result;
        window.location.search.substr(1).split("&").every(function(item) {
            tmp = item.split("=");
            if (tmp[0] === parameter) {
                result = decodeURIComponent(tmp[1]);
                return false;
            }
            return true;
        });
        return result;
    }
}());

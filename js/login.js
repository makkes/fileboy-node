(function() {
    window.onload = function() {
        var formElem = document.querySelector('form.uid');
        var uidElem = document.querySelector('#uid'),
            submitElem = document.querySelector('form.uid .submit'),
            infoElem = document.querySelector('form.uid .alert-info');
        formElem.addEventListener('submit', function(ev) {

            var codeErrorElem = document.querySelector('form.code .error'),
                uidErrorElem = formElem.querySelector('.error'),
                uid = uidElem.value;

            infoElem.style.display = "";
            infoElem.innerHTML = "Please wait...";

            uidErrorElem.style.display = "none";
            ev.preventDefault();

            $(document).ajaxError(function(event, jqXHR, ajaxSettings, error) {
                if (jqXHR.status === 403) {
                    if (ajaxSettings.url === "/login") {
                        codeErrorElem.innerHTML = jqXHR.responseText;
                        codeErrorElem.style.display = '';
                    } else if (ajaxSettings.url.substring(0, 6) === "/code/") {
                        uidErrorElem.innerHTML = jqXHR.responseText;
                        uidErrorElem.style.display = '';
                        uidElem.disabled = false;
                        submitElem.disabled = false;
                    }
                }
            });
            $.ajax({
                url: "/code/" + encodeURIComponent(uid),
                data: {
                    target: findURIParameter('target')
                },
                type: "GET"
            }).done(function() {
                var codeFormElem = document.querySelector('form.code');
                infoElem.style.display = "none";
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
                            uid: uid,
                            code: code
                        }
                    }).done(function() {
                        console.log("logged in");
                        window.location.replace(findURIParameter('target') || "/");
                    });
                });
            });
        });
        document.querySelector('#uid').focus();
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

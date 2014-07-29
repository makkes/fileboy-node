(function() {
    function size(fileSizeInBytes) {
        var i = -1;
        var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
        do {
            fileSizeInBytes = fileSizeInBytes / 1024;
            i++;
        } while (fileSizeInBytes > 1024);

        return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
    }

    function displayTotalSize(subtrahend) {
        var size_cell = document.querySelector("#admin_files .head .fsize"),
            new_size = size_cell.dataset.bytes - (subtrahend !== undefined ? subtrahend : 0),
            human_readable_size = size(new_size);
        document.querySelector("#total_size").innerHTML = "(" + human_readable_size + ")";
        size_cell.dataset.bytes = new_size;
    }

    function deleteFile(anchor, successCallback) {
        var file_url, tmp_anchor;

        if (!anchor.classList.contains("delete")) {
            return;
        }
        file_name = anchor.dataset.url;
        tmp_anchor = document.createElement("a");
        tmp_anchor.href = file_name;
        $.ajax({
            url: "/admin/delete",
            type: "POST",
            data: {
                "file_path": tmp_anchor.pathname
            }
        }).done(function() {
            displayTotalSize(anchor.parentElement.parentElement.querySelector(".fsize").dataset.bytes);
            if (typeof successCallback === "function") {
                successCallback();
            }
        }).fail(function(jqhxr, err) {
            alert(err);
        });
    }

    function refreshPassCount(cnt) {
        document.querySelector('#pass_count').innerHTML = cnt;
    }

    function isElementInViewport(elem) {
        var rect = elem.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    function initEventListeners() {
        document.querySelector("#admin_files").addEventListener('click', function(ev) {
            var prevSelected = document.querySelector("#admin_files .fentry.active");
            if (prevSelected) {
                prevSelected.classList.toggle("active");
            }
            ev.target.parentElement.classList.toggle("active");
            if (!isElementInViewport(ev.target.parentElement)) {
                ev.target.parentElement.scrollIntoView();
            }
        });

        document.querySelector("#invite").addEventListener("click", function(ev) {
            $.getJSON("/admin/invite")
                .done(function(res) {
                    var reselem = document.querySelector("#guest_url");
                    reselem.value = res.url;
                    reselem.select();
                    refreshPassCount(res.passes);
                }).fail(function(jqhxr, err) {
                    alert(err);
                });
        });

        document.querySelector("#admin_files").addEventListener("click", function(ev) {
            var elem = ev.target.parentElement;
            var rowElement = elem.parentElement.parentElement;
            var nextSelected = rowElement.nextElementSibling;
            if (!nextSelected) {
                nextSelected = rowElement.previousElementSibling;
            }
            deleteFile(elem, function() {
                rowElement.remove();
                nextSelected.classList.toggle("active");
                if (!isElementInViewport(nextSelected)) {
                    nextSelected.scrollIntoView();
                }
            });
        });

        document.querySelector("#revoke_passes").addEventListener('click', function(ev) {
            $.ajax({
                url: "/admin/revoke_passes",
                type: "GET"
            }).done(function(pass_count) {
                refreshPassCount(pass_count);
                document.querySelector("#guest_url").value = "";
            });
        });
    }

    function initShortcuts() {
        shortcut.add('j', function(ev) {
            var prevElem = document.querySelector("#admin_files .fentry.active"),
                nextElem;
            if (!prevElem) {
                return; // list is empty
            }
            nextElem = prevElem.nextElementSibling;
            if (nextElem) {
                prevElem.classList.toggle("active");
                nextElem.classList.toggle("active");
                if (!isElementInViewport(nextElem)) {
                    nextElem.scrollIntoView();
                }
            }
        });

        shortcut.add('k', function(ev) {
            var prevElem = document.querySelector("#admin_files .fentry.active"),
                nextElem;
            if (!prevElem) {
                return; // list is empty
            }
            nextElem = prevElem.previousElementSibling;
            if (nextElem && nextElem.classList.contains("fentry")) {
                prevElem.classList.toggle("active");
                nextElem.classList.toggle("active");
                if (!isElementInViewport(nextElem)) {
                    nextElem.scrollIntoView();
                }
            }
        });

        shortcut.add('Return', function(ev) {
            var currElem = document.querySelector("#admin_files .fentry.active a");
            if (!currElem) {
                return; // no element selected;
            }
            currElem.click();
        });

        shortcut.add('d', function(ev) {
            var currElem = document.querySelector("#admin_files .fentry.active");
            if (!currElem) {
                return; // no element selected
            }
            var deleteLink = document.querySelector("#admin_files .fentry.active a.delete");
            var nextSelected = currElem.nextElementSibling;
            if (!nextSelected) {
                nextSelected = currElem.previousElementSibling;
            }
            deleteFile(deleteLink, function() {
                currElem.remove();
                nextSelected.classList.toggle("active");
            });
        });

        shortcut.add('g', function(ev) {
            var curr_elem = document.querySelector("#admin_files .fentry.active"),
                first_child = document.querySelector("#admin_files .fentry:nth-child(2)");
            if (curr_elem) {
                curr_elem.classList.toggle("active");
            }
            first_child.classList.toggle("active");
            if (!isElementInViewport(first_child)) {
                first_child.scrollIntoView();
            }
        });

        shortcut.add('Shift+g', function(ev) {
            var curr_elem = document.querySelector("#admin_files .fentry.active"),
                last_child = document.querySelector("#admin_files .fentry:last-child");
            if (curr_elem) {
                curr_elem.classList.toggle("active");
            }
            last_child.classList.toggle("active");
            if (!isElementInViewport(last_child)) {
                last_child.scrollIntoView();
            }
        });
    }

    window.onload = function() {
        var firstEntry = document.querySelector("#admin_files .fentry");
        if (firstEntry) {
            firstEntry.classList.toggle("active");
        }

        displayTotalSize();
        initEventListeners();
        initShortcuts();
    };
}());

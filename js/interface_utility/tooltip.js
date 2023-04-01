let ToolTip = function (id) {
    let tooltipDiv = $("<div>");
    tooltipDiv.addClass("tooltip-div");
    tooltipDiv.attr("id", id);
    $("body").append(tooltipDiv);

    function show(str, pos) {
        tooltipDiv.css({
            left: pos.x + 10,
            top: pos.y + 10
        });
        tooltipDiv.html(str);

        if (pos.x + 10 + tooltipDiv.outerWidth() > window.innerWidth) {
            tooltipDiv.css({
                left: pos.x - 10 - tooltipDiv.outerWidth(),
            });
        }

        if (pos.y + 10 + tooltipDiv.outerHeight() > window.innerHeight) {
            tooltipDiv.css({
                top: pos.y - 10 - tooltipDiv.outerHeight(),
            });
        }

        tooltipDiv.show();
    }

    function hide() {
        tooltipDiv.hide();
    }

    return { show, hide }
};

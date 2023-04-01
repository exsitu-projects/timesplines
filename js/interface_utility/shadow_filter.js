let FilterUtil = function () {
    const SHADOW_ID = "shadow-filter";
    const SHADOW_TRANSFORM = "translate(-2,-2)";

    let mShadowFilter;

    function initializeShadowFilter(svg) {
        let defs = svg.select('defs').node()
            ? svg.select('defs')
            : svg.append('defs');
        mShadowFilter = defs.append("filter")
            .attr("id", SHADOW_ID)
            .attr("filterUnits", "userSpaceOnUse");
        mShadowFilter.append("feOffset")
            .attr("result", "offOut")
            .attr("in", "SourceAlpha")
            .attr("dx", 2)
            .attr("dy", 2);
        mShadowFilter.append("feGaussianBlur")
            .attr("result", "blurOut")
            .attr("in", "offOut")
            .attr("stdDeviation", 1);
        mShadowFilter.append("feComponentTransfer")
            .append("feFuncA")
            .attr("in", "blurOut")
            .attr("result", "fadeOut")
            .attr("type", "linear")
            .attr("slope", 0.3);
        mShadowFilter.append("feBlend")
            .attr("in", "SourceGraphic")
            .attr("in2", "fadeOut")
            .attr("mode", "normal");
    }

    function setFilterDisplayArea(x, y, width, height) {
        mShadowFilter
            .attr("x", x)
            .attr("y", y)
            .attr("width", width)
            .attr("height", height);
    }

    function applyShadowFilter(selection) {
        if (selection.empty()) return;

        // avoid double adds
        removeShadowFilter(selection);

        let currFilters = selection.attr("filter");
        if (!currFilters) currFilters = "";
        selection.attr("filter", currFilters + " url(#" + SHADOW_ID + ")");
        let currTransforms = selection.attr("transform");
        if (!currTransforms) currTransforms = "";
        selection.attr("transform", currTransforms + " " + SHADOW_TRANSFORM);
    }

    function removeShadowFilter(selection) {
        if (selection.empty()) return;

        let currFilters = selection.attr("filter");
        if (!currFilters) currFilters = "";
        selection.attr("filter", currFilters
            .split(" ")
            .filter(d => d != "url(#" + SHADOW_ID + ")")
            .join(" "));

        let currTransforms = selection.attr("transform");
        if (!currTransforms) currTransforms = "";
        selection.attr("transform", currTransforms
            .split(" ")
            .filter(d => d != SHADOW_TRANSFORM)
            .join(" "));
    }

    return {
        initializeShadowFilter,
        applyShadowFilter,
        removeShadowFilter,
        setFilterDisplayArea,
    }
}();
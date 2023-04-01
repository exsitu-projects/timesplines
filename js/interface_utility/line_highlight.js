function LineHighlight(parent) {
    let mHighlight = parent.append('path')
        .attr('id', 'highlight-path')
        .attr('stroke', 'blue')
        .attr('fill', 'none')
        .attr('stroke-width', 5)
        .style('isolation', 'auto')

    let mLastPointSet = [];
    let mPathLength = 0;
    let mPathStruct = []

    this.showAround = function (points, centerPercent, length) {
        let len = PathMath.getPathLength(points);
        let centerLen = len * centerPercent;
        let lowPercent = (centerLen - length / 2) / len
        let highPercent = (centerLen + length / 2) / len
        this.show(points, Math.max(lowPercent, 0), Math.min(highPercent, 1))
    }

    this.show = function (points, startpercent, endPercent) {
        if (!PathMath.equalsPath(mLastPointSet, points)) {
            mLastPointSet = points;
            mPathLength = PathMath.getPathLength(points);

            if (mPathLength < 20) {
                mPathStruct = [points[0]];
            } else {
                mPathStruct = Array.from(Array(Math.floor(mPathLength / 10)).keys())
                    .map(i => PathMath.getPositionForPercent(points, i * 10 / mPathLength))
            }

            mPathStruct.push(points[points.length - 1])
        }

        let startIndex = Math.floor(startpercent * mPathLength / 10);
        let endIndex = Math.ceil(endPercent * mPathLength / 10);

        mHighlight.attr('d', PathMath.getPathD(mPathStruct.slice(startIndex, endIndex)));
        mHighlight.style('visibility', '');
        mHighlight.raise();
    }

    this.hide = function () { mHighlight.style('visibility', 'hidden'); };
    // start hidden
    this.hide();
}

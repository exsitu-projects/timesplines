function ColorBrushController(vizLayer, overlayLayer, interactionLayer) {
    const BRUSH_SIZE_MIN = 0.75;
    const BRUSH_SIZE_MAX = 200;

    let mActive = false;
    let mColor = '#000000'
    let mRadius = 2;

    let mDragging = false;
    let mDraggedPoints = [];

    let mDrawFinishedCallback = () => { };

    let mDrawingGroup = interactionLayer.append('g')
        .attr("id", 'color-drawing-g')
        .style("visibility", 'hidden');

    // this must be under the mDrawing group else it capure events it shouldn't.
    let mColorLine = mDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', mRadius * 2)

    let mCover = overlayLayer.append('rect')
        .attr('id', "color-brush-cover")
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.2')
        .style("visibility", 'hidden');

    let mBrush = vizLayer.append("circle")
        .attr("id", "timeline-drawing-brush")
        .attr('fill', '#000000')
        .attr('r', mRadius)
        .style("visibility", 'hidden');

    function onPointerDown(coords) {
        if (mActive) {
            mDragging = true;
        }
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            mDraggedPoints.push(coords);
            mColorLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
        mBrush.attr("cx", coords.x).attr("cy", coords.y);
    }

    function onPointerUp(coords) {
        if (mActive && mDragging && mDraggedPoints.length > 1) {
            let result = [...mDraggedPoints]
            mDrawFinishedCallback(result, mColor, mRadius);
        }

        mDragging = false;
        mDraggedPoints = [];
        mColorLine.attr('d', PathMath.getPathD([]));
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mDrawingGroup.style('visibility', "");
            mCover.style("visibility", '')
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height);
            mBrush.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mDrawingGroup.style('visibility', "hidden");
            mCover.style('visibility', "hidden");
            mBrush.style('visibility', "hidden");
        }
    }

    function setColor(color) {
        mColor = color;
        mColorLine.attr('stroke', color);
        mBrush.attr("fill", mColor);
    }

    function increaseBrushRadius() {
        mRadius = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mRadius * 1.30));
        mBrush.attr("r", mRadius);
        mColorLine.attr("stroke-width", mRadius * 2);
    }

    function decreaseBrushRadius() {
        mRadius = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mRadius * 0.70));
        mBrush.attr("r", mRadius);
        mColorLine.attr("stroke-width", mRadius * 2);
    }

    function onWheel(delta) {
        if (mActive) {
            mRadius = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mRadius + delta / 50));
            mBrush.attr("r", mRadius);
            mColorLine.attr("stroke-width", mRadius * 2);
        }
    }

    this.setActive = setActive;
    this.setColor = setColor;
    this.getColor = () => mColor;
    this.increaseBrushRadius = increaseBrushRadius;
    this.decreaseBrushRadius = decreaseBrushRadius;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;

    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
    this.onWheel = onWheel;
}
function BrushController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;
    let mFreeze = false;
    let mBrushRadius = 50;

    let mBrushGroup = interactionLayer.append('g')
        .classed('brush-g', true)
        .style('visibility', 'hidden');

    let mBrush = mBrushGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', mBrushRadius)
        .attr('stroke', 'black')
        .attr('stroke-wdith', 2)
        .attr('fill', 'none');

    function setBrushRadius(brushRadius) {
        mBrushRadius = brushRadius;
        mBrush.attr('r', mBrushRadius);
    }

    function onPointerMove(coords) {
        if (!mFreeze) {
            mBrush.attr('cx', coords.x);
            mBrush.attr('cy', coords.y);
        }
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mBrushGroup.style('visibility', '');

        } else if (!active && mActive) {
            mActive = false;
            mBrushGroup.style('visibility', 'hidden');
        }
    }

    this.freeze = (freeze) => mFreeze = freeze;
    this.setActive = setActive;
    this.onPointerMove = onPointerMove;
    this.getBrushRadius = () => mBrushRadius;
    this.setBrushRadius = setBrushRadius;
}
function EraserController(vizLayer, overlayLayer, interactionLayer) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 800;

    let mActive = false;
    let mDragging = false;
    let mBrushRadius = 0;
    let mDraggedPoints = [];

    let mEraseCallback = (canvasMask) => { };

    let mEraserGroup = interactionLayer.append('g')
        .classed('eraser-g', true)
        .style('visibility', 'hidden');

    let mEraserLine = mEraserGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    let mBrushController = new BrushController(vizLayer, overlayLayer, interactionLayer);

    function updateModel(model) {
        mEraserLine.attr('stroke', model.getCanvas().color)
    }

    function onPointerDown(coords) {
        if (mActive) {
            mBrushRadius = mBrushController.getBrushRadius();
            mDragging = true;
            mEraserLine.attr('stroke-width', mBrushRadius * 2);
        }
    }

    function onPointerMove(coords) {
        mBrushController.onPointerMove(coords);

        if (mActive && mDragging) {
            mDraggedPoints.push(coords);
            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    async function onPointerUp() {
        if (mActive && mDragging) {
            mDragging = false;

            let eraserOutline = mEraserLine.node().getBBox();
            // eraser outline only takes the path coords into account, not the width
            let canvasWidth = eraserOutline.width + mBrushRadius * 2;
            let canvasHeight = eraserOutline.height + mBrushRadius * 2;
            let canvasX = eraserOutline.x - mBrushRadius;
            let canvasY = eraserOutline.y - mBrushRadius;

            let canvas = await DataUtil.svgToCanvas(mEraserLine.clone().node(), canvasX, canvasY, canvasWidth, canvasHeight);
            let mask = new CanvasMask(canvas, canvasX, canvasY, canvasWidth, canvasHeight);

            mEraseCallback(mask);

            // reset
            mDraggedPoints = [];
            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onWheel(delta) {
        if (mActive) {
            mBrushController.setBrushRadius(
                Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mBrushController.getBrushRadius() + delta / 50)))
        }
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mEraserGroup.style('visibility', '');
        } else if (!active && mActive) {
            mActive = false;
            mEraserGroup.style('visibility', 'hidden');
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.updateModel = updateModel;
    this.setEraseCallback = (callback) => mEraseCallback = callback;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
    this.onWheel = onWheel;
}
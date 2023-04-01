function ResizeController(parent) {
    const TARGET_SIZE = 20;

    let mDragging = false;
    let mDraggingData;
    let mDraggingStartPosition;
    let mDragStartCallback = (event, bounds) => { };
    let mDragCallback = (coords, bounds) => { };
    let mDragEndCallback = (coords, bounds) => { };

    let mBoundingBox;
    let mProportionsConstrained;

    let mControlsGroup = parent.append('g')
        .attr('id', 'resize-controls-g')
        .style('visibility', 'hidden');

    let mOutline = mControlsGroup.append('rect')
        .attr('id', 'resize-bottom-right')
        .attr('stroke-width', '2px')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('opacity', 0.5)
        .attr('stroke-dasharray', '9, 5')

    mControlsGroup.selectAll('.resize-point').data(makeData(0, 0, 0, 0)).enter()
        .append('circle')
        .classed('resize-point', true)
        .attr('r', 6)
        .attr('cursor', 'pointer')
        .attr('fill', '#1c1db5')
        .attr('stroke', 'black');

    mControlsGroup.selectAll('.resize-target').data(makeData(0, 0, 0, 0)).enter()
        .append('circle')
        .classed('resize-target', true)
        .attr('r', TARGET_SIZE)
        .attr('opacity', 0)
        .attr('cursor', 'pointer')
        .on('pointerdown', function (e, d) {
            mDragging = true;
            mDraggingData = d;
            mDraggingStartPosition = mDragStartCallback(e, mBoundingBox);
        })

    function show(x1, y1, x2, y2, constrained) {
        if (x1 == x2 || y1 == y2) {
            console.error('Cannot draw boudning box! Invalid dimentions: (' + x1 + ',' + y1 + ') (' + x2 + ',' + y2 + ')')
            return;
        }
        mBoundingBox = { x1, y1, x2, y2 };
        mProportionsConstrained = constrained;

        draw(x1, y1, x2, y2);

        mControlsGroup.style('visibility', '');
    }

    function hide() {
        mControlsGroup.style('visibility', 'hidden');
    }

    function onPointerMove(coords) {
        onPointer(coords, false)
    }

    function onPointerUp(coords) {
        onPointer(coords, true)
    }

    function onPointer(coords, isUp) {
        if (mDragging) {
            let dragCoords = { x: coords.x, y: coords.y }
            if (mProportionsConstrained) {
                let origin = { x: mDraggingData.x, y: mDraggingData.y };
                let vector = MathUtil.vectorFromAToB(origin, {
                    x: mDraggingData.left ? mBoundingBox.x2 : mBoundingBox.x1,
                    y: mDraggingData.top ? mBoundingBox.y2 : mBoundingBox.y1
                })
                dragCoords = MathUtil.projectPointOntoVector(coords, vector, origin)
            }
            let newBounds = {
                x1: mDraggingData.left ? dragCoords.x : mBoundingBox.x1,
                x2: mDraggingData.left ? mBoundingBox.x2 : dragCoords.x,
                y1: mDraggingData.top ? dragCoords.y : mBoundingBox.y1,
                y2: mDraggingData.top ? mBoundingBox.y2 : dragCoords.y,
            };

            if (newBounds.x1 >= newBounds.x2) {
                newBounds.x2 = newBounds.x1 + 1;
            }

            if (newBounds.y1 >= newBounds.y2) {
                newBounds.y2 = newBounds.y1 + 1;
            }

            draw(newBounds.x1, newBounds.y1, newBounds.x2, newBounds.y2);

            if (!isUp) {
                mDragCallback(dragCoords, mDraggingStartPosition, newBounds);
            } else {
                mDragEndCallback(dragCoords, mDraggingStartPosition, newBounds);
                mDragging = false;
            }
        }
    }

    function draw(x1, y1, x2, y2) {
        let data = makeData(x1, y1, x2, y2);
        mControlsGroup.selectAll('.resize-point').data(data)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
        mControlsGroup.selectAll('.resize-target').data(data)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
        mOutline
            .attr('x', Math.min(x1, x2))
            .attr('y', Math.min(y1, y2))
            .attr('width', Math.abs(x2 - x1))
            .attr('height', Math.abs(y2 - y1))
    }

    function makeData(x1, y1, x2, y2) {
        return [
            { top: true, left: true, x: x1, y: y1 },
            { top: true, right: true, x: x2, y: y1 },
            { bottom: true, left: true, x: x1, y: y2 },
            { bottom: true, right: true, x: x2, y: y2 },
        ]
    }

    this.show = show;
    this.hide = hide;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
}
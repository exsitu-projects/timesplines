function DeformController(vizLayer, overlayLayer, interactionLayer) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 800;

    let mActive = false;
    let mTimelines = [];
    let mLineModifiedCallback = () => { };
    let mDragStartCallback = (timelineId, e) => { return { x: e.x, y: e.y } }

    let mBrushController = new BrushController(vizLayer, overlayLayer, interactionLayer);
    let mDeformGroup = interactionLayer.append('g')
        .attr("id", 'deform-g')
        .style("visibility", 'hidden');

    let mCover = overlayLayer.append('rect')
        .attr('id', "deform-cover")
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.8')
        .style("visibility", 'hidden');

    let mMovingLines = []
    let mDragging = false;
    let mDragStartPos = null;

    function onPointerDown(coords) {
        if (mActive) {
            let brushRadius = mBrushController.getBrushRadius();
            mDragging = true;
            mDragStartPos = coords;
            mTimelines.forEach(line => {
                let closestPoint = PathMath.getClosestPointOnPath(coords, line.points);
                if (MathUtil.distanceFromAToB(closestPoint, coords) < brushRadius) {
                    let oldSegments = PathMath.segmentPath(line.points,
                        (point) => MathUtil.distanceFromAToB(point, coords) < brushRadius ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);
                    let newSegments = PathMath.cloneSegments(oldSegments);

                    mMovingLines.push({
                        id: line.id,
                        color: line.color,
                        oldSegments,
                        newSegments
                    });
                }
            });

            if (mMovingLines.length > 0) {
                mCover.style("visibility", '')
                    .attr('width', overlayLayer.node().getBBox().width)
                    .attr('height', overlayLayer.node().getBBox().height);
            }
        }
    }

    function onPointerMove(coords) {
        mBrushController.onPointerMove(coords);

        if (mActive && mDragging) {
            let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
            let linesData = mMovingLines.map(lineData => {
                return {
                    points: PathMath.mergeSegments(moveSegments(lineData.newSegments, diff)),
                    color: lineData.color
                }
            });

            drawLines(linesData);
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            mDragging = false;
            let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
            let result = mMovingLines.map(line => {
                return {
                    id: line.id,
                    oldSegments: line.oldSegments,
                    newSegments: moveSegments(line.newSegments, diff)
                }
            });
            mLineModifiedCallback(result);
        }

        // reset
        mMovingLines = []
        mDragStartPos = null
        drawLines([]);
        mCover.style("visibility", 'hidden');
    }

    function onWheel(delta) {
        if (mActive) {
            mBrushController.setBrushRadius(
                Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mBrushController.getBrushRadius() + delta / 50)))
        }
    }

    function updateModel(model) {
        mTimelines = model.getAllTimelines();
    }

    function moveSegments(segments, amount) {
        let returnable = []
        segments.forEach((segment) => {
            if (segment.label == SEGMENT_LABELS.CHANGED) {
                returnable.push({
                    label: segment.label,
                    points: segment.points.map((point) => {
                        return { x: point.x + amount.x, y: point.y + amount.y };
                    })
                })
            } else return returnable.push(segment);
        })
        return returnable;
    }

    function drawLines(data) {
        let paths = mDeformGroup.selectAll('.timeline-path').data(data);
        paths.enter().append('path')
            .classed('timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mDeformGroup.selectAll('.timeline-path')
            .attr('stroke', d => d.color)
            .attr('d', d => PathMath.getPathD(d.points));
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mDeformGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mDeformGroup.style('visibility', "hidden");
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.updateModel = updateModel;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
    this.onWheel = onWheel;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
}
function SmoothController(vizLayer, overlayLayer, interactionLayer) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 800;
    const MIN_RESOLUTION = 2;

    let mActive = false;
    let mTimelines = [];
    let mLineModifiedCallback = () => { };

    let mDragging = false;

    let mSmoothGroup = interactionLayer.append('g')
        .attr("id", 'smooth-g')
        .style("visibility", 'hidden');
    let mLinesGroup = mSmoothGroup.append('g');

    let mCover = overlayLayer.append('rect')
        .attr('id', "smooth-cover")
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.8')
        .style("visibility", 'hidden');

    let mMovingLines = [];
    let mStartPosition = null;
    let mBrushController = new BrushController(vizLayer, overlayLayer, interactionLayer);

    function onPointerDown(coords) {
        if (mActive) {
            mDragging = true;
            mStartPosition = coords;

            let radius = mBrushController.getBrushRadius();
            mTimelines.forEach(line => {
                let oldSegments = PathMath.segmentPath(line.points,
                    (point) => MathUtil.distanceFromAToB(point, coords) < radius ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);

                if (oldSegments.length == 0) { console.error("Failed to get segments for line", line); return; };

                if (oldSegments.length > 1 || oldSegments[0].label == SEGMENT_LABELS.CHANGED) {
                    let newSegments = PathMath.cloneSegments(oldSegments);
                    mMovingLines.push({ id: line.id, oldSegments, newSegments, color: line.color });
                }
            })

            mBrushController.freeze(true);
            mCover.style("visibility", '')
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height)

            onPointerMove(coords);
        }
    }

    function onPointerMove(coords) {
        mBrushController.onPointerMove(coords);

        if (mActive && mDragging) {
            let smoothStrength = Math.max(0, MathUtil.distanceFromAToB(mStartPosition, coords) - 20)
            let drawingLines = mMovingLines.map(lineData => {
                return {
                    points: PathMath.mergeSegments(smoothSegments(lineData.newSegments, smoothStrength)),
                    color: lineData.color,
                }
            });

            drawLines(drawingLines);
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            mDragging = false;
            let radius = mBrushController.getBrushRadius();
            let smoothStrength = Math.max(0, MathUtil.distanceFromAToB(mStartPosition, coords) - 20);
            let result = mMovingLines.map(line => {
                return {
                    id: line.id,
                    oldSegments: line.oldSegments,
                    newSegments: smoothSegments(line.newSegments, smoothStrength)
                }
            });
            mLineModifiedCallback(result);

            // reset
            mMovingLines = []
            mStartPosition = null;
            drawLines([]);
            mCover.style("visibility", 'hidden');
            mBrushController.freeze(false);
        }
    }

    function smoothSegments(segments, smoothStrength) {
        let returnArray = [];
        segments.forEach(segment => {
            if (segment.label == SEGMENT_LABELS.UNAFFECTED) {
                returnArray.push(segment);
            } else {
                let line = MathUtil.vectorFromAToB(segment.points[0], segment.points[segment.points.length - 1]);
                let movedPoints = [];
                segment.points.forEach(point => {
                    // first and last points will also be projected, but they are already on line, so that's fine.
                    let projectPoint = MathUtil.projectPointOntoVector(point, line, segment.points[0]);
                    let length = MathUtil.distanceFromAToB(projectPoint, point);
                    if (length > 0) {
                        let vector = MathUtil.vectorFromAToB(projectPoint, point);
                        let newPoint = MathUtil.getPointAtDistanceAlongVector(Math.max(length - smoothStrength, 0), vector, projectPoint);
                        movedPoints.push(newPoint);
                    } else {
                        movedPoints.push(point);
                    }
                });

                let newPoints = [movedPoints[0]];
                for (let i = 1; i < movedPoints.length - 1; i++) {
                    let point = movedPoints[i];
                    if (MathUtil.distanceFromAToB(movedPoints[i - 1], point) > MIN_RESOLUTION) {
                        let line = MathUtil.vectorFromAToB(movedPoints[i - 1], movedPoints[i + 1]);
                        let projectPoint = MathUtil.projectPointOntoVector(point, line, movedPoints[i - 1]);
                        let length = MathUtil.distanceFromAToB(projectPoint, point);
                        if (length > 0) newPoints.push(point);
                    }
                }
                if (newPoints.length > 1 && MathUtil.distanceFromAToB(newPoints[newPoints.length - 1], movedPoints[movedPoints.length - 1]) < MIN_RESOLUTION) {
                    newPoints.pop();
                }
                newPoints.push(movedPoints[movedPoints.length - 1]);

                returnArray.push({ label: segment.label, points: newPoints });
            }
        });
        return returnArray;
    }

    function drawLines(lineData) {
        let paths = mLinesGroup.selectAll('.timeline-path').data(lineData);
        paths.enter().append('path')
            .classed('timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLinesGroup.selectAll('.timeline-path')
            .attr('stroke', d => d.color)
            .attr('d', d => PathMath.getPathD(d.points));
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
            mSmoothGroup.style('visibility', "")
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height)
        } else if (!active && mActive) {
            mActive = false;
            mSmoothGroup.style('visibility', "hidden");
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.updateModel = (model) => mTimelines = model.getAllTimelines();
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
    this.onWheel = onWheel;
}

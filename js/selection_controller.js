function SelectionController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;

    let mModel = null;

    let mLineModifiedCallback = () => { };
    let mDragStartCallback = (timelineId, e) => { return { x: e.clientX, y: e.clientY } }

    let mSelectedTimeline = null;

    let mCover = overlayLayer.append('rect')
        .attr('id', "selection-cover")
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.8')
        .style("visibility", 'hidden');

    let mSelectionGroup = interactionLayer.append('g')
        .attr("id", 'selection-g')
        .style("visibility", 'hidden');
    let mStartRotatePoint = mSelectionGroup.append("circle")
        .attr("id", "line-selection-start-point")
        .attr('r', 5)
        .attr('cursor', 'pointer')
        .attr('fill', '#1c1db5')
        .attr("stroke", "black")
        .style("visibility", 'hidden');
    let mStartRotatePointTarget = mSelectionGroup.append("circle")
        .attr("id", "line-selection-start-point-target")
        .attr('r', 20)
        .attr('fill', '#000000')
        .attr('cursor', 'pointer')
        .attr('opacity', 0)
        .style("visibility", 'hidden');
    let mEndRotatePoint = mSelectionGroup.append("circle")
        .attr("id", "line-selection-end-point")
        .attr('r', 5)
        .attr('fill', '#1c1db5')
        .attr("stroke", "black")
        .style("visibility", 'hidden');
    let mEndRotatePointTarget = mSelectionGroup.append("circle")
        .attr("id", "line-selection-end-point-target")
        .attr('r', 20)
        .attr('fill', '#000000')
        .attr('cursor', 'pointer')
        .attr('opacity', 0)
        .style("visibility", 'hidden');

    let mLine = mSelectionGroup.append('path')
        .attr("id", "line-selection-line")
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)
        .style("visibility", 'hidden');

    let mDragging = false;

    let mRotatingStart = false;
    let mRotatingEnd = false;
    let mRotatatingPointsMapping = null;

    let mStartPos = null;

    function updateModel(model) {
        mModel = model;

        if (mSelectedTimeline) mSelectedTimeline = mModel.getTimelineById(mSelectedTimeline.id);

        if (mSelectedTimeline) {
            setTimelineControls(mSelectedTimeline)
        } else {
            // deselect
            mStartRotatePoint.style("visibility", 'hidden');
            mStartRotatePointTarget.style("visibility", 'hidden');
            mEndRotatePoint.style("visibility", 'hidden');
            mEndRotatePointTarget.style("visibility", 'hidden');
        }
    }

    mStartRotatePointTarget.on('pointerdown', function (e, d) {
        if (mActive) {
            mRotatingStart = true;
            rotationStart(e, d);
        }
    });

    mEndRotatePointTarget.on('pointerdown', function (e, d) {
        if (mActive) {
            mRotatingEnd = true;
            rotationStart(e, d);
        }
    });

    function rotationStart(e, d) {
        mStartPos = mDragStartCallback(d.id, e);
        mRotatatingPointsMapping = pointsToPercentDistMapping(d.points);

        mCover.style("visibility", '')
            .attr('width', overlayLayer.node().getBBox().width)
            .attr('height', overlayLayer.node().getBBox().height);
        mLine.attr('stroke', d.color)
            .attr('d', PathMath.getPathD(d.points))
            .style('visibility', "");
        mStartRotatePoint.style("visibility", 'hidden');
        mStartRotatePointTarget.style("visibility", 'hidden');
        mEndRotatePoint.style("visibility", 'hidden');
        mEndRotatePointTarget.style("visibility", 'hidden');
    }

    function onPointerDown(coords) {
        // background clicked
        if (mActive) {
            mSelectedTimeline = null;

            mStartRotatePoint.style("visibility", 'hidden');
            mStartRotatePointTarget.style("visibility", 'hidden');
            mEndRotatePoint.style("visibility", 'hidden');
            mEndRotatePointTarget.style("visibility", 'hidden');
        }
    }

    function onTimelineDragStart(timelineId, coords) {
        if (mActive) {
            mDragging = true;
            mStartPos = coords;
            mSelectedTimeline = mModel.getTimelineById(timelineId)
            setTimelineControls(mSelectedTimeline);

            mCover.style("visibility", '')
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height);
            mLine.attr('stroke', mSelectedTimeline.color)
                .attr('d', PathMath.getPathD(mSelectedTimeline.points))
                .style('visibility', "");
            mStartRotatePoint.style("visibility", 'hidden');
            mStartRotatePointTarget.style("visibility", 'hidden');
            mEndRotatePoint.style("visibility", 'hidden');
            mEndRotatePointTarget.style("visibility", 'hidden');
        }
    }

    function setTimelineControls(timeline) {
        mStartRotatePoint
            .attr('cx', timeline.points[0].x)
            .attr('cy', timeline.points[0].y);
        mStartRotatePointTarget.datum(timeline)
            .attr('cx', timeline.points[0].x)
            .attr('cy', timeline.points[0].y);

        mEndRotatePoint
            .attr('cx', timeline.points[timeline.points.length - 1].x)
            .attr('cy', timeline.points[timeline.points.length - 1].y);
        mEndRotatePointTarget.datum(timeline)
            .attr('cx', timeline.points[timeline.points.length - 1].x)
            .attr('cy', timeline.points[timeline.points.length - 1].y);
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            let diff = MathUtil.subtractAFromB(mStartPos, coords);
            let points = mSelectedTimeline.points.map((point) => {
                return { x: point.x + diff.x, y: point.y + diff.y };
            });
            mLine.attr('d', PathMath.getPathD(points));
        }

        if (mActive && mRotatingEnd) {
            let lineStart = mSelectedTimeline.points[0];
            let points = percentDistMappingToPoints(mRotatatingPointsMapping, lineStart, coords)
            mLine.attr('d', PathMath.getPathD(points));
        }

        if (mActive && mRotatingStart) {
            let lineEnd = mSelectedTimeline.points[mSelectedTimeline.points.length - 1];
            let points = percentDistMappingToPoints(mRotatatingPointsMapping, coords, lineEnd)
            mLine.attr('d', PathMath.getPathD(points));
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            let diff = MathUtil.subtractAFromB(mStartPos, coords);

            if (MathUtil.distanceFromAToB(mStartPos, coords) > 3) {
                let points = mSelectedTimeline.points.map((point) => {
                    return { x: point.x + diff.x, y: point.y + diff.y };
                });

                mLineModifiedCallback(mSelectedTimeline.id, mSelectedTimeline.points, points);
            }
        }

        if (mActive && mRotatingEnd) {
            let lineStart = mSelectedTimeline.points[0];
            let points = percentDistMappingToPoints(mRotatatingPointsMapping, lineStart, coords);
            mLineModifiedCallback(mSelectedTimeline.id, mSelectedTimeline.points, points);
        }

        if (mActive && mRotatingStart) {
            let lineEnd = mSelectedTimeline.points[mSelectedTimeline.points.length - 1];
            let points = percentDistMappingToPoints(mRotatatingPointsMapping, coords, lineEnd)
            mLineModifiedCallback(mSelectedTimeline.id, mSelectedTimeline.points, points);
        }

        // reset
        if (mActive && (mDragging || mRotatingEnd || mRotatingStart)) {
            mRotatingEnd = false;
            mRotatingStart = false;
            mDragging = false;
            mStartPos = null
            mRotatatingPointsMapping = null;

            mCover.style("visibility", 'hidden');
            mLine.style("visibility", 'hidden');
            mStartRotatePoint.style("visibility", '');
            mStartRotatePointTarget.style("visibility", '');
            mEndRotatePoint.style("visibility", '');
            mEndRotatePointTarget.style("visibility", '');
        }
    }

    function pointsToPercentDistMapping(points) {
        let lineStart = points[0];
        let lineEnd = points[points.length - 1];

        let len = MathUtil.distanceFromAToB(lineStart, lineEnd);
        if (len == 0) throw new Error("Line start and line end are the same!")

        let vector = MathUtil.vectorFromAToB(lineStart, lineEnd);
        let result = []
        points.forEach(point => {
            let projectedPoint = MathUtil.projectPointOntoVector(point, vector, lineStart);
            let projPercent = (projectedPoint.neg ? -1 : 1) * MathUtil.distanceFromAToB(lineStart, projectedPoint) / len;

            let normal = MathUtil.rotateVectorRight(MathUtil.normalize(vector));
            let neg = MathUtil.projectPointOntoVector(point, normal, projectedPoint).neg;
            let distance = (neg ? -1 : 1) * MathUtil.distanceFromAToB(projectedPoint, point);

            result.push({ percent: projPercent, distPercent: distance / len })
        })
        return result;
    }

    function percentDistMappingToPoints(mapping, lineStart, lineEnd) {
        let lineVector = MathUtil.vectorFromAToB(lineStart, lineEnd);
        let len = MathUtil.distanceFromAToB(lineStart, lineEnd);
        if (len == 0) {
            // we appear to have eliminated the line, tweak it to avoid errors. 
            lineEnd.x++;
            lineVector = MathUtil.vectorFromAToB(lineStart, lineEnd);
            len = MathUtil.distanceFromAToB(lineStart, lineEnd);
        }
        let normal = MathUtil.rotateVectorRight(MathUtil.normalize(lineVector));
        let result = [];
        mapping.forEach(entry => {
            origin = {
                x: lineVector.x * entry.percent + lineStart.x,
                y: lineVector.y * entry.percent + lineStart.y
            }

            result.push(MathUtil.getPointAtDistanceAlongVector(entry.distPercent * len, normal, origin));
        });
        return result;
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mSelectionGroup.style('visibility', "").raise();
        } else if (!active && mActive) {
            mActive = false;
            mSelectionGroup.style('visibility', "hidden");
        }

        mActive = active;
    };

    this.updateModel = updateModel;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;

    this.onTimelineDragStart = onTimelineDragStart;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
}
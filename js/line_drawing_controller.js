function LineDrawingController(vizLayer, overlayLayer, interactionLayer) {
    const EXTENSION_POINT_RADIUS = 5;
    const TARGET_SIZE = 20;
    const LINE_RESOLUTION = 50;

    let mActive = false;
    let mColor = '#000000'

    let mDragging = false;
    let mDraggedPoints = [];
    let mDragStartParams = {};

    let mDrawFinishedCallback = () => { };
    let mStartPoints = []
    let mEndPoints = []

    let mLineDrawingGroup = interactionLayer.append('g')
        .attr('id', 'line-drawing-g')
        .style('visibility', 'hidden');

    let mCover = overlayLayer.append('rect')
        .attr('id', 'timeline-drawing-cover')
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.5')
        .style('visibility', 'hidden');

    let mDrawingLine = mLineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    let mPointsGroup = mLineDrawingGroup.append('g')
        .attr('id', 'line-drawing-points-g');
    let mPointsTargetGroup = mLineDrawingGroup.append('g')
        .attr('id', 'line-drawing-targets-g');

    function onPointerDown(coords) {
        if (mActive) {
            mDragging = true;
        }
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            mDraggedPoints.push(coords);
            mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onPointerUp(coords) {
        if (mDragging && mDraggedPoints.length > 1) {
            mDragging = false;

            if (mActive) {
                // check if we're overlapping a line cap
                // but only check valid caps.
                let capPoints = [...mStartPoints, ...mEndPoints];
                if (mDragStartParams.startPoint) {
                    capPoints = mEndPoints;
                } else if (mDragStartParams.endPoint) {
                    capPoints = mStartPoints;
                }

                let minPointData = capPoints.reduce((minPointData, pointData) => {
                    let dist = MathUtil.distanceFromAToB(pointData.point, coords);
                    if (dist < minPointData.dist) {
                        minPointData.dist = dist;
                        minPointData.timelineId = pointData.timelineId
                        minPointData.isStartPoint = pointData.isStartPoint;
                    }
                    return minPointData;
                }, { dist: EXTENSION_POINT_RADIUS });

                if (mDragStartParams.startPoint || (minPointData.timelineId && !minPointData.isStartPoint)) {
                    // if we ended on an end point or started on a start point, reverse the array so the first 
                    // points will be close to the end point, and the last points will be close to the start point
                    mDraggedPoints = mDraggedPoints.reverse();
                    mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
                }

                let startPointLineId = null;
                if (mDragStartParams.startPoint) startPointLineId = mDragStartParams.startPoint;
                if (minPointData.timelineId && minPointData.isStartPoint) startPointLineId = minPointData.timelineId;

                let endPointLineId = null;
                if (mDragStartParams.endPoint) endPointLineId = mDragStartParams.endPoint;
                if (minPointData.timelineId && !minPointData.isStartPoint) {
                    endPointLineId = minPointData.timelineId;
                }

                let result = getPointsFromLine(mDrawingLine, LINE_RESOLUTION);

                mDrawFinishedCallback(result, mColor, startPointLineId, endPointLineId);
            }
            // reset
            mDraggedPoints = [];
            mDrawingLine.attr('d', PathMath.getPathD([]));
            mDrawingLine.attr('stroke', mColor);
            mDragStartParams = {};
            mPointsGroup.selectAll('.draw-start-point').style('visibility', '');
            mPointsGroup.selectAll('.draw-end-point').style('visibility', '');
            mPointsTargetGroup.selectAll('.draw-start-target').style('visibility', '');
            mPointsTargetGroup.selectAll('.draw-end-target').style('visibility', '');
        }
    }

    function updateModel(model) {
        let timelines = model.getAllTimelines();
        mStartPoints = timelines.map(timeline => {
            return {
                timelineId: timeline.id,
                point: timeline.points[0],
                isStartPoint: true,
                color: timeline.color
            };
        })
        mEndPoints = timelines.map(timeline => {
            return {
                timelineId: timeline.id,
                point: timeline.points[timeline.points.length - 1],
                isStartPoint: false,
                color: timeline.color
            };
        })

        let startPoints = mPointsGroup.selectAll('.draw-start-point').data(mStartPoints);
        startPoints.exit().remove();
        startPoints.enter().append('circle')
            .classed('draw-start-point', true)
            .attr('timeline-id', d => d.timelineId)
            .attr('r', EXTENSION_POINT_RADIUS)
            .attr('cursor', 'crosshair')
            .attr('fill', '#b51d1c')
            .attr('stroke', 'black')
        mPointsGroup.selectAll('.draw-start-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)

        let endPoints = mPointsGroup.selectAll('.draw-end-point').data(mEndPoints);
        endPoints.exit().remove();
        endPoints.enter().append('circle')
            .classed('draw-end-point', true)
            .attr('timeline-id', d => d.timelineId)
            .attr('r', EXTENSION_POINT_RADIUS)
            .attr('cursor', 'crosshair')
            .attr('fill', '#1c1db5')
            .attr('stroke', 'black');
        mPointsGroup.selectAll('.draw-end-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)

        let startTargets = mPointsTargetGroup.selectAll('.draw-start-target').data(mStartPoints);
        startTargets.exit().remove();
        startTargets.enter().append('circle')
            .classed('draw-start-target', true)
            .attr('r', TARGET_SIZE)
            .attr('opacity', 0)
            .attr('cursor', 'pointer')
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDragStartParams.startPoint = d.timelineId;
                    mPointsGroup.selectAll('.draw-start-point').style('visibility', 'hidden');
                    mPointsGroup.select('.draw-end-point[timeline-id="' + d.timelineId + '"]').style('visibility', 'hidden');
                    mPointsTargetGroup.selectAll('.draw-start-target').style('visibility', 'hidden');
                    mPointsTargetGroup.select('.draw-end-target[timeline-id="' + d.timelineId + '"]').style('visibility', 'hidden');
                    mDrawingLine.attr('stroke', d.color);
                }
            })
        mPointsTargetGroup.selectAll('.draw-start-target')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)

        let endTargets = mPointsTargetGroup.selectAll('.draw-end-target').data(mEndPoints);
        endTargets.exit().remove();
        endTargets.enter().append('circle')
            .classed('draw-end-target', true)
            .attr('r', TARGET_SIZE)
            .attr('opacity', 0)
            .attr('cursor', 'pointer')
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDragStartParams.endPoint = d.timelineId;
                    mPointsGroup.selectAll('.draw-end-point').style('visibility', 'hidden');
                    mPointsGroup.select('.draw-start-point[timeline-id="' + d.timelineId + '"]').style('visibility', 'hidden');
                    mPointsTargetGroup.selectAll('.draw-end-target').style('visibility', 'hidden');
                    mPointsTargetGroup.select('.draw-start-target[timeline-id="' + d.timelineId + '"]').style('visibility', 'hidden');
                    mDrawingLine.attr('stroke', d.color);
                }
            })
        mPointsTargetGroup.selectAll('.draw-end-target')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)
    }

    function getPointsFromLine(line, resolution) {
        let result = [];
        for (let len = 0; len < line.node().getTotalLength(); len += resolution) {
            result.push(line.node().getPointAtLength(len));
        }
        result.push(line.node().getPointAtLength(line.node().getTotalLength()));
        return result.map(p => { return { x: p.x, y: p.y }; });
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mLineDrawingGroup.style('visibility', '');
            mCover.style('visibility', '')
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height)
        } else if (!active && mActive) {
            mActive = false;
            mLineDrawingGroup.style('visibility', 'hidden');
            mCover.style('visibility', 'hidden');
        }
    }

    function setColor(color) {
        mColor = color;
        mDrawingLine.attr('stroke', color);
    }

    this.updateModel = updateModel;
    this.setActive = setActive;
    this.setColor = setColor;
    this.getColor = () => mColor;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
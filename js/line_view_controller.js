function LineViewController(mVizLayer, mVizOverlayLayer, mInteractionLayer) {
    let mLineStyle = LineStyle.STYLE_DASHED;

    let mActive = false;
    let mLineDragStartCallback = () => { };
    let mLineDragCallback = () => { };
    let mLineDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };
    let mPointerMoveCallback = () => { };

    let mLineGroup = mVizLayer.append('g')
        .attr("id", 'line-view-g');
    let mTailGroup = mVizLayer.append('g')
        .attr("id", 'line-tail-g');

    let mTargetGroup = mInteractionLayer.append('g')
        .attr("id", 'line-view-target-g')
        .style('visibility', "hidden");

    let mDragging = false;
    let mDraggingData = null;

    function updateModel(model) {
        let timelines = model.getAllTimelines();

        // TODO: get rid of this
        mTailGroup.selectAll('*').remove();

        drawLine(timelines, model);

        drawLineTargets(timelines);
    }

    function drawLine(timelines, model) {
        let allSegments = [];
        timelines.forEach(timeline => {
            let timeAttribute = model.hasTimeMapping(timeline.id) ? "timeStamp" : "timePercent";
            let segments = getDrawingSegments(timeline, model.getTimeBindingValues(timeline), timeAttribute);
            segments.forEach(segment => {
                segment.timelineId = timeline.id;
                segment.color = timeline.color;
            });
            allSegments.push(...segments);

            drawTails(timeline.id, timeline.points);
        });

        if (mLineStyle == LineStyle.STYLE_DASHED) {
            drawDashedLines(allSegments);
        } else if (mLineStyle == LineStyle.STYLE_OPACITY) {
            drawSemiOpaqueLines(allSegments);
        } else console.error("Unimplimented line style: " + mLineStyle)

        let points = mLineGroup.selectAll(".point-marker").data(timelines.map(path => path.points).flat())
        points.enter()
            .append("circle")
            .classed("point-marker", true)
            .attr("r", "1px")
            .attr("fill", "#000000")
            .style("opacity", 0.5);
        points.exit().remove();
        mLineGroup.selectAll(".point-marker")
            .attr("cx", function (d) { return d.x })
            .attr("cy", function (d) { return d.y })
    }

    function drawSingleTimeline(timeline, timeBindingValues, timeAttribute) {
        d3.selectAll(".warped-timeline-path").filter(function (d) { return d.timelineId == timeline.id; }).remove();
        d3.selectAll(".timeline-path").filter(function (d) { return d.id == timeline.id; }).remove();

        let segments = getDrawingSegments(timeline, timeBindingValues, timeAttribute);
        segments.forEach(segment => {
            segment.timelineId = timeline.id;
            segment.color = timeline.color;
        });

        if (mLineStyle == LineStyle.STYLE_DASHED) {
            drawDashedLines(segments, false);
        } else if (mLineStyle == LineStyle.STYLE_OPACITY) {
            drawSemiOpaqueLines(segments, false);
        } else console.error("Unimplimented line style: " + mLineStyle)

        drawTails(timeline.id, timeline.points);
    }

    function drawSemiOpaqueLines(segmentData, overwrite = true) {
        segmentData.forEach(s => {
            s.opacity = s.label * 2;
        })

        let paths = mLineGroup.selectAll('.warped-timeline-path');
        if (overwrite) {
            paths = paths.data(segmentData);
        } else {
            let oldData = paths.data();
            paths = paths.data(oldData.concat(segmentData));
        }

        paths.enter().append('path')
            .classed('warped-timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.warped-timeline-path')
            .attr('stroke', d => d.color)
            .attr('opacity', d => d.opacity)
            .attr('d', d => PathMath.getPathD(d.points))
            .attr('timeline-id', d => d.timelineId);
    }

    function drawDashedLines(segmentData, overwrite = true) {
        segmentData.forEach(s => {
            s.indicatorStroke = 180 * Math.exp(-4 * s.label);
        })

        let paths = mLineGroup.selectAll('.warped-timeline-path');
        if (overwrite) {
            paths = paths.data(segmentData);
        } else {
            let oldData = paths.data();
            paths = paths.data(oldData.concat(segmentData));
        }

        paths.enter().append('path')
            .classed('warped-timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.warped-timeline-path')
            .attr('stroke', d => d.color)
            .style("stroke-dasharray", d => d.indicatorStroke + ", 4, 1, 4, 1, 4")
            .attr('d', d => PathMath.getPathD(d.points))
            .attr('timeline-id', d => d.timelineId);
    }

    function getDrawingSegments(timeline, timeBindingValues, timeAttribute) {

        let ratioValues = [];
        for (let i = 1; i < timeBindingValues.length; i++) {
            let percentOfTime = (timeBindingValues[i][timeAttribute] - timeBindingValues[i - 1][timeAttribute]) / (timeBindingValues[timeBindingValues.length - 1][timeAttribute] - timeBindingValues[0][timeAttribute]);
            percentOfTime = Math.max(Math.round(100 * percentOfTime) / 100, 0.01);
            let percentOfLine = (timeBindingValues[i].linePercent - timeBindingValues[i - 1].linePercent);
            percentOfLine = Math.max(Math.round(100 * percentOfLine) / 100, 0.01);
            let ratio = Math.log10(percentOfTime / percentOfLine)
            let ratioValue = ratio / 4 + 0.5;
            ratioValues.push(ratioValue)
        }

        return PathMath.segmentPath(timeline.points, function (point, percent) {
            if (percent >= timeBindingValues[timeBindingValues.length - 1].linePercent) {
                return ratioValues[ratioValues.length - 1]
            }

            for (let i = 0; i < timeBindingValues.length; i++) {
                if (percent < timeBindingValues[i].linePercent) {
                    if (i == 0) {
                        return ratioValues[i];
                    } else {
                        return ratioValues[i - 1];
                    }
                }
            }

            console.error("Code should be unreachable! Should have returned by now!");
            return 1;
        });
    }

    function drawLineTargets(timelines) {
        let targets = mTargetGroup.selectAll('.timeline-target').data(timelines);
        targets.enter().append('path')
            .classed('timeline-target', true)
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 50)
            .attr('stroke-linecap', 'round')
            .attr('opacity', '0')
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDraggingData = d;
                    mLineDragStartCallback(d.id, e);
                }
            })
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    mPointerEnterCallback(e, d.id)
                    FilterUtil.applyShadowFilter(mLineGroup.selectAll('[timeline-id="' + d.id + '"]'));
                    FilterUtil.applyShadowFilter(mTailGroup.selectAll('[timeline-id="' + d.id + '"]'));
                }
            })
            .on('pointermove', (e, d) => {
                if (mActive) {
                    mPointerMoveCallback(e, d.id)
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    mPointerOutCallback(e, d.id)
                    FilterUtil.removeShadowFilter(mLineGroup.selectAll('[timeline-id="' + d.id + '"]'));
                    FilterUtil.removeShadowFilter(mTailGroup.selectAll('[timeline-id="' + d.id + '"]'));
                }
            })

        targets.exit().remove();
        mTargetGroup.selectAll('.timeline-target').attr('d', (timeline) => PathMath.getPathD(timeline.points));
    }

    function drawTails(timelineId, linePoints) {
        let tail1 = mTailGroup.select('.timeline-tail-1[timeline-id="' + timelineId + '"]').node()
            ? mTailGroup.select('.timeline-tail-1[timeline-id="' + timelineId + '"]')
            : mTailGroup.append('line')
                .classed('timeline-tail-1', true)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'grey')
                .style("stroke-dasharray", ("5, 5"))
                .attr('timeline-id', timelineId);

        let tail2 = mTailGroup.select('.timeline-tail-2[timeline-id="' + timelineId + '"]').node()
            ? mTailGroup.select('.timeline-tail-2[timeline-id="' + timelineId + '"]')
            : mTailGroup.append('line')
                .classed('timeline-tail-2', true)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'grey')
                .style("stroke-dasharray", ("5, 5"))
                .attr('timeline-id', timelineId);

        let startPoint = linePoints[0];
        let direction1 = MathUtil.vectorFromAToB(linePoints[1], startPoint);
        let tail1End = MathUtil.getPointAtDistanceAlongVector(TAIL_LENGTH, direction1, startPoint);
        tail1.attr('x1', startPoint.x)
            .attr('y1', startPoint.y)
            .attr('x2', tail1End.x)
            .attr('y2', tail1End.y);

        let endPoint = linePoints[linePoints.length - 1]
        let direction2 = MathUtil.vectorFromAToB(linePoints[linePoints.length - 2], endPoint);
        let tail2End = MathUtil.getPointAtDistanceAlongVector(TAIL_LENGTH, direction2, endPoint);

        tail2.attr('x1', endPoint.x)
            .attr('y1', endPoint.y)
            .attr('x2', tail2End.x)
            .attr('y2', tail2End.y);
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mTargetGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mTargetGroup.style('visibility', "hidden");
        }

        mActive = active;
    };

    function raise() {
        mLineGroup.raise();
        mTailGroup.raise();
    }

    function toggleStyle(model) {
        if (mLineStyle == LineStyle.STYLE_DASHED) {
            mLineStyle = LineStyle.STYLE_OPACITY;
        } else {
            mLineStyle = LineStyle.STYLE_DASHED;
        }

        d3.selectAll(".warped-timeline-path").remove();
        d3.selectAll(".timeline-path").remove();

        updateModel(model);
    }


    function onPointerMove(coords) {
        if (mDragging && mActive) {
            mLineDragCallback(mDraggingData.id, coords);
        }
    }

    function onPointerUp(coords) {
        if (mDragging && mActive) {
            mDragging = false;
            mLineDragEndCallback(mDraggingData.id, coords);
        }
    }

    this.updateModel = updateModel;
    this.drawSingleTimeline = drawSingleTimeline;
    this.setActive = setActive;
    this.raise = raise;
    this.toggleStyle = toggleStyle;
    this.setLineDragStartCallback = (callback) => mLineDragStartCallback = callback;
    this.setLineDragCallback = (callback) => mLineDragCallback = callback;
    this.setLineDragEndCallback = (callback) => mLineDragEndCallback = callback;
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerMoveCallback = (callback) => mPointerMoveCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
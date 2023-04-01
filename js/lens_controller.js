function LensController(svg, externalModelController, externalPushVersion, externalModelUpdated) {
    let mSvg = svg;
    let mModelController = externalModelController;
    let mVizLayer = svg.append('g')
        .classed('view-layer', true);
    let mVizOverlayLayer = mSvg.append('g')
        .classed('overlay-layer', true);
    let mInteractionLayer = mSvg.append('g')
        .classed('interaction-layer', true);

    let mPanCallback = () => { };

    let mMode = Mode.NONE;
    let mModel;
    let mTimelineId;

    let mDragStart = null;

    let mLineLength;
    let mStrokesData = {}

    let mViewTransform = {};
    resetViewTransform();

    let mLineGroup = mVizLayer.append('g').classed('lens-line-g', true);
    let mTextGroup = mVizLayer.append('g').classed('lens-annotations-g', true);
    let mPointsGroup = mVizLayer.append('g').classed('lens-points-g', true);
    let mStrokeGroup = mVizLayer.append('g').classed('lens-strokes-g', true);
    let mPinGroup = mVizLayer.append('g').classed('lens-pins-g', true);

    let mPanning = false;

    let mLensColorBrushController = new ColorBrushController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLensColorBrushController.setDrawFinishedCallback((points, color, radius) => {
        if (mTimelineId) {
            let model = mModelController.getModel();
            let timelineHasMapping = model.hasTimeMapping(mTimelineId);
            let mappedPoints = points.filter(p => p.x <= mLineLength && p.x >= 0).map(p => {
                let point = new DataStructs.StrokePoint(-p.y);
                let linePercent = point.linePercent = p.x / mLineLength;
                if (timelineHasMapping) {
                    point.timeStamp = model.mapLinePercentToTime(mTimelineId, linePercent);
                } else {
                    point.timePercent = model.mapLinePercentToTime(mTimelineId, linePercent);
                }
                return point;
            })

            mModelController.addTimelineStroke(mTimelineId, mappedPoints, color, radius * 2);

            externalPushVersion();
            modelUpdated();
        }
    })

    let mEraserController = new EraserController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mEraserController.setEraseCallback(canvasMask => {
        let changeMade = false;
        if (mMode == Mode.ERASER_STROKE || mMode == Mode.ERASER) {
            let strokeData = mModel.getStrokeData(mTimelineId);
            let strokeFragementData = DataUtil.fragmentStrokes(canvasMask,
                DataUtil.getStrokeCanvasPositions([{ x: 0, y: 0 }, { x: mLineLength, y: 0 }], strokeData));
            strokeFragementData.forEach(({ strokeData, fragments }) => {
                fragments.forEach(fragment => {
                    mModelController.addTimelineStroke(
                        mTimelineId,
                        fragment,
                        strokeData.color,
                        strokeData.width);
                })
            });
            mModelController.deleteStrokes(strokeFragementData.map(s => s.strokeData.id));
            if (strokeFragementData.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_POINT || mMode == Mode.ERASER) {
            let pointsData = getPointsDrawingData();
            let erasedPointsIds = [];
            pointsData.forEach(p => {
                if (canvasMask.isCovered({ y: p.y, x: p.x })) {
                    erasedPointsIds.push(p.cellBindingId);
                }
            });
            mModelController.deleteCellBindings(erasedPointsIds);
            if (erasedPointsIds.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_PIN || mMode == Mode.ERASER) {
            let pinData = getPinDrawingData();
            let erasedPinIds = [];
            pinData.forEach(({ pin, x }) => {
                if (canvasMask.isCovered({ y: 0, x })) {
                    erasedPinIds.push(pin.id);
                }
            })
            mModelController.deletePins(erasedPinIds);
            if (erasedPinIds.length > 0) changeMade = true;
        }

        if (changeMade) externalPushVersion();
        modelUpdated();
    })

    // needs to go after controllers so it's on top
    let mLensOverlay = mVizOverlayLayer.append('rect')
        .attr('id', 'lens-overlay')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', mSvg.attr('height'))
        .attr('width', mSvg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0')
        .on('pointerdown', function (e) {
            if (mMode == Mode.PAN) {
                mPanning = true;
                mDragStart = { x: e.x, y: e.y, transformX: mViewTransform.x, transformY: mViewTransform.y };
            }

            let coords = screenToSvgCoords({ x: e.x, y: e.y });
            mLensColorBrushController.onPointerDown(coords);
            mEraserController.onPointerDown(coords);
        })

    function onPointerMove(screenCoords) {
        let coords = screenToSvgCoords(screenCoords);

        if (mMode == Mode.PAN && mPanning) {
            mViewTransform.x = mDragStart.transformX + screenCoords.x - mDragStart.x;
            mViewTransform.y = mDragStart.transformY + screenCoords.y - mDragStart.y;
            setViewToTransform();
        }

        mLensColorBrushController.onPointerMove(coords);
        mEraserController.onPointerMove(coords);
    }

    function onPointerUp(screenCoords) {
        if (mPanning) {
            mPanCallback(
                mTimelineId,
                (mSvg.attr('width') / 2 - mViewTransform.x) / mLineLength,
                -(mSvg.attr('height') / 2) + mViewTransform.y);
            mPanning = false;
            mDragStart = null;
        }

        // these do their own active checking
        let coords = screenToSvgCoords(screenCoords);
        mLensColorBrushController.onPointerUp(coords);
        mEraserController.onPointerUp(coords);
    };

    function onResize(width) {
        mSvg.attr('width', width);
        mLensOverlay.attr('width', width);
    }

    function screenToSvgCoords(coords) {
        if (isNaN(parseInt(coords.x)) || isNaN(parseInt(coords.y))) {
            console.error('Bad coords', coords);
            return { x: 0, y: 0 };
        }

        let svgElementCoords = svg.node().getBoundingClientRect();
        if (isNaN(parseInt(svgElementCoords.x)) || isNaN(parseInt(svgElementCoords.y))) {
            console.error('Bad svg bounding box!', svgElementCoords);
            return { x: 0, y: 0 };
        }

        if (isNaN(parseInt(mViewTransform.x)) || isNaN(parseInt(mViewTransform.y))) {
            console.error('Bad veiw state!', mViewTransform);
            return { x: 0, y: 0 };
        }

        let x = coords.x - svgElementCoords.x - mViewTransform.x;
        let y = coords.y - svgElementCoords.y - mViewTransform.y;
        return { x, y };
    }

    function svgCoordsToScreenCoords(coords) {
        let svgElementCoords = svg.node().getBoundingClientRect();
        let x = coords.x + svgElementCoords.x + mViewTransform.x;
        let y = coords.y + svgElementCoords.y + mViewTransform.y;
        return { x, y };
    }

    function getCurrentCenterPercent() {
        if (!mTimelineId) {
            return 0;
        } else {
            return (mSvg.attr('width') / 2 - mViewTransform.x) / mLineLength;
        }
    }

    function modelUpdated() {
        externalModelUpdated();
    }

    function focus(timelineId, percent) {
        if (!timelineId) {
            mTimelineId = null;

            removeLine();
            removeTimePins();
            removeDataPoints();
            removeTextData();
            removeStrokes();

            resetViewTransform()
        } else {
            if (mTimelineId != timelineId) {
                mTimelineId = timelineId;

                let timeline = mModel.getTimelineById(mTimelineId);
                mLineLength = PathMath.getPathLength(timeline.points);
                redrawLine(mLineLength, timeline.color);

                redrawStrokes(null);
                redrawDataPoints();
                redrawTextData();
                redrawTimePins();
            }

            mViewTransform.x = -(percent * mLineLength - svg.attr('width') / 2);
            mViewTransform.y = svg.attr('height') / 2;
            setViewToTransform();
        }
    }

    function resetViewTransform() {
        mViewTransform.x = 0;
        mViewTransform.y = 0;
        mViewTransform.rotation = 0;
        setViewToTransform();
    }

    function setViewToTransform() {
        mVizLayer.attr('transform', 'translate(' + mViewTransform.x + ',' + mViewTransform.y + ')');
        mInteractionLayer.attr('transform', 'translate(' + mViewTransform.x + ',' + mViewTransform.y + ')');
    }

    // redraws everything. 
    function updateModel(model) {
        let oldModel = mModel;
        mModel = model;
        mEraserController.updateModel(mModel);

        mSvg.style('background-color', mModel.getCanvas().color);

        if (!mTimelineId) return;

        let timeline = mModel.getTimelineById(mTimelineId);

        if (!timeline) {
            // timeline got erased

            removeLine();
            removeTimePins();
            removeDataPoints();
            removeTextData();
            removeStrokes();

            resetViewTransform();

            mTimelineId = null;
            return;
        }

        let oldTimeline = oldModel.getTimelineById(mTimelineId);

        if (!PathMath.equalsPath(oldTimeline.points, timeline.points) || oldTimeline.color != timeline.color) {
            let timeline = mModel.getTimelineById(mTimelineId);
            mLineLength = PathMath.getPathLength(timeline.points);
            redrawLine(mLineLength, timeline.color);
        }

        redrawStrokes(oldModel);
        redrawDataPoints();
        redrawTextData();
        redrawTimePins();
    }

    function redrawLine(lineLength, color) {
        mLineGroup.selectAll('#lens-line')
            .data([null]).enter().append('line')
            .attr('id', 'lens-line')
            .attr('stroke-width', 1.5)
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('y2', 0);
        mLineGroup.select('#lens-line')
            .attr('stroke', color)
            .attr('x2', lineLength);
    }
    function removeLine() {
        mLineGroup.select('#lens-line').remove();
    }

    function redrawTimePins() {
        let pinsData = getPinDrawingData().map(p => p.x);
        let pins = mPinGroup.selectAll('.lens-pin-tick')
            .data(pinsData);
        pins.exit().remove();
        pins.enter().append('line')
            .classed('lens-pin-tick', true);

        const pinTickWidth = 6;
        const pinTickLength = 10
        mPinGroup.selectAll('.lens-pin-tick')
            .style('stroke', 'black')
            .style('stroke-width', (d) => pinTickWidth)
            .attr('x1', (d) => d)
            .attr('x2', (d) => d)
            .attr('y1', (d) => pinTickLength / 2)
            .attr('y2', (d) => -pinTickLength / 2);
    }

    function getPinDrawingData() {
        let timeline = mModel.getTimelineById(mTimelineId);
        if (!timeline) {
            console.error('Code should be unreachable.');
            return [];
        }

        return timeline.timePins.map(pin => {
            return {
                pin,
                x: pin.linePercent * mLineLength
            }
        });
    }

    function removeTimePins() {
        mPinGroup.selectAll('.lens-pin-tick').remove();
    }

    function redrawDataPoints() {
        let numData = getPointsDrawingData();

        let selection = mPointsGroup.selectAll('.lens-data-point').data(numData);
        selection.exit().remove();
        selection.enter()
            .append('circle')
            .classed('lens-data-point', true)
            .attr('r', 3.0)
            .attr('stroke', 'black')

        mPointsGroup.selectAll('.lens-data-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color });
    }
    function removeDataPoints() {
        mPointsGroup.selectAll('.lens-data-point').remove();
    }
    function getPointsDrawingData() {
        let cellBindingData = mModel.getCellBindingData(mTimelineId)
            .filter(cbd => cbd.linePercent != NO_LINE_PERCENT &&
                cbd.dataCell.getType() == DataTypes.NUM)
        return cellBindingData.map(cbd => {
            let { val1, val2, dist1, dist2 } = cbd.axisBinding;
            if (cbd.axisBinding.style == DataDisplayStyles.AREA || cbd.axisBinding.style == DataDisplayStyles.STREAM) {
                val2 = Math.max(Math.abs(val1), Math.abs(val2));
                val1 = 0;
            }
            if (val1 == val2) {
                console.error('Invalid binding values: ' + val1 + ', ' + val2);
                val1 = 0;
                if (val1 == val2) val2 = 1;
            };
            let dist = (dist2 - dist1) * (cbd.dataCell.getValue() - val1) / (val2 - val1) + dist1;
            return {
                cellBindingId: cbd.cellBinding.id,
                x: cbd.linePercent * mLineLength,
                y: -dist,
                color: cbd.color ? cbd.color : 'black'
            };
        });
    }

    function redrawTextData() {
        let cellBindingData = mModel.getCellBindingData(mTimelineId)
            .filter(cbd => cbd.linePercent != NO_LINE_PERCENT &&
                cbd.dataCell.getType() == DataTypes.TEXT)
        let textData = cellBindingData.map(cbd => {
            return {
                x: cbd.linePercent * mLineLength,
                color: cbd.color ? cbd.color : 'black'
            };
        });

        let selection = mTextGroup.selectAll('.lens-text-markers')
            .data(textData);
        selection.exit().remove();
        selection.enter()
            .append('line')
            .classed('lens-text-markers', true)
            .attr('stroke-width', 1)
            .attr('stroke', 'black')
            .attr('opacity', 0.6)
            .attr('y1', -5)
            .attr('y2', 5);
        mTextGroup.selectAll('.lens-text-markers')
            .attr('x1', function (d) { return d.x + 2 })
            .attr('x2', function (d) { return d.x - 2 });
    }
    function removeTextData() {
        mTextGroup.selectAll('.lens-text-markers').remove();

    }

    function redrawStrokes(oldModel) {


        //////////////////////

        let oldStrokeData = mStrokesData;
        mStrokesData = {}

        let timeline = mModel.getTimelineById(mTimelineId);
        let oldtimeline = oldModel ? oldModel.getTimelineById(mTimelineId) : null;
        let changedStrokes = DataUtil.timelineStrokesChanged(timeline, oldtimeline);

        if (changedStrokes.length > 0) {
            let changedStrokeData = mModel.getStrokeData(mTimelineId).filter(s => changedStrokes.includes(s.id));
            let strokeDrawingData = DataUtil.getStrokeCanvasPositions([{ x: 0, y: 0 }, { x: mLineLength, y: 0 }], changedStrokeData);
            strokeDrawingData.forEach(strokeDrawingData => {
                mStrokesData[strokeDrawingData.stroke.id] = {
                    color: strokeDrawingData.stroke.color,
                    width: strokeDrawingData.stroke.width,
                    projectedPoints: strokeDrawingData.projectedPoints,
                };
            })
        }
        let unchangedStrokeData = timeline.annotationStrokes.filter(s => !changedStrokes.includes(s.id));
        unchangedStrokeData.forEach(stroke => {
            mStrokesData[stroke.id] = oldStrokeData[stroke.id];
        });


        let selection = mStrokeGroup.selectAll('.lens-annotation-stroke').data(Object.values(mStrokesData));
        selection.exit()
            .remove();
        selection.enter()
            .append('path')
            .classed('lens-annotation-stroke', true)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
        mStrokeGroup.selectAll('.lens-annotation-stroke')
            .attr('stroke', d => d.color)
            .attr('stroke-width', d => d.width)
            .attr('d', d => PathMath.getPathD(d.projectedPoints));
    }
    function removeStrokes() {
        mStrokeGroup.selectAll('.lens-annotation-stroke').remove();
    }

    function onWheel(delta) {
        mLensColorBrushController.onWheel(delta);
        mEraserController.onWheel(delta);
    }

    function setMode(mode) {
        if (mode != mMode) {
            clearMode();
            mMode = mode;

            if (mMode == Mode.COLOR_BRUSH) {
                mLensColorBrushController.setActive(true);
            } else if (mMode == Mode.ERASER_STROKE ||
                mMode == Mode.ERASER_POINT ||
                mMode == Mode.ERASER_PIN ||
                mMode == Mode.ERASER) {
                mEraserController.setActive(true);
            }
        }
    }

    function clearMode() {
        mLensColorBrushController.setActive(false);
        mEraserController.setActive(false);

        mMode = Mode.NONE;
    }


    this.updateModel = updateModel;

    this.setMode = setMode;
    this.clearMode = clearMode;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
    this.onResize = onResize;
    this.onWheel = onWheel;

    this.focus = focus;
    this.getCurrentTimelineId = () => mTimelineId;
    this.getCurrentCenterPercent = getCurrentCenterPercent;

    this.setColorBrushColor = function (color) { mLensColorBrushController.setColor(color); }
    this.increaseBrushRadius = function () { mLensColorBrushController.increaseBrushRadius(); }
    this.decreaseBrushRadius = function () { mLensColorBrushController.decreaseBrushRadius(); }

    this.setPanCallback = (callback) => mPanCallback = callback;
}
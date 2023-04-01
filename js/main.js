document.addEventListener('DOMContentLoaded', function (e) {
    let mMode;
    let mBucketColor = '#000000';

    let mSvg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight);

    let mVizLayer = mSvg.append('g').attr('id', 'main-viz-layer');
    let mVizOverlayLayer = mSvg.append('g').attr('id', 'main-overlay-layer');
    let mInteractionLayer = mSvg.append('g').attr('id', 'main-interaction-layer');

    let mPanning = false;
    let mViewTransform = { x: 0, y: 0, rotation: 0, scale: 1 };
    let mZoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", ({ transform }) => {
            mViewTransform.x = transform.x;
            mViewTransform.y = transform.y;
            mViewTransform.scale = transform.k;
            setViewToTransform();
        });

    // Dragging variables
    let mDraggingTimePin = null;
    let mDraggingTimePinSettingTime = false;
    let mResizingImageBindingData = null;

    let mSelectedCellBindingId = null;
    let mSelectedImageBindingId = null;
    let mSelectedAxisId = null;
    let mLinkingBinding = null;
    let mMousedOverLinkButton = false;

    let mMouseDropShadow = new MouseDropShadow(mInteractionLayer);
    let mLineHighlight = new LineHighlight(mVizLayer);
    let mTextInputBox = new TextInputBox();

    let mTooltip = new ToolTip('main-tooltip');
    let mTooltipSetTo = ''

    FilterUtil.initializeShadowFilter(mSvg);
    FilterUtil.setFilterDisplayArea(0, 0, mSvg.attr('width'), mSvg.attr('height'));

    let mMainOverlay = mVizOverlayLayer.append('rect')
        .attr('id', 'main-viz-overlay')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', mSvg.attr('height'))
        .attr('width', mSvg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0');

    let mLinkLine = mInteractionLayer.append('line')
        .attr('stroke-width', 0.5)
        .attr('stroke', 'black')
        .attr('opacity', 0.6);

    window.addEventListener('resize', () => {
        mSvg.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
        mMainOverlay.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
    });

    let mWorkspace;
    let mModelController = new ModelController();
    let mVersionController = new VersionController();

    let mDrawerController = new DrawerController('#data-drawer');
    mDrawerController.setDrawerResizedCallback((width) => {
        mLensController.onResize(width);
        if (mLensController.getCurrentTimelineId()) {
            showLensView(mLensController.getCurrentTimelineId(), mLensController.getCurrentCenterPercent());
        }
    })
    $('#data-drawer').find('.close-button').on('click', () => {
        mDrawerController.closeDrawer();
        mDataTableController.deselectCells();
        $('#link-button-div').hide();

        log(LogEvent.TOGGLE_DRAWER, 'close-button');
    });

    // note that this needs to happen after we set drawer controller
    let mLensSvg = d3.select('#lens-view').append('svg')
        .attr('width', $('#lens-view').width())
        .attr('height', $('#lens-view').height());
    let mLensController = new LensController(mLensSvg, mModelController, pushVersion, modelUpdated);
    mLensController.setPanCallback((timelineId, centerPercent, centerHeight) => {
        if (timelineId && mModelController.getModel().getTimelineById(timelineId)) {
            showLensView(timelineId, centerPercent);
        }
    })

    let mSelectionController = new SelectionController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mSelectionController.setDragStartCallback((timelineId, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        return coords;
    });
    mSelectionController.setLineModifiedCallback((timelineId, points, newPoints) => {
        mModelController.updateTimelinePoints(timelineId, [{ points }], [{ points: newPoints }]);

        pushVersion();
        modelUpdated();
    });

    let mLineViewController = new LineViewController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineViewController.setLineDragStartCallback((timelineId, pointerEvent) => {
        if (mMode == Mode.SELECTION) {
            mSelectionController.onTimelineDragStart(timelineId, screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY }));
        } if (mMode == Mode.PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            if (!timeline) {
                console.error('Bad timeline id! ' + timelineId);
                return;
            }

            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);
            let timePin = new DataStructs.TimePin(linePoint.percent);

            let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                timePin.timeStamp = time;
            } else {
                timePin.timePercent = time;
            }

            mDraggingTimePin = timePin;

            pinDrag(timeline, timePin, linePoint.percent);
        } else if (mMode == Mode.LENS) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            if (!timeline) { console.error('Bad timeline id! ' + timelineId); return; }
            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);
            showLensView(timelineId, linePoint.percent);
            mLensController.focus(timelineId, linePoint.percent);
        } else if (mMode == Mode.TEXT || mMode == Mode.IMAGE || mMode == Mode.LINK || mMode == Mode.LENS || mMode == Mode.SCISSORS) {
            mDragStartPosition = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        } else if (mMode == Mode.IMAGE_LINK) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            mModelController.imageBindingToLineBinding(timelineId, mSelectedImageBindingId, linePoint);

            pushVersion();
            modelUpdated();
            setDefaultMode();
        }
    })
    mLineViewController.setLineDragCallback((timelineId, coords) => {
        if (mMode == Mode.PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDrag(timeline, mDraggingTimePin, PathMath.getClosestPointOnPath(coords, timeline.points).percent);
        } else if (mMode == Mode.LENS) {
            let linePoint = PathMath.getClosestPointOnPath(coords,
                mModelController.getModel().getTimelineById(timelineId).points);

            showLensView(timelineId, linePoint.percent);
            mLensController.focus(timelineId, linePoint.percent);
        }
    })
    mLineViewController.setLineDragEndCallback((timelineId, coords) => {
        let linePoint = PathMath.getClosestPointOnPath(coords,
            mModelController.getModel().getTimelineById(timelineId).points);
        if (mMode == Mode.PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
        } else if (mMode == Mode.TEXT) {
            // TODO: Open the text input in new comment mode.
            // TODO: Create in pointer down instead and initiate a drag on the text 
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
                mModelController.addBoundTextRow(timelineId, DataUtil.getFormattedDate(time), time);
            } else {
                let timePin = new DataStructs.TimePin(linePoint.percent);
                timePin.timePercent = mModelController.getModel()
                    .mapLinePercentToTime(timelineId, linePoint.percent);

                mModelController.addBoundTextRow(timelineId, '<text>', '', timePin);
            }

            pushVersion();
            modelUpdated();
        } else if (mMode == Mode.IMAGE) {
            FileHandler.getImageFile().then(({ imageData, width, height }) => {
                let max = Math.max(width, height);
                width = width * 100 / max;
                height = height * 100 / max;

                if (mModelController.getModel().hasTimeMapping(timelineId)) {
                    let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
                    mModelController.addBoundImage(timelineId, imageData, width, height, time);
                } else {
                    let timePin = new DataStructs.TimePin(linePoint.percent);
                    timePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timelineId, linePoint.percent);

                    mModelController.addBoundImage(timelineId, imageData, width, height, '', timePin);
                }

                modelUpdated();
            })
        } else if (mMode == Mode.LINK) {
            let cellBindings = mDataTableController.getSelectedCells();
            mModelController.bindCells(timelineId, cellBindings);

            mDataTableController.deselectCells();
            $('#link-button-div').hide();

            modelUpdated();

            let newCellIds = cellBindings.map(b => b.id);
            let cellBindingData = mModelController.getModel().getCellBindingData(timelineId);
            let newText = cellBindingData.filter(b => newCellIds.includes(b.cellBinding.id) && b.dataCell.getType() == DataTypes.TEXT);
            if (newText.length > 0) {
                let boundingBoxes = mTextController.getTextBoundingBoxes();
                let allCellBindingIds = cellBindingData.map(b => b.cellBinding.id)
                boundingBoxes = boundingBoxes.filter(b => allCellBindingIds.includes(b.cellBindingId))

                let newOffsets = DataUtil.layoutText(newText.map(cbd => cbd.cellBinding), boundingBoxes);
                newOffsets.forEach(d => mModelController.updateTextOffset(d.cellBindingId, d.offset));
            }

            modelUpdated();
            pushVersion();
            setDefaultMode();
        } else if (mMode == Mode.COLOR_BUCKET) {
            mModelController.updateTimelineColor(timelineId, mBucketColor);
            pushVersion();
            modelUpdated();
        } else if (mMode == Mode.COLOR_BRUSH_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setColorBrushColor(timeline.color);
        } else if (mMode == Mode.COLOR_BUCKET_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setColorBucketColor(timeline.color);
        } else if (mMode == Mode.LINE_DRAWING_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setLineDrawingColor(timeline.color);
        } else if (mMode == Mode.SCISSORS) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            let points1 = [];
            let points2 = timeline.points.map(p => Object.assign({}, { x: p.x, y: p.y }));

            for (let i = 0; i < timeline.points.length; i++) {
                points1.push(points2.shift());
                if (PathMath.getPathLength(points1) > linePoint.length) {
                    points2.unshift(points1.pop());
                    points1.push({ x: linePoint.x, y: linePoint.y });
                    points2.unshift({ x: linePoint.x, y: linePoint.y });
                    break;
                }
            }

            let segments = [
                { label: SEGMENT_LABELS.UNAFFECTED, points: points1 },
                { label: SEGMENT_LABELS.UNAFFECTED, points: points2 }
            ]

            mModelController.breakTimeline(timelineId, segments);

            pushVersion();
            modelUpdated();
        }
    })
    mLineViewController.setPointerEnterCallback((event, timelineId) => {
        if (mMode == Mode.SELECTION || mMode == Mode.TEXT || mMode == Mode.IMAGE || mMode == Mode.PIN) {
            showLineTime(timelineId, { x: event.clientX, y: event.clientY });
            mDataTableController.highlightCells(mModelController.getModel().getTimelineHighlightData(timelineId));
            FilterUtil.applyShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        } else if (mMode == Mode.LINK) {
            FilterUtil.applyShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        }
    })
    mLineViewController.setPointerMoveCallback((event, timelineId) => {
        if (mMode == Mode.SELECTION || mMode == Mode.TEXT || mMode == Mode.IMAGE || mMode == Mode.PIN) {
            showLineTime(timelineId, { x: event.clientX, y: event.clientY });
        }
    });
    mLineViewController.setPointerOutCallback((event, timelineId) => {
        if (mMode == Mode.SELECTION || mMode == Mode.TEXT || mMode == Mode.IMAGE || mMode == Mode.PIN) {
            if (mTooltipSetTo == timelineId) {
                mTooltip.hide();
            }

            mMouseDropShadow.hide();
            mDataTableController.highlightCells({});
            FilterUtil.removeShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        } else if (mMode == Mode.LINK) {
            FilterUtil.removeShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        }
    })

    let mStrokeController = new StrokeController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mStrokeController.setDragStartCallback((strokeId, pointerEvent) => {
        if (mMode == Mode.SELECTION) {
            if (mModelController.isCanvasStroke(strokeId)) {
                let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
                let stroke = mModelController.getModel().getStrokeById(strokeId);
                mDragStartPosition = coords;
                mStrokeController.redrawCanvasStroke(stroke);
            }
        }
    });
    mStrokeController.setDragCallback((strokeId, coords) => {
        if (mMode == Mode.SELECTION) {
            if (mModelController.isCanvasStroke(strokeId)) {
                let stroke = mModelController.getModel().getStrokeById(strokeId);
                let diff = MathUtil.subtractAFromB(mDragStartPosition, coords);
                stroke.points.forEach(p => {
                    p.xValue += diff.x;
                    p.lineDist += diff.y;
                })
                mStrokeController.redrawCanvasStroke(stroke);
            }
        }
    });
    mStrokeController.setDragEndCallback((strokeId, coords) => {
        if (mMode == Mode.SELECTION) {
            if (mModelController.isCanvasStroke(strokeId)) {
                let stroke = mModelController.getModel().getStrokeById(strokeId);
                let diff = MathUtil.subtractAFromB(mDragStartPosition, coords);
                mModelController.updateStrokePoints(strokeId, stroke.points.map(p => {
                    p.xValue += diff.x;
                    p.lineDist += diff.y;
                    return p;
                }));
                pushVersion();
                modelUpdated();
            }
        } else if (mMode == Mode.COLOR_BUCKET) {
            mModelController.updateStrokeColor(strokeId, mBucketColor);
            pushVersion();
            modelUpdated();
        } else if (mMode == Mode.COLOR_BRUSH_EYEDROPPER) {
            setColorBrushColor(mModelController.getModel().getStrokeById(strokeId).color);
        } else if (mMode == Mode.COLOR_BUCKET_EYEDROPPER) {
            setColorBucketColor(mModelController.getModel().getStrokeById(strokeId).color);
        } else if (mMode == Mode.LINE_DRAWING_EYEDROPPER) {
            setLineDrawingColor(mModelController.getModel().getStrokeById(strokeId).color);
        }
    })

    let mTimePinController = new TimePinController(mVizLayer, mVizOverlayLayer, mInteractionLayer);

    mTimePinController.setDragStartCallback((event, timePin) => { /* don't need to do anything here. */ })
    mTimePinController.setDragCallback((coords, timePin) => {
        let timeline = mModelController.getModel().getTimelineForTimePin(timePin.id);
        let projectedPoint = PathMath.getClosestPointOnPath(coords, timeline.points)

        pinDrag(timeline, timePin, projectedPoint.percent)
    });
    mTimePinController.setDragEndCallback((coords, timePin) => {
        let timeline = mModelController.getModel().getTimelineForTimePin(timePin.id);
        let projectedPoint = PathMath.getClosestPointOnPath(coords, timeline.points)

        pinDragEnd(timeline, timePin, projectedPoint.percent)
    });
    mTimePinController.setPointerEnterCallback((event, timePin) => {
        let screenCoords = { x: event.clientX, y: event.clientY };
        let message = timePin.timeStamp ? DataUtil.getFormattedDate(timePin.timeStamp) : 'Percent of time: ' + Math.round(timePin.timePercent * 100) + '%';

        let timeCell = mModelController.getModel().getTimeCellForPin(timePin.id);
        if (timeCell) {
            if (timeCell.isValid()) {
                console.error('Bad state. Valid time linked to pin.', timeCell, timePin)
            } else if (timeCell.getValue()) {
                message = '<div>' + message + '<div></div>' + timeCell.getValue() + '</div>';
            }
        }

        mTooltip.show(message, screenCoords);
        mTooltipSetTo = timePin.id;
    });
    mTimePinController.setPointerOutCallback((event, timePin) => {
        if (mTooltipSetTo = timePin.id) {
            mTooltip.hide();
        }
    });

    let mTextController = new TextController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mTextController.setPointerEnterCallback((e, cellBindingData) => {
        mDataTableController.highlightCells(mModelController.getModel().getCellBindingHighlightData(cellBindingData.cellBinding));
    })
    mTextController.setPointerOutCallback((e, cellBindingData) => {
        mDataTableController.highlightCells({});
    })
    mTextController.setDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        if (mMode == Mode.TEXT || mMode == Mode.SELECTION) {
            showTextContextMenu(cellBindingData);
        } else if (mMode == Mode.PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForBindingDrag(cellBindingData, linePoint);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData = cellBindingData.copy();
            cellBindingData.linePercent = linePoint.percent;
            cellBindingData.cellBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            mTextController.fadeTimelineText(cellBindingData.timeline.id);
            mTextController.redrawText(cellBindingData);
        }

        return coords;
    });
    mTextController.setDragCallback((cellBindingData, startPos, coords) => {
        if (mMode == Mode.TEXT || mMode == Mode.SELECTION) {
            hideTextContextMenu();

            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            cellBindingData = cellBindingData.copy();
            let offset = MathUtil.addAToB(cellBindingData.cellBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            cellBindingData.cellBinding.offset = offset;
            mTextController.redrawText(cellBindingData);
        } else if (mMode == Mode.PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData = cellBindingData.copy();
            cellBindingData.cellBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            cellBindingData.linePercent = linePoint.percent;
            mTextController.redrawText(cellBindingData);
        }
    });
    mTextController.setDragEndCallback((cellBindingData, startPos, coords) => {
        if (mMode == Mode.TEXT || mMode == Mode.SELECTION) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let orginalBinding = mModelController.getModel().getCellBindingById(cellBindingData.cellBinding.id);
            let offset = MathUtil.addAToB(orginalBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            mModelController.updateTextOffset(cellBindingData.cellBinding.id, offset);

            pushVersion();
            modelUpdated();

            showTextContextMenu(cellBindingData);
        } else if (mMode == Mode.PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            let offset = MathUtil.subtractAFromB(linePoint, coords);
            mModelController.updateTextOffset(cellBindingData.cellBinding.id, offset);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            if (!cellBindingData.timeCell.isValid()) {
                mModelController.updateTimePinBinding(cellBindingData.cellBinding.id, mDraggingTimePin.id)
            }

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
            mDraggingTimePinSettingTime = false;
        } else if (mMode == Mode.COLOR_BUCKET) {
            mModelController.setCellBindingColor(cellBindingData.cellBinding.id, mBucketColor);
            pushVersion();
            modelUpdated();
        }
    });
    mTextController.setDoubleClickCallback((cellId, text, x, y, height, width) => {
        let screenCoords = svgCoordsToScreen({ x, y });
        mTextInputBox.show(text, screenCoords.x, screenCoords.y, height, width);
        mTextInputBox.setTextChangedCallback((text) => {
            // TODO: Check if the text actually changed
            mModelController.updateText(cellId, text);
            pushVersion();
            modelUpdated();
            mTextInputBox.reset();
        })
    })

    // Text controller utility functions
    // TODO: make this general for all context menus
    function showTextContextMenu(cellBindingData) {
        let textBox = mTextController.getTextBoundingBoxes()
            .find(b => b.cellBindingId == cellBindingData.cellBinding.id);
        if (!textBox) {
            console.error('textbox not found!', cellBindingData);
            return;
        }
        let coords = svgCoordsToScreen({ x: textBox.x + textBox.width, y: textBox.y })

        $('#text-context-menu-div').css('top', coords.y);
        $('#text-context-menu-div').css('left', coords.x);
        $('#text-context-menu-div').show();
        mSelectedCellBindingId = cellBindingData.cellBinding.id;
    }
    function hideTextContextMenu() {
        $('#text-context-menu-div').hide();
        mSelectedCellBindingId = null;
    }

    // end of text utility functions

    let mImageController = new ImageController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mImageController.setDragStartCallback((imageBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        if (mMode == Mode.IMAGE || mMode == Mode.SELECTION) {
            mSelectedImageBindingId = imageBindingData.imageBinding.id;

            let position = { x: 0, y: 0 };
            if (!imageBindingData.isCanvasBinding) {
                position = PathMath.getPositionForPercent(imageBindingData.timeline.points, imageBindingData.linePercent);
            }
            position.x = position.x + imageBindingData.imageBinding.offset.x;
            position.y = position.y + imageBindingData.imageBinding.offset.y;

            showImageContextMenu(imageBindingData, position);
            mResizeController.show(
                position.x,
                position.y,
                position.x + imageBindingData.imageBinding.width,
                position.y + imageBindingData.imageBinding.height,
                true)
        } else if (mMode == Mode.PIN && !imageBindingData.isCanvasBinding) {
            let linePoint = PathMath.getClosestPointOnPath(coords, imageBindingData.timeline.points);

            // sets mDraggingTimePin
            setDragPinForBindingDrag(imageBindingData, linePoint, true);
            pinDrag(imageBindingData.timeline, mDraggingTimePin, linePoint.percent);

            imageBindingData = imageBindingData.copy();
            imageBindingData.linePercent = linePoint.percent;
            imageBindingData.imageBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            mImageController.redrawImage(imageBindingData);
        }

        return coords;
    });
    mImageController.setDragCallback((imageBindingData, startPos, coords) => {
        if (mMode == Mode.IMAGE || mMode == Mode.SELECTION) {
            hideImageContextMenu();
            mResizeController.hide();

            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let offset = MathUtil.addAToB(imageBindingData.imageBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            // copy the dataCell to avoid modification leaks
            imageBindingData = imageBindingData.copy();
            imageBindingData.imageBinding.offset = offset;
            mImageController.redrawImage(imageBindingData);
        } else if (mMode == Mode.PIN && !imageBindingData.isCanvasBinding) {
            let timeline = imageBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            imageBindingData = imageBindingData.copy();
            imageBindingData.imageBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            imageBindingData.linePercent = linePoint.percent;
            mImageController.redrawImage(imageBindingData);
        }
    });
    mImageController.setDragEndCallback((imageBindingData, startPos, coords) => {
        if (mMode == Mode.IMAGE || mMode == Mode.SELECTION) {
            // if we didn't actually move, don't update.
            if (!MathUtil.pointsEqual(startPos, coords)) {
                let offset = MathUtil.addAToB(imageBindingData.imageBinding.offset, MathUtil.subtractAFromB(startPos, coords));
                mModelController.updateImageOffset(imageBindingData.imageBinding.id, offset);

                pushVersion();
                modelUpdated();

                imageBindingData.imageBinding.offset = offset;
            }

            let position = { x: 0, y: 0 };
            if (!imageBindingData.isCanvasBinding) {
                position = PathMath.getPositionForPercent(imageBindingData.timeline.points, imageBindingData.linePercent);
            }
            position.x = position.x + imageBindingData.imageBinding.offset.x;
            position.y = position.y + imageBindingData.imageBinding.offset.y;

            showImageContextMenu(imageBindingData, position);
            mResizeController.show(
                position.x,
                position.y,
                position.x + imageBindingData.imageBinding.width,
                position.y + imageBindingData.imageBinding.height,
                true)
        } else if (mMode == Mode.PIN && !imageBindingData.isCanvasBinding) {
            let timeline = imageBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            let offset = MathUtil.subtractAFromB(linePoint, coords);
            mModelController.updateImageOffset(imageBindingData.imageBinding.id, offset);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            if (!imageBindingData.imageBinding.timeStamp) {
                mModelController.updateTimePinBinding(imageBindingData.imageBinding.id, mDraggingTimePin.id)
            }

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
            mDraggingTimePinSettingTime = false;
        }
    });
    mImageController.setDoubleClickCallback((imageBindingData, clickEvent) => {
        showImageViewer(imageBindingData.imageBinding);
    })
    // Text controller utility functions
    // TODO: make this general for all context menus
    function showImageContextMenu(imageBindingData, position) {
        let coords = svgCoordsToScreen({
            x: position.x + imageBindingData.imageBinding.width,
            y: position.y
        });

        if (imageBindingData.isCanvasBinding) {
            $('#image-link-button').show();
            $('#image-unlink-button').hide();
        } else {
            $('#image-unlink-button').show();
            $('#image-link-button').hide();
        }

        $('#image-context-menu-div').css('top', coords.y);
        $('#image-context-menu-div').css('left', coords.x);
        $('#image-context-menu-div').show();
    }
    function hideImageContextMenu() {
        $('#image-context-menu-div').hide();
    }

    // end of text utility functions


    let mDataPointController = new DataPointController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDataPointController.setPointDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == Mode.PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForBindingDrag(cellBindingData, linePoint);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawDataSet([cellBindingData]);
            mTextController.fadeTimelineText(cellBindingData.timeline.id);
        }

        return coords;
    });
    mDataPointController.setPointDragCallback((cellBindingData, coords) => {
        if (mMode == Mode.PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    timePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawDataSet([cellBindingData]);
        }
    });
    mDataPointController.setPointDragEndCallback((cellBindingData, coords) => {
        if (mMode == Mode.PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    timePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            if (!cellBindingData.timeCell.isValid()) {
                mModelController.updateTimePinBinding(cellBindingData.cellBinding.id, mDraggingTimePin.id)
            }

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
            mDraggingTimePinSettingTime = false;
        }
    });
    mDataPointController.setAxisDragStartCallback((axis, controlNumber, event) => {
        if (mMode == Mode.SELECTION) {
            let model = mModelController.getModel();
            showAxisContextMenu(axis, model.getTimelineByAxisId(axis.id));
        } else if (mMode == Mode.COLOR_BUCKET) {
            mModelController.updateAxisColor(axis.id, controlNumber, mBucketColor);
            pushVersion();
            modelUpdated();
        } else if (mMode == Mode.COLOR_BRUSH_EYEDROPPER) {
            let color = controlNumber == null ? null : controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColorBrushColor(color);
        } else if (mMode == Mode.COLOR_BUCKET_EYEDROPPER) {
            let color = controlNumber == null ? null : controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColorBucketColor(color);
        } else if (mMode == Mode.LINE_DRAWING_EYEDROPPER) {
            let color = controlNumber == null ? null : controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setLineDrawingColor(color);
        }
    })
    mDataPointController.setAxisDragCallback((axis, controlNumber, coords) => {
        if (mMode == Mode.SELECTION) {
            hideAxisContextMenu();
            let model = mModelController.getModel();

            // copy to avoid leaks
            axis = axis.copy();

            let timeline = model.getTimelineByAxisId(axis.id);
            if (controlNumber == null) {
                let closestPoint = PathMath.getClosestPointOnPath(coords, timeline.points);
                axis.linePercent = closestPoint.percent;
            } else {
                let origin = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
                let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);
                let newPosition = MathUtil.projectPointOntoVector(coords, normal, origin);
                let dist = MathUtil.distanceFromAToB(origin, newPosition);
                dist = newPosition.neg ? -1 * dist : dist;
                if (controlNumber == 1) {
                    axis.dist1 = dist;
                } else {
                    axis.dist2 = dist;
                }
            }

            let boundData = model.getAllCellBindingData().filter(cbd => {
                return cbd.dataCell.getType() == DataTypes.NUM && cbd.axisBinding && cbd.axisBinding.id == axis.id;
            });
            boundData.forEach(cbd => {
                cbd.axisBinding = axis;
            })
            if (boundData.length == 0) { console.error('Bad state. Should not display a axis that has no data.', axis.id); return; }

            mDataPointController.drawDataSet(boundData);
        }
    });
    mDataPointController.setAxisDragEndCallback((axis, controlNumber, coords) => {
        if (mMode == Mode.SELECTION) {// copy to avoid leaks
            let model = mModelController.getModel();

            // copy to avoid leaks
            axis = axis.copy();

            let timeline = model.getTimelineByAxisId(axis.id);
            if (controlNumber == null) {
                let closestPoint = PathMath.getClosestPointOnPath(coords, timeline.points);
                axis.linePercent = closestPoint.percent;
            } else {
                let origin = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
                let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);
                let newPosition = MathUtil.projectPointOntoVector(coords, normal, origin);
                let dist = MathUtil.distanceFromAToB(origin, newPosition);
                dist = newPosition.neg ? -1 * dist : dist;
                if (controlNumber == 1) {
                    axis.dist1 = dist;
                } else {
                    axis.dist2 = dist;
                }
            }

            mModelController.updateAxisPosition(axis.id, axis.dist1, axis.dist2, axis.linePercent);

            pushVersion();
            modelUpdated();
            showAxisContextMenu(axis, timeline);
        }
    });
    mDataPointController.setPointerEnterCallback((e, cellBindingData) => {
        mDataTableController.highlightCells(mModelController.getModel().getCellBindingHighlightData(cellBindingData.cellBinding));
    })
    mDataPointController.setPointerOutCallback((e, cellBindingData) => {
        mDataTableController.highlightCells({});
    })

    // UTILITY
    function setDragPinForBindingDrag(bindingData, linePoint, isImage = false) {
        // check if a pin already exists for this text, whether or not it's valid
        let timePinId = isImage ? bindingData.imageBinding.timePinId : bindingData.cellBinding.timePinId;
        let timeIsValid = isImage ? bindingData.imageBinding.timeStamp : bindingData.timeCell.isValid();
        let time = isImage ? bindingData.imageBinding.timeStamp : bindingData.timeCell.getValue();

        let timePin;
        if (timeIsValid) {
            timePin = bindingData.timeline.timePins.find(pin => pin.timeStamp == time);
        } else if (timePinId) {
            timePin = bindingData.timeline.timePins.find(pin => pin.id == timePinId);
        }

        // if not, create one.
        if (!timePin) {
            timePin = new DataStructs.TimePin(linePoint.percent);

            let hasTimeMapping = mModelController.getModel().hasTimeMapping(bindingData.timeline.id);
            if (timeIsValid) {
                timePin.timeStamp = time;
            } else if (hasTimeMapping) {
                timePin.timeStamp = mModelController.getModel()
                    .mapLinePercentToTime(bindingData.timeline.id, linePoint.percent, false)
            }

            if (!timeIsValid) {
                bindingData.timePinId = timePin.id;
            }

            if (!hasTimeMapping) {
                timePin.timePercent = mModelController.getModel()
                    .mapLinePercentToTime(bindingData.timeline.id, linePoint.percent, true)
            }

            if (!timeIsValid || !hasTimeMapping) {
                mDraggingTimePinSettingTime = true;
            }
        }

        mDraggingTimePin = timePin;
    }

    function showAxisContextMenu(axis, timeline) {
        let basePose = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
        let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);

        let pos1 = MathUtil.getPointAtDistanceAlongVector(axis.dist1, normal, basePose);
        let pos2 = MathUtil.getPointAtDistanceAlongVector(axis.dist2, normal, basePose);

        let coords = svgCoordsToScreen({
            x: Math.max(pos1.x, pos2.x),
            y: Math.min(pos1.y, pos2.y)
        });

        if (axis.alignment == DataDisplayAlignments.DYNAMIC) {
            $('#dynamic-normals-axis-button').show();
            $('#fixed-normals-axis-button').hide();
        } else {
            $('#dynamic-normals-axis-button').hide();
            $('#fixed-normals-axis-button').show();
        }

        $('#axis-context-menu-div').css('top', coords.y);
        $('#axis-context-menu-div').css('left', coords.x);
        $('#axis-context-menu-div').show();
        mSelectedAxisId = axis.id;
    }
    function hideAxisContextMenu() {
        $('#axis-context-menu-div').hide();
        mSelectedAxisId = null;
    }

    // END UTILITY

    let mLineDrawingController = new LineDrawingController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineDrawingController.setDrawFinishedCallback((newPoints, color, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            mModelController.newTimeline(newPoints, color);

            pushVersion();
            modelUpdated();
        } else if (startPointLineId != null && endPointLineId != null) {
            // the line which has it's end point connecting to the other line goes first
            let startLineId = endPointLineId;
            let endLineId = startPointLineId;
            mModelController.mergeTimeline(startLineId, endLineId, newPoints);

            pushVersion();
            modelUpdated();
        } else {
            mModelController.extendTimeline(startPointLineId ? startPointLineId : endPointLineId, newPoints, startPointLineId != null);

            pushVersion();
            modelUpdated();
        }
    });

    let mColorBrushController = new ColorBrushController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mColorBrushController.setDrawFinishedCallback((points, color, radius) => {
        let strokePoints = points.map(p => {
            let strokePoint = new DataStructs.StrokePoint(p.y);
            strokePoint.xValue = p.x;
            return strokePoint;
        })
        mModelController.addCanvasStroke(strokePoints, color, radius * 2);

        pushVersion();
        modelUpdated();
    })

    let mEraserController = new EraserController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mEraserController.setEraseCallback(canvasMask => {
        let changeMade = false;

        // check/erase lines
        if (mMode == Mode.ERASER_TEXT || mMode == Mode.ERASER) {
            // text has to be erased first because we need the rendering information.
            let boundingBoxes = mTextController.getTextBoundingBoxes();
            let maskedCellBindingIds = DataUtil.getMaskedText(canvasMask, boundingBoxes);
            mModelController.deleteCellBindings(maskedCellBindingIds);
            if (maskedCellBindingIds.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_TIMELINE || mMode == Mode.ERASER) {
            let segmentsData = DataUtil.getMaskedTimelines(canvasMask, mModelController.getModel());

            let deletedTimelines = segmentsData.filter(d => d.segments.length == 1 && d.segments[0].label == SEGMENT_LABELS.DELETED).map(d => d.id);
            deletedTimelines.forEach(id => mModelController.deleteTimeline(id));
            let brokenTimelines = segmentsData.filter(d => d.segments.length > 1);
            brokenTimelines.forEach(d => mModelController.breakTimeline(d.id, d.segments));
            if (deletedTimelines.length > 0 || brokenTimelines.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_STROKE || mMode == Mode.ERASER) {
            let model = mModelController.getModel();
            let strokeFragementData = DataUtil.getMaskedStrokes(canvasMask, model);
            strokeFragementData.forEach(({ strokeData, fragments }) => {
                if (mModelController.isCanvasStroke(strokeData.id)) {
                    fragments.forEach(fragment => {
                        mModelController.addCanvasStroke(
                            fragment,
                            strokeData.color,
                            strokeData.width);
                    })
                } else {
                    let timeline = model.getTimelineByStrokeId(strokeData.id);
                    if (!timeline) { console.error('No timeline for timeline stroke!', strokeData); return; }
                    fragments.forEach(fragment => {
                        if (!timeline) console.error('Cannot get timeline')
                        mModelController.addTimelineStroke(
                            timeline.id,
                            fragment,
                            strokeData.color,
                            strokeData.width);
                    })
                }
            });
            mModelController.deleteStrokes(strokeFragementData.map(s => s.strokeData.id));
            if (strokeFragementData.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_POINT || mMode == Mode.ERASER) {
            let maskedCellBindingIds = DataUtil.getMaskedDataPoints(canvasMask, mModelController.getModel());
            mModelController.deleteCellBindings(maskedCellBindingIds);
            if (maskedCellBindingIds.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_IMAGE || mMode == Mode.ERASER) {
            let erasedImageIds = DataUtil.getMaskedImages(canvasMask, mModelController.getModel());
            mModelController.deleteImageBindings(erasedImageIds);
            if (erasedImageIds.length > 0) changeMade = true;
        }
        if (mMode == Mode.ERASER_PIN) {
            let erasedPinIds = DataUtil.getMaskedPins(canvasMask, mModelController.getModel());
            // only do this if we are specifically erasing pins, because 
            // pins will be deleted with the erased line section.
            mModelController.deletePins(erasedPinIds);
            if (erasedPinIds.length > 0) changeMade = true;
        }

        if (changeMade) {
            pushVersion();
            modelUpdated();
        }
    })

    let mDeformController = new DeformController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDeformController.setDragStartCallback((timelineId, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        return coords;
    });
    mDeformController.setLineModifiedCallback(data => {
        data.forEach(d => mModelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));

        pushVersion();
        modelUpdated();
    });

    let mSmoothController = new SmoothController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mSmoothController.setLineModifiedCallback(data => {
        data.forEach(d => mModelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));

        pushVersion();
        modelUpdated();
    });

    let mDataTableController = new DataTableController();
    mDataTableController.setOnSelectionCallback((yTop, yBottom, isFirstColOnly) => {
        if (isFirstColOnly) {
            $('#link-button-div').hide();
        } else {
            let maxPos = window.innerHeight - mLensSvg.attr('height') - 50;
            let minPos = 10;
            let position = (yTop + yBottom) / 2 - $('#link-button-div').height() / 2 - 10;

            $('#link-button-div').css('top', Math.min(maxPos, Math.max(minPos, position)));
            $('#link-button-div').show();
        }
    });
    mDataTableController.setOnDeselectionCallback((yTop, yBottom) => {
        $('#link-button-div').hide();
        if (mMode == Mode.LINK) setDefaultMode();
    });
    mDataTableController.setTableUpdatedCallback((table, changeType, changeData) => {
        mModelController.tableUpdated(table, changeType, changeData);

        // Could do some more checks to avoid expensive redraws
        if (changeType == TableChange.DELETE_ROWS ||
            changeType == TableChange.DELETE_COLUMNS ||
            changeType == TableChange.UPDATE_CELLS ||
            changeType == TableChange.PASTE) {

            modelUpdated();
        }

        pushVersion();
    });
    mDataTableController.setShouldDeselectCallback(() => !mMousedOverLinkButton)

    let mResizeController = new ResizeController(mInteractionLayer);
    mResizeController.setDragStartCallback((pointerEvent, bounds) => {
        mResizingImageBindingData = mModelController.getModel().getImageBindingDataById(mSelectedImageBindingId);
        mResizingImageBindingData.startBounds = bounds;

        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        return coords
    })
    mResizeController.setDragCallback((dragCoords, startPos, newBounds) => {
        if (mSelectedImageBindingId) {
            hideImageContextMenu();

            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, dragCoords)) return;

            let imageBindingData = mResizingImageBindingData.copy();

            if (mResizingImageBindingData.startBounds.x1 != newBounds.x1) {
                imageBindingData.imageBinding.offset.x = imageBindingData.imageBinding.offset.x + dragCoords.x - startPos.x;
            }

            if (mResizingImageBindingData.startBounds.y1 != newBounds.y1) {
                imageBindingData.imageBinding.offset.y = imageBindingData.imageBinding.offset.y + dragCoords.y - startPos.y;
            }

            imageBindingData.imageBinding.height = newBounds.y2 - newBounds.y1
            imageBindingData.imageBinding.width = newBounds.x2 - newBounds.x1

            mImageController.redrawImage(imageBindingData);
        }
    })
    mResizeController.setDragEndCallback((dragCoords, startPos, newBounds) => {
        if (mSelectedImageBindingId) {

            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, dragCoords)) return;

            let offset = mResizingImageBindingData.copy().imageBinding.offset;
            if (mResizingImageBindingData.startBounds.x1 != newBounds.x1) {
                offset.x = offset.x + dragCoords.x - startPos.x;
            }

            if (mResizingImageBindingData.startBounds.y1 != newBounds.y1) {
                offset.y = offset.y + dragCoords.y - startPos.y;
            }

            let height = newBounds.y2 - newBounds.y1
            let width = newBounds.x2 - newBounds.x1

            mModelController.updateImageSize(mSelectedImageBindingId, offset, height, width);

            pushVersion();
            modelUpdated();

            showImageContextMenu(mModelController.getModel().getImageBindingDataById(mSelectedImageBindingId), { x: newBounds.x1, y: newBounds.y1 });
            mResizeController.show(newBounds.x1, newBounds.y1, newBounds.x2, newBounds.y2, true);
        }

    })

    mMainOverlay.on('pointerdown', function (pointerEvent) {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == Mode.COLOR_BUCKET) {
            mModelController.updateCanvasColor(mBucketColor);
            pushVersion();
            modelUpdated();
        } else if (mMode == Mode.COLOR_BRUSH_EYEDROPPER) {
            setColorBrushColor(mModelController.getModel().getCanvas().color);
        } else if (mMode == Mode.COLOR_BUCKET_EYEDROPPER) {
            setColorBucketColor(mModelController.getModel().getCanvas().color);
        } else if (mMode == Mode.LINE_DRAWING_EYEDROPPER) {
            setLineDrawingColor(mModelController.getModel().getCanvas().color);
        } else if (mMode == Mode.LENS) {
            hideLensView();
        } else if (mMode == Mode.TEXT) {
            if (mTextInputBox.isShowing()) {
                mTextInputBox.returnText();
            } else {
                mModelController.addCanvasText('<text>', coords);
                pushVersion();
                modelUpdated();
            }
        } else if (mMode == Mode.IMAGE) {
            FileHandler.getImageFile().then(({ imageData, width, height }) => {
                let max = Math.max(width, height);
                width = width * 100 / max;
                height = height * 100 / max;
                mModelController.addCanvasImage(imageData, width, height, coords);
                pushVersion();
                modelUpdated();
            })
        }

        mColorBrushController.onPointerDown(coords);
        mLineDrawingController.onPointerDown(coords);
        mDeformController.onPointerDown(coords);
        mEraserController.onPointerDown(coords);
        mSmoothController.onPointerDown(coords);
        mSelectionController.onPointerDown(coords);
    })

    $(document).on('pointerdown', function (event) {
        let pointerEvent = event.originalEvent;
        let screenCoords = { x: pointerEvent.clientX, y: pointerEvent.clientY };
        let modelCoords = screenToSvgCoords(screenCoords);

        log(LogEvent.POINTER_DOWN, JSON.stringify([screenCoords, modelCoords]));

        if ($(event.target).closest('#text-context-menu-div').length === 0 &&
            $(event.target).closest('.text-interaction-target').length === 0) {
            // if we didn't click on a button in the context div
            hideTextContextMenu();
        }

        if ($(event.target).closest('#image-context-menu-div').length === 0 &&
            $(event.target).closest('.image-interaction-target').length === 0 &&
            $(event.target).closest('.resize-target').length === 0) {
            // if we didn't click on a button in the context div
            hideImageContextMenu();
            mResizeController.hide();
            mSelectedImageBindingId = null;
        }

        if ($(event.target).closest('#axis-context-menu-div').length === 0 &&
            $(event.target).closest('.axis-target-circle').length === 0) {
            // if we didn't click on a button in the context div
            hideAxisContextMenu();
        }

        if ($(event.target).closest('#color-picker-div').length === 0 &&
            $(event.target).closest('#color-brush-button-color-picker').length === 0 &&
            $(event.target).closest('#color-bucket-button-color-picker').length === 0 &&
            $(event.target).closest('#line-drawing-button-color-picker').length === 0) {
            // if we didn't click on the div or an open button
            $('#color-picker-div').hide();
        }

        if (mMode == Mode.IMAGE_LINK) {
            setDefaultMode();
        }
    });

    $(document).on('pointermove', function (e) {
        let pointerEvent = e.originalEvent;
        let screenCoords = { x: pointerEvent.clientX, y: pointerEvent.clientY };

        mDrawerController.onPointerMove(screenCoords);
        mLensController.onPointerMove(screenCoords);

        let coords = screenToSvgCoords(screenCoords);

        if (mMode == Mode.IMAGE_LINK) {
            if (!mLinkingBinding) {
                console.error('No image linking binding set!');
                setDefaultMode();
                return;
            }

            showLinkLine(mLinkingBinding.offset, coords);
        }

        mColorBrushController.onPointerMove(coords);
        mLineViewController.onPointerMove(coords);
        mLineDrawingController.onPointerMove(coords);
        mDeformController.onPointerMove(coords);
        mEraserController.onPointerMove(coords);
        mTimePinController.onPointerMove(coords);
        mTextController.onPointerMove(coords);
        mImageController.onPointerMove(coords);
        mResizeController.onPointerMove(coords);
        mDataPointController.onPointerMove(coords);
        mSmoothController.onPointerMove(coords);
        mStrokeController.onPointerMove(coords);
        mSelectionController.onPointerMove(coords);

        $('#mode-indicator-div').css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });
    });

    $(document).on('pointerup', function (e) {
        let pointerEvent = e.originalEvent;
        let screenCoords = { x: pointerEvent.clientX, y: pointerEvent.clientY };
        let coords = screenToSvgCoords(screenCoords);

        log(LogEvent.POINTER_UP, JSON.stringify([screenCoords, coords]));

        if (mPanning) {
            mPanning = false;
        }


        mDrawerController.onPointerUp(screenCoords);
        mLensController.onPointerUp(screenCoords);

        // sync pointer ups
        mColorBrushController.onPointerUp(coords);
        mLineViewController.onPointerUp(coords);
        mLineDrawingController.onPointerUp(coords);
        mDeformController.onPointerUp(coords);
        mTimePinController.onPointerUp(coords);
        mTextController.onPointerUp(coords);
        mImageController.onPointerUp(coords);
        mResizeController.onPointerUp(coords);
        mDataPointController.onPointerUp(coords);
        mSmoothController.onPointerUp(coords);
        mStrokeController.onPointerUp(coords);
        mSelectionController.onPointerUp(coords);

        // async pointer ups
        // the promise is mainly for testing purposes, but also 
        // highlights that these may happen in any order.
        return Promise.all([
            mEraserController.onPointerUp(coords)
        ])
    });

    $(document).keydown(function (e) {
        if ((e.ctrlKey || e.metaKey) && /* z */ e.which == 90) {
            let versionObj = mVersionController.doUndo();
            if (versionObj) {
                mModelController.setModelFromObject(versionObj)
                modelUpdated();
                log(LogEvent.UNDO, 'key');
            } else {
                log(LogEvent.UNDO, 'key, failed');
            }
        }

        if (((e.ctrlKey || e.metaKey) && /* y */ e.which == 89) || ((e.ctrlKey || e.metaKey) && e.shiftKey && /* z */ e.which == 90)) {
            let versionObj = mVersionController.doRedo();
            if (versionObj) {
                mModelController.setModelFromObject(versionObj)
                modelUpdated();
                log(LogEvent.REDO, 'button');
            } else {
                log(LogEvent.REDO, 'button, failed');
            }
        }

        if (/* delete */ e.which == 46) {
            deleteSelected();
            log(LogEvent.DELETE, 'key')
        }

        if (e.key == 'Enter') {
            if (mTextInputBox.isShowing()) {
                mTextInputBox.returnText();
                log(LogEvent.TEXT_EDIT, 'key')
            }
        }
    });

    $(document).on('wheel', function (e) {
        e = e.originalEvent;
        mDeformController.onWheel(e.wheelDelta);
        mEraserController.onWheel(e.wheelDelta);
        mSmoothController.onWheel(e.wheelDelta);
        mColorBrushController.onWheel(e.wheelDelta);
        mLensController.onWheel(e.wheelDelta);

        log(LogEvent.WHEEL, '');
    });

    function deleteSelected() {
        let selectedCount = [mSelectedCellBindingId, mSelectedImageBindingId, mSelectedAxisId]
            .reduce((count, item) => item == null ? count : count + 1, 0);
        if (selectedCount > 1) {
            console.error('Multiple selected items!', [mSelectedCellBindingId, mSelectedImageBindingId, mSelectedAxisId]);
            return;
        };

        if (mSelectedCellBindingId != null) {
            mModelController.deleteCellBindings([mSelectedCellBindingId]);
        } else if (mSelectedImageBindingId != null) {
            mModelController.deleteImageBindings([mSelectedImageBindingId]);
        } else if (mSelectedAxisId != null) {
            mModelController.deleteDataSet(mSelectedAxisId);
        }

        if (selectedCount == 1) {
            pushVersion();
            modelUpdated();
            hideAxisContextMenu();
            hideTextContextMenu();
            hideImageContextMenu();
            mResizeController.hide();
            mSelectedImageBindingId = null;
        }
    }

    function screenToSvgCoords(screenCoords) {
        if (isNaN(parseInt(screenCoords.x)) || isNaN(parseInt(screenCoords.y))) {
            console.error('Bad screen coords', screenCoords);
            return { x: 0, y: 0 };
        }

        let svgViewportPos = mSvg.node().getBoundingClientRect();
        if (isNaN(parseInt(svgViewportPos.x)) || isNaN(parseInt(svgViewportPos.y))) {
            console.error('Bad svg bounding box!', svgViewportPos);
            return { x: 0, y: 0 };
        }

        if (isNaN(parseInt(mViewTransform.x)) || isNaN(parseInt(mViewTransform.y))) {
            console.error('Bad veiw state!', mViewTransform);
            return { x: 0, y: 0 };
        }

        return {
            x: (screenCoords.x - svgViewportPos.x - mViewTransform.x) / mViewTransform.scale,
            y: (screenCoords.y - svgViewportPos.y - mViewTransform.y) / mViewTransform.scale
        };
    }

    function svgCoordsToScreen(svgCoords) {
        let svgViewportPos = mSvg.node().getBoundingClientRect();
        return {
            x: (svgCoords.x * mViewTransform.scale) + svgViewportPos.x + mViewTransform.x,
            y: (svgCoords.y * mViewTransform.scale) + svgViewportPos.y + mViewTransform.y
        };
    }

    function setViewToTransform() {
        mVizLayer.attr('transform', 'translate(' + mViewTransform.x + ',' + mViewTransform.y + ') scale(' + mViewTransform.scale + ')');
        mInteractionLayer.attr('transform', 'translate(' + mViewTransform.x + ',' + mViewTransform.y + ') scale(' + mViewTransform.scale + ')');
        let topLeft = screenToSvgCoords({ x: 0, y: 0 });
        let bottomRight = screenToSvgCoords({ x: mSvg.attr('width'), y: mSvg.attr('height') });
        FilterUtil.setFilterDisplayArea(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    }

    function pinDrag(timeline, timePin, linePercent) {
        if (linePercent < 0) linePercent = 0;
        if (linePercent > 1) linePercent = 1;

        let changedPin = timePin.copy();
        changedPin.linePercent = linePercent;

        let timelineHasMapping = mModelController.getModel().hasTimeMapping(timeline.id);
        let timeAttribute = timelineHasMapping ? 'timeStamp' : 'timePercent';

        let tempPins = DataUtil.filterTimePinByChangedPin(timeline.timePins, changedPin, timeAttribute);
        mTimePinController.drawPinTicks(timeline, tempPins);

        let timeBindingValues = DataUtil.filterTimePinByChangedPin(
            mModelController.getModel().getTimeBindingValues(timeline), changedPin, timeAttribute);

        mLineViewController.drawSingleTimeline(timeline, timeBindingValues, timeAttribute);
    }

    function pinDragEnd(timeline, timePin, linePercent) {
        if (linePercent < 0) linePercent = 0;
        if (linePercent > 1) linePercent = 1;

        timePin.linePercent = linePercent;

        mModelController.updatePinBinding(timeline.id, timePin);

        pushVersion();
        modelUpdated();
    }

    function pushVersion() {
        mVersionController.pushVersion(mModelController.getModel().toObject());
    }

    function modelUpdated() {
        mLineViewController.updateModel(mModelController.getModel());
        mLineDrawingController.updateModel(mModelController.getModel());
        mDeformController.updateModel(mModelController.getModel());
        mSmoothController.updateModel(mModelController.getModel());
        mDataTableController.updateModel(mModelController.getModel());
        mTextController.updateModel(mModelController.getModel());
        mImageController.updateModel(mModelController.getModel());
        mDataPointController.updateModel(mModelController.getModel());
        mTimePinController.updateModel(mModelController.getModel());
        mLensController.updateModel(mModelController.getModel());
        mStrokeController.updateModel(mModelController.getModel());
        mEraserController.updateModel(mModelController.getModel());
        mSelectionController.updateModel(mModelController.getModel());

        if (mLensController.getCurrentTimelineId()) {
            showLensView(mLensController.getCurrentTimelineId(), mLensController.getCurrentCenterPercent());
        } else {
            hideLensView();
        }

        $('body').css('background-color', mModelController.getModel().getCanvas().color);
    }

    // Setup main view buttons' events
    $('#datasheet-toggle-button').on('click', () => {
        if (mDrawerController.isOpen()) {
            mDrawerController.closeDrawer();
            mDataTableController.deselectCells();
            $('#link-button-div').hide();
        } else {
            mDrawerController.openDrawer();
        }

        log(LogEvent.TOGGLE_DRAWER, mDrawerController.isOpen());
    })
    setupButtonTooltip('#datasheet-toggle-button', 'Opens and closes the datasheets and lens view');

    $('#undo-button').on('click', () => {
        let versionObj = mVersionController.doUndo();
        if (versionObj) {
            mModelController.setModelFromObject(versionObj)
            modelUpdated();
            log(LogEvent.UNDO, 'button');
        } else {
            log(LogEvent.UNDO, 'button, failed');
        }
    })
    setupButtonTooltip('#undo-button', 'Undo last action');

    $('#redo-button').on('click', () => {
        let versionObj = mVersionController.doRedo();
        if (versionObj) {
            mModelController.setModelFromObject(versionObj)
            modelUpdated();
            log(LogEvent.REDO, 'button');
        } else {
            log(LogEvent.REDO, 'button, failed');
        }
    })
    setupButtonTooltip('#redo-button', 'Redo last undone action');

    $('#upload-button').on('click', async () => {
        setDefaultMode();
        showSubMenu('#upload-button');
        log(LogEvent.UPLOAD_MENU, '');
    })
    setupButtonTooltip('#upload-button', 'Shows menu to load previous work');

    $('#upload-button-folder').on('click', async () => {
        try {
            setDefaultMode();

            mWorkspace = await FileHandler.getWorkspace(false);
            workspaceSet();

            let model = await mWorkspace.readVersion();
            mModelController.setModelFromObject(model);
            mVersionController.reset();
            pushVersion();
            mVersionController.setWorkspace(mWorkspace);
            modelUpdated();

            log(LogEvent.WORKSPACE_OPENED, '');
        } catch (e) {
            if (e.message.includes('The user aborted a request')) return;
            if (e.message.includes('Missing folders')) {
                alert('Cannot open workspace: ' + e.message)
                return;
            };
            console.error('Error fetching model', e); return;
        }
    })
    setupButtonTooltip('#upload-button-folder', 'Select and load a viz from a workspace folder');

    $('#upload-button-json').on('click', async () => {
        let model;
        try {
            model = await FileHandler.getJSONModel();
            mModelController.setModelFromObject(model);
            pushVersion();
            modelUpdated();
            setDefaultMode();

            log(LogEvent.JSON_UPLOADED, 'success');
        } catch (e) {
            if (e.message.includes('The user aborted a request')) {
                log(LogEvent.JSON_UPLOADED, 'aborted');
                return;
            };
            console.error('Error loading workspace', e);
            log(LogEvent.JSON_UPLOADED, 'error ' + e.message);
            return;
        }
    })
    setupButtonTooltip('#upload-button-json', 'Replace current viz with a previously downloaded json file');

    $('#download-button').on('click', () => {
        setDefaultMode();
        showSubMenu('#download-button');
        log(LogEvent.DOWNLOAD_MENU, '');
    })
    setupButtonTooltip('#download-button', 'Shows menu with options to save your work');

    $('#download-button-folder').on('click', async () => {
        try {
            mWorkspace = await FileHandler.getWorkspace(true);
            await mWorkspace.writeVersion(mModelController.getModel().toObject());

            mVersionController.setWorkspace(mWorkspace);

            workspaceSet();

            log(LogEvent.WRITE_WORKSPACE, '');
        } catch (e) {
            if (e.message.includes('The user aborted a request')) return;
            if (e.message.includes('Folder not empty')) {
                alert('Cannot open workspace: ' + e.message)
                return;
            };
            console.error('Error saving workspace', e); return;
        }
    })
    setupButtonTooltip('#download-button-folder', 'Set the workspace folder for this visualization');

    $('#download-button-json').on('click', () => {
        FileHandler.downloadJSON(mModelController.getModel().toObject());
        log(LogEvent.WRITE_JSON, '');
    })
    setupButtonTooltip('#download-button-json', 'Package your image into a json file which can be uploaded later');

    $('#download-button-svg').on('click', () => {
        let viz = mVizLayer.clone(true);
        viz.attr('transform', 'translate(' + 0 + ',' + 0 + ')');
        viz.selectAll('g').each(function () {
            if (this.childElementCount == 0) {
                d3.select(this).remove();
            }
        });
        viz.select('#timeline-drawing-brush').remove();

        let { x, y, width, height } = viz.node().getBBox();

        let exportSVG = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', x + ' ' + y + ' ' + width + ' ' + height)
            .style('background-color', mModelController.getModel().getCanvas().color)
            .attr('xmlns', 'http://www.w3.org/2000/svg');
        exportSVG.append(function () { return viz.node() });
        FileHandler.downloadSVG(exportSVG.node())
        log(LogEvent.WRITE_SVG, '');
    })
    setupButtonTooltip('#download-button-svg', 'Download your viz as svg');

    $('#download-button-png').on('click', async () => {
        let canvas = await DataUtil.vizToCanvas(mVizLayer, mModelController.getModel().getCanvas().color);
        FileHandler.downloadPNG(canvas);
        log(LogEvent.WRITE_PNG, '');
    })
    setupButtonTooltip('#download-button-png', 'Download your viz as png');
    // ---------------
    setupModeButton('#line-drawing-button', Mode.LINE_DRAWING, () => {
        mLineDrawingController.setActive(true);
    });
    setupButtonTooltip('#line-drawing-button', 'Draws timelines')
    $('#line-drawing-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/timeline_drawing.mp4');
    })
    setupSubModeButton('#line-drawing-button', '-eyedropper', Mode.LINE_DRAWING_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#line-drawing-button-eyedropper', 'Copies the color from anything that can be colored')
    $('#line-drawing-button-color-picker').on('click', (e) => {
        setColorPickerInputColor(mLineDrawingController.getColor());
        toggleColorPicker(e);
    });
    setupButtonTooltip('#line-drawing-button-color-picker', 'Choose timeline color');


    $('#line-manipulation-button').on('click', () => {
        if (mMode == Mode.DEFORM) {
            setDefaultMode();
        } else {
            $('#line-manipulation-button-deform').trigger('click');
        }
    })
    setupButtonTooltip('#line-manipulation-button', 'Smooths and deforms timelines')
    $('#line-manipulation-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/deform.mp4');
    })
    setupSubModeButton('#line-manipulation-button', '-deform', Mode.DEFORM, () => {
        mDeformController.setActive(true);
    });
    setupButtonTooltip('#line-manipulation-button-deform', 'Deforms timelines')
    setupSubModeButton('#line-manipulation-button', '-smooth', Mode.SMOOTH, () => {
        mSmoothController.setActive(true);
    });
    setupButtonTooltip('#line-manipulation-button-smooth', 'Flattens timelines')

    setupModeButton('#scissors-button', Mode.SCISSORS, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#scissors-button', 'Splits timelines')
    $('#scissors-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/scissors.mp4');
    })

    $('#toggle-timeline-style-button').on('click', () => {
        mLineViewController.toggleStyle(mModelController.getModel());
        log(LogEvent.LINE_STYLE_TOGGLE, '');
    })
    setupButtonTooltip('#toggle-timeline-style-button', 'Flips through available timeline styles')
    // ---------------
    setupModeButton('#color-brush-button', Mode.COLOR_BRUSH, () => {
        mColorBrushController.setActive(true);
    });
    setupButtonTooltip('#color-brush-button', 'Draws annotations on the diagram and in the lens view')
    $('#color-brush-button',).on('dblclick', function () {
        showVideoViewer('img/tutorial/stroke_annotation.mp4');
    })
    setupSubModeButton('#color-brush-button', '-eyedropper', Mode.COLOR_BRUSH_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#color-brush-button-eyedropper', 'Copies the color from anything that can be colored')
    $('#color-brush-button-color-picker').on('click', (e) => {
        setColorPickerInputColor(mColorBrushController.getColor());
        toggleColorPicker(e);
    });
    setupButtonTooltip('#color-brush-button-color-picker', 'Choose brush color');

    $('#color-brush-button-grow').on('click', () => {
        mColorBrushController.increaseBrushRadius();
        mLensController.increaseBrushRadius();
        log(LogEvent.GROW_COLOR_BRUSH, '');
    })
    $('#color-brush-button-shrink').on('click', () => {
        mColorBrushController.decreaseBrushRadius();
        mLensController.decreaseBrushRadius();
        log(LogEvent.SHRINK_COLOR_BRUSH, '');
    })


    setupModeButton('#text-button', Mode.TEXT, () => {
        mLineViewController.setActive(true);
        mTextController.setActive(true);
    });
    setupButtonTooltip('#text-button', 'Creates text items on timelines or on the main view')
    $('#text-button',).on('dblclick', function () {
        showVideoViewer('img/tutorial/text.mp4');
    })
    $('#toggle-font-button').on('click', () => {
        if (!mSelectedCellBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        mModelController.toggleFont(mSelectedCellBindingId);
        pushVersion();
        modelUpdated();
    })
    $('#toggle-font-weight-button').on('click', () => {
        if (!mSelectedCellBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        mModelController.toggleFontWeight(mSelectedCellBindingId);
        pushVersion();
        modelUpdated();
    })
    $('#toggle-font-italics-button').on('click', () => {
        if (!mSelectedCellBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        mModelController.toggleFontItalics(mSelectedCellBindingId);
        pushVersion();
        modelUpdated();
    })
    $('#increase-font-size-button').on('click', () => {
        if (!mSelectedCellBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        let cellBinding = mModelController.getModel().getCellBindingById(mSelectedCellBindingId);
        if (!cellBinding) {
            console.error('Bad State! Cell binding not found', mSelectedCellBindingId);
            return;
        }

        mModelController.setFontSize(mSelectedCellBindingId, Math.min(cellBinding.fontSize + 4, 64));
        pushVersion();
        modelUpdated();
    })
    $('#decrease-font-size-button').on('click', () => {
        if (!mSelectedCellBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        let cellBinding = mModelController.getModel().getCellBindingById(mSelectedCellBindingId);
        if (!cellBinding) {
            console.error('Bad State! Cell binding not found', mSelectedCellBindingId);
            return;
        }

        mModelController.setFontSize(mSelectedCellBindingId, Math.max(cellBinding.fontSize - 4, 4));
        pushVersion();
        modelUpdated();
    })
    $('#delete-text-button').on('click', deleteSelected);
    setupButtonTooltip('#delete-text-button', 'Unlink this text from the visual');

    setupModeButton('#image-button', Mode.IMAGE, () => {
        mLineViewController.setActive(true);
        mImageController.setActive(true);
    });
    setupButtonTooltip('#image-button', 'Add images to the viz')
    $('#image-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/image.mp4');
    })


    $('#image-unlink-button').on('click', () => {
        if (!mSelectedImageBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        mModelController.imageBindingToCanvasBinding(mSelectedImageBindingId);
        mSelectedImageBindingId = null;

        setDefaultMode();
        pushVersion();
        modelUpdated();
    })
    setupButtonTooltip('#image-unlink-button', 'Detach image from line')
    $('#delete-image-button').on('click', deleteSelected);
    setupButtonTooltip('#delete-image-button', 'Delete this image');

    setupModeButton('#image-link-button', Mode.IMAGE_LINK, () => {
        if (!mSelectedImageBindingId) {
            console.error('Button should not be clickable!');
            setDefaultMode();
            return;
        }
        mLinkingBinding = mModelController.getModel().getImageBindingById(mSelectedImageBindingId);
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#image-link-button', 'Attach image to line')

    $('#image-time-edit-button').on('click', (event) => {
        if (!mSelectedImageBindingId) {
            console.error('Button should not be clickable!');
            return;
        }

        let imageBinding = mModelController.getModel().getImageBindingById(mSelectedImageBindingId);
        if (!imageBinding) {
            console.error('Image binding not found for id!', mSelectedImageBindingId);
            return;
        }

        let screenCoords = { x: event.clientX, y: event.clientY };

        let time = imageBinding.timeStamp ? DataUtil.getFormattedDate(imageBinding.timeStamp) : '';
        mTextInputBox.show(time, screenCoords.x, screenCoords.y, 100, 200);
        mTextInputBox.setTextChangedCallback((text) => {
            let time = new Date(text);
            if (isNaN(time)) {
                time = new Date(parseInt(text));
            }
            if (!isNaN(time)) {
                mModelController.updateImageTime(imageBinding.id, time.getTime());
                pushVersion();
                modelUpdated();
            }
            mTextInputBox.reset();
        })
        mTextInputBox.setIsValidCallback(text => {
            return text && (!isNaN(new Date(text)) || !isNaN(new Date(parseInt(text))));
        })
    })
    setupButtonTooltip('#image-time-edit-button', 'Edit the time assigned to the image')


    setupModeButton('#pin-button', Mode.PIN, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mImageController.setActive(true);
    });
    setupButtonTooltip('#pin-button', 'Creates and moves time pins on timelines')
    $('#pin-button',).on('dblclick', function () {
        showVideoViewer('img/tutorial/pin.mp4');
    })

    // ---------------
    $('#selection-button').on('click', () => {
        setDefaultMode();
    })
    setupButtonTooltip('#selection-button', 'Select and move items around')
    $('#selection-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/selection.mp4');
    })


    setupModeButton('#eraser-button', Mode.ERASER, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button', 'Erases all the things!')
    $('#eraser-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/eraser.mp4');
    })
    setupSubModeButton('#eraser-button', '-timeline', Mode.ERASER_TIMELINE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button-timeline', 'Erases timelines only')
    setupSubModeButton('#eraser-button', '-stroke', Mode.ERASER_STROKE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button-stroke', 'Erases strokes only')
    setupSubModeButton('#eraser-button', '-point', Mode.ERASER_POINT, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button-point', 'Erases points only')
    setupSubModeButton('#eraser-button', '-text', Mode.ERASER_TEXT, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button-text', 'Erases text only')
    setupSubModeButton('#eraser-button', '-pin', Mode.ERASER_PIN, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button-pin', 'Erases pins only')
    setupSubModeButton('#eraser-button', '-image', Mode.ERASER_IMAGE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip('#eraser-button-image', 'Erases images only')

    setupModeButton('#color-bucket-button', Mode.COLOR_BUCKET, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mStrokeController.setActive(true);
    });
    setupButtonTooltip('#color-bucket-button', 'Colors all the things!')
    $('#color-bucket-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/bucket.mp4');
    })
    setupSubModeButton('#color-bucket-button', '-eyedropper', Mode.COLOR_BUCKET_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#color-bucket-button-eyedropper', 'Copies the color from anything that can be colored')
    $('#color-bucket-button-color-picker').on('click', (e) => {
        setColorPickerInputColor(mBucketColor);
        toggleColorPicker(e);
    });
    setupButtonTooltip('#color-bucket-button-color-picker', 'Choose color to color things with');

    $('#color-picker-wrapper').farbtastic((color) => {
        if (color != '#NaNNaNNaN') {
            color = color + getOpacityInput();
            if (mMode == Mode.COLOR_BRUSH) {
                setColorBrushColor(color);
            } else if (mMode == Mode.COLOR_BUCKET) {
                setColorBucketColor(color);
            } else if (mMode == Mode.LINE_DRAWING) {
                setLineDrawingColor(color);
            }
            setColorPickerInputColor(color);
        }
    });
    $('#color-picker-input').on('input', (e) => {
        if (mMode == Mode.COLOR_BRUSH) {
            setColorBrushColor($('#color-picker-input').val());
        } else if (mMode == Mode.COLOR_BUCKET) {
            setColorBucketColor($('#color-picker-input').val());
        } else if (mMode == Mode.LINE_DRAWING) {
            setLineDrawingColor($('#color-picker-input').val());
        }
        setColorPickerInputColor($('#color-picker-input').val());
    })
    $('#opacity-input').on('change', function () {
        let opacity = getOpacityInput();
        let color = $('#color-picker-input').val().substring(0, 7) + opacity;

        if (mMode == Mode.COLOR_BRUSH) {
            setColorBrushColor(color);
        } else if (mMode == Mode.COLOR_BUCKET) {
            setColorBucketColor(color);
        } else if (mMode == Mode.LINE_DRAWING) {
            setLineDrawingColor(color);
        }
        setColorPickerInputColor(color);
    })

    // set color to a random color
    setColorBrushColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') + 'FF')
    setColorBucketColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') + 'FF')
    setLineDrawingColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') + 'FF')

    // ---------------
    setupModeButton('#lens-button', Mode.LENS, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#lens-button', 'Displayed the clicked section of timeline in the lens view')
    $('#lens-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/lens.mp4');
    })

    setupModeButton('#panning-button', Mode.PAN, () => {
        mSvg.call(mZoom);
    });
    setupButtonTooltip('#panning-button', 'Pans the main view and the lens view')
    $('#panning-button').on('dblclick', function () {
        showVideoViewer('img/tutorial/pan.mp4');
    })


    // setup other buttons

    setupModeButton('#link-button', Mode.LINK, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#link-button', 'Attaches data to timelines')
    $('#link-button').on('pointerenter', () => { mMousedOverLinkButton = true; });
    $('#link-button').on('pointerout', () => { mMousedOverLinkButton = false; });

    $('#toggle-data-style-button').on('click', () => {
        if (!mSelectedAxisId) { console.error('Button should not be clickable!'); return; }
        mModelController.toggleDataStyle(mSelectedAxisId);
        pushVersion();
        modelUpdated();
    });
    setupButtonTooltip('#toggle-data-style-button', 'Toggle the data display style');
    $('#dynamic-normals-axis-button').on('click', () => {
        if (!mSelectedAxisId) { console.error('Button should not be clickable!'); return; }
        mModelController.updateAxisDataAlignment(mSelectedAxisId, DataDisplayAlignments.FIXED);
        pushVersion();

        $('#dynamic-normals-axis-button').hide();
        $('#fixed-normals-axis-button').show();
        modelUpdated();
    });
    setupButtonTooltip('#dynamic-normals-axis-button', 'Change the data alignment relative to the line.');
    $('#fixed-normals-axis-button').on('click', () => {
        if (!mSelectedAxisId) { console.error('Button should not be clickable!'); return; }
        mModelController.updateAxisDataAlignment(mSelectedAxisId, DataDisplayAlignments.DYNAMIC);
        pushVersion();

        $('#fixed-normals-axis-button').hide();
        $('#dynamic-normals-axis-button').show();
        modelUpdated();
    });
    setupButtonTooltip('#fixed-normals-axis-button', 'Change the data alignment relative to the line.');
    $('#delete-axis-button').on('click', deleteSelected);
    setupButtonTooltip('#delete-axis-button', 'Unlink all data points in this set');

    $('#add-datasheet-button').on('click', () => {
        let newTable = new DataStructs.DataTable([
            new DataStructs.DataColumn('Time', 0),
            new DataStructs.DataColumn('', 1),
            new DataStructs.DataColumn('', 2)
        ]);
        for (let i = 0; i < 3; i++) {
            let dataRow = new DataStructs.DataRow()
            dataRow.index = i;
            dataRow.dataCells.push(new DataStructs.TimeCell('', newTable.dataColumns[0].id));
            for (let j = 1; j < newTable.dataColumns.length; j++) {
                dataRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, '', newTable.dataColumns[j].id));
            }
            newTable.dataRows.push(dataRow)
        }


        mModelController.addTable(newTable);
        pushVersion();
        modelUpdated();

        log(LogEvent.ADD_SPREADSHEET, '');
    })
    setupButtonTooltip('#add-datasheet-button', 'Adds a new datasheet')

    $('#upload-datasheet-button').on('click', async () => {
        try {
            let csv = await FileHandler.getCSVDataFile();
            mModelController.addTableFromCSV(csv.data);
            pushVersion();
            modelUpdated();
        } catch (e) {
            if (e.message.includes('The user aborted a request')) {
                log(LogEvent.UPLOAD_CSV, 'aborted');
            } else {
                log(LogEvent.UPLOAD_CSV, 'error ' + e.message);
                throw e;
            }
        }

        log(LogEvent.UPLOAD_CSV, 'success');
    })
    setupButtonTooltip('#upload-datasheet-button', 'Upload a csv datasheet')

    function setupModeButton(buttonId, mode, callback) {
        $(buttonId).on('click', () => {
            if (mMode == mode) {
                setDefaultMode()
            } else {
                clearMode();
                callback();
                mMode = mode;
                mLensController.setMode(mode);

                $(buttonId).css('opacity', '0.3');

                $('#mode-indicator-div').html('');
                let modeImg = $('<img>');
                modeImg.attr('id', 'mode-img');
                modeImg.attr('src', $(buttonId).attr('src'));
                modeImg.css('max-width', '35px');
                modeImg.css('background-color', $(buttonId).css('background-color'));
                modeImg.addClass('mode-indicator');
                $('#mode-indicator-div').append(modeImg);
                $('#mode-indicator-div').show();

                showSubMenu(buttonId);

                log(LogEvent.MODE_CHANGE, mMode);
            }
        })
    }

    function setupSubModeButton(buttonId, subButtonAppendix, mode, callback) {
        $(buttonId + subButtonAppendix).on('click', () => {
            if (mMode == mode) {
                $(buttonId).trigger('click');
            } else {
                // clear everything and show your own submenu
                clearMode();
                showSubMenu(buttonId);

                callback();
                mMode = mode;
                mLensController.setMode(mode);

                $(buttonId).css('opacity', '0.3');
                $(buttonId + subButtonAppendix).css('opacity', '0.3');

                $('#mode-indicator-div').html('');
                let modeImg = $('<img>');
                modeImg.attr('src', $(buttonId + subButtonAppendix).attr('src'));
                modeImg.css('max-width', '35px');
                modeImg.css('background-color', $(buttonId + subButtonAppendix).css('background-color'));
                modeImg.addClass('mode-indicator');
                $('#mode-indicator-div').append(modeImg);
                $('#mode-indicator-div').show();

                log(LogEvent.MODE_CHANGE, mMode);
            }
        })
    }

    function showSubMenu(buttonId) {
        $('.sub-menu').hide();
        $(buttonId + '-sub-menu').show();
        $('#sub-menu-wrapper').css('top', window.height);
        $('#sub-menu-wrapper').show();

        // This is dump but nessisary to show the menu in the right origination
        // otherwise the sub-menu height is 0, so it can't tell if it's too tall.
        setTimeout(() => {
            let top = $(buttonId).offset().top;
            let height = $(buttonId + '-sub-menu').height();

            if ((top + height) > window.innerHeight) {
                $('#sub-menu-wrapper').css('top', '');
                $('#sub-menu-wrapper').css('bottom', window.innerHeight - ($(buttonId).offset().top + $(buttonId).height()));
            } else {
                $('#sub-menu-wrapper').css('top', top);
                $('#sub-menu-wrapper').css('bottom', '');
            }
        }, 1)
    }

    function setupButtonTooltip(buttonId, text) {
        $(buttonId).on('pointerenter', (event) => {
            let screenCoords = { x: event.clientX, y: event.clientY };
            mTooltip.show(text, screenCoords);
            mTooltipSetTo = buttonId;

            log(LogEvent.TOOLTIP, buttonId)
        })
        $(buttonId).on('pointerout', (event) => {
            if (mTooltipSetTo == buttonId) {
                mTooltip.hide();
            }
        })
    }

    function setDefaultMode() {
        clearMode();
        mMode = Mode.SELECTION;
        mLensController.setMode(Mode.SELECTION);

        mSelectionController.setActive(true);
        mLineViewController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mImageController.setActive(true);
        mStrokeController.setActive(true);

        $('#selection-button').css('opacity', '0.3');

        hideImageContextMenu();
        mResizeController.hide();
        mSelectedImageBindingId = null;

        hideTextContextMenu();
        hideAxisContextMenu();

        mLinkingBinding = null;
        hideLinkLine();

        $('#mode-indicator-div').html('');
        let modeImg = $('<img>');
        modeImg.attr('id', 'mode-img');
        modeImg.attr('src', $('#selection-button').attr('src'));
        modeImg.css('max-width', '35px');
        modeImg.css('background-color', $('#selection-button').css('background-color'));
        modeImg.addClass('mode-indicator');
        $('#mode-indicator-div').append(modeImg);
        $('#mode-indicator-div').show();

        $('#selection-button-sub-menu').css('top', $('#selection-button').offset().top);
        $('#selection-button-sub-menu').css('left', $('#selection-button').offset().left - $('#selection-button-sub-menu').outerWidth() - 10);
        $('#selection-button-sub-menu').show();

        log(LogEvent.MODE_CHANGE, mMode);
    }
    setDefaultMode();

    function clearMode() {
        mLineViewController.setActive(false);
        mLineDrawingController.setActive(false);
        mEraserController.setActive(false);
        mDeformController.setActive(false);
        mSmoothController.setActive(false);
        mTimePinController.setActive(false);
        mColorBrushController.setActive(false);
        mDataPointController.setActive(false);
        mTextController.setActive(false);
        mImageController.setActive(false);
        mStrokeController.setActive(false);
        mSelectionController.setActive(false);
        mLensController.clearMode();
        $('.tool-button').css('opacity', '');
        $('#mode-indicator-div img').hide();
        $('#mode-indicator-div').hide();
        $('#sub-menu-wrapper').hide();

        mMode = Mode.NONE;
        mLensController.setMode(Mode.NONE);
        mSvg.on('.zoom', null);
    }

    // Color utility functions
    function setEyeDropperActive() {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mStrokeController.setActive(true);
    }

    function toggleColorPicker(e) {
        if ($('#color-picker-div').is(':visible')) {
            $('#color-picker-div').hide();
            log(LogEvent.TOGGLE_COLOR_PICKER, 'close');
        } else {
            $('#color-picker-div').css('top', e.pageY - $('#color-picker-div').height());
            $('#color-picker-div').css('left', e.pageX - $('#color-picker-div').width());
            $('#color-picker-div').show();
            log(LogEvent.TOGGLE_COLOR_PICKER, 'open');
        }
    }

    function setColorPickerInputColor(color) {
        $('#color-picker-input').val(color);
        $('#color-picker-input').css('background-color', color);
        $.farbtastic('#color-picker-wrapper').setColor(color);
        if (typeof color == 'string') {
            setOpacityInput(color.substring(7, 9))
        }
    }

    function setColorBucketColor(color) {
        $('#color-bucket-button-color-picker').css('background-color', color);
        $('#color-bucket-button').css('background-color', color);
        $('#mode-img').css('background-color', color);
        mBucketColor = color;
    }

    function setLineDrawingColor(color) {
        $('#line-drawing-button-color-picker').css('background-color', color);
        $('#line-drawing-button').css('background-color', color);
        $('#mode-img').css('background-color', color);
        mLineDrawingController.setColor(color)
    }

    function setColorBrushColor(color) {
        $('#color-brush-button-color-picker').css('background-color', color);
        $('#color-brush-button').css('background-color', color);
        $('#mode-img').css('background-color', color);
        mColorBrushController.setColor(color)
        mLensController.setColorBrushColor(color)
    }

    function getOpacityInput() {
        let val = parseInt($('#opacity-input').val());
        if (isNaN(val)) val = 255;
        return val.toString(16).padStart(2, '0')
    }

    function setOpacityInput(value) {
        if (value.length == 2) {
            let val = parseInt(value, 16);
            if (!isNaN(val)) {
                $('#opacity-input').val(val)
            }
        } else {
            $('#opacity-input').val(255)
        }
    }
    // End color utility functions

    function showImageViewer(imageBinding) {
        $('#full-image').show();
        $('#video-viewer').hide();

        $('#full-image').attr('src', imageBinding.imageData);
        $('#image-viewer').show();
    }

    function showVideoViewer(videoURL) {
        $('#full-image').hide();
        $('#video-viewer').show();

        $('#video-viewer').empty();
        $('#video-viewer').append($('<source>').attr('src', videoURL));
        $('#video-viewer')[0].load();
        $('#image-viewer').show();
    }

    $('#image-viewer .close').on('click', function () {
        $('#image-viewer').hide();
    });

    function workspaceSet() {
        $('#download-button').attr('src', 'img/download_button.png')
        $('#download-button-folder').attr('src', 'img/folder_button.png')
    }

    function showLinkLine(coords1, coords2) {
        mLinkLine.attr('x1', coords1.x).attr('y1', coords1.y)
            .attr('x2', coords2.x).attr('y2', coords2.y);
        mLinkLine.style('visibility', '');
    }

    function hideLinkLine() {
        mLinkLine.style('visibility', 'hidden');
    }

    function showLineTime(timelineId, screenCoords) {
        let timeline = mModelController.getModel().getTimelineById(timelineId);

        let svgCoords = screenToSvgCoords(screenCoords);
        let pointOnLine = PathMath.getClosestPointOnPath(svgCoords, timeline.points);

        let time = mModelController.getModel().mapLinePercentToTime(timelineId, pointOnLine.percent);
        let message = mModelController.getModel().hasTimeMapping(timelineId) ?
            DataUtil.getFormattedDate(time) : 'Percent of time: ' + Math.round(time * 100) + '%';

        mMouseDropShadow.show(pointOnLine, svgCoords);

        mTooltip.show(message, screenCoords);
        mTooltipSetTo = timelineId;
    }

    function showLensView(timelineId, percent) {
        let timeline = mModelController.getModel().getTimelineById(timelineId);
        if (!timeline) console.error('Bad state! tried to show highlight for non-existant line: ' + timelineId);

        $('#lens-div').show();

        if (!mDrawerController.isOpen()) {
            mDrawerController.openDrawer();
        }

        mLineHighlight.showAround(timeline.points, percent, mLensSvg.attr('width'));
    }

    function hideLensView() {
        $('#lens-div').hide();

        mLensController.focus(null, null);
        mLineHighlight.hide();
    }

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, screenToSvgCoords({ x: e.clientX, y: e.clientY }))
    // });

    function log(event, data) {
        if (mWorkspace) mWorkspace.log(event, data);
    }

    mLineViewController.raise();
    mMainOverlay.raise();
    hideLensView();
    setDefaultMode();
    pushVersion();

    if (new URLSearchParams(window.location.search).has('analysis')) {
        setAnalysisMode(modelUpdated, mModelController, async () => await DataUtil.vizToCanvas(mVizLayer, mModelController.getModel().getCanvas().color));
    }

    if (new URLSearchParams(window.location.search).has('viz')) {
        let loadViz = new URLSearchParams(window.location.search).get('viz');
        let url = "gallery/json/" + loadViz + ".json";
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function () {
            var status = xhr.status;
            if (status === 200) {
                model = xhr.response;
                mModelController.setModelFromObject(model);
                modelUpdated();
                setDefaultMode();
            } else {
                console.error("Failed to get model", xhr.response);
            }
        };
        xhr.send();
    }
});
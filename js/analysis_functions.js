function setAnalysisMode(modelUpdated, mModelController, getCanvasFromViz) {
    const { log } = console;

    let ModeButtonMap = {
        'selection': "img/selection_button.png",
        'drawing': "img/timeline_eraser_button.png",
        'drawingEyedropper': "img/eye_dropper.png",
        'eraser': "img/eraser_button.png",
        'eraserTimeline': "img/timeline_eraser_button.png",
        'eraserStroke': "img/stroke_eraser_button.png",
        'eraserPoint': "img/data_point_eraser_button.png",
        'eraserText': "img/text_eraser_button.png",
        'eraserPin': "img/pin_eraser_button.png",
        'eraserImage': "img/image_eraser_button.png",
        'deform': "img/deform_button.png",
        'smooth': "img/smooth_button.png",
        'scissors': "img/scissors_button.png",
        'text': "img/text_button.png",
        'image': "img/image_button.png",
        'imageLink': "img/link_button.png",
        'pin': "img/pin_button.png",
        'lens': "img/lens_button.png",
        'colorBrush': "img/color_brush_button.png",
        'colorBrushEyedropper': "img/eye_dropper.png",
        'bucket': "img/color_bucket_button.png",
        'bucketEyedropper': "img/eye_dropper.png",
        'pan': "img/panning_button.png",
        'link': "img/link_button.png",
    };

    let EventButtonMap = {
        /*UNDO*/ 1: "img/undo_button.png",
        /*REDO*/ 2: "img/redo_button.png",
        /*DELETE*/ 4: "img/delete_button.png",
        /*TOGGLE_DRAWER*/ 6: "img/datasheet_drawer_toggle.png",
        /*UPLOAD_CSV*/ 7: "img/upload_datasheet.png",
        /*ADD_SPREADSHEET*/ 8: "img/add_datasheet.png",
        /*UPLOAD_MENU*/ 9: "img/upload_button.png",
        /*WORKSPACE_OPENED*/ 10: "img/folder_button.png",
        /*JSON_UPLOADED*/ 11: "img/json_button.png",
        /*DOWNLOAD_MENU*/ 13: "img/download_button.png",
        /*WRITE_WORKSPACE*/ 14: "img/folder_button.png",
        /*WRITE_SVG*/ 15: "img/svg_button.png",
        /*WRITE_JSON*/ 16: "img/json_button.png",
        /*WRITE_PNG*/ 17: "img/png_button.png",
        /*LINE_STYLE_TOGGLE*/ 18: "img/toggle_timeline_style_button.png",
        /*TOGGLE_COLOR_PICKER*/ 19: "img/color_set.png",
        /*GROW_COLOR_BRUSH*/ 20: "img/color_brush_grow_button.png",
        /*SHRINK_COLOR_BRUSH*/ 21: "img/color_brush_shrink_button.png",
    }

    /* TODO! 
    "img/break_link_button.png"
    "img/data_normals_dynamic.png"
    "img/data_normals_fixed.png"
    "img/edit_time_button.png"
    "img/line_manipulation_button.png"
    "img/text_bold_button.png"
    "img/text_font_change_button.png"
    "img/text_italics_button.png"
    "img/text_size_decrease_button.png"
    "img/text_size_increase_button.png"
    "img/toggle_data_style_button.png"
    */




    function disable(buttonId) {
        $(buttonId).css("opacity", "0.5");
        $(buttonId).off("click");
    }

    $('#extra-functions-div').show();
    disable("#upload-button");

    $('#extra-json-to-png').on('click', async () => {
        let workspace = await FileHandler.getWorkspace(false);
        await workspace.forEachVersion(async (version, versionNumber) => {
            try {
                mModelController.setModelFromObject(version);
                modelUpdated();

                let canvas = await getCanvasFromViz();
                await workspace.writePNG(canvas, versionNumber);
            } catch (e) {
                console.error(e);
            }
        })
    })

    $('#extra-versioning-to-json').on('click', async () => {
        let workspace = await FileHandler.getWorkspace(false);
        await workspace.forEachVersion(async (version, versionNumber) => {
            await workspace.writeJSON(version, versionNumber);
        })
    })

    $('#create-workspace-viz').on('click', async () => {
        const A_MINUTE = 60000;

        let workspace = await FileHandler.getWorkspace(false);
        let logData = await workspace.getLogData();

        logData = logData.filter(line => line.length == 3);

        log("Items to process: " + logData.length)

        if (!logData || logData.length <= 1 || logData[0][0] == logData[logData.length - 1][0]) {
            console.error("Insufficient log data to create viz");
            return;
        }

        let startTime = parseInt(logData[0][0])
        let endTime = parseInt(logData[logData.length - 1][0])

        log("Total length: " + ((endTime - startTime) / 60000) + " minutes")

        if (isNaN(startTime) || isNaN(endTime)) {
            console.error("Malformated CSV", logData[logData.length - 1])
        }

        let textTable = [];
        let clickTable = [];
        let wheelTable = [];
        let tooltipTable = [];
        let imageBindings = [];

        let modelController = new ModelController();
        let ratio = /*totalTime > 30 * A_MINUTE ? 1.0 / A_MINUTE :*/ 1.0 / 1000; /* One pixel per second */
        let pins = [];
        let lineLength = 0;
        let creationTime = 0;
        for (let i = 1; i < logData.length; i++) {
            let date = parseInt(logData[i][0]);
            if (i > 0) {
                let datePrev = parseInt(logData[i - 1][0]);
                let time = date - datePrev;
                if (isNaN(time)) {
                    console.error("Bad entry!", logData[i], logData[i - 1]);
                    continue;
                }
                if (time > /* A year */ 31556926000 || time < 0) { console.error("Wierd bug: ", time, date, datePrev); continue; }
                if (time > /*10 minutes*/ 10 * A_MINUTE) {
                    creationTime += A_MINUTE;
                    if (!pins[pins.length - 1] || pins[pins.length - 1].timeStamp != datePrev) {
                        pins.push({ timeStamp: datePrev, length: lineLength });
                    }
                    lineLength += A_MINUTE * ratio;
                    pins.push({ timeStamp: date, length: Math.round(lineLength) });
                } else {
                    lineLength += time * ratio;
                    creationTime += time;
                }
            }


            let event = parseInt(logData[i][1]);
            if (event == LogEvent.POINTER_DOWN || event == LogEvent.POINTER_UP) {
                clickTable.push([new Date(date), event == LogEvent.POINTER_DOWN ? 1 : 0]);
            } else if (event == LogEvent.WHEEL) {
                if (!wheelTable.length > 0 || date - wheelTable[wheelTable.length - 1][0] > 1000) {
                    wheelTable.push([new Date(date), 1]);
                }
            } else if (event == LogEvent.TOOLTIP) {
                tooltipTable.push([new Date(date), 1]);
            } else if (event == LogEvent.MODE_CHANGE) {
                imageBindings.push({ imageData: ModeButtonMap[logData[i][2]], timeStamp: date });
            } else if (event == LogEvent.VERSION) {
                let versionNum = logData[i][2];
                try {
                    log("Processing image: " + versionNum);
                    let result = await workspace.readPNGSmall(versionNum, 100, 100, versionNum);
                    imageBindings.push({ imageData: result.imageData, timeStamp: date, width: result.width, height: result.height });
                } catch (e) {
                    textTable.push([new Date(date), eventToString(event, logData[i][2])]);
                }
            } else if (Object.keys(EventButtonMap).includes(String(event))) {
                imageBindings.push({ imageData: EventButtonMap[String(event)], timeStamp: date });
            } else {
                textTable.push([new Date(date), eventToString(event, logData[i][2])]);
            }
        }

        log("Creation Time: " + (creationTime / 60000) + " minutes")

        let timelinePoints = [{ x: 100, y: 100 }, { x: 100, y: creationTime * ratio + 100 }];
        modelController.newTimeline(timelinePoints, "#000000FF");
        let timelineId = modelController.getModel().getAllTimelines()[0].id;

        let textTableId = modelController.addTableFromCSV(textTable);
        let clickTableId = modelController.addTableFromCSV(clickTable);
        let wheelTableId = modelController.addTableFromCSV(wheelTable);
        let tooltipTableId = modelController.addTableFromCSV(tooltipTable);
        modelController.getModel().getAllTables().forEach(table => {
            let dataColumnId = table.dataColumns.find(c => c.index == 1).id;
            let cellBindings = [];
            table.dataRows.forEach(row => {
                let dataCell = row.dataCells.find(cell => cell.columnId == dataColumnId);
                cellBindings.push(new DataStructs.CellBinding(dataCell.id));
            })
            modelController.bindCells(timelineId, cellBindings);
        });
        // Style the axis bindings
        let clickColumnId = clickTableId ? modelController.getModel().getTableById(clickTableId).dataColumns.find(c => c.index == 1).id : null;
        let wheelColumnId = wheelTableId ? modelController.getModel().getTableById(wheelTableId).dataColumns.find(c => c.index == 1).id : null;
        let tooltipColumnId = tooltipTableId ? modelController.getModel().getTableById(tooltipTableId).dataColumns.find(c => c.index == 1).id : null;
        modelController.getModel().getAllTimelines()[0].axisBindings.forEach(binding => {
            if (binding.columnId == clickColumnId) {
                modelController.updateAxisColor(binding.id, 1, "#718363ff");
                modelController.updateAxisColor(binding.id, 2, "#5ece09ff");
                modelController.updateAxisPosition(binding.id, 10, 20, 0)
            } else if (binding.columnId == wheelColumnId) {
                modelController.updateAxisColor(binding.id, 2, "#e6d500ff");
                modelController.updateAxisPosition(binding.id, 25, 30, 0);
            } else if (binding.columnId == tooltipColumnId) {
                modelController.updateAxisColor(binding.id, 2, "#4d4dffff");
                modelController.updateAxisPosition(binding.id, 40, 45, 0);
            }
        });

        pins.forEach(pinData => {
            let pin = new DataStructs.TimePin(pinData.length / lineLength);
            pin.timeStamp = pinData.timeStamp;
            modelController.updatePinBinding(timelineId, pin);
        });

        imageBindings.sort((a, b) => b.timeStamp - a.timeStamp).forEach(imgData => {
            let imgId = modelController.addBoundImage(timelineId, imgData.imageData,
                imgData.width ? imgData.width : 20, imgData.height ? imgData.height : 20, imgData.timeStamp);
            modelController.updateImageOffset(imgId, { x: 50, y: 0 });
        })

        let imgData = modelController.getModel().getAllImageBindingData();
        let positions = DataUtil.getImageCanvasPositions(imgData);
        let boundingBoxes = positions.map(img => {
            return {
                x: img.x,
                y: img.y,
                height: img.binding.imageBinding.height,
                width: img.binding.imageBinding.width,
                id: img.binding.imageBinding.id,
                originX: img.x - img.binding.imageBinding.offset.x,
                originY: img.y - img.binding.imageBinding.offset.y,
                isImage: true,
            }
        });
        boundingBoxes = DataUtil.layoutBoxes(boundingBoxes.map(b => b.id), boundingBoxes, { x: 21, y: 0 });
        boundingBoxes.forEach(boundingBox => {
            let offset = { x: boundingBox.x - boundingBox.originX, y: boundingBox.y - boundingBox.originY }
            modelController.updateImageOffset(boundingBox.id, offset);
        })

        let textData = modelController.getModel().getCellBindingData(timelineId).filter(cbd => cbd.dataCell.getType() == DataTypes.TEXT)
        textData.sort((a, b) => a.linePercent - b.linePercent);
        let textPositions = PathMath.getPositionForPercents(
            timelinePoints,
            textData.map(b => b.linePercent));
        boundingBoxes = boundingBoxes.concat(textData.map((text, index) => {
            return {
                x: textPositions[index].x + text.cellBinding.offset.x,
                y: textPositions[index].y + text.cellBinding.offset.y,
                height: 20,
                width: 95,
                id: text.cellBinding.id,
                originX: textPositions[index].x,
                originY: textPositions[index].y,
                isText: true,
            }
        }))
        boundingBoxes = DataUtil.layoutBoxes(textData.map(t => t.cellBinding.id), boundingBoxes, { x: 10, y: 0 });
        boundingBoxes.filter(bb => bb.isText).forEach(boundingBox => {
            let offset = { x: boundingBox.x - boundingBox.originX, y: -5 }
            modelController.updateTextOffset(boundingBox.id, offset);
        })

        mModelController.updateCanvasColor("#666666");

        mModelController.setModelFromObject(modelController.getModel().toObject());
        log("Drawing")
        modelUpdated();
    })

    function eventToString(event, eventData) {
        let eventString = Object.entries(LogEvent).find(([k, value]) => value == event)[0];
        eventString += ": " + eventData;

        return eventString;
    }
}

/*
this.updateCanvasColor = updateCanvasColor;

    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;
    this.deleteTimeline = deleteTimeline;
    this.breakTimeline = breakTimeline;
    this.updateTimelinePoints = updateTimelinePoints;
    this.updateTimelineColor = updateTimelineColor;

    this.addTable = addTable;
    this.addTableFromCSV = addTableFromCSV;
    this.tableUpdated = tableUpdated;

    this.bindCells = bindCells;
    this.updatePinBinding = updatePinBinding;

    // clean these up so they only modify the table, and clear that they do so.
    this.addBoundTextRow = addBoundTextRow;
    this.addCanvasText = addCanvasText;
    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;
    this.updateTimePinBinding = updateTimePinBinding;
    this.toggleFont = toggleFont;
    this.toggleFontWeight = toggleFontWeight;
    this.toggleFontItalics = toggleFontItalics;
    this.setFontSize = setFontSize;

    this.addTimelineStroke = addTimelineStroke;
    this.addCanvasStroke = addCanvasStroke;
    this.updateStrokeColor = updateStrokeColor;
    this.updateStrokePoints = updateStrokePoints;
    this.isCanvasStroke = isCanvasStroke;

    this.updateAxisPosition = updateAxisPosition;
    this.updateAxisColor = updateAxisColor;
    this.updateAxisDataAlignment = updateAxisDataAlignment;
    this.toggleDataStyle = toggleDataStyle;

    this.addBoundImage = addBoundImage;
    this.addCanvasImage = addCanvasImage;
    this.updateImageOffset = updateImageOffset;
    this.updateImageSize = updateImageSize;
    this.updateImageTime = updateImageTime;
    this.imageBindingToCanvasBinding = imageBindingToCanvasBinding;
    this.imageBindingToLineBinding = imageBindingToLineBinding;

    this.deleteCellBindings = deleteCellBindings;
    this.deleteImageBindings = deleteImageBindings;
    this.deleteDataSet = deleteDataSet;
    this.deletePins = deletePins;
    this.deleteStrokes = deleteStrokes;

    this.getModel = () => mModel.copy();

    this.setModelFromObject = setModelFromObject;

*/
DataStructs.DataModel = function () {
    const MAP_TIME = "mapTime";

    let mCanvas = new DataStructs.Canvas();
    let mTimelines = [];
    let mDataTables = [];

    function getCellBindingData(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for getting cell binding data!", timelineId); return []; }
        let timelineHasMapping = hasTimeMapping(timelineId);
        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let table = getTableForCell(cellBinding.cellId);
            if (!table) { console.error("Invalid cell binding! No table!"); return; }
            let tableId = table.id;

            let row = getRowByCellId(cellBinding.cellId);
            if (!row) { console.error("Invalid cell binding! No row!"); return; }
            let rowId = row.id;

            let timeCell = getTimeCellForRow(rowId);
            if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

            let dataCell = getCellById(cellBinding.cellId);
            if (!dataCell) { console.error("Failed to get cell for column"); return; }
            if (dataCell.id != cellBinding.cellId) throw new ModelStateError("Got the wrong cell!");

            let linePercent;
            if (cellBinding.timePinId) {
                let timePin = timeline.timePins.find(pin => pin.id == cellBinding.timePinId);
                if (timePin) {
                    linePercent = timePin.linePercent;
                } else {
                    console.error("Time pin not found for cell binding!", cellBinding);
                    cellBinding.timePinId = null;
                    linePercent = NO_LINE_PERCENT;
                }
            } else if (timelineHasMapping && timeCell.isValid()) {
                linePercent = MAP_TIME;
            } else if (timeCell.isValid()) {
                let timePin = timeline.timePins.find(pin => pin.timeStamp == timeCell.getValue());
                if (timePin) {
                    linePercent = timePin.linePercent;
                } else {
                    linePercent = NO_LINE_PERCENT;
                }
            } else {
                linePercent = NO_LINE_PERCENT;
            }

            let axis = timeline.axisBindings.find(a => a.columnId == dataCell.columnId);

            let color = null;
            if (cellBinding.color) {
                color = cellBinding.color;
            } else if (dataCell.color) {
                color = dataCell.color;
            } else if (dataCell.getType() == DataTypes.NUM && axis && axis.color1 && axis.color2) {
                let num = dataCell.getValue();
                let colorPercent = (num - axis.val1) / (axis.val2 - axis.val1)

                color = DataUtil.getColorBetween(axis.color1, axis.color2, colorPercent)
            }

            returnable.push(new DataStructs.CellBindingData(cellBinding, timeline, dataCell, timeCell, tableId, rowId, color, linePercent, axis ? axis : null));
        })

        let mapBindings = returnable.filter(cb => cb.linePercent == MAP_TIME);
        if (mapBindings.length > 0) {
            let timesForMapping = mapBindings.map(cb => cb.timeCell.getValue());
            timesForMapping.sort((a, b) => a - b);
            let linePercents = batchMapTimeToLinePercent(timeline.id, timesForMapping);
            if (linePercents.length != timesForMapping.length) {
                console.error("Mapping failed!", linePercents);
                mapBindings.forEach(cb => { cb.linePercent = NO_LINE_PERCENT });
                return returnable;
            }
            mapBindings.forEach(cb => {
                cb.linePercent = linePercents[timesForMapping.indexOf(cb.timeCell.getValue())];
            });
        }

        return returnable;
    }

    function getCanvasBindingData() {
        let returnable = [];
        mCanvas.cellBindings.forEach(cellBinding => {
            let table = getTableForCell(cellBinding.cellId);
            if (!table) { console.error("Invalid cell binding! No table!"); return; }
            let tableId = table.id;

            let row = getRowByCellId(cellBinding.cellId);
            if (!row) { console.error("Invalid cell binding! No row!"); return; }
            let rowId = row.id;

            let dataCell = getCellById(cellBinding.cellId);
            if (!dataCell) { console.error("Failed to get cell for column"); return; }
            if (dataCell.id != cellBinding.cellId) throw new ModelStateError("Got the wrong cell!");

            let color = null;
            if (cellBinding.color) {
                color = cellBinding.color;
            } else if (dataCell.color) {
                color = dataCell.color;
            }

            returnable.push(new DataStructs.CanvasCellBindingData(cellBinding, dataCell, tableId, rowId, color));
        })

        return returnable;
    }

    function getAllCellBindingData() {
        return mTimelines.map(timeline => getCellBindingData(timeline.id)).flat();
    }

    function mapTimeToLinePercent(timelineId, time) {
        if (isNaN(time)) {
            console.error("Invalid for mapping time to line percent time: ", time);
            return 0;
        }

        let timeline = getTimelineById(timelineId);

        // there might be an exact pin with timestamp even if we don't have a time mapping.
        let exactPin = timeline.timePins.find(pin => pin.timeStamp == time);
        if (!exactPin && !hasTimeMapping(timelineId)) {
            // only check this if the line does not have a mapping. 
            // If it has a mapping, we should not be asking to map a timePercent, 
            // and we don't want to confuse a timeStamp of 0.5 with a timePercent.
            exactPin = timeline.timePins.find(pin => pin.timePercent == time);
        }
        if (exactPin) {
            return exactPin.linePercent;
        }

        return batchMapTimeToLinePercent(timelineId, [time])[0];
    }

    // Utility function
    function batchMapTimeToLinePercent(timelineId, times) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for mapping time to line percent!", timelineId); return []; }

        let timelineHasMapping = hasTimeMapping(timelineId);

        // validate times
        times = times.filter(time => {
            if (isNaN(time)) {
                console.error("Invalid for batch mapping time to line percent time: ", time);
                return false;
            } else if (!timelineHasMapping && (time < 0 || time > 1)) {
                // we can't check timestamps as they are unbounded.
                console.error("Invalid state! Provided value invalid for time percent", time, timeline);
                return false;
            }
            return true;
        });

        let bindingValues = getTimeBindingValues(timeline);
        if (bindingValues.length < 2) {
            console.error("Code should be unreachable!", timeline);
            return [];
        }

        let timeAttribute = timelineHasMapping ? "timeStamp" : "timePercent";

        return mapBindingArrayInterval(bindingValues, times, timeAttribute, "linePercent")
    }

    function mapLinePercentToTime(timelineId, linePercent) {
        if (isNaN(linePercent)) { console.error("Invalid percent for mapping line percent to time:" + linePercent); return 0; }
        if (linePercent < 0) {
            // only log an error if it was much less, otherwise it's probably just a rounding error
            if (linePercent < -0.001) console.error("Invalid linePercent!", linePercent);
            linePercent = 0;
        }
        if (linePercent > 1) {
            // only log an error if it was much more, otherwise it's probably just a rounding error
            if (linePercent > 1.001) console.error("Invalid linePercent!", linePercent);
            linePercent = 1;
        }

        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for mapping line percent to time!", timelineId); return 0; }

        let bindingValues = getTimeBindingValues(timeline);
        if (bindingValues.length < 2) {
            console.error("Code should be unreachable!", timeline, time);
            return 0;
        }

        let timeAttribute = hasTimeMapping(timelineId) ? "timeStamp" : "timePercent";
        let mapping = mapBindingArrayInterval(bindingValues, [linePercent], "linePercent", timeAttribute);

        if (mapping.length == 0) {
            console.error("Failed to map!", linePercent);
            return 0;
        }

        return mapping[0];
    }

    function hasTimeMapping(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for testing time mapping!", timelineId); return false; }

        let timePinTimeStamps = timeline.timePins
            .filter(pin => pin.timeStamp).map(b => b.timeStamp);
        let imageBindingsTimeStamps = timeline.imageBindings
            .filter(d => d.timeStamp).map(d => d.timeStamp);
        let boundTimeValues = getBoundTimeCellValues(timeline.id)
            .filter(time => !timePinTimeStamps.includes(time));
        let times = DataUtil.getUniqueList(boundTimeValues.concat(timePinTimeStamps).concat(imageBindingsTimeStamps));

        if (times.length < 2) {
            return false;
        } else {
            return true;
        }
    }

    function getTimeBindingValues(timeline) {
        let timeBindingValues;

        if (hasTimeMapping(timeline.id)) {
            timeBindingValues = timeline.timePins.filter(pin => pin.timeStamp);
            timeBindingValues.sort((a, b) => a.linePercent - b.linePercent);

            let uniqueValues = DataUtil.getUniqueList(timeBindingValues, 'timeStamp');
            if (uniqueValues.length < timeBindingValues) {
                console.error("Bad State! Times multiply bounds to point!", timeBindingValues);
                timeBindingValues = uniqueValues;
            }

            let timePinTimeStamps = timeBindingValues.map(b => b.timeStamp);

            timeBindingValues.push(...getBoundTimeCellValues(timeline.id)
                .map(val => { return { timeStamp: val } })
                .filter(b => !timePinTimeStamps.includes(b.timeStamp)));
            timeBindingValues.sort((a, b) => a.timeStamp - b.timeStamp);

            if (!("linePercent" in timeBindingValues[0])) timeBindingValues[0].linePercent = 0;
            if (!("linePercent" in timeBindingValues[timeBindingValues.length - 1])) timeBindingValues[timeBindingValues.length - 1].linePercent = 1;
            timeBindingValues = timeBindingValues.filter(bv => "linePercent" in bv);

            if (timeBindingValues.length < 2) {
                console.error("Code should be unreachable! there should be at least two bindings.", timeBindingValues);
            }

            if (timeBindingValues[0].linePercent > 0) {
                let timeRatio = (timeBindingValues[1].timeStamp - timeBindingValues[0].timeStamp) / (timeBindingValues[1].linePercent - timeBindingValues[0].linePercent)
                let timeDiff = timeRatio * (timeBindingValues[0].linePercent);
                timeBindingValues.unshift({ linePercent: 0, timeStamp: timeBindingValues[0].timeStamp - timeDiff });
            }

            if (timeBindingValues[timeBindingValues.length - 1].linePercent < 1) {
                let lastBinding = timeBindingValues[timeBindingValues.length - 1];
                let prevBinding = timeBindingValues[timeBindingValues.length - 2];
                let timeRatio = (lastBinding.timeStamp - prevBinding.timeStamp) / (lastBinding.linePercent - prevBinding.linePercent)
                let timeDiff = timeRatio * (1 - lastBinding.linePercent);
                timeBindingValues.push({ linePercent: 1, timeStamp: lastBinding.timeStamp + timeDiff });
            }
        } else {
            timeBindingValues = [...timeline.timePins];
            timeBindingValues.sort((a, b) => a.linePercent - b.linePercent);

            if (timeBindingValues.length == 0 || timeBindingValues[0].linePercent > 0) {
                timeBindingValues.unshift({ linePercent: 0, timePercent: 0 });
            }

            if (timeBindingValues[timeBindingValues.length - 1].linePercent < 1) {
                timeBindingValues.push({ linePercent: 1, timePercent: 1 })
            }

            if (timeBindingValues[1].timePercent <= 0) {
                timeBindingValues[1].timePercent = 0.001;
            }

            if (timeBindingValues[timeBindingValues.length - 2].timePercent >= 1) {
                timeBindingValues[timeBindingValues.length - 2].timePercent = 0.999;
            }
        }

        // sort again to be on the safe side.
        timeBindingValues.sort((a, b) => a.linePercent - b.linePercent);
        return timeBindingValues;
    }

    function getTimelineByCellBinding(cellBindingId) {
        return mTimelines.find(t => t.cellBindings.some(b => b.id == cellBindingId));
    }

    function getTimelineByImageBinding(imageBindingId) {
        return mTimelines.find(t => t.imageBindings.some(b => b.id == imageBindingId));
    }

    function getTimelineByStrokeId(strokeId) {
        return mTimelines.find(t => t.annotationStrokes.some(s => s.id == strokeId));
    }

    /* End Mapping Utility function */
    function getBoundTimeCellValues(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) {
            console.error("bad timeline id for getting bound time cells!", timelineId);
            return [];
        }

        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let timeCell = getTimeCellForDataCell(cellBinding.cellId);
            if (!timeCell) return;

            if (timeCell.isValid()) returnable.push(timeCell.getValue());
        })

        return returnable;
    }

    function getAllImageBindingData() {
        return mTimelines.map(timeline => getImageBindingData(timeline.id)).flat().concat(getCanvasImageBindings());
    }

    function getImageBindingData(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for getting image binding data!", timelineId); return []; }
        let timelineHasMapping = hasTimeMapping(timelineId);
        let returnable = [];
        timeline.imageBindings.forEach(imageBinding => {
            let linePercent;
            if (imageBinding.timePinId) {
                let timePin = timeline.timePins.find(pin => pin.id == imageBinding.timePinId);
                if (timePin) {
                    linePercent = timePin.linePercent;
                } else {
                    console.error("Time pin not found for image binding!", imageBinding);
                    imageBinding.timePinId = null;
                    linePercent = NO_LINE_PERCENT;
                }
            } else if (timelineHasMapping && imageBinding.timeStamp) {
                linePercent = MAP_TIME;
            } else if (imageBinding.timeStamp) {
                let timePin = timeline.timePins.find(pin => pin.timeStamp == imageBinding.timeStamp);
                if (timePin) {
                    linePercent = timePin.linePercent;
                } else {
                    linePercent = NO_LINE_PERCENT;
                }
            } else {
                linePercent = NO_LINE_PERCENT;
            }

            returnable.push(new DataStructs.ImageBindingData(imageBinding, timeline, linePercent));
        });

        let mapBindings = returnable.filter(ib => ib.linePercent == MAP_TIME);
        if (mapBindings.length > 0) {
            let timesForMapping = mapBindings.map(ib => ib.imageBinding.timeStamp);
            timesForMapping.sort((a, b) => a - b);
            let linePercents = batchMapTimeToLinePercent(timeline.id, timesForMapping);
            if (linePercents.length != timesForMapping.length) {
                console.error("Mapping failed!", linePercents);
                mapBindings.forEach(ib => { ib.linePercent = NO_LINE_PERCENT });
                return returnable;
            }
            mapBindings.forEach(ib => {
                ib.linePercent = linePercents[timesForMapping.indexOf(ib.imageBinding.timeStamp)];
            });
        }

        return returnable;
    }

    function getImageBindingById(imageBindingId) {
        return mTimelines.map(t => t.imageBindings).flat()
            .concat(mCanvas.imageBindings)
            .find(ib => ib.id == imageBindingId);
    }

    function getImageBindingDataById(imageBindingId) {
        let canvasBinding = mCanvas.imageBindings.find(b => b.id == imageBindingId);
        if (canvasBinding) {
            return new DataStructs.ImageBindingData(canvasBinding, null, NO_LINE_PERCENT, true);
        }

        let timeline = mTimelines.find(t => t.imageBindings.some(b => b.id == imageBindingId));
        if (!timeline) { console.error("No image binding found for id!", imageBindingId); return; }

        let timelineHasMapping = hasTimeMapping(timeline.id);
        let imageBinding = getImageBindingById(imageBindingId);

        let linePercent;
        if (imageBinding.timePinId) {
            let timePin = timeline.timePins.find(pin => pin.id == imageBinding.timePinId);
            if (timePin) {
                linePercent = timePin.linePercent;
            } else {
                console.error("Time pin not found for image binding!", imageBinding);
                imageBinding.timePinId = null;
                linePercent = NO_LINE_PERCENT;
            }
        } else if (timelineHasMapping && imageBinding.timeStamp) {
            let time = imageBinding.timeStamp;
            linePercent = mapTimeToLinePercent(timeline.id, time)
        } else if (imageBinding.timeStamp) {
            let timePin = timeline.timePins.find(pin => pin.timeStamp == imageBinding.timeStamp);
            if (timePin) {
                linePercent = timePin.linePercent;
            } else {
                linePercent = NO_LINE_PERCENT;
            }
        } else {
            linePercent = NO_LINE_PERCENT;
        }

        return new DataStructs.ImageBindingData(imageBinding, timeline, linePercent);
    }

    function getCanvasImageBindings() {
        return mCanvas.imageBindings.map(imageBinding => {
            return new DataStructs.ImageBindingData(imageBinding, null, NO_LINE_PERCENT, true);
        })
    }

    function mapBindingArrayInterval(bindings, values, fromKey, toKey) {
        if (bindings.length < 2) {
            console.error("Insufficent bindings for mapping!", bindings);
            return [];
        }
        if (!values || values.length == 0) {
            console.error("No values passed!", values);
            return [];
        }

        values.sort((a, b) => a - b);
        let returnable = [];

        let valuesIndex = 0;
        let bindingIndex = 1;
        // first handle all values outside the start of the range
        while (values[valuesIndex] < bindings[0][fromKey]) {
            returnable.push(bindings[0][toKey])
            valuesIndex++;
        }

        // find the correct interval
        for (valuesIndex; valuesIndex < values.length; valuesIndex++) {
            while (bindingIndex < bindings.length && bindings[bindingIndex][fromKey] < values[valuesIndex]) {
                bindingIndex++;
            }

            if (bindingIndex == bindings.length) {
                // handle values outside end of the range
                returnable.push(bindings[bindings.length - 1][toKey])
            } else {
                let nextVal = bindings[bindingIndex][fromKey];
                let prevVal = bindings[bindingIndex - 1][fromKey];
                let percentBetween = (values[valuesIndex] - prevVal) / (nextVal - prevVal)

                let nextConvertVal = bindings[bindingIndex][toKey];
                let prevConvertVal = bindings[bindingIndex - 1][toKey];

                returnable.push(percentBetween * (nextConvertVal - prevConvertVal) + prevConvertVal);

            }
        }

        return returnable;
    }

    function getCellById(cellId) {
        return mDataTables.map(t => t.dataRows.map(r => r.dataCells)).flat(3).find(cell => cell.id == cellId);
    }

    function getRowByCellId(cellId) {
        let row = mDataTables.map(t => t.dataRows).flat(2).find(row => row.dataCells.some(c => c.id == cellId));
        if (!row) { throw new Error("Row not found for cell: " + cellId); }
        return row;
    }

    function getCellBindingById(cellBindingId) {
        return mTimelines.map(t => t.cellBindings).flat()
            .concat(mCanvas.cellBindings)
            .find(cb => cb.id == cellBindingId);
    }

    function getTimeCellForRow(rowId) {
        let table = mDataTables.find(t => t.dataRows.some(r => r.id == rowId));
        if (!table) { throw new Error("Row now found in any table: " + rowId); }
        let row = table.dataRows.find(r => r.id == rowId);
        let col = getTimeColumnByTableId(table.id);
        return row.getCell(col.id);
    }

    function getTimeCellForPin(timePinId) {
        let cellBinding = mTimelines.map(t => t.cellBindings).flat().find(cb => cb.timePinId == timePinId);
        if (cellBinding) {
            return getTimeCellForDataCell(cellBinding.cellId);
        } else {
            return null;
        }
    }

    function getTimeCellForDataCell(dataCellId) {
        let row = getRowByCellId(dataCellId);
        if (!row) {
            console.error("Cannot get row for cell!", dataCellId);
            return null;
        }

        let timeCell = getTimeCellForRow(row.id);
        if (!timeCell) {
            console.error("Cannot get time cell for row!", row);
            return null;
        } else {
            return timeCell;
        }
    }

    function getTableForCell(cellId) {
        let table = mDataTables.find(t => t.dataRows.some(row => row.dataCells.some(c => c.id == cellId)));
        if (!table) { throw new Error("Table not found for cell: " + cellId); }
        return table;
    }

    function getTimelineById(id) {
        return mTimelines.find(t => t.id == id);
    }

    function getTimelineForTimePin(timePinId) {
        return mTimelines.find(t => t.timePins.some(pin => pin.id == timePinId));
    }

    function getTableById(id) {
        return mDataTables.find(t => t.id == id);
    }

    function getAxisById(axisId) {
        return mTimelines.map(t => t.axisBindings).flat().find(b => b.id == axisId);
    }

    function getTimelineByAxisId(axisId) {
        return mTimelines.find(t => t.axisBindings.some(b => b.id == axisId));
    }

    function getTimePinById(pinId) {
        return mTimelines.map(t => t.timePins).flat().find(pin => pin.id == pinId);
    }

    function getStrokeById(strokeId) {
        return mTimelines
            .map(t => t.annotationStrokes)
            .flat()
            .concat(mCanvas.annotationStrokes)
            .find(s => s.id == strokeId);
    }

    function getStrokeData(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for getting stroke data!", timelineId); return []; }
        let timelineHasMapping = hasTimeMapping(timelineId);

        let times = DataUtil.getUniqueList(
            timeline.annotationStrokes.map(stroke => stroke.points
                .map(p => timelineHasMapping ? p.timeStamp : p.timePercent))
                .flat()
                .sort((a, b) => a - b));

        let linePercents = times.length > 0 ? batchMapTimeToLinePercent(timelineId, times) : [];
        let strokeData = timeline.annotationStrokes.map(stroke => {
            let strokeCopy = stroke.copy();
            strokeCopy.points.forEach(p => {
                p.linePercent = linePercents[times.indexOf(timelineHasMapping ? p.timeStamp : p.timePercent)]
            })
            return strokeCopy;
        });

        return strokeData;
    }

    function getTimeColumnByTableId(tableId) {
        return getTableById(tableId).dataColumns.find(col => col.index == 0);
    }

    function getTimelineHighlightData(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for getting highlight data!", timelineId); return {}; }

        let highlights = {};
        timeline.cellBindings.forEach(b => {
            let table = getTableForCell(b.cellId);
            let cell = getCellById(b.cellId);
            let row = getRowByCellId(b.cellId);
            let col = table.dataColumns.find(c => c.id == cell.columnId);

            highlights[table.id] ? "" : highlights[table.id] = {};
            highlights[table.id][col.index] ? "" : highlights[table.id][col.index] = {}
            highlights[table.id][col.index][row.index] = true;

            // also highlight the time cell.
            highlights[table.id][0] ? "" : highlights[table.id][0] = {}
            highlights[table.id][0][row.index] = true;
        });

        return highlights;
    }

    function getCellBindingHighlightData(cellBinding) {
        let highlights = {};
        let table = getTableForCell(cellBinding.cellId);
        let cell = getCellById(cellBinding.cellId);
        let row = getRowByCellId(cellBinding.cellId);
        let col = table.dataColumns.find(c => c.id == cell.columnId);

        highlights[table.id] ? "" : highlights[table.id] = {};
        highlights[table.id][col.index] ? "" : highlights[table.id][col.index] = {}
        highlights[table.id][col.index][row.index] = true;

        // also highlight the time cell.
        highlights[table.id][0] ? "" : highlights[table.id][0] = {}
        highlights[table.id][0][row.index] = true;

        return highlights;
    }

    this.setCanvas = (canvas) => mCanvas = canvas;
    this.setTimelines = (timelines) => mTimelines = timelines;
    this.setTables = (tables) => mDataTables = tables;

    this.getCanvas = () => mCanvas;

    this.getTimelineById = getTimelineById;
    this.getTimelineForTimePin = getTimelineForTimePin;
    this.getAllTimelines = function () { return mTimelines };

    this.getTableById = getTableById;
    this.getAllTables = function () { return mDataTables };
    this.getTimeColumnByTableId = getTimeColumnByTableId;
    this.getRowByCellId = getRowByCellId;

    this.toObject = function () {
        return {
            canvas: this.getCanvas(),
            timelines: this.getAllTimelines(),
            dataTables: this.getAllTables()
        }
    }

    this.getCellBindingData = getCellBindingData;
    this.getAllCellBindingData = getAllCellBindingData;
    this.getCanvasBindingData = getCanvasBindingData;

    this.getCellById = getCellById;
    this.getCellBindingById = getCellBindingById;

    this.getAxisById = getAxisById;
    this.getTimelineByAxisId = getTimelineByAxisId;
    this.getTimePinById = getTimePinById;

    this.getStrokeById = getStrokeById;
    this.getStrokeData = getStrokeData;

    this.getTimeCellForPin = getTimeCellForPin;
    this.getTimeCellForDataCell = getTimeCellForDataCell;
    this.getBoundTimeCellValues = getBoundTimeCellValues;

    this.getAllImageBindingData = getAllImageBindingData;
    this.getCanvasImageBindings = getCanvasImageBindings;
    this.getImageBindingData = getImageBindingData;
    this.getImageBindingById = getImageBindingById;
    this.getImageBindingDataById = getImageBindingDataById;

    this.mapLinePercentToTime = mapLinePercentToTime;
    this.mapTimeToLinePercent = mapTimeToLinePercent;
    this.hasTimeMapping = hasTimeMapping;
    this.getTimeBindingValues = getTimeBindingValues;

    this.getTimelineByCellBinding = getTimelineByCellBinding;
    this.getTimelineByImageBinding = getTimelineByImageBinding;
    this.getTimelineByStrokeId = getTimelineByStrokeId;

    this.getTimelineHighlightData = getTimelineHighlightData;
    this.getCellBindingHighlightData = getCellBindingHighlightData;

    this.copy = function () {
        let model = new DataStructs.DataModel();
        model.setCanvas(mCanvas.copy());
        model.setTimelines(mTimelines.map(t => t.copy()));
        model.setTables(mDataTables.map(t => t.copy()));
        return model;
    }
}

DataStructs.CellBindingData = function (cellBinding, timeline, dataCell, timeCell, tableId, rowId, color, linePercent = NO_LINE_PERCENT, axisBinding = null) {
    this.cellBinding = cellBinding;
    this.timeline = timeline;
    this.dataCell = dataCell;
    this.timeCell = timeCell;
    this.tableId = tableId;
    this.rowId = rowId;
    this.color = color;

    // optional values
    this.linePercent = linePercent;
    this.axisBinding = axisBinding;

    this.copy = function () {
        let b = new DataStructs.CellBindingData(
            this.cellBinding.copy(),
            this.timeline.copy(),
            this.dataCell.copy(),
            this.timeCell.copy(),
            this.tableId,
            this.rowId,
            this.color,
        )
        b.linePercent = this.linePercent;
        b.axisBinding = this.axisBinding;
        return b;
    }

    this.equals = function (other) {
        if (!other) return false;
        if (this.isCanvasBinding != other.isCanvasBinding) return false;

        if (this.cellBinding.id != other.cellBinding.id) return false;
        if (this.cellBinding.cellId != other.cellBinding.cellId) return false;
        if (this.cellBinding.color != other.cellBinding.color) return false;
        if (this.cellBinding.timePinId != other.cellBinding.timePinId) return false;
        if (this.cellBinding.font != other.cellBinding.font) return false;
        if (this.cellBinding.fontWeight != other.cellBinding.fontWeight) return false;
        if (this.cellBinding.fontItalics != other.cellBinding.fontItalics) return false;
        if (this.cellBinding.fontSize != other.cellBinding.fontSize) return false;
        if (this.cellBinding.offset.x != other.cellBinding.offset.x) return false;
        if (this.cellBinding.offset.y != other.cellBinding.offset.y) return false;

        if (!this.axisBinding && other.axisBinding || this.axisBinding && !other.axisBinding) return false;
        if (this.axisBinding && !this.axisBinding.equals(other.axisBinding)) return false;

        if (this.dataCell.getValue() != other.dataCell.getValue()) return false;
        if (this.timeCell.getValue() != other.timeCell.getValue()) return false;

        return true;
    }
}

DataStructs.CanvasCellBindingData = function (cellBinding, dataCell, tableId, rowId, color) {
    this.cellBinding = cellBinding;
    this.dataCell = dataCell;
    this.tableId = tableId;
    this.rowId = rowId;
    this.color = color;
    this.isCanvasBinding = true;

    this.copy = function () {
        let b = new DataStructs.CanvasCellBindingData(
            this.cellBinding.copy(),
            this.dataCell.copy(),
            this.tableId,
            this.rowId,
            this.color,
        )
        return b;
    }

    this.equals = function (other) {
        if (!other) return false;
        if (this.isCanvasBinding != other.isCanvasBinding) return false;

        if (this.cellBinding.cellId != other.cellBinding.cellId) return false;
        if (this.cellBinding.id != other.cellBinding.id) return false;
        if (this.cellBinding.color != other.cellBinding.color) return false;
        if (this.cellBinding.timePinId != other.cellBinding.timePinId) return false;
        if (this.cellBinding.font != other.cellBinding.font) return false;
        if (this.cellBinding.fontWeight != other.cellBinding.fontWeight) return false;
        if (this.cellBinding.fontItalics != other.cellBinding.fontItalics) return false;
        if (this.cellBinding.fontSize != other.cellBinding.fontSize) return false;
        if (this.cellBinding.offset.x != other.cellBinding.offset.x) return false;
        if (this.cellBinding.offset.y != other.cellBinding.offset.y) return false;
        if (this.dataCell.getValue() != other.dataCell.getValue()) return false;

        return true;
    }
}

DataStructs.ImageBindingData = function (imageBinding, timeline, linePercent = NO_LINE_PERCENT, isCanvasBinding = false) {
    this.imageBinding = imageBinding;
    this.timeline = timeline;
    this.linePercent = linePercent;
    this.isCanvasBinding = isCanvasBinding;

    this.copy = function () {
        let b = new DataStructs.ImageBindingData(
            this.imageBinding.copy(),
            this.timeline ? this.timeline.copy() : null,
            this.linePercent,
            this.isCanvasBinding
        )
        return b;
    }
}
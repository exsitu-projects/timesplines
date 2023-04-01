function ModelController() {
    let mModel = new DataStructs.DataModel();

    let mUndoStack = [];
    let mRedoStack = [];

    function updateCanvasColor(color) {
        mModel.getCanvas().color = color;
    }

    function newTimeline(points, color) {
        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = new DataStructs.Timeline(points.map(p => Object.assign({}, p)));
        timeline.color = color;
        mModel.getAllTimelines().push(timeline);

        return timeline;
    }

    function extendTimeline(timelineId, points, extendStart) {
        let timeline = mModel.getTimelineById(timelineId);
        let originalLength = PathMath.getPathLength(timeline.points);

        // knock off the first point for smoothing purposes. 
        extendStart ? points.pop() : points.unshift();

        let newPoints = extendStart ? points.concat(timeline.points) : timeline.points.concat(points);
        let newLength = PathMath.getPathLength(newPoints);

        let capTimePin = getCapTimePin(timeline, extendStart);
        if (capTimePin) timeline.timePins.push(capTimePin);

        timeline.points = newPoints;
        let updateLinePercent;
        if (extendStart) {
            updateLinePercent = (binding) => {
                let diff = newLength - originalLength;
                let originalLengthAlongLine = binding.linePercent * originalLength;
                binding.linePercent = (originalLengthAlongLine + diff) / newLength;
            }
        } else {
            updateLinePercent = (binding) => {
                let conversionRatio = originalLength / newLength;
                binding.linePercent *= conversionRatio;
            }
        }
        timeline.timePins.forEach(updateLinePercent)
        timeline.axisBindings.forEach(updateLinePercent)

        if (!mModel.hasTimeMapping(timeline.id)) {
            if (extendStart) {
                timeline.annotationStrokes.forEach(stroke => stroke.points.forEach(point => {
                    let originalLengthAlongLine = point.linePercent * originalLength;
                    point.linePercent = (originalLengthAlongLine + diff) / newLength;
                }))
            } else {
                let conversionRatio = originalLength / newLength;
                timeline.annotationStrokes.forEach(stroke => stroke.points.forEach(point => {
                    point.linePercent *= conversionRatio;
                }))
            }
        }
    }

    function mergeTimeline(timelineIdStart, timelineIdEnd, points) {
        let startTimeline = mModel.getTimelineById(timelineIdStart);
        let endTimeline = mModel.getTimelineById(timelineIdEnd);

        let startTimelineHasMapping = mModel.hasTimeMapping(timelineIdStart);
        let endTimelineHasMapping = mModel.hasTimeMapping(timelineIdEnd);

        let originalStartLength = PathMath.getPathLength(startTimeline.points);
        let originalEndLength = PathMath.getPathLength(endTimeline.points);

        // knock off the end points for smoothing purposes.
        points.pop();
        points.unshift();

        let newPoints = startTimeline.points.concat(points, endTimeline.points);
        let newLength = PathMath.getPathLength(newPoints);

        // Merge the line
        let newTimeline = new DataStructs.Timeline(newPoints);
        newTimeline.color = DataUtil.getColorBetween(startTimeline.color, endTimeline.color, 0.5);

        // Merge the cellBindings
        let endBindings = [...endTimeline.cellBindings];
        startTimeline.cellBindings.forEach(cellBinding => {
            let duplicate = endBindings.find(eb => eb.cellId == cellBinding.cellId);
            if (duplicate) {
                // remove from end bindings
                endBindings.splice(endBindings.indexOf(duplicate), 1);

                cellBinding.color = cellBinding.color ? cellBinding.color : duplicate.color;
                cellBinding.timePinId = cellBinding.timePinId ? cellBinding.timePinId : duplicate.timePinId;
            }
            newTimeline.cellBindings.push(cellBinding);
        });
        newTimeline.cellBindings.push(...endBindings);

        // Merge the axis
        let numericDataCells = newTimeline.cellBindings.map(cb => mModel.getCellById(cb.cellId)).filter(cell => cell.getType() == DataTypes.NUM);
        if (numericDataCells.length > 0) {
            // if there is no numeric data there should be no axis, otherwise merge them
            newTimeline.axisBindings = [...startTimeline.axisBindings];
            newTimeline.axisBindings.forEach(axis => {
                axis.linePercent = axis.linePercent * originalStartLength / newLength;
            });
            endTimeline.axisBindings.forEach(axis => {
                let newAxis = newTimeline.axisBindings.find(ab => ab.columnId == axis.columnId);
                if (newAxis) {
                    // update the data
                    newAxis.val1 = Math.min(...numericDataCells
                        .filter(cell => cell.columnId == axis.columnId)
                        .map(cell => cell.getValue()))
                    newAxis.val2 = Math.max(...numericDataCells
                        .filter(cell => cell.columnId == axis.columnId)
                        .map(cell => cell.getValue()))
                    if (newAxis.val1 == newAxis.val2) axis.val1 = 0;
                    // just in case they were both 0.
                    if (newAxis.val1 == newAxis.val2) axis.val2 = 1;

                    // set the dists to the extremes
                    // check if the line was increasing negative or positive and match that
                    if (newAxis.dist1 < newAxis.dist2) {
                        newAxis.dist1 = Math.min(newAxis.dist1, axis.dist1, newAxis.dist2, axis.dist2);
                        newAxis.dist2 = Math.max(newAxis.dist1, axis.dist1, newAxis.dist2, axis.dist2);
                    } else {
                        newAxis.dist2 = Math.min(newAxis.dist1, axis.dist1, newAxis.dist2, axis.dist2);
                        newAxis.dist1 = Math.max(newAxis.dist1, axis.dist1, newAxis.dist2, axis.dist2);
                    }
                } else {
                    newTimeline.axisBindings.push(axis);
                }
            });
        }

        // Merge the imageBindings
        newTimeline.imageBindings.push(...endTimeline.imageBindings, ...startTimeline.imageBindings);

        let conversionRatio = originalStartLength / newLength;
        let diff = newLength - originalEndLength;

        let getTime;
        if (startTimelineHasMapping != endTimelineHasMapping) {
            let startvalues = mModel.getTimeBindingValues(startTimeline);
            let endvalues = mModel.getTimeBindingValues(endTimeline);
            // if one side has a mapping: 
            let timeInSegment
            let segmentStartTime;
            if (startTimelineHasMapping) {
                let startTimeRatio = (startvalues[startvalues.length - 1].timeStamp - startvalues[0].timeStamp) / originalStartLength;
                let timeInBridge = startTimeRatio * (newLength - originalStartLength - originalEndLength);
                timeInSegment = startTimeRatio * originalEndLength;
                segmentStartTime = startvalues[startvalues.length - 1].timeStamp + timeInBridge;
            } else {
                let endTimeRatio = (endvalues[endvalues.length - 1].timeStamp - endvalues[0].timeStamp) / originalEndLength;
                let timeInBridge = endTimeRatio * (newLength - originalStartLength - originalEndLength);
                timeInSegment = endTimeRatio * originalStartLength;
                segmentStartTime = endvalues[0].timeStamp - timeInBridge - timeInSegment;
            }
            getTime = function (timePercent) {
                return timePercent * timeInSegment + segmentStartTime;
            }
        }

        // Update time pin line percents and timesPercents if necessary
        let timePins = []
        startTimeline.timePins.concat([getCapTimePin(startTimeline, false)].filter(p => p))
            .forEach(binding => {
                let newBinding = binding.copy();
                newBinding.linePercent = binding.linePercent * conversionRatio;

                if (!startTimelineHasMapping && endTimelineHasMapping && isNaN(parseInt(binding.timeStamp))) {
                    newBinding.timeStamp = getTime(binding.timePercent);
                    newBinding.timePercent = null;
                } else if (!startTimelineHasMapping) {
                    newBinding.timePercent = binding.timePercent / 2;
                }

                timePins.push(newBinding);
            });
        endTimeline.timePins.concat([getCapTimePin(endTimeline, true)].filter(p => p))
            .forEach(binding => {
                let newBinding = binding.copy();
                let originalLengthAlongLine = binding.linePercent * originalEndLength;
                newBinding.linePercent = (originalLengthAlongLine + diff) / newLength;

                if (!endTimelineHasMapping && startTimelineHasMapping && isNaN(parseInt(binding.timeStamp))) {
                    newBinding.timeStamp = getTime(binding.timePercent);
                    newBinding.timePercent = null;
                } else if (!endTimelineHasMapping) {
                    newBinding.timePercent = binding.timePercent / 2 + 0.5;
                }

                timePins.push(newBinding);
            });

        // Delete invalid pins as necessary
        if (startTimelineHasMapping || endTimelineHasMapping) {
            let pinsByPercent = [...timePins].sort((a, b) => a.linePercent - b.linePercent);
            let pinsByTime = [...timePins].sort((a, b) => a.timeStamp - b.timeStamp);

            // Algorithm to remove invalid pins
            // Find the pin with the biggest index difference, remove. Repeat until all pins are at the same index
            for (let i = 0; i < pinsByPercent.length; i++) {
                if (pinsByPercent[i] != pinsByTime[i]) {
                    // how far away is the item in the percent array?
                    let distPercentItem = pinsByTime.indexOf(pinsByPercent[i])
                    // how far is the item in the time array?
                    let distTimeItem = pinsByPercent.indexOf(pinsByTime[i])
                    let eliminate;
                    if (distPercentItem < distTimeItem) {
                        // percent item is closer, eliminate the dist item
                        eliminate = pinsByTime[i];
                    } else {
                        eliminate = pinsByPercent[i];
                    }
                    pinsByPercent.splice(pinsByPercent.indexOf(eliminate), 1);
                    pinsByTime.splice(pinsByPercent.indexOf(eliminate), 1);
                    i--;
                }
            }
            newTimeline.timePins = pinsByPercent;
        } else {
            newTimeline.timePins = timePins;
        }

        startTimeline.annotationStrokes.forEach(stroke => {
            let newStoke = new DataStructs.Stroke([], stroke.color, stroke.width);
            newStoke.points = stroke.points.map(p => {
                let point = p.copy();
                if (!startTimelineHasMapping && endTimelineHasMapping) {
                    point.timeStamp = getTime(point.timePercent);
                    point.timePercent = null;
                } else if (!startTimelineHasMapping) {
                    point.timePercent = point.timePercent / 2;
                }

                return point;
            })
            newTimeline.annotationStrokes.push(newStoke);
        })

        endTimeline.annotationStrokes.forEach(stroke => {
            let newStoke = new DataStructs.Stroke([], stroke.color, stroke.width);
            newStoke.points = stroke.points.map(p => {
                let point = p.copy();
                if (!endTimelineHasMapping && startTimelineHasMapping) {
                    point.timeStamp = getTime(point.timePercent);
                    point.timePercent = null;
                } else if (!endTimelineHasMapping) {
                    point.timePercent = (point.timePercent / 2) + 0.5;
                }
                return point;
            })
            newTimeline.annotationStrokes.push(newStoke);
        })

        mModel.setTimelines(mModel.getAllTimelines().filter(timeline => timeline.id != timelineIdStart && timeline.id != timelineIdEnd));
        mModel.getAllTimelines().push(newTimeline);

        let timelineHasMapping = mModel.hasTimeMapping(newTimeline.id);
        // last couple things to check. 
        if (!endTimelineHasMapping && !startTimelineHasMapping && timelineHasMapping) {
            mapTimePercentsToTimeStamps(newTimeline);
        }

        // last thing create pins for cell bindings that lost their pins
        newTimeline.cellBindings.concat(newTimeline.imageBindings).forEach(binding => {
            if (binding.timePinId) {
                let pin = newTimeline.timePins.find(p => p.id == binding.timePinId);
                if (!pin) {
                    if (!timelineHasMapping) { console.error("Bad state! Timeline has no mapping, pin should not have been eliminated!", binding); return }
                    // the only way for this pin to have been elminated is if it had a time mapping which was incompatible
                    let pin = startTimeline.timePins.concat(endTimeline.timePins).find(p => p.id == binding.timePinId);
                    if (!pin) { console.error("Bad state! Pin not found!", binding.timePinId); return }
                    if (isNaN(parseInt(pin.timeStamp))) { console.error("Bad state! Pin should not have been eliminated!", pin); return }
                    let existingPin = newTimeline.timePins.find(p => p.timeStamp == pin.timeStamp);
                    if (!existingPin) {
                        let newPin = new DataStructs.TimePin(mModel.mapTimeToLinePercent(pin.timeStamp));
                        newPin.timeStamp = pin.timeStamp;
                        newTimeline.timePins.push(newPin);
                        binding.timePinId = newPin.id;
                    } else {
                        binding.timePinId = existingPin.id;
                    }
                }
            }
        })

        return [timelineIdStart, timelineIdEnd];
    }

    /* Utility Function for extending and merging timelines*/
    function getCapTimePin(timeline, capStart) {
        let timelineHasMapping = mModel.hasTimeMapping(timeline.id);
        let boundValues = mModel.getBoundTimeCellValues(timeline.id)
            .concat(timeline.annotationStrokes.map(s => s.points.map(p => timelineHasMapping ? p.timeStamp : p.timePercent)).flat());
        if (boundValues.length > 1) {
            let capTimeStamp = capStart ? boundValues[0] : boundValues[boundValues.length - 1];

            timeline.timePins.sort((a, b) => a.timeStamp - b.timeStamp);
            let capTimePin = capStart ? timeline.timePins[0] : timeline.timePins[timeline.timePins.length - 1];

            if (capTimePin && ((capStart && Math.round(capTimePin.timeStamp) <= Math.round(capTimeStamp)) ||
                (!capStart && Math.round(capTimeStamp) <= Math.round(capTimePin.timeStamp)))) {
                // our cap is pinned, all good
                return null;
            } else {
                let linePercent = mModel.mapTimeToLinePercent(timeline.id, capTimeStamp);
                let timePin = new DataStructs.TimePin(linePercent);
                timePin.timeStamp = capTimeStamp;
                return timePin;
            }
        } else {
            // we only have time pins, so we're good.
            return null;
        }
    }
    /* End Utilty Function */

    function deleteTimeline(timelineId) {
        mModel.setTimelines(mModel.getAllTimelines().filter(t => t.id != timelineId));
    }

    function breakTimeline(timelineId, segments) {
        if (segments.length < 2) throw new Error("Expecting at least part of the timeline to be erased.")

        let timeline = mModel.getTimelineById(timelineId);
        let totalLength = PathMath.getPathLength(timeline.points);
        let timelineHasMapping = mModel.hasTimeMapping(timelineId);

        let findSegment = (percent) => {
            return segments.find(s =>
                percent >= s.startPercent &&
                percent <= s.endPercent);
        }

        // Assign the segments their correct line percents.
        segments[0].startPercent = 0;
        segments[0].startTime = mModel.mapLinePercentToTime(timelineId, 0);
        segments[0].endPercent = PathMath.getSubpathLength(segments[0].points) / totalLength;
        segments[0].endTime = mModel.mapLinePercentToTime(timelineId, segments[0].endPercent);
        for (let i = 1; i < segments.length; i++) {
            segments[i].startPercent = segments[i - 1].endPercent;
            segments[i].startTime = segments[i - 1].endTime;
            segments[i].endPercent = PathMath.getSubpathLength(PathMath.mergeSegments(segments.slice(0, i + 1))) / totalLength;
            segments[i].endTime = mModel.mapLinePercentToTime(timelineId, segments[i].endPercent);
        }
        // ensure the last segment does indeed go to one, avoid rounding errors.
        segments[segments.length - 1].endPercent = 1;
        segments[segments.length - 1].endTime = mModel.mapLinePercentToTime(timelineId, 1);

        // split up the time pins into their proper segments
        segments.forEach(s => s.timePins = []);
        let timePins = mModel.getTimelineById(timeline.id).timePins;
        timePins.forEach(pin => {
            let segment = findSegment(pin.linePercent);
            if (!segment) { console.error("Unhandled edge case!", binding.linePercent, segments); return; };
            segment.timePins.push(pin);
        })

        // split up the cell bindings into their proper segments
        segments.forEach(s => s.cellBindingsData = []);
        let cellBindingData = mModel.getCellBindingData(timeline.id);
        cellBindingData.forEach(binding => {
            let linePercent = binding.linePercent;
            if (linePercent == NO_LINE_PERCENT) linePercent = 0;

            let segment = findSegment(linePercent);
            if (!segment) { console.error("Something wierd here. Didn't find segment for linePercent", linePercent, binding.linePercent); return; };
            segment.cellBindingsData.push(binding);
        });

        // split up the image bindings into their proper segments
        segments.forEach(s => s.imageBindingData = []);
        let imageBindingData = mModel.getImageBindingData(timeline.id);
        imageBindingData.forEach(binding => {
            let linePercent = binding.linePercent;
            if (linePercent == NO_LINE_PERCENT) linePercent = 0;

            let segment = findSegment(linePercent);
            if (!segment) { console.error("Something wierd here. Didn't find segment for linePercent", linePercent, binding.linePercent); return; };
            segment.imageBindingData.push(binding);
        });

        // split up the strokes (sometimes literally split them) into their segments
        segments.forEach(s => s.annotationStrokes = []);
        mModel.getStrokeData(timeline.id).forEach(strokeData => {
            let currSegment = null;
            let currSet = [];
            strokeData.points.forEach((point, index) => {
                if (index == 0) {
                    currSegment = findSegment(point.linePercent);
                    currSet.push(point.copy());
                } else if (point.linePercent > currSegment.endPercent || point.linePercent < currSegment.startPercent) {
                    // outside the current segment, add the previous stroke part to the previous segment and reset.
                    if (currSet.length >= 2) {
                        currSegment.annotationStrokes.push(new DataStructs.Stroke(currSet, strokeData.color, strokeData.width));
                    }
                    currSet = [point.copy()];
                    currSegment = findSegment(point.linePercent);
                } else {
                    currSet.push(point.copy());
                }
            })
            // push the last stroke
            if (currSet.length >= 2) {
                currSegment.annotationStrokes.push(new DataStructs.Stroke(currSet, strokeData.color, strokeData.width));
            }
        });

        // add time pins to ensure the data doesn't move because of being disconnected if neccesary
        segments.forEach(segment => {
            // get the max time bound to this line
            let maxTime = -Infinity;
            let minTime = Infinity;
            segment.timePins.sort((a, b) => a.linePercent - b.linePercent);
            if (timelineHasMapping) {
                // check the cellBindings
                let validCellBindingsStamps = segment.cellBindingsData
                    .filter(c => c.timeCell.isValid())
                    .map(cbd => cbd.timeCell.getValue());
                // check the imageBindings
                let validImageBindingStamps = segment.imageBindingData
                    .filter(i => i.imageBinding.timeStamp)
                    .map(i => i.imageBinding.timeStamp);
                // check the strokes
                let strokeStamps = segment.annotationStrokes
                    .map(s => s.points.map(p => p.timeStamp))
                    .flat();
                maxTime = Math.max(maxTime, ...validCellBindingsStamps, ...validImageBindingStamps, ...strokeStamps);
                minTime = Math.min(minTime, ...validCellBindingsStamps, ...validImageBindingStamps, ...strokeStamps);

                if (minTime < Infinity &&
                    segment.startPercent > 0 && (
                        segment.timePins.length == 0 ||
                        minTime < segment.timePins[0].timeStamp)) {
                    // add a start peg based on the old timeline
                    let timePin = new DataStructs.TimePin(segment.startPercent);
                    timePin.timeStamp = mModel.mapLinePercentToTime(timelineId, segment.startPercent);
                    segment.timePins.unshift(timePin);
                }

                if (maxTime > -Infinity &&
                    segment.endPercent < 1 && (
                        segment.timePins.length == 0 ||
                        maxTime > segment.timePins[segment.timePins.length - 1].timeStamp)) {
                    // add an end peg based on the old timeline
                    let timePin = new DataStructs.TimePin(segment.endPercent);
                    timePin.timeStamp = mModel.mapLinePercentToTime(timelineId, segment.endPercent);
                    segment.timePins.push(timePin);
                }
            }
        })

        // create the new timelines
        let newTimelines = segments.filter(s => s.label == SEGMENT_LABELS.UNAFFECTED).map(segment => {
            let newTimeline = new DataStructs.Timeline(segment.points);
            newTimeline.color = timeline.color;

            // update pin mappings
            newTimeline.timePins = segment.timePins.map(pin => {
                let timePin = pin.copy();
                timePin.linePercent = (timePin.linePercent - segment.startPercent) / (segment.endPercent - segment.startPercent);
                if (!timelineHasMapping) {
                    timePin.timePercent = (timePin.timePercent - segment.startTime) / (segment.endTime - segment.startTime);
                }
                return timePin;
            });

            // add the data mappings
            newTimeline.cellBindings = segment.cellBindingsData.map(b => b.cellBinding);
            newTimeline.imageBindings = segment.imageBindingData.map(b => b.imageBinding);

            // update the axis mappings
            let axesColumns = DataUtil.getUniqueList(segment.cellBindingsData
                .filter(cbd => cbd.dataCell.getType() == DataTypes.NUM)
                .map(cbd => cbd.dataCell.columnId));
            newTimeline.axisBindings = timeline.axisBindings.filter(ab => axesColumns.includes(ab.columnId)).map(ab => ab.clone());
            newTimeline.axisBindings.forEach(axisBinding => {
                axisBinding.linePercent = (axisBinding.linePercent - segment.startPercent) / (segment.endPercent - segment.startPercent);
                // don't use whole numbers to avoid divide by 0 bugs
                if (axisBinding.linePercent < 0.0001) axisBinding.linePercent = 0.0001;
                if (axisBinding.linePercent > 0.9999) axisBinding.linePercent = 0.9999;
            });

            // update the annotation stroke mappings
            newTimeline.annotationStrokes = [...segment.annotationStrokes];
            if (!timelineHasMapping) {
                newTimeline.annotationStrokes.forEach(stroke => {
                    stroke.points.forEach(point => {
                        point.timePercent = (point.timePercent - segment.startTime) /
                            (segment.endTime - segment.startTime);
                    })
                });
            }

            return newTimeline;
        })

        mModel.setTimelines(mModel.getAllTimelines().filter(t => t.id != timelineId));
        mModel.getAllTimelines().push(...newTimelines);
    }

    function updateTimelinePoints(timelineId, oldSegments, newSegments) {
        let timeline = mModel.getTimelineById(timelineId);

        timeline.points = PathMath.mergeSegments(newSegments);

        // update the time pins
        let newLength = PathMath.getPathLength(PathMath.mergeSegments(newSegments));
        let oldLength = PathMath.getPathLength(PathMath.mergeSegments(oldSegments));
        let cumulativeNewLength = 0;
        let cumulativeOldLength = 0;
        for (let i = 0; i < oldSegments.length; i++) {
            let newSegmentPoints = newSegments[i].points;
            if (newSegments[i].label == SEGMENT_LABELS.CHANGED) {
                if (i > 0) {
                    newSegmentPoints.unshift(newSegments[i - 1].points[newSegments[i - 1].points.length - 1])
                }
                if (i < newSegments.length - 1) {
                    newSegmentPoints.push(newSegments[i + 1].points[0])
                }
            }

            let newSegmentLength = PathMath.getPathLength(newSegmentPoints);
            let oldSegmentLength = PathMath.getPathLength(oldSegments[i].points);

            let newStartPercent = cumulativeNewLength / newLength;
            let oldStartPercent = cumulativeOldLength / oldLength;

            cumulativeNewLength += newSegmentLength;
            cumulativeOldLength += oldSegmentLength;

            let newEndPercent = cumulativeNewLength / newLength;
            let oldEndPercent = cumulativeOldLength / oldLength;

            let newPercentInterval = newEndPercent - newStartPercent;
            let oldPercentInterval = oldEndPercent - oldStartPercent;

            timeline.timePins
                .filter(binding =>
                    binding.linePercent >= oldStartPercent &&
                    binding.linePercent <= oldEndPercent)
                .forEach(binding => {
                    binding.linePercent = (((binding.linePercent - oldStartPercent) / oldPercentInterval) * newPercentInterval) + newStartPercent;
                })
        }
    }

    function updateTimelineColor(timelineId, color) {
        let timeline = mModel.getTimelineById(timelineId);
        if (!timeline) { console.error("Bad timeline id!", timelineId); return; }
        timeline.color = color;
    }

    function addBoundTextRow(timelineId, text, time, timePin = null) {
        if (mModel.getAllTables().length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mModel.getAllTables().push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mModel.getAllTables()[0].dataRows.length;
        mModel.getAllTables()[0].dataRows.push(newRow);

        let timeColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.TimeCell(time, timeColId)
        newRow.dataCells.push(timeCell);

        let nextColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 1).id;
        let textCell = new DataStructs.DataCell(DataTypes.TEXT, text, nextColId)
        newRow.dataCells.push(textCell);

        for (let i = 2; i < mModel.getAllTables()[0].dataColumns.length; i++) {
            let colId = mModel.getAllTables()[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        let timeline = mModel.getTimelineById(timelineId);

        let newBinding = new DataStructs.CellBinding(textCell.id);
        if (timePin) {
            newBinding.timePinId = timePin.id;
            timeline.timePins.push(timePin);
        }

        timeline.cellBindings.push(newBinding);
    }

    function addCanvasText(text, offset) {
        if (mModel.getAllTables().length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mModel.getAllTables().push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mModel.getAllTables()[0].dataRows.length;
        mModel.getAllTables()[0].dataRows.push(newRow);

        let timeColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.TimeCell("", timeColId)
        newRow.dataCells.push(timeCell);

        let nextColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 1).id;
        let textCell = new DataStructs.DataCell(DataTypes.TEXT, text, nextColId)
        newRow.dataCells.push(textCell);

        for (let i = 2; i < mModel.getAllTables()[0].dataColumns.length; i++) {
            let colId = mModel.getAllTables()[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        let newBinding = new DataStructs.CellBinding(textCell.id);
        newBinding.offset = offset;

        mModel.getCanvas().cellBindings.push(newBinding);
    }

    function updatePinBinding(timelineId, pin) {
        if (!timelineId) throw new Error("Invalid TimelineId: " + timelineId);

        let timeline = mModel.getTimelineById(timelineId);
        if (!timeline) throw new Error("Invalid TimelineId: " + timelineId);

        if (timeline.timePins.length > 0) {
            let timelineHasMapping = mModel.hasTimeMapping(timelineId);
            let timeAttribute = timelineHasMapping ? "timeStamp" : "timePercent";

            if (isNaN(parseInt(pin[timeAttribute]))) {
                console.error("Invalid pin update! Should have " +
                    (timelineHasMapping ? "timeStamp" : "timePercent")
                    + " set!", pin);
                return;
            }

            timeline.timePins = DataUtil.filterTimePinByChangedPin(timeline.timePins, pin, timeAttribute);

            let pinsIds = timeline.timePins.map(pin => pin.id);
            timeline.cellBindings.concat(timeline.imageBindings).forEach(b => {
                if (!pinsIds.includes(b.timePinId)) b.timePinId = null;
            })
        } else {
            timeline.timePins.push(pin);
        }
    }

    function updateText(cellId, text) {
        let cell = mModel.getCellById(cellId);
        cell.val = text;
    }

    function updateTextOffset(cellBindingId, offset) {
        let cellBinding = mModel.getCellBindingById(cellBindingId);
        cellBinding.offset = offset;
    }

    function updateTimePinBinding(bindingId, timePinId) {
        let binding = mModel.getCellBindingById(bindingId);
        if (!binding) {
            binding = mModel.getImageBindingById(bindingId);
        }

        if (!binding) {
            console.error("Invalid binding id!", bindingId);
            return;
        }

        binding.timePinId = timePinId;
    }

    function toggleFont(cellBindingId) {
        let binding = mModel.getCellBindingById(cellBindingId);
        binding.font = Fonts[(Fonts.indexOf(binding.font) + 1) % Fonts.length];
    }

    function toggleFontWeight(cellBindingId) {
        let binding = mModel.getCellBindingById(cellBindingId);
        binding.fontWeight = !binding.fontWeight;
    }

    function toggleFontItalics(cellBindingId) {
        let binding = mModel.getCellBindingById(cellBindingId);
        binding.fontItalics = !binding.fontItalics;
    }

    function setFontSize(cellBindingId, size) {
        let binding = mModel.getCellBindingById(cellBindingId);
        binding.fontSize = size;
    }

    function setCellBindingColor(cellBindingId, color) {
        let binding = mModel.getCellBindingById(cellBindingId);
        binding.color = color;
    }


    function addTimelineStroke(timelineId, points, color, width) {
        mModel.getTimelineById(timelineId).annotationStrokes.push(new DataStructs.Stroke(points, color, width));
    }

    function addCanvasStroke(points, color, width) {
        mModel.getCanvas().annotationStrokes.push(new DataStructs.Stroke(points, color, width));
    }

    function updateStrokeColor(strokeId, color) {
        let stroke = mModel.getStrokeById(strokeId);
        if (!stroke) { console.error("Bad stroke id!", strokeId); return; }
        stroke.color = color;
    }


    function updateStrokePoints(strokeId, points) {
        let stroke = mModel.getStrokeById(strokeId);
        if (!stroke) { console.error("Bad stroke id!", storkeId); return; }
        stroke.points = points;

    }

    function isCanvasStroke(strokeId) {
        if (mModel.getCanvas().annotationStrokes.find(s => s.id == strokeId)) return true;
        if (mModel.getAllTimelines().map(t => t.annotationStrokes).flat().find(s => s.id == strokeId)) return false;
        // neither of the other two happened.
        console.error("Bad stroke id!", strokeId); return;
    }


    function addTable(table) {
        // TODO validate table.
        mModel.getAllTables().push(table.copy());
    }

    function addTableFromCSV(array2d) {
        if (!array2d.length) {
            return null;
        }

        let table = new DataStructs.DataTable();
        array2d[0].forEach((cell, index) => {
            if (index == 0) {
                table.dataColumns.push(new DataStructs.DataColumn("Time", index));
            } else {
                table.dataColumns.push(new DataStructs.DataColumn("Col " + index, index));
            }
        })

        array2d.forEach((row, index) => {
            let dataRow = new DataStructs.DataRow();
            dataRow.index = index;
            row.forEach((cellValue, index) => {
                if (index == 0) {
                    dataRow.dataCells.push(new DataStructs.TimeCell(cellValue, table.dataColumns[0].id));
                } else {
                    dataRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, cellValue, table.dataColumns[index].id));
                }
            });
            table.dataRows.push(dataRow)
        });

        mModel.getAllTables().push(table);
        return table.id;
    }

    function tableUpdated(table, change, changeData) {
        let affectedTimelines = [];
        let affectedTimelinesData = {};
        mModel.getAllTimelines().forEach(timeline => {
            let affected = timeline.cellBindings.some(b => {
                if (change == TableChange.UPDATE_CELLS) {
                    // check if this timeline has cells with ids in the changed list
                    if (changeData.includes(b.cellId)) return true;
                    let timeCell = mModel.getTimeCellForDataCell(b.cellId);
                    if (!timeCell) { console.error("Bad state! Could not get time cell for cell", b.cellId); }
                    return changeData.includes(timeCell.id);
                } else if (change == TableChange.DELETE_ROWS) {
                    // check if this timeline has bound cells in rows that got deleted
                    return changeData.includes(mModel.getRowByCellId(b.cellId).id);
                } else if (change == TableChange.DELETE_COLUMNS) {
                    return changeData.includes(mModel.getCellById(b.cellId).columnId);
                }
            });

            if (affected) {
                affectedTimelines.push(timeline);
                if (mModel.hasTimeMapping(timeline.id)) {
                    let bindingValues = mModel.getTimeBindingValues(timeline);
                    affectedTimelinesData[timeline.id] = {
                        startTime: bindingValues[0].timeStamp,
                        endTime: bindingValues[bindingValues.length - 1].timeStamp
                    };
                }
            }
        })

        // sanitize the table to prevent data leaks
        table = table.copy();

        let index = mModel.getAllTables().findIndex(t => t.id == table.id);
        mModel.getAllTables()[index] = table;

        // remove canvas cells that are no longer in the model
        mModel.getCanvas().cellBindings = mModel.getCanvas().cellBindings.filter(
            cellBinding => mModel.getCellById(cellBinding.cellId) ? true : false);
        affectedTimelines.forEach(timeline => {
            // remove cells bindings no longer in the model
            timeline.cellBindings = timeline.cellBindings.filter(
                cellBinding => mModel.getCellById(cellBinding.cellId) ? true : false);

            updateTimelineAxes(timeline);
            clearLinksAndSetPins(timeline);

            let previouslyMappedTimelineIds = Object.keys(affectedTimelinesData);
            let timelineHadMapping = previouslyMappedTimelineIds.includes(timeline.id);
            if (timelineHadMapping != mModel.hasTimeMapping(timeline.id)) {
                if (timelineHadMapping) {
                    mapTimeStampsToTimePercents(timeline,
                        affectedTimelinesData[timeline.id].startTime,
                        affectedTimelinesData[timeline.id].endTime)
                } else {
                    mapTimePercentsToTimeStamps(timeline);
                }
            }
        });
    }

    //// table Update Util functions ////
    function updateTimelineAxes(timeline) {
        let prevAxis = timeline.axisBindings;
        timeline.axisBindings = [];

        let dataCells = timeline.cellBindings.map(cb => mModel.getCellById(cb.cellId));

        prevAxis.forEach(axis => {
            let cells = dataCells.filter(cell => cell.columnId == axis.columnId && cell.getType() == DataTypes.NUM);
            if (cells.length > 0) {
                axis.val1 = Math.min(...cells.map(c => c.getValue()));
                axis.val2 = Math.max(...cells.map(c => c.getValue()));

                if (axis.val1 == axis.val2) axis.val1 = 0;
                // just in case they were both 0
                if (axis.val1 == axis.val2) axis.val2 = 1;
                timeline.axisBindings.push(axis);
            }
        });
    }

    function clearLinksAndSetPins(timeline) {
        timeline.cellBindings.forEach(b => {
            if (b.timePinId) {
                let timeCell = mModel.getTimeCellForDataCell(b.cellId);
                if (!timeCell) return;

                if (timeCell.isValid()) {
                    let timePin = mModel.getTimePinById(b.timePinId);
                    let pinCopy = timePin.copy();
                    pinCopy.timeStamp = timeCell.getValue();
                    let resultingPins = DataUtil.filterTimePinByChangedPin(timeline.timePins, pinCopy, 'timeStamp');

                    if (resultingPins.length == timeline.timePins.length) {
                        timePin.timeStamp = timeCell.getValue();
                    }

                    b.timePinId = null;
                }
            }
        })

        timeline.imageBindings.forEach(b => {
            if (b.timePinId) {
                if (b.timeStamp) {
                    let timePin = mModel.getTimePinById(b.timePinId);
                    let pinCopy = timePin.copy();
                    pinCopy.timeStamp = b.timeStamp;
                    let resultingPins = DataUtil.filterTimePinByChangedPin(timeline.timePins, pinCopy, 'timeStamp');

                    if (resultingPins.length == timeline.timePins.length) {
                        timePin.timeStamp = b.timeStamp;
                    }

                    b.timePinId = null;
                }
            }
        })
    }
    //// end of table Update Util functions ////

    function bindCells(lineId, cellBindings) {
        let timeline = mModel.getTimelineById(lineId);
        let hasMappingBefore = mModel.hasTimeMapping(timeline.id);
        let alreadyBoundCells = timeline.cellBindings.map(cb => cb.cellId);

        cellBindings = cellBindings.filter(cb => {
            let cell = mModel.getCellById(cb.cellId);
            if (!cell) { console.error("Invalid cell id: ", cb.cellId); return false; }
            // filter out time cells
            if (cell.isTimeCell) return false;
            // don't bind empty cells. 
            if (cell.val !== 0 && !cell.val) return false;
            if (typeof cell.val == 'string' && cell.val.trim() == "") return false;
            // filter out already bound cells
            if (alreadyBoundCells.includes(cell.id)) return false;

            return true;
        });

        timeline.cellBindings.push(...cellBindings);

        // update the axis
        let oldAxes = timeline.axisBindings;
        timeline.axisBindings = []

        let boundCells = timeline.cellBindings.map(c => mModel.getCellById(c.cellId));

        let columnsIds = DataUtil.getUniqueList(boundCells.map(c => c.columnId));
        columnsIds.forEach(columnId => {
            let numCells = boundCells.filter(cell =>
                cell.columnId == columnId &&
                cell.getType() == DataTypes.NUM &&
                cell.isValid());

            if (numCells.length > 0) {
                let min = Math.min(...numCells.map(i => i.getValue()));
                let max = Math.max(...numCells.map(i => i.getValue()));
                if (min == max) min > 0 ? min = 0 : max = 0;

                let axis = oldAxes.find(a => a.columnId == columnId);
                if (!axis) {
                    axis = new DataStructs.AxisBinding(columnId);
                    axis.dist1 = 30;
                    axis.dist2 = 100;
                }

                axis.val1 = min;
                axis.val2 = max;
                timeline.axisBindings.push(axis)
            }
        });

        if (mModel.hasTimeMapping(timeline.id) && !hasMappingBefore) {
            // we can only go from no mapping to mapping in this function
            mapTimePercentsToTimeStamps(timeline);
        }
    }

    function mapTimePercentsToTimeStamps(timeline) {
        if (!mModel.hasTimeMapping(timeline.id)) {
            console.error("Invalid timeline for percent to stamp mapping!");
            return;
        }

        let values = mModel.getTimeBindingValues(timeline);
        timeMin = values[0].timeStamp;
        timeMax = values[values.length - 1].timeStamp;

        // It is possible that we might have a single time pin that already has a time stamp
        let stampedPin = timeline.timePins.find(pin => pin.timeStamp);
        if (stampedPin) {
            if (stampedPin.timeStamp == timeMin || stampedPin.timeStamp == timeMax) {
                // all good, don't need to factor this into the calculation.
                stampedPin = null;
            } else {
                stampedPin = stampedPin.copy();
            }
        }
        function convertPercent(timePercent) {
            let result;
            if (stampedPin) {
                if (timePercent > stampedPin.timePercent) {
                    let rangePercent = (timePercent - stampedPin.timePercent) / (1 - stampedPin.timePercent);
                    result = rangePercent * (timeMax - stampedPin.timeStamp) + stampedPin.timeStamp;
                } else {
                    let rangePercent = timePercent / stampedPin.timePercent;
                    result = rangePercent * (stampedPin.timeStamp - timeMin) + timeMin;
                }
            } else {
                result = timePercent * (timeMax - timeMin) + timeMin;
            }
            return Math.round(result);
        }

        timeline.timePins.forEach(pin => {
            if (!pin.timeStamp) {
                pin.timeStamp = convertPercent(pin.timePercent);
            }
            pin.timePercent = null;
        })

        timeline.annotationStrokes.forEach(stroke => stroke.points.forEach(point => {
            if (!point.timeStamp) {
                point.timeStamp = convertPercent(point.timePercent);
                point.timePercent = null;
            }
        }))

    }

    function mapTimeStampsToTimePercents(timeline, lineStartTimeStamp, lineEndTimeStamp) {
        // map everything to time percent
        if (isNaN(parseInt(lineStartTimeStamp))) {
            console.error("Invalid parameters. Must include time mapping values if shifted to no time mapping.");
            return;
        }
        if (isNaN(parseInt(lineEndTimeStamp))) {
            console.error("Invalid parameters. Must include time mapping values if shifted to no time mapping.")
            return;
        }

        timeline.timePins.forEach(pin => {
            // there can really only be at most one pin in this case.
            pin.timePercent = pin.linePercent;
        })

        timeline.annotationStrokes.forEach(stroke => stroke.points.forEach(point => {
            point.timePercent = (point.timeStamp - lineStartTimeStamp) / (lineEndTimeStamp - lineStartTimeStamp);
            point.timeStamp = null;
        }))
    }

    function updateAxisPosition(axisId, dist1, dist2, linePercent) {
        let currentAxis = mModel.getAxisById(axisId);

        if (!currentAxis) { console.error("Bad axis id for dist update!", axisId); return; }

        currentAxis.dist1 = dist1;
        currentAxis.dist2 = dist2;
        currentAxis.linePercent = linePercent;
    }

    function updateAxisColor(axisId, oneOrTwo, color) {
        let axis = mModel.getAxisById(axisId);
        if (!axis) { console.error("Bad axis id for color update!", axisId); return; }

        if (oneOrTwo == 1) {
            axis.color1 = color;
        } else {
            axis.color2 = color;
        }
    }

    function updateAxisDataAlignment(axisId, alignment) {
        let axis = mModel.getAxisById(axisId);
        if (!axis) { console.error("Bad axis id for color update!", axisId); return; }

        axis.alignment = alignment;
    }

    function toggleDataStyle(axisId) {
        let axis = mModel.getAxisById(axisId);
        if (!axis) { console.error("Bad axis id for color update!", axisId); return; }

        let styles = Object.values(DataDisplayStyles);
        axis.style = styles[(styles.indexOf(axis.style) + 1) % styles.length];
    }

    function addBoundImage(timelineId, imageData, width, height, time, timePin = null) {
        let timeline = mModel.getTimelineById(timelineId);
        if (!timeline) {
            console.error("Bad timeline id for image!", timelineId);
            return;
        }

        let newBinding = new DataStructs.ImageBinding(imageData);
        newBinding.width = width;
        newBinding.height = height;
        if (time) {
            newBinding.timeStamp = time;
        }

        if (timePin) {
            newBinding.timePinId = timePin.id;
            timeline.timePins.push(timePin);
        }

        timeline.imageBindings.push(newBinding);
        return newBinding.id;
    }

    function addCanvasImage(imageData, width, height, coords) {
        let newBinding = new DataStructs.ImageBinding(imageData);
        newBinding.width = width;
        newBinding.height = height;
        newBinding.offset = {
            x: coords.x - 50,
            y: coords.y - 50
        };

        mModel.getCanvas().imageBindings.push(newBinding);
    }

    function updateImageOffset(imageBindingId, offset) {
        let imageBinding = mModel.getImageBindingById(imageBindingId);
        imageBinding.offset = offset;
    }

    function updateImageSize(imageBindingId, offset, height, width) {
        let imageBinding = mModel.getImageBindingById(imageBindingId);
        imageBinding.offset = offset;
        imageBinding.height = height;
        imageBinding.width = width;
    }

    function updateImageTime(imageBindingId, time) {
        let imageBinding = mModel.getImageBindingById(imageBindingId);
        if (!imageBinding) {
            console.error("invalid image binding id to set time", imageBindingId);
            return;
        }

        let timeline = mModel.getAllTimelines().find(t => t.imageBindings.some(i => i.id == imageBindingId));
        let hadTimeMapping, startTime, endTime;
        if (timeline) {
            hadTimeMapping = mModel.hasTimeMapping(timeline.id);
        }

        if (hadTimeMapping) {
            let bindingValues = mModel.getTimeBindingValues(timeline);
            startTime = bindingValues[0].timeStamp;
            endTime = bindingValues[bindingValues.length - 1].timeStamp;
        }

        if (DataUtil.isNumeric(time)) {
            imageBinding.timeStamp = time;

            if (timeline && !hadTimeMapping && mModel.hasTimeMapping(timeline.id)) {
                mapTimePercentsToTimeStamps(timeline);
            }
        } else {
            imageBinding.timeStamp = null;
            if (timeline && hadTimeMapping && !mModel.hasTimeMapping(timeline.id)) {
                mapTimeStampsToTimePercents(timeline, startTime, endTime);
            }
        }
    }

    function imageBindingToCanvasBinding(imageBindingId) {
        let timeline = mModel.getAllTimelines().find(t => t.imageBindings.some(i => i.id == imageBindingId));
        if (!timeline) {
            console.error("No timeline found for image binding!");
            return;
        }

        let hadTimeMapping = mModel.hasTimeMapping(timeline.id);
        let startTime, endTime;
        if (hadTimeMapping) {
            let bindingValues = mModel.getTimeBindingValues(timeline);
            startTime = bindingValues[0].timeStamp;
            endTime = bindingValues[bindingValues.length - 1].timeStamp;
        }

        let imageData = mModel.getImageBindingData(timeline.id).find(d => d.imageBinding.id == imageBindingId);
        if (!imageData) {
            console.error("could not find the image binding for id!", imageBindingId);
            return;
        }

        let position = PathMath.getPositionForPercent(timeline.points, imageData.linePercent);
        let imageBinding = imageData.imageBinding;
        imageBinding.offset.x += position.x;
        imageBinding.offset.y += position.y;
        imageBinding.timePinId = null;
        mModel.getCanvas().imageBindings.push(imageBinding);
        timeline.imageBindings = timeline.imageBindings.filter(i => i.id != imageBindingId);

        if (hadTimeMapping && !mModel.hasTimeMapping(timeline.id)) {
            let timeline = mModel.getTimelineById(timeline.id);
            mapTimeStampsToTimePercents(timeline, startTime, endTime)
        }
    }

    function imageBindingToLineBinding(timelineId, imageBindingId, linePoint) {
        let timeline = mModel.getTimelineById(timelineId);
        if (!timeline) {
            console.error("Bad timeline id to link image binding to!", timelineId);
            return;
        }

        let hadTimeMapping = mModel.hasTimeMapping(timeline.id);

        let imageData = mModel.getCanvasImageBindings().find(d => d.imageBinding.id == imageBindingId);
        if (!imageData) {
            console.error("could not find the image binding for id!", imageBindingId);
            return;
        }

        let imageBinding = imageData.imageBinding;
        imageBinding.offset.x -= linePoint.x;
        imageBinding.offset.y -= linePoint.y;
        mModel.getCanvas().imageBindings = mModel.getCanvas().imageBindings.filter(b => b.id != imageBindingId);

        if (hadTimeMapping && !imageData.imageBinding.timeStamp) {
            imageBinding.timeStamp = mModel.mapLinePercentToTime(timeline.id, linePoint.percent);
        } else if (!hadTimeMapping) {
            // make a pin to link it to the clicked point.
            let timePin = new DataStructs.TimePin(linePoint.percent);
            timePin.timePercent = mModel.mapLinePercentToTime(timeline.id, linePoint.percent);
            if (imageData.imageBinding.timeStamp) {
                timePin.timeStamp = imageData.imageBinding.timeStamp;
            }
            imageBinding.timePinId = timePin.id;
            timeline.timePins.push(timePin);
        }

        timeline.imageBindings.push(imageBinding);

        if (!hadTimeMapping && mModel.hasTimeMapping(timeline.id)) {
            mapTimePercentsToTimeStamps(timeline);
        }
    }

    function deleteCellBindings(cellBindingIds) {
        let hasTimeMappings = {};
        let affectedTimelines = [];

        cellBindingIds.forEach(cellBindingId => {
            if (mModel.getCanvas().cellBindings.map(b => b.id).includes(cellBindingId)) {
                mModel.getCanvas().cellBindings = mModel.getCanvas().cellBindings.filter(b => b.id != cellBindingId);
            } else {
                let timeline = mModel.getTimelineByCellBinding(cellBindingId);
                if (!timeline) {
                    console.error("Bad cell binding id! No timeline found!", cellBindingId);
                    return;
                }

                if (!(timeline.id in hasTimeMappings)) {
                    hasTimeMappings[timeline.id] = { timelineHasMapping: mModel.hasTimeMapping(timeline.id) };
                    if (hasTimeMappings[timeline.id].timelineHasMapping) {
                        let bindingValues = mModel.getTimeBindingValues(timeline);
                        hasTimeMappings[timeline.id].startTime = bindingValues[0].timeStamp;
                        hasTimeMappings[timeline.id].endTime = bindingValues[bindingValues.length - 1].timeStamp
                    }
                }
                timeline.cellBindings = timeline.cellBindings.filter(b => b.id != cellBindingId);
                affectedTimelines.push(timeline.id);
            }
        })

        affectedTimelines.forEach(timelineId => {
            let timeline = mModel.getTimelineById(timelineId);
            let bindingData = mModel.getCellBindingData(timelineId);
            let axesColumns = DataUtil.getUniqueList(bindingData
                .filter(cbd => cbd.dataCell.getType() == DataTypes.NUM)
                .map(cbd => cbd.dataCell.columnId));
            timeline.axisBindings = timeline.axisBindings.filter(ab => axesColumns.includes(ab.columnId)).map(ab => ab.clone());
        })

        Object.entries(hasTimeMappings).forEach(([timelineId, data]) => {
            if (data.timelineHasMapping && !mModel.hasTimeMapping(timelineId)) {
                let timeline = mModel.getTimelineById(timelineId);
                mapTimeStampsToTimePercents(timeline, data.startTime, data.endTime)
            }
        })
    }

    function deletePins(pinIds) {
        let timelines = mModel.getAllTimelines();
        timelines.forEach(timeline => {
            let checkTimeMapping = false, startTime, endTime;

            let newPins = timeline.timePins.filter(pin => !pinIds.includes(pin.id))
            if (newPins.length != timeline.timePins.length) {
                // set the values needed for loss of mapping
                if (mModel.hasTimeMapping(timeline.id)) {
                    checkTimeMapping = true;
                    let bindingValues = mModel.getTimeBindingValues(timeline);
                    startTime = bindingValues[0].timeStamp
                    endTime = bindingValues[bindingValues.length - 1].timeStamp;
                }

                // remove pin linking
                timeline.cellBindings.concat(timeline.imageBindings).forEach(b => {
                    if (b.timePinId && !pinIds.includes(b.timePinId)) {
                        b.timePinId = null;
                    }
                })
            }

            timeline.timePins = newPins;

            // check if we had a mapping and now don't
            if (checkTimeMapping && !mModel.hasTimeMapping(timeline.id)) {
                mapTimeStampsToTimePercents(timeline, startTime, endTime)
            }
        });
    }

    function deleteStrokes(strokeIds) {
        let timelines = mModel.getAllTimelines();
        timelines.forEach(timeline => {
            timeline.annotationStrokes = timeline.annotationStrokes.filter(s => !strokeIds.includes(s.id));
        })
        mModel.getCanvas().annotationStrokes = mModel.getCanvas().annotationStrokes.filter(s => !strokeIds.includes(s.id));
    }

    function deleteImageBindings(imageBindingIds) {
        let hasTimeMappings = {};

        imageBindingIds.forEach(imageBindingId => {
            if (mModel.getCanvas().imageBindings.map(b => b.id).includes(imageBindingId)) {
                mModel.getCanvas().imageBindings = mModel.getCanvas().imageBindings.filter(b => b.id != imageBindingId);
            } else {
                let timeline = mModel.getTimelineByImageBinding(imageBindingId);
                if (!timeline) {
                    console.error("Bad image binding id! No timeline found!", imageBindingId);
                    return;
                }

                if (!(timeline.id in hasTimeMappings)) {
                    hasTimeMappings[timeline.id] = { timelineHasMapping: mModel.hasTimeMapping(timeline.id) };
                    if (hasTimeMappings[timeline.id].timelineHasMapping) {
                        let bindingValues = mModel.getTimeBindingValues(timeline);
                        hasTimeMappings[timeline.id].startTime = bindingValues[0].timeStamp;
                        hasTimeMappings[timeline.id].endTime = bindingValues[bindingValues.length - 1].timeStamp
                    }
                }

                timeline.imageBindings = timeline.imageBindings.filter(b => b.id != imageBindingId);
            }
        })

        Object.entries(hasTimeMappings).forEach(([timelineId, data]) => {
            if (data.timelineHasMapping && !mModel.hasTimeMapping(timelineId)) {
                let timeline = mModel.getTimelineById(timelineId);
                mapTimeStampsToTimePercents(timeline, data.startTime, data.endTime)
            }
        })
    }

    function deleteDataSet(axisId) {
        let timeline = mModel.getTimelineByAxisId(axisId);
        if (!timeline) {
            console.error("Bad axis id! No timeline found!", axisId);
            return;
        }

        let hadTimeMapping = mModel.hasTimeMapping(timeline.id);
        let startTime, endTime;
        if (hadTimeMapping) {
            let bindingValues = mModel.getTimeBindingValues(timeline);
            startTime = bindingValues[0].timeStamp;
            endTime = bindingValues[bindingValues.length - 1].timeStamp;
        }

        let removeBindings = mModel.getCellBindingData(timeline.id).filter(b => b.axisBinding.id == axisId).map(b => b.cellBinding.id);
        timeline.cellBindings = timeline.cellBindings.filter(b => !removeBindings.includes(b.id));
        timeline.axisBindings = timeline.axisBindings.filter(b => b.id != axisId);

        if (hadTimeMapping && !mModel.hasTimeMapping(timeline.id)) {
            mapTimeStampsToTimePercents(timeline, startTime, endTime);
        }
    }

    /****
     * Utility
     */

    function setModelFromObject(obj) {
        // TODO: Do complete model validation.

        mModel = new DataStructs.DataModel();
        mModel.setCanvas(DataStructs.Canvas.fromObject(obj.canvas))
        obj.timelines.forEach(timeline => {
            let prevPoints = [...timeline.points];
            timeline.points = timeline.points.filter(p => {
                if (isNaN(parseInt(p.x)) || isNaN(parseInt(p.y))) return false;
                else return true;
            });

            if (prevPoints.length != timeline.points.length) {
                // flag it but carry on with the filtered list.
                console.error("Invalid points in loaded timeline!", prevPoints);
            }

            mModel.getAllTimelines().push(DataStructs.Timeline.fromObject(timeline))
        })
        obj.dataTables.forEach(table => mModel.getAllTables().push(DataStructs.DataTable.fromObject(table)))
    }

    /****
     * Exports
     */
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
    this.setCellBindingColor = setCellBindingColor;

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
}
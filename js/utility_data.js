let DataUtil = function () {
    function inferDataAndType(cellVal) {
        if (typeof (x) === 'number') {
            return { val: cellVal, type: DataTypes.NUM }
        } else if (isNumeric(String(cellVal))) {
            return { val: parseFloat("" + cellVal), type: DataTypes.NUM }
        } else {
            return { val: String(cellVal), type: DataTypes.TEXT }
        }
    }

    function isDate(val) {
        // this is too aggressive
        return !isNaN(Date.parse(val));
    }

    function isNumeric(val) {
        return isFloat(val) || isInt(val);
    }

    function isFloat(val) {
        var floatRegex = /^-?\d+(?:[.,]\d*?)?$/;
        if (!floatRegex.test(val))
            return false;

        val = parseFloat(val);
        if (isNaN(val))
            return false;
        return true;
    }

    function isInt(val) {
        var intRegex = /^-?\d+$/;
        if (!intRegex.test(val))
            return false;

        var intVal = parseInt(val, 10);
        return parseFloat(val) == intVal && !isNaN(intVal);
    }

    function getUniqueList(list, key = null) {
        return [...new Map(list.map(item => [key ? item[key] : item, item])).values()]
    }

    function AGreaterThanB(a, b, type) {
        if (type == DataTypes.NUM) {
            return a > b;
        } else if (type == DataTypes.TEXT) {
            return String(a) > String(b);
        } else { throw new Error("Cannot calculate greaterThan for type: " + type); }
    }

    function subtractAFromB(a, b, type) {
        if (type == DataTypes.NUM) {
            return b - a;
        } else { throw new Error("Cannot calculate subtract for type: " + type); }
    }

    function AEqualsB(a, b, type) {
        if (type == DataTypes.NUM) {
            // only check to 4 decimal places
            return Math.round(a * 10000) == Math.round(b * 10000);
        } else if (type == DataTypes.TEXT) {
            return a == b;
        } else { throw new Error("Cannot calculate equals for type: " + type); }
    }

    function incrementAByB(a, b, type) {
        if (type == DataTypes.NUM) {
            return a + b;
        } else { throw new Error("Cannot calculate increment by for type: " + type); }
    }

    function getFormattedDate(date) {
        if (!(date instanceof Date)) {
            let num = date;
            date = new Date(num);
            if (isNaN(date)) {
                console.error("Not a date!", num);
                return "";
            }
        }

        let year = date.getFullYear();
        let month = date.toLocaleString('en-US', { month: 'short' });
        let day = date.getDate();
        let hour = date.getHours();
        let min = date.getMinutes();
        let sec = date.getSeconds();

        day = (day < 10 ? "0" : "") + day;
        hour = (hour < 10 ? "0" : "") + hour;
        min = (min < 10 ? "0" : "") + min;
        sec = (sec < 10 ? "0" : "") + sec;

        return month + " " + day + ", " + year + " " + hour + ":" + min + ":" + sec;
    }

    function getColorBetween(color1, color2, percent) {
        let rgb1 = color1.match(/\w\w/g).map((c) => parseInt(c, 16));
        let rgb2 = color2.match(/\w\w/g).map((c) => parseInt(c, 16));

        if ((rgb1.length != 3 && rgb1.length != 4) ||
            (rgb2.length != 3 && rgb2.length != 4) ||
            rgb1.some(n => isNaN(n)) ||
            rgb2.some(n => isNaN(n))) {
            console.error("Invalid hex color!", color1, color2);
            return "#000000";
        }

        if (rgb1.length == 3) {
            rgb1.push(255)
        }

        if (rgb2.length == 3) {
            rgb2.push(255)
        }

        let avgRGB = []
        for (let i = 0; i < 4; i++) {
            avgRGB[i] = Math.round(rgb1[i] + ((rgb2[i] - rgb1[i]) * percent)).toString(16).padStart(2, '0');
        }
        return '#' + avgRGB.join("");
    }

    function filterTimePinByChangedPin(pins, changedPin, timeAttribute) {
        if (!timeAttribute || isNaN(changedPin[timeAttribute])) {
            console.error("Invalid pin or time attribute!", changedPin, timeAttribute);
            return pins;
        }

        let filtered = pins.filter(pin => {
            // clear the binding out of the array so we can read the new data
            if (pin.id == changedPin.id) return false;
            if (!pin[timeAttribute] || !changedPin[timeAttribute]) return true;

            // otherwise make sure time and bindings both increase in the same direction
            return (pin[timeAttribute] < changedPin[timeAttribute] && pin.linePercent < changedPin.linePercent) ||
                (pin[timeAttribute] > changedPin[timeAttribute] && pin.linePercent > changedPin.linePercent);
        });
        filtered.push(changedPin);
        filtered.sort((a, b) => a.linePercent - b.linePercent);
        return filtered;
    }

    function timelineStrokesChanged(timeline1, timeline2) {
        if (!timeline1) {
            if (!timeline2) {
                console.error("If they're both duds why are you asking?", timeline1, timeline2);
                return [];
            }

            // one timeline is a dud, they're all changes
            return timeline2.annotationStrokes.map(s => s.id);
        }

        if (!timeline2) {
            if (!timeline1) {
                console.error("If they're both duds why are you asking?", timeline1, timeline2);
                return [];
            }

            // one timeline is a dud, they're all changes
            return timeline1.annotationStrokes.map(s => s.id);
        }

        if (!PathMath.equalsPath(timeline1.points, timeline2.points)) {
            return DataUtil.getUniqueList(
                timeline1.annotationStrokes.map(s => s.id).concat(
                    timeline2.annotationStrokes.map(s => s.id)));
        }

        let pinChanged = timelinesPinsChanged(timeline1, timeline2);
        if (pinChanged) {
            return DataUtil.getUniqueList(
                timeline1.annotationStrokes.map(s => s.id).concat(
                    timeline2.annotationStrokes.map(s => s.id)));
        }

        let allIds = DataUtil.getUniqueList(
            timeline1.annotationStrokes.map(s => s.id).concat(
                timeline2.annotationStrokes.map(s => s.id)));

        let changedIds = allIds.filter(id => {
            let stroke1 = timeline1.annotationStrokes.find(s => s.id == id);
            let stroke2 = timeline2.annotationStrokes.find(s => s.id == id);
            // if either is missing this has changed.
            if (!stroke1 || !stroke2) return true;
            // if the path has changed it's changed.
            if (!stroke1.equals(stroke2)) return true;
            // no change
            return false;
        });
        return changedIds;
    }

    function timelineTextChanged(timeline1, textData1, timeline2, textData2) {
        if (!timeline1) {
            if (!timeline2) { console.error("If they're both duds why are you asking?", timeline1, timeline2); return []; }
            // one timeline is a dud, they're all changes
            return textData2.map(t => t.cellBinding.id);
        }

        if (!timeline2) {
            if (!timeline1) { console.error("If they're both duds why are you asking?", timeline1, timeline2); return []; }
            // one timeline is a dud, they're all changes
            return textData1.map(t => t.cellBinding.id);
        }

        let allIds = DataUtil.getUniqueList(
            textData1.map(t => t.cellBinding.id).concat(
                textData2.map(t => t.cellBinding.id)));

        if (!PathMath.equalsPath(timeline1.points, timeline2.points)) {
            return allIds;
        }

        let pinChanged = timelinesPinsChanged(timeline1, timeline2);
        if (pinChanged) {
            return allIds;
        }

        let changedIds = allIds.filter(id => {
            let text1 = textData1.find(t => t.cellBinding.id == id);
            let text2 = textData2.find(t => t.cellBinding.id == id);
            // if either is missing this has changed.
            if (!text1 || !text2) return true;
            if (!text1.equals(text2)) return true;
            // no change
            return false;
        });
        return changedIds;
    }

    function canvasTextChanged(textData1, textData2) {
        let allIds = DataUtil.getUniqueList(
            textData1.map(t => t.cellBinding.id).concat(
                textData2.map(t => t.cellBinding.id)));

        let changedIds = allIds.filter(id => {
            let text1 = textData1.find(t => t.cellBinding.id == id);
            let text2 = textData2.find(t => t.cellBinding.id == id);
            // if either is missing this has changed.
            if (!text1 || !text2) return true;
            if (!text1.equals(text2)) return true;
            // no change
            return false;
        });
        return changedIds;

    }

    function timelineDataPointsChanged(timelineId, model1, model2) {
        let timeline1 = model1.getAllTimelines().find(t => t.id == timelineId);
        let timeline2 = model2.getAllTimelines().find(t => t.id == timelineId);

        if (!timeline1) {
            if (!timeline2) { console.error("If they're both duds why are you asking?", timeline1, timeline2); return []; }
            // one timeline is a dud, they're all changes
            return timeline2.cellBindings.map(s => s.id);
        }

        if (!timeline2) {
            if (!timeline1) { console.error("If they're both duds why are you asking?", timeline1, timeline2); return []; }
            // one timeline is a dud, they're all changes
            return timeline1.cellBindings.map(s => s.id);
        }

        if (!PathMath.equalsPath(timeline1.points, timeline2.points)) {
            return DataUtil.getUniqueList(
                timeline1.cellBindings.map(s => s.id).concat(
                    timeline2.cellBindings.map(s => s.id)));
        }

        let pinChanged = timelinesPinsChanged(timeline1, timeline2);
        if (pinChanged) {
            return DataUtil.getUniqueList(
                timeline1.cellBindings.map(s => s.id).concat(
                    timeline2.cellBindings.map(s => s.id)));
        }

        let timelineData1 = model1.getCellBindingData(timelineId);
        let timelineData2 = model2.getCellBindingData(timelineId);
        let allIds = DataUtil.getUniqueList(
            timeline1.cellBindings.map(s => s.id).concat(
                timeline2.cellBindings.map(s => s.id)));

        let changedIds = allIds.filter(id => {
            let binding1 = timelineData1.find(b => b.cellBinding.id == id);
            let binding2 = timelineData2.find(b => b.cellBinding.id == id);
            // if either is missing this has changed.
            if (!binding1 || !binding2) return true;
            // if the path has changed it's changed.
            if (!binding1.equals(binding2)) return true;
            // no change
            return false;
        });
        return changedIds;
    }

    function timelinesPinsChanged(timeline1, timeline2) {
        return timeline1.timePins.length != timeline2.timePins.length ||
            timeline1.timePins.some(pin => {
                // check if at least one pin has changed.
                let oldPin = timeline2.timePins.find(p => p.id == pin.id);
                // pin set mismatch, that's a change.
                if (!oldPin) return true;
                // otherwise check if the line percent has changed.
                if (oldPin.linePercent != pin.linePercent) return true;
                return false;
            });
    }

    function svgToCanvas(svgElement, x, y, width, height, backgroundColor = null) {
        return new Promise((resolve, reject) => {
            let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
                .attr('width', width)
                .attr('height', height)
                .style("background-color", backgroundColor)
                // this is required for unknown reasons
                .attr("xmlns", "http://www.w3.org/2000/svg");

            exportSVG.append("g")
                .attr("transform", "translate(" + -x + "," + -y + ")")
                .append(function () { return svgElement; });

            let svgURL = new XMLSerializer().serializeToString(exportSVG.node());
            let image = new Image();
            image.onload = function () {
                let canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                let context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, width, height);
                resolve(canvas);
            }
            image.onerror = function () { reject("The image export failed. Chrome refuses to give further information. Sorry."); }
            image.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svgURL);
        })
    }

    async function vizToCanvas(vizLayer, backgroundColor) {
        let viz = vizLayer.clone(true);
        viz.attr('transform', 'translate(' + 0 + ',' + 0 + ')');
        viz.selectAll('g').each(function () {
            if (this.childElementCount == 0) {
                d3.select(this).remove();
            }
        });
        viz.select('#timeline-drawing-brush').remove();

        let { x, y, height, width } = viz.node().getBBox();
        x -= 10;
        y -= 10;
        height += 20;
        width += 20;

        let canvas = await svgToCanvas(viz.node(), x, y, width, height, backgroundColor);
        return canvas;
    }

    function getMaskedTimelines(eraserMask, model) {
        // check erase timelines
        let timelines = model.getAllTimelines();
        let segmentsData = timelines.map(timeline => {
            return {
                id: timeline.id,
                segments: PathMath.segmentPath(timeline.points, point => {
                    return eraserMask.isCovered(point) ? SEGMENT_LABELS.DELETED : SEGMENT_LABELS.UNAFFECTED;
                })
            }
        }).filter(segmentData => segmentData.segments.some(segment => segment.label == SEGMENT_LABELS.DELETED));

        return segmentsData;
    }

    function getMaskedStrokes(eraserMask, model) {
        let strokeCanvasPositionSet = [];

        let timelines = model.getAllTimelines();
        timelines.forEach(timeline => {
            let strokeData = model.getStrokeData(timeline.id);
            strokeCanvasPositionSet.push(...getStrokeCanvasPositions(timeline.points, strokeData))
        });
        strokeCanvasPositionSet.push(...getStrokeCanvasPositions(null, model.getCanvas().annotationStrokes));

        return fragmentStrokes(eraserMask, strokeCanvasPositionSet);
    }

    function fragmentStrokes(eraserMask, strokeCanvasPositionSet) {
        let returnable = [];

        strokeCanvasPositionSet.forEach((strokeCanvasPosition) => {
            let stroke = strokeCanvasPosition.stroke;
            let positions = strokeCanvasPosition.projectedPoints;
            let fragments = [];
            let currSet = [];
            stroke.points.forEach((point, index) => {
                if (eraserMask.isCovered(positions[index])) {
                    if (currSet.length >= 2) {
                        fragments.push(currSet);
                    }
                    currSet = [];
                } else {
                    // copy returns a regular stroke point. 
                    currSet.push(point.copy());
                }
            });

            if (currSet.length != stroke.points.length) {
                // we broke the stroke
                if (currSet.length >= 2) {
                    // push the last stroke
                    fragments.push(currSet);
                }

                returnable.push({ strokeData: stroke, fragments })
            }
        });

        return returnable;
    }

    function getMaskedDataPoints(eraserMask, model) {
        let maskedIds = [];

        let timelines = model.getAllTimelines();
        timelines.forEach(timeline => {
            let pointData = model.getCellBindingData(timeline.id).filter(cbd => cbd.dataCell.getType() == DataTypes.NUM);
            let positionData = getDataPointCanvasPositions(timeline, pointData);

            positionData.forEach(data => {
                if (eraserMask.isCovered({ x: data.x, y: data.y })) {
                    maskedIds.push(data.binding.cellBinding.id);
                }
            });
        });

        return maskedIds;
    }

    function getMaskedText(eraserMask, textBoundingBoxes) {
        let maskedIds = [];

        textBoundingBoxes.forEach(box => {
            let x1 = box.x;
            let y1 = box.y;
            let x2 = box.x + box.width;
            let y2 = box.y + box.height;
            let points = [
                { x: x1, y: y1 },
                { x: x1, y: y2 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: (x1 + x2) / 2, y: y1 },
                { x: (x1 + x2) / 2, y: y2 },
                { x: x1, y: (y1 + y2) / 2 },
                { x: x2, y: (y1 + y2) / 2 },
            ]
            let score = points.reduce((score, currPoint) => {
                if (eraserMask.isCovered(currPoint)) score++;
                return score;
            }, 0)

            if (score > 4) {
                maskedIds.push(box.cellBindingId);
            }
        });

        return maskedIds;
    }

    function getMaskedImages(eraserMask, model) {
        let maskedIds = [];

        let timelines = model.getAllTimelines();
        timelines.forEach(timeline => {
            let imageData = model.getImageBindingData(timeline.id);
            imageData.sort((a, b) => a.linePercent - b.linePercent);
            let percents = imageData.map(p => p.linePercent);
            let positions = PathMath.getPositionForPercents(timeline.points, percents);
            imageData.forEach((img, index) => {
                let pos = positions[index];
                let x1 = pos.x + img.imageBinding.offset.x;
                let x2 = pos.x + img.imageBinding.offset.x + img.imageBinding.width;
                let y1 = pos.y + img.imageBinding.offset.y;
                let y2 = pos.y + img.imageBinding.offset.y + img.imageBinding.height;

                let points = [
                    { x: x1, y: y1 },
                    { x: x1, y: y2 },
                    { x: x2, y: y1 },
                    { x: x2, y: y2 },
                    { x: (x1 + x2) / 2, y: y1 },
                    { x: (x1 + x2) / 2, y: y2 },
                    { x: x1, y: (y1 + y2) / 2 },
                    { x: x2, y: (y1 + y2) / 2 },
                ]
                let score = points.reduce((score, currPoint) => {
                    if (eraserMask.isCovered(currPoint)) score++;
                    return score;
                }, 0);

                if (score > 4) {
                    maskedIds.push(img.imageBinding.id);
                }
            });
        });

        let imageData = model.getCanvasImageBindings();
        imageData.forEach(img => {
            let x1 = img.imageBinding.offset.x;
            let x2 = img.imageBinding.offset.x + img.imageBinding.width;
            let y1 = img.imageBinding.offset.y;
            let y2 = img.imageBinding.offset.y + img.imageBinding.height;

            let points = [
                { x: x1, y: y1 },
                { x: x1, y: y2 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: (x1 + x2) / 2, y: y1 },
                { x: (x1 + x2) / 2, y: y2 },
                { x: x1, y: (y1 + y2) / 2 },
                { x: x2, y: (y1 + y2) / 2 },
            ]
            let score = points.reduce((score, currPoint) => {
                if (eraserMask.isCovered(currPoint)) score++;
                return score;
            }, 0);

            if (score > 4) {
                maskedIds.push(img.imageBinding.id);
            }
        });

        return maskedIds;
    }

    function getMaskedPins(eraserMask, model) {
        let maskedIds = [];

        let timelines = model.getAllTimelines();
        timelines.forEach(timeline => {
            timeline.timePins.sort((a, b) => a.linePercent - b.linePercent);
            let pinPositions = PathMath.getPositionForPercents(timeline.points, timeline.timePins.map(pin => pin.linePercent));
            timeline.timePins.forEach((pin, index) => {
                if (eraserMask.isCovered(pinPositions[index])) {
                    maskedIds.push(pin.id);
                }
            });
        });

        return maskedIds;
    }

    function getDataPointCanvasPositions(timeline, cellBindings) {
        cellBindings.sort((a, b) => a.linePercent - b.linePercent);
        let percents = cellBindings.map(b => b.linePercent);
        let dists = cellBindings.map(b => {
            let { val1, val2, dist1, dist2 } = b.axisBinding;
            if (b.axisBinding.style == DataDisplayStyles.AREA || b.axisBinding.style == DataDisplayStyles.STREAM) {
                val2 = Math.max(Math.abs(val1), Math.abs(val2));
                val1 = 0;
            }
            if (val1 == val2) { console.error("Invalid axis values: " + val1 + ", " + val2); val1 = 0; if (val1 == val2) val2 = 1; };
            let dist = (dist2 - dist1) * (b.dataCell.getValue() - val1) / (val2 - val1) + dist1;
            return dist;
        })

        let fixedNormal = null;
        if (cellBindings.length > 0 && cellBindings[0].axisBinding.alignment == DataDisplayAlignments.FIXED) {
            fixedNormal = PathMath.getNormalForPercent(timeline.points, cellBindings[0].axisBinding.linePercent)
        }

        let positions = PathMath.getPositionsForPercentsAndDists(timeline.points, percents, dists, fixedNormal);
        return cellBindings.map((bindingData, index) => {
            return {
                binding: bindingData,
                dist: dists[index],
                x: positions[index].x,
                y: positions[index].y,
            }
        });
    }

    function getStrokeCanvasPositions(points, strokeData) {
        if (!points) {
            return strokeData.map(stroke => {
                return {
                    stroke,
                    projectedPoints: stroke.points.map(p => {
                        return {
                            x: p.xValue,
                            y: p.lineDist,
                        }
                    })
                }
            })
        } else {
            strokeData.forEach(s => s.points.forEach((p, index) => {
                p.sId = s.id
                p.index = index;
            }));
            let pointArray = strokeData.map(s => s.points).flat().sort((a, b) => a.linePercent - b.linePercent)
            let positions = PathMath.getPositionsForPercentsAndDists(
                points, pointArray.map(p => p.linePercent), pointArray.map(p => p.lineDist));

            let returnData = {};
            strokeData.forEach(sd => {
                returnData[sd.id] = { stroke: sd, projectedPoints: [] };
            })

            pointArray.forEach((p, index) => {
                returnData[p.sId].projectedPoints[p.index] = positions[index];
            });

            return Object.values(returnData);
        }
    }

    function getImageCanvasPositions(boundData) {
        let returnData = []

        let timelines = DataUtil.getUniqueList(boundData.filter(b => !b.isCanvasBinding).map(b => b.timeline), 'id');
        timelines.forEach(timeline => {
            let timelineBindingData = boundData.filter(b => b.timeline && b.timeline.id == timeline.id);
            timelineBindingData.sort((a, b) => a.linePercent - b.linePercent);

            let positions = PathMath.getPositionForPercents(
                timeline.points,
                timelineBindingData.map(binding => binding.linePercent != NO_LINE_PERCENT ? binding.linePercent : 0))

            timelineBindingData.forEach((binding, index) => {
                returnData.push({
                    x: positions[index].x + binding.imageBinding.offset.x,
                    y: positions[index].y + binding.imageBinding.offset.y,
                    pos: positions[index],
                    binding,
                })
            });
        })

        boundData.filter(b => b.isCanvasBinding).forEach(binding => {
            returnData.push({
                x: binding.imageBinding.offset.x,
                y: binding.imageBinding.offset.y,
                pos: { x: 0, y: 0 },
                binding
            })
        });

        return returnData;
    }

    function getHashCode(string) {
        var hash = 0,
            i, chr;
        if (string.length === 0) return hash;
        for (i = 0; i < string.length; i++) {
            chr = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    function layoutText(textCellBindings, boundingBoxes) {
        textCellBindings.forEach(cellBinding => {
            let textBoundingBox = boundingBoxes.find(b => b.cellBindingId == cellBinding.id);
            while (boundingBoxes.some(box => {
                if (box.cellBindingId == cellBinding.id) return false;
                return overlap(box, textBoundingBox);
            })) {
                cellBinding.offset.x += 2;
                cellBinding.offset.y -= 10;
                textBoundingBox.x += 2;
                textBoundingBox.y -= 10;
            }
        })

        return textCellBindings.map(b => { return { cellBindingId: b.id, offset: b.offset } })
    }

    function layoutBoxes(idsToLayout, boundingBoxes, offset) {
        idsToLayout.forEach(id => {
            let boundingBox = boundingBoxes.find(b => b.id == id);
            while (boundingBoxes.some(box => (box.id == id) ? false : overlap(box, boundingBox))) {
                boundingBox.x += offset.x;
                boundingBox.y += offset.y;
            }
        })

        return boundingBoxes;
    }

    function overlap(bb1, bb2) {
        let overlap1D = (min1, max1, min2, max2) => max1 >= min2 && max2 >= min1;
        return overlap1D(bb1.x, bb1.x + bb1.width, bb2.x, bb2.x + bb2.width) &&
            overlap1D(bb1.y, bb1.y + bb1.height, bb2.y, bb2.y + bb2.height);
    }

    return {
        inferDataAndType,
        getUniqueList,
        isDate,
        isNumeric,

        AGreaterThanB,
        subtractAFromB,
        AEqualsB,
        incrementAByB,

        getFormattedDate,

        getColorBetween,

        filterTimePinByChangedPin,
        timelineStrokesChanged,
        timelineTextChanged,
        canvasTextChanged,
        timelineDataPointsChanged,

        svgToCanvas,
        vizToCanvas,

        getMaskedDataPoints,
        getMaskedImages,
        getMaskedPins,
        getMaskedStrokes,
        getMaskedText,
        getMaskedTimelines,

        getDataPointCanvasPositions,
        getStrokeCanvasPositions,
        getImageCanvasPositions,

        fragmentStrokes,
        getHashCode,

        layoutText,
        layoutBoxes,
    }
}();

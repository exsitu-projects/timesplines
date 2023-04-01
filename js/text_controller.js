function TextController(vizLayer, overlayLayer, interactionLayer) {
    const TEXT_WIDTH = 200;
    const LINE_PADDING = 2;

    let mActive = false;

    let mModel = new DataStructs.DataModel();
    let mTextData = {};

    let mDragging = false;
    let mDragStartPos = null;
    let mDragBinding = null;

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };
    let mDoubleClickCallback = (cellId, text, x, y, height, width) => { }

    let mDisplayGroup = vizLayer.append('g')
        .attr("id", 'annotation-display-g');
    let mInteractionGroup = interactionLayer.append('g')
        .attr("id", 'annotation-interaction-g');

    function updateModel(model) {
        let oldModel = mModel;
        mModel = model;

        let oldTextData = mTextData;
        mTextData = {}

        let text = mModel.getAllCellBindingData().filter(b => b.dataCell.getType() == DataTypes.TEXT);
        let oldText = oldModel.getAllCellBindingData().filter(b => b.dataCell.getType() == DataTypes.TEXT);

        mModel.getAllTimelines().forEach(timeline => {
            let oldtimeline = oldModel.getAllTimelines().find(t => t.id == timeline.id);
            let timelineTextBindings = text.filter(t => t.timeline.id == timeline.id);
            let changedTextIds = DataUtil.timelineTextChanged(timeline,
                timelineTextBindings,
                oldtimeline,
                oldText.filter(t => t.timeline.id == timeline.id));
            let cachedData = timelineTextBindings.filter(binding => !changedTextIds.includes(binding.cellBinding.id));
            cachedData.forEach(binding => {
                mTextData[binding.cellBinding.id] = oldTextData[binding.cellBinding.id];
            });
            let recalcData = timelineTextBindings.filter(binding => changedTextIds.includes(binding.cellBinding.id));
            let data = createTimelineTextData(recalcData, timeline);
            data.forEach(d => mTextData[d.binding.cellBinding.id] = d);
        });

        let canvasTextBindings = mModel.getCanvasBindingData().filter(b => b.dataCell.getType() == DataTypes.TEXT);
        let changedTextIds = DataUtil.canvasTextChanged(canvasTextBindings,
            oldModel.getCanvasBindingData().filter(b => b.dataCell.getType() == DataTypes.TEXT));
        canvasTextBindings.forEach(binding => {
            if (changedTextIds.includes(binding.cellBinding.id)) {
                mTextData[binding.cellBinding.id] = createCanvasData(binding);
            } else {
                mTextData[binding.cellBinding.id] = oldTextData[binding.cellBinding.id];
            }
        })

        drawText();
        setupInteractionTargets();
    }

    function createTimelineTextData(bindingData, timeline) {
        bindingData.sort((a, b) => a.linePercent - b.linePercent);
        let positions = PathMath.getPositionForPercents(
            timeline.points,
            bindingData.map(binding => binding.linePercent != NO_LINE_PERCENT ? binding.linePercent : 0))
        let returnable = [];
        bindingData.forEach((binding, index) => {
            let options = {
                font: binding.cellBinding.font,
                fontWeight: binding.cellBinding.fontWeight,
                fontItalics: binding.cellBinding.fontItalics,
                fontSize: binding.cellBinding.fontSize,
            }
            let x = positions[index].x + binding.cellBinding.offset.x;
            let y = positions[index].y + binding.cellBinding.offset.y;
            let spans = layoutText(binding.dataCell.getValue(), TEXT_WIDTH, options)
            spans.forEach(spanData => {
                spanData.x = positions[index].x + binding.cellBinding.offset.x;
                spanData.y = positions[index].y + binding.cellBinding.offset.y + spanData.lineNumber * (spanData.lineHeight + LINE_PADDING);
            })
            let boundingBox = {
                x, y,
                width: Math.max(...spans.map(s => s.lineWidth)),
                height: Math.max(...spans.map(s => s.lineNumber * (s.lineHeight + LINE_PADDING)))
            }
            returnable.push({
                x, y,
                text: binding.dataCell.getValue(),
                spans,
                origin: positions[index],
                hasTime: binding.timeCell.isValid(),
                timelineId: timeline.id,
                lineData: getLineData(positions[index], boundingBox),
                boundingBox,
                binding
            });
        })
        return returnable;
    }

    function createCanvasData(binding) {
        let options = {
            font: binding.cellBinding.font,
            fontWeight: binding.cellBinding.fontWeight,
            fontItalics: binding.cellBinding.fontItalics,
            fontSize: binding.cellBinding.fontSize,
        }
        let x = binding.cellBinding.offset.x;
        let y = binding.cellBinding.offset.y;
        let spans = layoutText(binding.dataCell.getValue(), TEXT_WIDTH, options)
        spans.forEach(spanData => {
            spanData.x = binding.cellBinding.offset.x;
            spanData.y = binding.cellBinding.offset.y + spanData.lineNumber * (spanData.lineHeight + LINE_PADDING);
            spanData.bindingId = binding.cellBinding.id;
        })
        let boundingBox = {
            x, y,
            width: Math.max(...spans.map(s => s.lineWidth)),
            height: Math.max(...spans.map(s => s.lineNumber * (s.lineHeight + LINE_PADDING)))
        }
        return {
            x, y,
            text: binding.dataCell.getValue(),
            spans,
            timelineId: "is-canvas-text",
            boundingBox,
            binding,
        };
    }

    function drawText() {
        let selection = mDisplayGroup.selectAll('.annotation-text')
            .data(Object.values(mTextData));
        selection.exit().remove();
        selection.enter().append("text")
            .classed("annotation-text", true)

        mDisplayGroup.selectAll('.annotation-text')
            .attr("timeline-id", function (d) { return d.timelineId; })
            .attr("font-family", function (d) { return d.binding.cellBinding.font; })
            .attr("font-weight", function (d) { return d.binding.cellBinding.fontWeight ? 700 : 400; })
            .style("font-style", function (d) { return d.binding.cellBinding.fontItalics ? "italic" : null; })
            .style("font-size", function (d) { return d.binding.cellBinding.fontSize })
            .style("fill", function (d) { return d.binding.cellBinding.color ? d.binding.cellBinding.color : "black" })
            .attr("binding-id", function (d) { return d.binding.cellBinding.id; })
            .attr('opacity', 1);

        let spansSelection = mDisplayGroup.selectAll('.annotation-text')
            .selectAll("tspan").data(d => d.spans);
        spansSelection.exit().remove();
        spansSelection.enter().append("tspan");
        mDisplayGroup.selectAll('.annotation-text').selectAll("tspan")
            .text(d => d.lineText)
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("binding-id", function (d) { return d.cellBindingId; });

        let horizontalLines = mDisplayGroup.selectAll('.horizontal-line')
            .data(Object.values(mTextData).filter(d => d.lineData));
        horizontalLines.exit().remove();
        horizontalLines.enter()
            .append('line')
            .classed("horizontal-line", true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black');
        mDisplayGroup.selectAll('.horizontal-line')
            .attr("timeline-id", function (d) { return d.timelineId })
            .attr('x1', function (d) { return d.lineData.hx1 })
            .attr('y1', function (d) { return d.lineData.y })
            .attr('x2', function (d) { return d.lineData.hx2 })
            .attr('y2', function (d) { return d.lineData.y })
            .attr("binding-id", function (d) { return d.binding.cellBinding.id; })
            .attr('opacity', 0.6);


        let connectingLines = mDisplayGroup.selectAll('.connecting-line')
            .data(Object.values(mTextData).filter(d => d.lineData));
        connectingLines.exit().remove();
        connectingLines.enter()
            .append('line')
            .classed('connecting-line', true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
        mDisplayGroup.selectAll('.connecting-line')
            .attr("timeline-id", function (d) { return d.timelineId })
            .attr('x1', function (d) { return d.origin.x })
            .attr('y1', function (d) { return d.origin.y })
            .attr('x2', function (d) { return d.lineData.lx })
            .attr('y2', function (d) { return d.lineData.y })
            .style("stroke-dasharray", d => d.hasTime ? null : "3, 3")
            .attr("binding-id", function (d) { return d.binding.cellBinding.id; })
            .attr('opacity', 0.6);
    }

    function getLineData(origin, boundingBox) {
        let x1 = boundingBox.x;
        let x2 = boundingBox.x + boundingBox.width;
        let y1 = boundingBox.y;
        let y2 = boundingBox.y + boundingBox.height;

        let closeY, closeX;
        if (Math.abs(origin.y - y1) < Math.abs(origin.y - y2)) {
            // this *2 is dumb, but whatever, it works.
            closeY = y1 + LINE_PADDING * 2;
        } else {
            closeY = y2 + LINE_PADDING * 2;
        }

        if (Math.abs(origin.x - x1) < Math.abs(origin.x - x2)) {
            closeX = x1 - LINE_PADDING;
        } else {
            closeX = x2 + LINE_PADDING;
        }

        return {
            // horizontal line xs
            hx1: x1 - LINE_PADDING,
            hx2: x2 + LINE_PADDING,
            // the close x
            lx: closeX,
            // line and horizontal line use the same y
            y: closeY,
        };
    }

    function redrawText(cellBindingData) {
        mDisplayGroup.select()
        let textData;
        if (cellBindingData.isCanvasBinding) {
            textData = createCanvasData(cellBindingData);
        } else {
            textData = createTimelineTextData([cellBindingData], cellBindingData.timeline)[0];
        }

        mDisplayGroup.selectAll('.annotation-text[binding-id="' + cellBindingData.cellBinding.id + '"]')
            .data([textData])
            .attr("x", function (d) { return d.x; })
            .attr("y", function (d) { return d.y; })
            .attr("font-family", function (d) { return d.binding.cellBinding.font; })
            .attr("font-weight", function (d) { return d.binding.cellBinding.fontWeight ? 700 : 400; })
            .style("font-style", function (d) { return d.binding.cellBinding.fontItalics ? "italic" : null; })
            .style("font-size", function (d) { return d.binding.cellBinding.fontSize })
            .attr('opacity', 1);

        let spansSelection = mDisplayGroup.selectAll('.annotation-text[binding-id="' + cellBindingData.cellBinding.id + '"]')
            .selectAll("tspan").data(d => d.spans);
        spansSelection.exit().remove();
        spansSelection.enter().append("tspan");
        mDisplayGroup.selectAll('.annotation-text').selectAll("tspan")
            .text(d => d.lineText)
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("binding-id", function (d) { return d.cellBindingId; });

        mDisplayGroup.selectAll('.horizontal-line[binding-id="' + cellBindingData.cellBinding.id + '"]')
            .data([textData])
            .attr('x1', function (d) { return d.lineData.hx1 })
            .attr('y1', function (d) { return d.lineData.y })
            .attr('x2', function (d) { return d.lineData.hx2 })
            .attr('y2', function (d) { return d.lineData.y });

        mDisplayGroup.selectAll('.connecting-line[binding-id="' + cellBindingData.cellBinding.id + '"]')
            .data([textData])
            .attr('x1', function (d) { return d.origin.x })
            .attr('y1', function (d) { return d.origin.y })
            .attr('x2', function (d) { return d.lineData.lx })
            .attr('y2', function (d) { return d.lineData.y })
            .style("stroke-dasharray", d => d.hasTime ? null : "3, 3")
    }

    function fadeTimelineText(timelineId) {
        mDisplayGroup.selectAll('[timeline-id="' + timelineId + '"]')
            .attr('opacity', 0.2);

    }

    function setupInteractionTargets() {
        let interactionTargets = mInteractionGroup.selectAll('.text-interaction-target')
            .data(Object.values(mTextData));
        interactionTargets.exit().remove();
        interactionTargets.enter()
            .append('rect')
            .classed('text-interaction-target', true)
            .attr('timeline-id', d => d.timelineId)
            .attr('fill', 'white')
            .attr('opacity', 0)
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragStartPos = mDragStartCallback(d.binding.copy(), e);
                    mDragging = true;
                    mDragBinding = d.binding;
                }
            })
            .on('dblclick', function (e, d) {
                mDoubleClickCallback(d.binding.dataCell.id, d.text, d.boundingBox.x, d.boundingBox.y, d.boundingBox.height, d.boundingBox.width);
            })
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    mPointerEnterCallback(e, d.binding);
                    FilterUtil.applyShadowFilter(mDisplayGroup
                        .selectAll('[binding-id="' + d.binding.cellBinding.id + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    mPointerOutCallback(e, d.binding);
                    FilterUtil.removeShadowFilter(mDisplayGroup
                        .selectAll('[binding-id="' + d.binding.cellBinding.id + '"]'));
                }
            });

        mInteractionGroup.selectAll('.text-interaction-target')
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("height", d => d.boundingBox.height)
            .attr("width", d => d.boundingBox.width);
    }

    function onPointerMove(coords) {
        if (mDragging) {
            mDragCallback(mDragBinding.copy(), mDragStartPos, coords);
        }
    }

    function onPointerUp(coords) {
        if (mDragging) {
            mDragging = false;
            mDragEndCallback(mDragBinding.copy(), mDragStartPos, coords);

            mDragStartPos = null;
            mDragBinding = null;
        }
    }

    function layoutText(text, width, options) {
        let returnable = [];
        let words = text.split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 1;

        while (word = words.pop()) {
            if (textSize(word, options).width > width) {
                for (let i = 0; i < word.length; i++) {
                    if (textSize(word.substring(0, i), options) > width) {
                        temp = word.substring(0, i - 1);
                        words.push(word.substring(i - 1));
                        word = temp;
                        break;
                    }
                }
            }

            line.push(word);
            let size = textSize(line.join(" "), options);
            if (size.width > width) {
                line.pop();
                returnable.push({ lineText: line.join(" "), lineNumber, lineHeight: size.height, lineWidth: size.width })
                line = [word];
                lineNumber++;
            }
        }

        let size = textSize(line.join(" "), options);
        returnable.push({ lineText: line.join(" "), lineNumber, lineHeight: size.height, lineWidth: size.width });
        return returnable;
    }

    function textSize(text, options) {
        let container = d3.select('body').append('svg');
        container.append('text')
            .text(text)
            .attr("font-family", options.font)
            .attr("font-weight", options.fontWeight ? 700 : 400)
            .style("font-style", options.fontItalics ? "italic" : null)
            .style("font-size", options.fontSize);
        var size = container.node().getBBox();
        container.remove();
        return { width: size.width, height: size.height };
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mInteractionGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mInteractionGroup.style('visibility', "hidden");
        }
    }

    this.updateModel = updateModel;
    this.redrawText = redrawText;
    this.fadeTimelineText = fadeTimelineText;
    this.setActive = setActive;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;
    this.setDoubleClickCallback = (callback) => mDoubleClickCallback = callback;
    this.getTextBoundingBoxes = () => Object.values(mTextData).map(d => Object.assign(d.boundingBox, { cellBindingId: d.binding.cellBinding.id }));

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
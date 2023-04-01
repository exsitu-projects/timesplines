function TimePinController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;

    let mLinePoints = {};
    let mBindings = {};

    let mDragging = false;
    let mDraggingBinding = null;

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };

    let mPinTickGroup = vizLayer.append('g')
        .attr("id", 'tick-g');

    let mPinTickTargetGroup = interactionLayer.append('g')
        .attr("id", 'tick-target-g')
        .style("visibility", "hidden");

    function updateModel(model) {
        mLinePoints = {};
        mBindings = {};

        mPinTickGroup.selectAll('*').remove();
        mPinTickTargetGroup.selectAll('*').remove();

        model.getAllTimelines().forEach(timeline => {
            mLinePoints[timeline.id] = timeline.points;
            mBindings[timeline.id] = timeline.timePins;
            drawPinTicks(timeline, timeline.timePins);
        });
    }

    function drawPinTicks(timeline, timePins) {
        timePins.sort((a, b) => a.linePercent - b.linePercent)

        let tickData = [];
        let tickTargetData = [];

        timePins.forEach(pin => {
            let position = PathMath.getPositionForPercent(timeline.points, pin.linePercent);
            let degrees = MathUtil.vectorToRotation(
                PathMath.getNormalForPercent(timeline.points, pin.linePercent));

            tickData.push({ position, degrees, pin });
            tickTargetData.push({ position, degrees, pin, timelineId: timeline.id });
        });


        const pinTickWidth = 6;
        const pinTickLength = 10
        const pinTickTargetPadding = 10;

        let ticks = mPinTickGroup.selectAll('.pin-tick[timeline-id="' + timeline.id + '"]').data(tickData);
        ticks.exit().remove();
        ticks.enter().append('g')
            .classed('pin-tick', true)
            .attr("timeline-id", timeline.id)
            .append("line")
            .style("stroke", "black")
            .style("stroke-width", pinTickWidth);
        mPinTickGroup.selectAll('.pin-tick[timeline-id="' + timeline.id + '"]').select("line")
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + pinTickLength / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - pinTickLength / 2)
            .attr('pin-id', (d) => d.pin.id);

        let targets = mPinTickTargetGroup.selectAll('.pin-tick-target[timeline-id="' + timeline.id + '"]')
            .data(tickTargetData);
        targets.exit().remove();
        targets.enter().append('line')
            .classed('pin-tick-target', true)
            .attr("timeline-id", timeline.id)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')
            .on('pointerdown', (event, d) => {
                if (mActive) {
                    mDragging = true;
                    mDraggingBinding = d.pin;
                    mDragStartCallback(event, d.pin);
                }
            })
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    mPointerEnterCallback(e, d.pin);
                    FilterUtil.applyShadowFilter(mPinTickGroup
                        .selectAll('[pin-id="' + d.pin.id + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    mPointerOutCallback(e, d.pin);
                    FilterUtil.removeShadowFilter(mPinTickGroup
                        .selectAll('[pin-id="' + d.pin.id + '"]'));
                }
            })

        mPinTickTargetGroup.selectAll('.pin-tick-target[timeline-id="' + timeline.id + '"]')
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", pinTickTargetPadding + pinTickWidth)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + pinTickTargetPadding + pinTickLength / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - pinTickTargetPadding + pinTickLength / 2);
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            mDragCallback(coords, mDraggingBinding);
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            mDragging = false;
            mDragEndCallback(coords, mDraggingBinding);

            mDraggingBinding = null;
        }
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mPinTickTargetGroup.style("visibility", "");
        } else if (!active && mActive) {
            mActive = false;
            mPinTickTargetGroup.style("visibility", "hidden");
        }
    };

    this.updateModel = updateModel;
    this.drawPinTicks = drawPinTicks;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}


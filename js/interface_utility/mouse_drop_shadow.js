function MouseDropShadow(parent) {
    let shadow = parent.append('g')
        .attr('id', 'mouse-drop-shadow');

    shadow.append('circle')
        .attr('id', 'drop-position')
        .attr('fill', 'grey')
        .attr('r', 3.5)
        .attr('opacity', 0.5);
    shadow.append('line')
        .attr('id', 'drop-line')
        .attr('stroke-width', 1.5)
        .attr('stroke', 'grey')
        .attr('opacity', 0.5);

    this.show = function (dropCoords, mouseCoords) {
        shadow.select('#drop-position')
            .attr('cx', dropCoords.x)
            .attr('cy', dropCoords.y)
        shadow.select('#drop-line')
            .attr('x1', dropCoords.x)
            .attr('y1', dropCoords.y)
            .attr('x2', mouseCoords.x)
            .attr('y2', mouseCoords.y)
        shadow.style('visibility', null);
    }
    this.hide = function () { shadow.style('visibility', 'hidden'); };
    // start hidden
    this.hide();
}

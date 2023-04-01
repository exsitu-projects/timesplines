function CanvasMask(canvas, x, y, width, height) {
    let mX = x;
    let mY = y;
    let mWidth = width;
    let mHeight = height;
    let mContext = canvas.getContext("2d", { willReadFrequently: true });

    this.isCovered = function (coords) {
        if (!coords || !DataUtil.isNumeric(coords.x) || !DataUtil.isNumeric(coords.y)) {
            console.error("Invalid mask coords!", coords);
            return false;
        }

        if (coords.x < mX || coords.y < mY || coords.x > mX + mWidth || coords.y > mY + mHeight) return false;
        return mContext.getImageData(Math.round(coords.x - mX), Math.round(coords.y - mY), 1, 1).data[3] > 0;
    }

    this.getBoundingBox = () => { return { x: mX, y: mY, width: mWidth, height: mHeight } }
}
const TAIL_LENGTH = 50;

// taking an int here as it might do wierd things but is less likely to cause crashes. 
const NO_LINE_PERCENT = -1;

const Mode = {
    NONE: 'noneMode',
    SELECTION: 'selection',
    LINE_DRAWING: 'drawing',
    LINE_DRAWING_EYEDROPPER: 'drawingEyedropper',
    ERASER: 'eraser',
    ERASER_TIMELINE: 'eraserTimeline',
    ERASER_STROKE: 'eraserStroke',
    ERASER_POINT: 'eraserPoint',
    ERASER_TEXT: 'eraserText',
    ERASER_PIN: 'eraserPin',
    ERASER_IMAGE: 'eraserImage',
    DEFORM: 'deform',
    SMOOTH: 'smooth',
    SCISSORS: 'scissors',
    TEXT: 'text',
    IMAGE: 'image',
    IMAGE_LINK: 'imageLink',
    PIN: 'pin',
    LENS: 'lens',
    COLOR_BRUSH: 'colorBrush',
    COLOR_BRUSH_EYEDROPPER: 'colorBrushEyedropper',
    COLOR_BUCKET: 'bucket',
    COLOR_BUCKET_EYEDROPPER: 'bucketEyedropper',
    PAN: 'pan',
    LINK: 'link',
}

const DataTypes = {
    TEXT: 'text',
    NUM: 'num',
    UNSPECIFIED: 'unspecified'
}

const Fonts = [
    'Arial, sans-serif',
    'OCR A Std, monospace',
    'Brush Script MT, Brush Script Std, cursive',
    // this should be at the bottom so when you toggle through 
    // the first time the text returns to this as the last item
    'Times, Times New Roman, serif'
]

const DataDisplayStyles = {
    POINTS: 'points',
    LINE: 'line',
    AREA: 'area',
    STREAM: 'stream'
}

const DataDisplayAlignments = {
    DYNAMIC: 'dynamic',
    FIXED: 'fixed'
}

const SEGMENT_LABELS = {
    UNAFFECTED: 'unaffected',
    DELETED: 'deleted',
    CHANGED: 'changed'
}

const TableChange = {
    REORDER_ROWS: 'reorderRows',
    REORDER_COLUMNS: 'reorderColumns',
    DELETE_ROWS: 'deleteRows',
    DELETE_COLUMNS: 'deleteColumns',
    CREATE_ROWS: 'createRows',
    CREATE_COLUMNS: 'createColumns',
    UPDATE_CELLS: 'updateCells',
}

const LineStyle = {
    STYLE_OPACITY: 'opacity',
    STYLE_DASHED: 'dashed',
}

const LogEvent = {
    MODE_CHANGE: 0,
    UNDO: 1,
    REDO: 2,
    TEXT_EDIT: 3,
    DELETE: 4,
    WHEEL: 5,
    TOGGLE_DRAWER: 6,
    UPLOAD_CSV: 7,
    ADD_SPREADSHEET: 8,
    UPLOAD_MENU: 9,
    WORKSPACE_OPENED: 10,
    JSON_UPLOADED: 11,
    TOOLTIP: 12,
    DOWNLOAD_MENU: 13,
    WRITE_WORKSPACE: 14,
    WRITE_SVG: 15,
    WRITE_JSON: 16,
    WRITE_PNG: 17,
    LINE_STYLE_TOGGLE: 18,
    TOGGLE_COLOR_PICKER: 19,
    GROW_COLOR_BRUSH: 20,
    SHRINK_COLOR_BRUSH: 21,
    POINTER_DOWN: 22,
    POINTER_UP: 23,
    VERSION: 24,
}

class ModelStateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ModelStateError';
    }
}

class DataTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DataTypeError';
    }
}
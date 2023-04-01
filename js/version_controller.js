function VersionController() {
    // someday this will control the version from a workspace version folder, it's just 
    // a bit too complicated for right now. 

    let mUndoStack = [];
    let mRedoStack = [];
    let mWorkspace;

    function pushVersion(versionObj) {
        // the top of the undo stack is the current object
        mUndoStack.push(versionObj);
        mRedoStack = [];
        // TODO: Figure out what to do about async
        if (mWorkspace) mWorkspace.writeVersion(JSON.parse(JSON.stringify(versionObj)));
    }

    function doUndo() {
        if (mUndoStack.length > 1) {
            mRedoStack.push(mUndoStack.pop());
            return mUndoStack[mUndoStack.length - 1];
        } else {
            return null;
        }
    }

    function doRedo() {
        if (mRedoStack.length > 0) {
            let versionObj = mRedoStack.pop();
            mUndoStack.push(versionObj)
            return versionObj;
        } else {
            return null;
        }
    }

    function reset() {
        mUndoStack = [];
        mRedoStack = [];
        mWorkspace = null;
    }

    function setWorkspace(workspace) {
        mWorkspace = workspace;
    }

    this.pushVersion = pushVersion;
    this.doUndo = doUndo;
    this.doRedo = doRedo;
    this.reset = reset;
    this.setWorkspace = setWorkspace;
}
let FileHandler = function () {
    async function getCSVDataFile() {
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return Papa.parse(contents);
    }

    async function getImageFile() {
        let fileHandle = await window.showOpenFilePicker({
            types: [{ description: 'Images', accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg'] } },],
            multiple: false
        });
        let file = await fileHandle[0].getFile();
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onloadend = function () {
                var image = new Image();
                image.onload = function () {
                    resolve({ imageData: reader.result, width: this.width, height: this.height })
                };
                image.onerror = reject;
                image.src = reader.result;
            }
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function downloadJSON(obj) {
        let blob = new Blob([JSON.stringify(obj)], { type: 'text/plain' });
        downloadFile(blob, 'timeALine_viz.json');
    }

    async function downloadPNG(canvas) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        downloadFile(blob, 'timeALine_viz.png');
    }

    function downloadSVG(svgElement) {
        let svgURL = new XMLSerializer().serializeToString(svgElement);
        var blob = new Blob([svgURL], { type: 'text/plain' });
        downloadFile(blob, 'timeALine_viz.svg');
    }

    function downloadFile(blob, name) {
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        // delete the internal blob reference to clear memory
        URL.revokeObjectURL(link.href);
    }

    async function getJSONModel() {
        // TODO: Validate. 
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return JSON.parse(contents);
    }

    async function getWorkspace(create) {
        let directoryHandle = await window.showDirectoryPicker();
        let workspace = new WorkspaceController(directoryHandle);
        await workspace.init(create);
        return workspace;
    }

    return {
        getCSVDataFile,
        getImageFile,
        downloadJSON,
        downloadPNG,
        downloadSVG,
        getJSONModel,
        getWorkspace,
    }
}();
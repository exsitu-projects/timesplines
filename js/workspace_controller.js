function WorkspaceController(directoryHandle) {
    let mHandle = directoryHandle;
    let mVersionCount = 0;
    let mInitialized = false;
    let mSavedImagesHashes = [];

    const SETTINGS_FILE = "workspaceData.json";

    async function init(create) {
        if (create) {
            for await (let f of mHandle.values()) {
                throw new Error("Folder not empty, this is here: " + f.name + ". Empty folder required for new workspace");
            }

            await storeSettings({ workspaceVersion: 1, });
        } else {
            let settings;
            try {
                let settingsFileHandle = await mHandle.getFileHandle(SETTINGS_FILE);
                let file = await settingsFileHandle.getFile();
                let contents = await file.text();
                settings = JSON.parse(contents);
            } catch (e) {
                if (e.message.includes('file or directory could not be found')) {
                    // either this isn't a workspace folder or it's an old one
                    try {
                        await mHandle.getDirectoryHandle("version");
                        // if there's a version folder then it's an old workspace
                        settings = { workspaceVersion: 0 };
                    } catch (e2) {
                        throw new Error("Malformatted workspace! Unable to open version folder: " + e2.message);
                    }
                } else {
                    throw new Error("Malformatted workspace! Error checking settings: " + e.message);
                }
            }

            await updateWorkspaceVersion(settings);
        }

        let versionFolder = await mHandle.getDirectoryHandle("version", { create: true });
        for await (f of versionFolder.values()) {
            let num = parseInt(f.name.split(".")[0]);
            if (DataUtil.isNumeric(num)) {
                mVersionCount = Math.max(num + 1, mVersionCount);
            }
        }

        let imageFolder = await mHandle.getDirectoryHandle("images", { create: true });
        for await (f of imageFolder.values()) {
            let hash = parseInt(f.name.split(".")[0]);
            mSavedImagesHashes.push(hash);
        }

        mInitialized = true;
    }

    async function writePNG(canvas, fileName) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        let name = fileName + ".png";
        let traceFolder = await mHandle.getDirectoryHandle("trace", { create: true });
        let pngsFolder = await traceFolder.getDirectoryHandle("pngs", { create: true });
        let fileHandle = await pngsFolder.getFileHandle(name, { create: true });
        let stream = await fileHandle.createWritable();
        await stream.write(blob);
        await stream.close();
    }

    async function readPNGSmall(fileName, height = null, width = null, label = null) {
        let name = fileName + ".png";
        let traceFolder = await mHandle.getDirectoryHandle("trace", { create: true });
        let pngsFolder = await traceFolder.getDirectoryHandle("pngs", { create: true });
        let fileHandle = await pngsFolder.getFileHandle(name);
        let file = await fileHandle.getFile();
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onloadend = function () {
                var image = new Image();
                image.onload = function () {
                    if (width && height) {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        canvas.width = width * this.width / (Math.max(this.width, this.height));
                        canvas.height = height * this.height / (Math.max(this.width, this.height));
                        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                        if (label) {
                            ctx.fillStyle = "black";
                            ctx.font = "12px Arial";
                            ctx.fillText(label, 5, 17);
                        }
                        resolve({ imageData: canvas.toDataURL(), width: canvas.width, height: canvas.height })
                    } else {
                        resolve({ imageData: reader.result, width: this.width, height: this.height })
                    }
                };
                image.onerror = reject;
                image.src = reader.result;
            }
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function writeJSON(obj, fileName) {
        let name = fileName + ".json";
        let traceFolder = await mHandle.getDirectoryHandle("trace", { create: true });
        let jsonsFolder = await traceFolder.getDirectoryHandle("jsons", { create: true });
        let fileHandle = await jsonsFolder.getFileHandle(name, { create: true });
        let stream = await fileHandle.createWritable();
        await stream.write(JSON.stringify(obj));
        await stream.close();
    }

    async function writeVersion(version, versionNumber = null) {
        if (!versionNumber) versionNumber = mVersionCount

        let name = versionNumber + ".json";

        let imageBindings = version.canvas.imageBindings
            .concat(version.timelines
                .map(t => t.imageBindings)
                .flat());

        for (let binding of imageBindings) {
            if (binding.imageData == "hashed") {
                console.error("Malformatted JSON, this is already a version file.")
                return;
            }
            let imageData = binding.imageData;
            let imageHash = DataUtil.getHashCode(imageData)
            binding.imageData = "hashed"
            binding.hash = imageHash;
            if (!mSavedImagesHashes.includes(imageHash)) {
                await storeImageURL(imageHash, imageData);
            }
        }

        let versionFolder = await mHandle.getDirectoryHandle("version", { create: true });
        let fileHandle = await versionFolder.getFileHandle(name, { create: true });
        let stream = await fileHandle.createWritable();
        await stream.write(JSON.stringify(version));
        await stream.close();

        // update the state last thing in case of errors
        if (versionNumber == mVersionCount) mVersionCount++;

        log(LogEvent.VERSION, versionNumber);
    }

    async function readVersion(versionNumber = null) {
        if (!versionNumber) versionNumber = mVersionCount - 1;

        let name = versionNumber + ".json";
        let versionFolder = await mHandle.getDirectoryHandle("version", { create: true });
        let fileHandle = await versionFolder.getFileHandle(name);

        let file = await fileHandle.getFile();
        let contents = await file.text();
        let version = JSON.parse(contents);

        let imageBindings = version.canvas.imageBindings
            .concat(version.timelines
                .map(t => t.imageBindings)
                .flat());

        let badImages = [];
        for (let binding of imageBindings) {
            if (!binding.hash) {
                console.error("This is not an up to date version file.")
                return;
            }
            try {
                binding.imageData = await retrieveImageURL(binding.hash);
            } catch (e) {
                console.error("Error getting image!" + e);
                badImages.push(binding.id);
            }
        }

        if (badImages.length > 0) {
            version.canvas.imageBindings = version.canvas.imageBindings.filter(b => !badImages.includes(b.id))
            version.timelines.forEach(t => {
                t.imageBindings = t.imageBindings.filter(b => !badImages.includes(b.id))
            });
        }

        return version;
    }

    async function forEachVersion(callback) {
        for (let i = 0; i < mVersionCount; i++) {
            await callback(await readVersion(i), i)
        }
    }

    async function updateWorkspaceVersion(settings) {
        if (settings.workspaceVersion == 0) {
            let versionFolder = await mHandle.getDirectoryHandle("version");
            let i = 0;
            while (true) {
                let name = i + ".json";

                try {
                    let fileHandle = await versionFolder.getFileHandle(name);
                    let file = await fileHandle.getFile();
                    let contents = await file.text();
                    await writeVersion(JSON.parse(contents), i);
                } catch (e) {
                    if (e.message.includes('file or directory could not be found')) {
                        break;
                    } else {
                        console.error("Failed to open version: " + name, e);
                    }
                }

                i++;
            }

            settings.workspaceVersion = 1;
        }

        await storeSettings(settings);
    }

    async function storeImageURL(imageHash, imageData) {
        let imageFolder = await mHandle.getDirectoryHandle("images", { create: true });
        let fileHandle = await imageFolder.getFileHandle(imageHash + ".json", { create: true });
        let stream = await fileHandle.createWritable();

        await stream.write(imageData);
        await stream.close();

        mSavedImagesHashes.push(imageHash);
    }

    async function retrieveImageURL(imageHash) {
        let imageFolder = await mHandle.getDirectoryHandle("images", { create: true });
        let fileHandle = await imageFolder.getFileHandle(imageHash + ".json");
        let file = await fileHandle.getFile();
        return await file.text();
    }

    async function storeSettings(settings) {
        let fileHandle = await mHandle.getFileHandle(SETTINGS_FILE, { create: true });
        let stream = await fileHandle.createWritable();

        await stream.write(JSON.stringify(settings));
        await stream.close();
    }

    function initWrap(func) {
        return async function () {
            if (!mInitialized) {
                throw new Error("Workspace not Initialized!")
            } else {
                return await func(...arguments);
            }
        }
    }

    async function log(event, data) {
        // timestamp, event, data
        let logStr = Papa.unparse([[Date.now(), event, data]]) + "\n";
        let traceFolder = await mHandle.getDirectoryHandle("trace", { create: true });
        let fileHandle = await traceFolder.getFileHandle("log.csv", { create: true });
        let file = await fileHandle.getFile();
        let stream = await fileHandle.createWritable({ keepExistingData: true });
        await stream.write({ type: "write", position: file.size, data: logStr });
        await stream.close();
    }

    async function getLogData() {
        let traceFolder = await mHandle.getDirectoryHandle("trace", { create: true });
        let fileHandle = await traceFolder.getFileHandle("log.csv", { create: true });
        let file = await fileHandle.getFile();
        let contents = await file.text();
        // Should probably do some error handling here... whatever. 
        return Papa.parse(contents).data;
    }

    this.init = init;
    this.writePNG = initWrap(writePNG);
    this.readPNGSmall = initWrap(readPNGSmall);
    this.writeJSON = initWrap(writeJSON);
    this.writeVersion = initWrap(writeVersion);
    this.readVersion = initWrap(readVersion);
    this.forEachVersion = initWrap(forEachVersion);
    this.storeImageURL = initWrap(storeImageURL);
    this.getLogData = initWrap(getLogData);
    this.log = log;
}

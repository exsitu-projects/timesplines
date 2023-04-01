
function DrawerController() {
    const MIN_WIDTH = 200;

    let mIsOpen = false;
    let mWidth = 500;
    let mDragging = false;

    let mDrawerResizedCallback = function (drawerSize) { }

    function openDrawer() {
        $("#drawer-resize-strip").css("cursor", "e-resize")
        $("#drawer-wrapper").animate({ right: 0 });
        $("#drawer-side-menu").animate({ right: mWidth });
        $("#sub-menu-wrapper").animate({ right: mWidth + $("#drawer-side-menu").width() });
        mIsOpen = true;
    }

    function closeDrawer() {
        $("#drawer-resize-strip").css("cursor", "")
        $("#drawer-wrapper").animate({ right: -mWidth });
        $("#drawer-side-menu").animate({ right: 0 });
        $("#sub-menu-wrapper").animate({ right: $("#drawer-side-menu").width() });
        mIsOpen = false;
    }

    function setWidth(width) {
        mWidth = width;
        $("#drawer-wrapper").css("max-width", mWidth);
        $("#drawer-side-menu").css("right", mWidth);
        $('#link-button-div').css("right", mWidth - $('#link-button-div').width());
        $("#sub-menu-wrapper").css("right", mWidth + $("#drawer-side-menu").width());

        mDrawerResizedCallback($("#drawer-content-wrapper").width())
    }
    setWidth(mWidth);
    $("#drawer-wrapper").css("right", - mWidth);
    $("#drawer-side-menu").css("right", 0);
    $("#sub-menu-wrapper").animate({ right: $("#drawer-side-menu").width() });

    $("#drawer-resize-strip").on("pointerdown", function () {
        if (mIsOpen) mDragging = true;
    })

    function onPointerMove(screenCoords) {
        if (mIsOpen && mDragging) {
            setWidth(Math.max($(window).width() + $("#drawer-resize-strip").width() - screenCoords.x, MIN_WIDTH))
        }
    }

    function onPointerUp(screenCoords) {
        mDragging = false;
    }

    this.openDrawer = openDrawer;
    this.closeDrawer = closeDrawer;
    this.setWidth = setWidth;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
    this.setDrawerResizedCallback = (callback) => mDrawerResizedCallback = callback;
    this.isOpen = () => mIsOpen;
}
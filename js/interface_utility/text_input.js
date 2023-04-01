function TextInputBox() {
    let mTextChangedCallback = (text) => { };
    let mIsValidCallback = (text) => { return true };

    let mIsShowing;
    let mInputbox = $('#input-box');

    mInputbox.on('input', function (e) {
        let value = mInputbox.val();
        let isValid = mIsValidCallback(value);

        if (isValid) {
            mInputbox.css('background-color', '')
        } else {
            mInputbox.css('background-color', 'lightpink')
        }

        mInputbox.css('height', (mInputbox.prop('scrollHeight') - 4) + 'px');
    }).on('change', function (e) {
        hide();
    }).on('blur', function (e) {
        mTextChangedCallback(mInputbox.val());
        hide();
    });

    function show(text, x, y, height, width) {
        mInputbox.css('top', Math.floor(y - 8) + 'px')
            .css('left', Math.floor(x - 8) + 'px')
            .css('height', height + 'px')
            .css('width', width + 'px');
        mInputbox.val(text);

        mInputbox.show();
        mIsShowing = true;

        mInputbox[0].focus();
    }

    function returnText() {
        if (mIsShowing) {
            mTextChangedCallback(mInputbox.val());
            hide();
        }
    }

    function hide() {
        mInputbox.hide();
        mIsShowing = false;
    }

    function reset() {
        mTextChangedCallback = (text) => { };
        mIsValidCallback = (value) => { return true };
        mInputbox.css('background-color', '');
    }

    this.show = show;
    this.returnText = returnText;
    this.hide = hide;
    this.reset = reset;
    this.isShowing = () => mIsShowing;

    this.setTextChangedCallback = (callback) => mTextChangedCallback = callback;
    this.setIsValidCallback = (callback) => mIsValidCallback = callback;

    hide();
}

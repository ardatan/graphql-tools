export var getExtNameFromFilePath = function (filePath) {
    var partials = filePath.split('.');
    var ext = '.' + partials.pop();
    if (partials.length > 1 && partials[partials.length - 1] === 'flow') {
        ext = '.' + partials.pop() + ext;
    }
    return ext;
};

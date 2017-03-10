$("#avatar").fileinput({
    uploadUrl: '/upload/avatar',
    allowedFileExtensions: ["jpg", "png", "gif"],
    overwriteInitial: false,
    maxFilesNum: 1,
    maxFileCount: 1
});

$('#avatar').on('fileuploaded', function (event, data, previewId, index) {
    var form = data.form, files = data.files, extra = data.extra,
        response = data.response, reader = data.reader;
    var fileId = response[data.filenames[0]]
    $('#uploaded_fileName').text(data.filenames[0])
    $('#uploaded_fileUrl').text('/upload/avatar/'+fileId)
});

$(document).ready(function() {
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
        $('#uploaded_fileUrl').text('/upload/avatar/' + fileId)
    });

    $("#login").click(function () {
        var username = $("#username").val()
        var password = $("#password").val()
        $.ajax({
            method: "POST",
            url: "/auth/login",
            data: JSON.stringify({ username,password }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(result){
                let token = result.data.token
                let href = "http://localhost:8089/index.php?fs_auth_token="+token
                console.log(href)
                window.location.replace(href)
            },
            failure: function(errMsg) {
                console.log(errMsg);
            }
        })
        return false;
    });
})
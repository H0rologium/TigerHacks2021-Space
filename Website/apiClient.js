var satellite = $.ajax({
    url: 'https://tle.ivanstanojevic.me/api/tle/49181',
    method: 'GET',
    params: {
        id: '49181'
    },
    success : function (response) {
        console.log(response.line1);
        console.log(response.line2);
    }
});
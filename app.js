var express = require('express');
var app = express();

app.use(express.static(__dirname));

app.get('/', (req, res) => { res.sendFile('index.html', { root: __dirname }); });

app.get('/models/:name', (req, res) => {
    console.log(__dirname);
    res.sendFile('models/' + req.params.name + '.txt', { root: __dirname });
});

app.listen(8080, function () {
    console.log("Server up and running!");
});
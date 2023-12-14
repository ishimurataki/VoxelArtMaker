var express = require('express');
var app = express();

const PORT = process.env.PORT || 8080;

app.use(express.static(__dirname));

app.get('/', (req, res) => { res.sendFile('index.html', { root: __dirname }); });

app.get('/models/:name', (req, res) => {
    console.log(__dirname);
    res.sendFile('models/' + req.params.name + '.txt', { root: __dirname });
});

app.listen(PORT, function () {
    console.log("Server up and running!");
});
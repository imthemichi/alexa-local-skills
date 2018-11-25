const https = require('https');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const Alexa = require('alexa-sdk');
const request = require('request');
const logger = require('./logger.js');

const config = require('./config');

const subsonic = require('./subsonic');
const subsonicSkillHandlers = require('./skills/subsonic/index').handlers;
const remoteSkillHandlers = require('./skills/remote/index').handlers;
const locales = require('./locales');

const app = express();
app.use(cors());
app.options('*', cors());
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

// app.get('/', (req, res) => res.sendStatus(200));

app.get('/stream', async (req, res) => {
    let options = await subsonic.streamUrl(req.query.q);

    let r = request(options);
    r.on('response', function (res1) {
        res1.pipe(res);
    });
});

app.post('/subsonic', (req, res) => {
    const context = {
        fail: () => {
            res.sendStatus(500);
        },
        succeed: data => {
            res.send(data);
        }
    };

    const alexa = Alexa.handler(req.body, context);
    alexa.appId = config.SUBSONIC_SKILL_ID;
    alexa.resources = locales.languageStrings;
    alexa.registerHandlers(subsonicSkillHandlers);
    alexa.execute();
});

app.post('/remote', (req, res) => {
    const context = {
        fail: () => {
            res.sendStatus(500);
        },
        succeed: data => {
            res.send(data);
        }
    };

    const alexa = Alexa.handler(req.body, context);
    alexa.appId = config.REMOTE_SKILL_ID;
    alexa.resources = locales.languageStrings;
    alexa.registerHandlers(remoteSkillHandlers);
    alexa.execute();
});

subsonic.open(config.SUBSONICSERVER, config.SUBSONICUSERNAME, config.SUBSONICPASSWORD);

if (config.HTTP == true) {
    app.listen(80, () => {
        logger.info('http-Skill-Server started');
    });
}
else {
    https.createServer(
        {
            ca: fs.readFileSync(config.SSLCERTIFICATECA),
            cert: fs.readFileSync(config.SSLCERTIFICATECERT),
            key: fs.readFileSync(config.SSLCERTIFICATEKEY)
        },
        app).listen(443, () => {
            logger.info('https-Skill-Server started');
        });
}

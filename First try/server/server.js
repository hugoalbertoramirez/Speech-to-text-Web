const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
var router = express.Router();  
var fs = require("fs");

var path = require('path');
var formidable = require('formidable');

var port = process.env.PORT || 3000;     

router.use(function(req, res, next) {
    console.log('Recibo comando');
    next();  
});

app.get('/', function (req, res) {
  res.send('Hello World')
})
 
app.use(fileUpload());
 
var url_client = "http://127.0.0.1:8887";

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "X-Custom-Header");
  next();
});

// <!-- SDK USAGE -->
// Setup the recongizer
function RecognizerSetup(SDK, recognitionMode, language, format, subscriptionKey, file) {
    
    switch (recognitionMode) {
        case "Interactive" :
            recognitionMode = SDK.RecognitionMode.Interactive;    
            break;
        case "Conversation" :
            recognitionMode = SDK.RecognitionMode.Conversation;    
            break;
        case "Dictation" :
            recognitionMode = SDK.RecognitionMode.Dictation;    
            break;
        default:
            recognitionMode = SDK.RecognitionMode.Interactive;
    }

    var recognizerConfig = new SDK.RecognizerConfig(
        new SDK.SpeechConfig(
            new SDK.Context(
                //new SDK.OS(navigator.userAgent, "Browser", null),
                new SDK.OS("nodeJS", "server", null),
                new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
        recognitionMode,
        language, 
        format); 

    var authentication = new SDK.CognitiveSubscriptionKeyAuthentication(subscriptionKey);

    // var files = document.getElementById('filePicker').files;
    // if (!files.length) {
    //     return SDK.CreateRecognizer(recognizerConfig, authentication);
    // } else {
    //    return SDK.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, file);
    //}

    fs.readFile(file, function (err,data) {
        if (err) {
            console.log("Error al leer el archivo!\n");
        }
            console.log("Archivo leido correctamente!\n");
            return SDK.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, data);
        }
    );
}

// Start the recognition
function RecognizerStart(SDK, recognizer) {
    recognizer.Recognize((event) => {
        
        switch (event.Name) {
            case "RecognitionTriggeredEvent" :
                UpdateStatus("Initializing");
                break;
            case "ListeningStartedEvent" :
                UpdateStatus("Listening");
                break;
            case "RecognitionStartedEvent" :
                UpdateStatus("Listening_Recognizing");
                break;
            case "SpeechStartDetectedEvent" :
                UpdateStatus("Listening_DetectedSpeech_Recognizing");
                UpdateStatus(JSON.stringify(event.Result));
                //console.log(JSON.stringify(event.Result)); 
                break;
            case "SpeechHypothesisEvent" :
                UpdateRecognizedHypothesis(event.Result.Text);
                UpdateStatus(JSON.stringify(event.Result));
                //console.log(JSON.stringify(event.Result)); 
                break;
            case "SpeechEndDetectedEvent" :
                //OnSpeechEndDetected();
                UpdateStatus("Processing_Adding_Final_Touches");
                UpdateStatus(JSON.stringify(event.Result));
                //console.log(JSON.stringify(event.Result)); 
                break;
            case "SpeechSimplePhraseEvent" :
                //UpdateRecognizedPhrase(JSON.stringify(event.Result, null, 3));
                UpdateStatus(JSON.stringify(event.Result, null, 3));
                break;
            case "SpeechDetailedPhraseEvent" :
                //UpdateRecognizedPhrase(JSON.stringify(event.Result, null, 3));
                UpdateStatus(JSON.stringify(event.Result, null, 3));
                break;
            case "RecognitionEndedEvent" :
                //OnComplete();
                UpdateStatus("FIN");
                //console.log(JSON.stringify(event)); 
                UpdateStatus(JSON.stringify(event));
                break;
            default:
                UpdateStatus(JSON.stringify(event));
                //console.log(JSON.stringify(event));
        }
        
    })
    .On(() => {
        // The request succeeded. Nothing to do here.
    },
    (error) => {
        console.error(error);
    });
}

function UpdateStatus(status) {
    console.log(">>>" + status + '\n\n');
}

// Stop the Recognition.
function RecognizerStop(SDK, recognizer) {
    recognizer.AudioSource.TurnOff();
}

///////////

app.post('/uploadWAV', function(req, res) {

    var times = Date.now();
    if (!fs.existsSync('uploads\\' + times)) {
        console.log(times);
        fs.mkdirSync('uploads\\' + times);
    }

    if (req.files.uploads[0]) // es un array
    {
        var nFiles = req.files.uploads.length; 
        for (i = 0; i < nFiles; i++)
        {
            fs.writeFile('uploads\\' + times + '\\' + req.files.uploads[i].name, req.files.uploads[i].data, function(err) {
                //res.send("Error al mandar el archivo .wav");
            });
        }
    }
    else // no es un array (un solo archivo)
    {
        console.log(req.files.uploads.name);
        var myFileName = 'uploads\\' + times + '\\' + req.files.uploads.name;
        
        fs.writeFile(myFileName, req.files.uploads.data, function(err) {

            //require(["Speech.Browser.Sdk"], function(SDK) {

                //WebSocket = require('ws');
                const requirejs = require('requirejs');
                requirejs.config({
                    baseUrl: __dirname,
                    nodeRequire: require
                });
                const SDK = requirejs('Speech.Browser.Sdk');
                module.exports = SDK;
                

                var recognitionMode = "Conversation" ; // Interactive, Dictation
                var language = "es-ES"; // no es-MX
                var format = "simple"; // Simple, Detailed
                var subscriptionKey = "9fc280924bed46b9ab0c3714ca3069ca";

                var recognizer = RecognizerSetup(SDK, recognitionMode, language, format, subscriptionKey, myFileName);

                console.log(recognizer);
                //RecognizerStart(SDK, recognizer);
            //});            
        });
    }
});

app.listen(port);
console.log('Server online en puerto: ' + port);   


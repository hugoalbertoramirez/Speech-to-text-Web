var SpeechToTextKey = "9fc280924bed46b9ab0c3714ca3069ca";
var TextAnalysisKey = "9c0bc0190edf451fa24029d7c2419210";

var nFiles = 0;
var keyPhrasesJSON = {};
var opinionsJSON = {};
var irrelevantWords = [
'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del', 
'yo', 'tu', 'el', 'nosotros', 'nosotras', 'ustedes', 'ellos', 'ellas',
'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre', 'este', 'hacia', 'hasta', 'mediante', 'para', 'por', 
'segun', 'sin', 'so', 'sobre', 'tras', 'versus',  'via', 'y', 'o',
];

$('.upload-btn').on('click', function (){
    $('#upload-input').click();
    $('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
});

$('#upload-input').on('change', function(){

  var files = $(this).get(0).files;

  nFiles = files.length;
  if (files.length > 0){
    
    require(["Speech.Browser.Sdk"], function(SDK) {
      var recognizerConfig = new SDK.RecognizerConfig(
        new SDK.SpeechConfig(
            new SDK.Context(
              new SDK.OS(navigator.userAgent, "Browser", null),
              new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
        SDK.RecognitionMode.Conversation,
        "es-ES", 
        SDK.SpeechResultFormat["Simple"]); // Detailed
      
      var authentication = new SDK.CognitiveSubscriptionKeyAuthentication(SpeechToTextKey);
      
      for (var i = 0; i < nFiles; i++) {
        var file = files[i];
        recognizer = SDK.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, file);
        RecognizerStart(SDK, recognizer, file.name, i); 
      }
    });
  }
});

function RecognizerStart(SDK, recognizer, fileName, index) {
  recognizer.Recognize((event) => {
    if (event.Name == "SpeechSimplePhraseEvent")
    {
      console.log(event.Result.DisplayText);
      
      var documents = { documents: [ { id: '1', language: 'es', text: event.Result.DisplayText},] };

      GetScore(documents, fileName);
      GetKeyPhrases(documents);
    }   
    else if (event.Name == "RecognitionEndedEvent")
    {
      if (index == nFiles - 1)
      {
        console.log("============= keyPhrasesJSON =============");
        console.log(JSON.stringify(fixPhrases(keyPhrasesJSON)));
        // for(key in keyPhrasesJSON){
        //   var value = keyPhrasesJSON[key];
        //   console.log(key + ": " + value)
        // }

        console.log("============= opinionsJSON =============");
        console.log(JSON.stringify(opinionsJSON));
        // for(key in opinionsJSON){
        //   var value = opinionsJSON[key];
        //   console.log(key + ": " + value)
        // }
      }
    }
  })
  .On(
    () => { },
    (error) => { console.error(error);}
  );
}

function GetScore(documents, fileName)
{
  var settings = {
    "async": true,
    "crossDomain": true,
    "url": "https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment",
    "method": "POST",
    "headers": {
      "ocp-apim-subscription-key": TextAnalysisKey,
      "content-type": "application/json",
      "cache-control": "no-cache"
    },
    "data": JSON.stringify(documents)
  }
  
  $.ajax(settings).done(function (response) {
    if (response.documents && response.documents[0] && response.documents[0].score)
    {
      var score = response.documents[0].score;
      
      if (opinionsJSON[fileName])
      {
        var arr = opinionsJSON[fileName];
        arr.push(score);
      }
      else
      {
        opinionsJSON[fileName] = [score];
      }
    }
  });
}

function GetKeyPhrases(documents)
{
  var settings = {
    "async": true,
    "crossDomain": true,
    "url": "https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases",
    "method": "POST",
    "headers": {
      "ocp-apim-subscription-key": TextAnalysisKey,
      "content-type": "application/json",
      "cache-control": "no-cache"
    },
    "data": JSON.stringify(documents)
  }

  $.ajax(settings).done(function (response) {
    if (response.documents && response.documents[0] && response.documents[0].keyPhrases)
    {
      var keyPhrases = response.documents[0].keyPhrases;
      var key;
      for (var i = 0; i < keyPhrases.length; i++)
      {
        key = keyPhrases[i];
        if (keyPhrasesJSON[key])
        {
          keyPhrasesJSON[key] = keyPhrasesJSON[key] + 1;
        }
        else
        {
          keyPhrasesJSON[key] = 1;
        }
      }
    }
  });
}

function fixPhrases(keyPhrasesJSON, limit = 20)
{
  var noCapitals = {};
  var found = false;

  // remove if it has capital letters:
  for (key in keyPhrasesJSON)
  {
    found = false;

    for (var j = 0; j < key.length && found == false; j++)
    {
      if (key[j] == key[j].toUpperCase())
      {
        found = true;
      }
    }

    if (!found)
    {
      noCapitals[key] = keyPhrasesJSON[key];
    }
  }

  var noIrrelevantWords = {};
  found = false;

  // remove is it is an irrelevant word:
  for (key in noCapitals)
  {
    found = false;

    for (var i = 0; i < irrelevantWords.length && found == false; i++)
    {
      if (irrelevantWords[i] == key.toLowerCase())
      {
        found = true;
      }
    }

    if (!found)
    {
      noIrrelevantWords[key] = noCapitals[key];
    }
  }

  var fixed = {};

  // crear una lista con los 'values' de noIrrelevantWords
  var items = Object.keys(noIrrelevantWords).map(function(key) 
  { 
    return [key, noIrrelevantWords[key]]; 
  });

  //ordenar los 'values' de mayor a menor
  items.sort(function(first, second) 
  { 
    return second[1] - first[1]; 
  });

  // quedarse con los primeros limit valores de limit (20)
  for (var i =  0; i < Math.max(limit, items.length); i++)
  {
    fixed[items[i][0]] = items[i][1];
  }
  
  return fixed;
}
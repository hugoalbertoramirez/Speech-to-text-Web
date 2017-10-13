var SpeechToTextKey = "9fc280924bed46b9ab0c3714ca3069ca";
var TextAnalysisKey = "0c140e28fe754315b816691babf92e4e";
var urlkeyPhrases = "https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases";
var urlSentiment = "https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment";
var lang = "es";

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

var files;
var nFiles = 0;
var indexfile;
var SDK_;
var recognizerConfig;
var authentication;

$('#upload-input').on('change', function(){

  files = $(this).get(0).files;
  nFiles = files.length;
  indexfile = 0;

  if (files.length > 0){
    
    require(["Speech.Browser.Sdk"], function(SDK) {
      SDK_ = SDK;
      recognizerConfig = new SDK.RecognizerConfig(
        new SDK.SpeechConfig(
            new SDK.Context(
              new SDK.OS(navigator.userAgent, "Browser", null),
              new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
        SDK.RecognitionMode.Conversation,
        "es-ES",
        SDK.SpeechResultFormat["Simple"]); // Detailed
      
      authentication = new SDK.CognitiveSubscriptionKeyAuthentication(SpeechToTextKey);

      recognizer = SDK.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, files[indexfile]);
      RecognizerStart(recognizer);
    });
  }
});

function RecognizerStart(recognizer) {
  
  var fileName = files[indexfile].name;
  var documents = { documents: [] };
  var idDocument = 0;
  var document;

  recognizer.Recognize((event) => {
    
    if (event.Name == "SpeechSimplePhraseEvent")
    {
      idDocument += 1;
      console.log("SpeechSimplePhraseEvent-" + fileName + "(" + idDocument + "): " + event.Result.DisplayText);
     
      document = { id: idDocument, language: lang, text: event.Result.DisplayText};
      documents.documents.push(document);
    }
    else if (event.Name == "RecognitionEndedEvent")
    {
      console.log("RecognitionEndedEvent " + fileName);

      GetScore(documents, fileName);
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
    "url": urlSentiment,
    "method": "POST",
    "headers": {
      "ocp-apim-subscription-key": TextAnalysisKey,
      "content-type": "application/json",
      "cache-control": "no-cache"
    },
    "data": JSON.stringify(documents)
  }
  
  $.ajax(settings).done(function (response) 
  {
    if (response.documents)
    {
      for (var i = 0; i < response.documents.length; i++)
      {
        if (response.documents[i].score)
        {
          var score = response.documents[i].score;
          
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
      }
    }

    GetKeyPhrases(documents, fileName);
  });
}

function GetKeyPhrases(documents, fileName)
{
  var settings = {
    "async": true,
    "crossDomain": true,
    "url": urlkeyPhrases,
    "method": "POST",
    "headers": {
      "ocp-apim-subscription-key": TextAnalysisKey,
      "content-type": "application/json",
      "cache-control": "no-cache"
    },
    "data": JSON.stringify(documents)
  }

  $.ajax(settings).done(function (response) 
  {
    if (response.documents)
    {
      var keyPhrases;
      var key;
      for (var i = 0; i < response.documents.length; i++)
      {
        if (response.documents[i].keyPhrases)
        {
          keyPhrases = response.documents[i].keyPhrases;
          
          for (var j = 0; j < keyPhrases.length; j++)
          {
            key = keyPhrases[j];

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
      }
    }

    AnalysisNewFile();    
  });
}

function AnalysisNewFile()
{
  indexfile++;
  if (indexfile < files.length)
  {
    recognizer = SDK_.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, files[indexfile]);
    RecognizerStart(recognizer);
  }
  else if (indexfile == files.length)
  {
    printFinalResult();
    
    opinionsJSON = {};
    keyPhrasesJSON = {};
  }
}

function printFinalResult()
{
  console.log("============= opinionsJSON =============");
  console.log(JSON.stringify(opinionsJSON));

  console.log("============ keyPhrasesJSON ============");
  console.log(JSON.stringify(fixPhrases(keyPhrasesJSON)));
}

function fixPhrases(json, limit = 20)
{
  var noCapitals = {};
  var found = false;

  // remove if it has capital letters:
  for (key in json)
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
      noCapitals[key] = json[key];
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

  // quedarse con los primeros valores de limit (20)
  var max = Math.min(limit, items.length);
  for (var i =  0; i < max; i++)
  {
    fixed[items[i][0]] = items[i][1];
  }
  
  return fixed;
}
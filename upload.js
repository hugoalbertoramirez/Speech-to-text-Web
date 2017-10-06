$('.upload-btn').on('click', function (){
    $('#upload-input').click();
    $('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
});

$('#upload-input').on('change', function(){

  var files = $(this).get(0).files;

  if (files.length > 0){
    
    require(["Speech.Browser.Sdk"], function(SDK) {

      var subscriptionKey = "9fc280924bed46b9ab0c3714ca3069ca";

      var recognizerConfig = new SDK.RecognizerConfig(
        new SDK.SpeechConfig(
            new SDK.Context(
              new SDK.OS(navigator.userAgent, "Browser", null),
              new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
        SDK.RecognitionMode.Conversation,
        "es-ES", 
        SDK.SpeechResultFormat["Simple"]); // Detailed
      
      var authentication = new SDK.CognitiveSubscriptionKeyAuthentication(subscriptionKey);
      
      for (var i = 0; i < files.length; i++) {
        //formData.append('uploads', file, file.name);

        var file = files[i];

        recognizer = SDK.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, file);
        RecognizerStart(SDK, recognizer, file); 
      }
    });

  }
});

function RecognizerStart(SDK, recognizer, file) {
  recognizer.Recognize((event) => {
      switch (event.Name) {
          case "RecognitionTriggeredEvent" :
              UpdateStatus(file, event.Name, "Initializing");
              break;
          case "ListeningStartedEvent" :
              UpdateStatus(file, event.Name, "Listening");
              break;
          case "RecognitionStartedEvent" :
              UpdateStatus(file, event.Name, "Listening_Recognizing");
              break;
          case "SpeechStartDetectedEvent" :
              UpdateStatus(file, event.Name, "Listening_DetectedSpeech_Recognizing");
              console.log(JSON.stringify(event.Result)); 
              break;
          case "SpeechHypothesisEvent" :
              UpdateStatus(file, event.Name, event.Result.Text);
              UpdateStatus(file, event.Name, JSON.stringify(event.Result));
              break;
          case "SpeechEndDetectedEvent" :
              OnSpeechEndDetected(file);
              UpdateStatus(file, event.Name, "Processing_Adding_Final_Touches");
              console.log(JSON.stringify(event.Result)); 
              break;
          case "SpeechSimplePhraseEvent" :
              UpdateStatus(file, event.Name, "SpeechSimplePhraseEvent");
              UpdateStatus(file, event.Name, JSON.stringify(event.Result, null, 3));
              break;
          case "SpeechDetailedPhraseEvent" :
              UpdateStatus(file, event.Name, "SpeechDetailedPhraseEvent");
              UpdateStatus(file, event.Name, JSON.stringify(event.Result, null, 3));
              break;
          case "RecognitionEndedEvent" : 
              OnComplete();
              UpdateStatus(file, "END", JSON.stringify(event));
              break;
          default:
              console.log(JSON.stringify(event)); 
      }
  })
  .On(() => {
      // The request succeeded. Nothing to do here.
  },
  (error) => {
      console.error(error);
  });
}

function UpdateStatus(file, event, text) {
  console.log(file.name + ' >>> ' + event + ' >>> \n' + text);
}

function UpdateRecognizedHypothesis(text) {
  //hypothesisDiv.innerHTML = text;
  console.log(text + "\n");
}

function OnSpeechEndDetected(file) {
  // evento que se dispara cuando termina la detección de un archivo
}

function OnComplete() {
  
}
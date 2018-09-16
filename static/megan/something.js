const projectName = "random-quote-machine";
localStorage.setItem('example_project', 'Randowm Quote Machine');
let quotesData;

/*
  Code by Gabriel Nunes
  Modified by Todd Chaffee to use Camper gist for JSON Quote data.
*/

function inIframe () { try { return window.self !== window.top; } catch (e) { return true; } }

var colors = ['#16a085', '#27ae60', '#2c3e50', '#f39c12', '#e74c3c', '#9b59b6', '#FB6964', '#342224', "#472E32", "#BDBB99", "#77B1A9", "#73A857"];
var currentQuote = '', currentAuthor = '';
function openURL(url){
  window.open(url, 'Share', 'width=550, height=400, toolbar=0, scrollbars=1 ,location=0 ,statusbar=0,menubar=0, resizable=0');
}

function getQuotes() {
  return $.ajax({
    headers: {
      Accept: "application/json"
    },
    url: 'https://gist.githubusercontent.com/rayheberer/cad42ce2a1a5cc907b79719561f3eb3c/raw/8ddb6510f17d183ec3cdc8c99ce6ee1214710029/somethings.json',
    success: function(jsonQuotes) {
      if (typeof jsonQuotes === 'string') {
        quotesData = JSON.parse(jsonQuotes);
        console.log('quotesData');
        console.log(quotesData);
      }
    }
  });
}

function getRandomQuote() {
  return quotesData.quotes[Math.floor(Math.random() * quotesData.quotes.length)];
}

function getQuote() {

  let randomQuote = getRandomQuote();
  
  currentQuote = randomQuote.quote;
  currentAuthor = randomQuote.date;
  
  $(".quote-text").animate(
    { opacity: 0 },
    500,
    function() {
      $(this).animate({ opacity: 1}, 500);
      $('#text').text(randomQuote.quote);
    }
  );

  $(".quote-date").animate(
    { opacity: 0 },
    500,
    function() {
      $(this).animate({ opacity: 1}, 500);
      $('#date').html(randomQuote.date);
    }
  );

  var color = Math.floor(Math.random() * colors.length);
  $("html body").animate(
    {
      backgroundColor: colors[color],
      color: colors[color]
    },
    1000
  );
  $(".button").animate(
    {
      backgroundColor: colors[color]
    },
    1000
  );
}

$(document).ready(function() {
  getQuotes().then(() => {
    getQuote();
  });

  $('#new-quote').on('click', getQuote);
});
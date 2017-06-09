'use strict'

const _ = require('lodash')
// const rp = require('request-promise')
const rp = require('request-promise-native')
const numeral = require('numeral')
// var Nightmare = global.require('nightmare')
// var Horseman = require('node-horseman')
// var Zombie = require('zombie')
// const ReactDataGridPlugins = require('react-data-grid/addons')
const cheerio = require('cheerio')
// const got = require('got')
const Url = require('url')
const FormData = require('form-data')
const Promise = require('bluebird')
const Numeral = require('numeral')
const Md5 = require('md5')
var Qs = require('querystring')
// var Xray = require('x-ray')
/*
var phantomjs = require('phantomjs-prebuilt')
var Horseman = require('node-horseman')
*/
/*
var Phantomer = require('phantomer')
*/
var Nightmare = global.require('nightmare')
// const fetch = require('fetch-cookie')(require('node-fetch'))
//let needle = require('needle')

var maxbet = (function () {
  function maxbet () {
    this.config = {}
    this._key = ''
    this._username = ''
    this.eventList = []
    this.updateEventListTimeout = null
    this.updateEventPriceTimeout = null
    this.updateAPIKeyTimeout = null
    this.resetTimeout = null
    this.refreshTimeout = null
    this._infoHandler = null
    this.providerCode = 'maxbet'
    this.gameIdToGameType = {}
    this.marketSelectionIdToGameTypeStr = {}
    this.isEventListFirstCallCompleted = false
    this.isEventPriceFirstCallCompleted = false
    this.previousEventPriceResponse = ''
    this.previousEventResponse = ''

    this.isLoggedIn= false
    this.isAPIKeyReady = false
    this.isMemberInfoReady = false
    this.lastCallStepArr = {}
    this.gameIdInfoCache = {}
    this.specialCodeInfoCache = {}

    this.baseURL = ''
    this.marketCrawlURL = {}
    this.leagueCrawlURL = {}

    // this.browser = new Nightmare({show: true}).useragent("Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/8.0 Mobile/11A465 Safari/9537.53")
    // this.browser = new Horseman().userAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/8.0 Mobile/11A465 Safari/9537.53")
    // this.browser = new Zombie()

    this.defaultOptions = {
      json: true // Automatically parses the JSON string in the response
    }

    this.isReady = function () {
      return true
    }
    this.setInfoHandler = function (ph) {
      this._infoHandler = ph;
    }
    this.setProviderKey = function (key) {
      this._providerKey = key;
    }
    this.setConfig = function (config) {
      this.config = config;

    }

    this.login = () => {

      /*
    var horseman = new Horseman({phantomPath:'/usr/local/bin/phantomjs'})
    horseman
		.open('http://mobile.twitter.com/realtrump')
		.text('.UserProfileHeader-stat--followers .UserProfileHeader-statCount')
		.then(function(text){
			console.log( ': ' + text );
		})
		.finally(function(){
			return horseman.close();
		});
    */
      var nightmare = Nightmare({ show: true });

      nightmare
  //load a url
  .goto('http://yahoo.com')
  //simulate typing into an element identified by a CSS selector
  //here, Nightmare is typing into the search bar
  .type('input[title="Search"]', 'github nightmare')
  //click an element identified by a CSS selector
  //in this case, click the search button
  .click('#uh-search-button')
  //wait for an element identified by a CSS selector
  //in this case, the body of the results
  .wait('#main')
  //execute javascript on the page
  //here, the function is getting the HREF of the first search result
  .evaluate(function() {
    return document.querySelector('#main .searchCenterMiddle li a')
      .href;
  })
  //end the Nightmare instance along with the Electron instance it wraps
  .end()
  //run the queue of commands specified, followed by logging the HREF
  .then(function(result) {
    console.log(result);
  })
  //catch errors if they happen
  .catch(function(error){
    console.error('an error has occurred: ' + error);
  });
  /*
      var horseman = new Horseman({phantomPath:'/usr/local/bin/phantomjs'})
      horseman
      .open('http://mobile.twitter.com/realtrump')
      .then(horseman.text.bind(null,'.UserProfileHeader-stat--followers .UserProfileHeader-statCount'))
      .then(function(text) {
        console.log(': ' + text);
      })
      .finally(function() {
        horseman.close();
      });
      */
      /*
      const CFS = function(codeStr) {
        function CfsCode(nWord) {
            var result = "";
            for (var cc = 1; cc <= nWord.length; cc++) {
                result += nWord.charAt(cc - 1).charCodeAt(0);
            }
            var DecimalValue = new Number(result);
            result = DecimalValue.toString(16);
            return result;
        }
        ;var CodeLen = 30, CodeSpace, Been;
        CodeSpace = CodeLen - codeStr.length;
        if (CodeSpace > 1) {
            for (var cecr = 1; cecr <= CodeSpace; cecr++) {
                codeStr = codeStr + String.fromCharCode(21);
            }
        }
        var NewCode = new Number(1);
        for (var cecb = 1; cecb <= CodeLen; cecb++) {
            Been = CodeLen + codeStr.charAt(cecb - 1).charCodeAt(0) * cecb;
            NewCode = NewCode * Been;
        }
        var tmpNewCode = new Number(NewCode.toPrecision(15));
        codeStr = tmpNewCode.toString().toUpperCase();
        var NewCode2 = "";
        for (var cec = 1; cec <= codeStr.length; cec++) {
            NewCode2 = NewCode2 + CfsCode(codeStr.substring(cec - 1, cec + 2));
        }
        var CfsEncodeStr = "";
        for (var cec = 20; cec <= NewCode2.length - 18; cec += 2) {
            CfsEncodeStr = CfsEncodeStr + NewCode2.charAt(cec - 1);
        }
        return CfsEncodeStr.toUpperCase();
      }

      var token = null
      var PWKEY = null
      var fd = new FormData()

      fetch('http://m.maxbet.com/default.aspx', {redirect:'follow', credentials:'include'})
      .then((response) => {
        // console.log(response)
        return response.text()
      })
      .then((responseText) => {
        let $ = cheerio.load(responseText)
        token = $('#__tk').attr('value')
        // console.log(responseText)
        fetch('http://m.maxbet.com/Default/RefreshPKey', {method:'post',  credentials:'include'})
        .then((pwkeyResponse) => {
          // console.log(pwkeyResponse)
          return pwkeyResponse.json()
        })
        .then((pwkeyResponseJSON) => {
          // console.log(pwkeyResponseJSON)
          PWKEY = pwkeyResponseJSON['Data']['PWKEY']
          console.log('PWKEY: %s', PWKEY)
          console.log('CFS : %s', CFS(this.config.password))
          let qs = {}
          fd.set('__tk', token)
          fd.set('Username', this.config.username)
          fd.set('Password', Md5(CFS(this.config.password) + PWKEY))
          fd.set('RememberMe', false)
          fd.set('Language', 'en-US')
          fd.set('isGesture', false)
          qs['__tk'] = token
          qs['Username'] = this.config.username
          qs['Password'] = Md5(CFS(this.config.password) + PWKEY)
          qs['RememberMe'] = false
          qs['Language'] = 'en-US'
          qs['isGesture'] = false
          qs['detecas_analysis'] = '{"startTime":1487005506000,"version":"1.1.4","exceptions":[],"executions":[{"step":1,"time":286},{"step":2,"time":289},{"step":3,"time":306},{"step":5,"time":478},{"step":6,"time":487},{"step":7,"time":488}],"storages":[{"name":"LS","success":true,"time":307},{"name":"WN","success":true,"time":313},{"name":"UD","success":false,"time":314},{"name":"WS","success":true,"time":345},{"name":"IDB","success":true,"time":461},{"name":"FS","success":true,"time":477}],"devices":[{"name":"CC","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":289},{"name":"LS","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":306},{"name":"WN","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":313},{"name":"WS","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":345},{"name":"IDB","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":460},{"name":"FS","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":477},{"name":"CB2","value":"463554c8aa5c3d99b4c5de60cb9548a52441f4f9ac9eea3c9704e4780166dc1a","time":488}],"enable":true}'
          qs['__di'] = 'eyJuYSI6Ik4vQSIsImRldmljZUNvZGUiOiJhNTZkYzE3ZGQyODJlZWZhOGRmMTY0Y2RmOTE5YWQ5YjdiMGQxMzg2OzlkOTQ2ODg0ZmMxNjI3NTBkMGFkMDA2YWUzNWM2MWYwIiwiYXBwVmVyc2lvbiI6IjUuMCAoaVBob25lOyBDUFUgaVBob25lIE9TIDlfMSBsaWtlIE1hYyBPUyBYKSBBcHBsZVdlYktpdC82MDEuMS40NiAoS0hUTUwsIGxpa2UgR2Vja28pIFZlcnNpb24vOS4wIE1vYmlsZS8xM0IxNDMgU2FmYXJpLzYwMS4xIiwidGltZVpvbmUiOiItNDgwIiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKGlQaG9uZTsgQ1BVIGlQaG9uZSBPUyA5XzEgbGlrZSBNYWMgT1MgWCkgQXBwbGVXZWJLaXQvNjAxLjEuNDYgKEtIVE1MLCBsaWtlIEdlY2tvKSBWZXJzaW9uLzkuMCBNb2JpbGUvMTNCMTQzIFNhZmFyaS82MDEuMSIsInNjcmVlbiI6eyJ3aWR0aCI6Mzc1LCJoZWlnaHQiOjY2NywiY29sb3JEZXB0aCI6MjR9LCJkZXZpY2VJZCI6IjMxNTBkYmE4ZWQ4ZDQ1YmFiZTNkODliZWVlMDU5MjcwIiwiaHJlZiI6Imh0dHA6Ly9tLm1heGJldC5jb20vZGVmYXVsdC5hc3B4IiwiY2FwdHVyZWREYXRlIjoiNjM2MjI1ODIzOTk1NjY0MzQwIn0='

          return fetch('http://m.maxbet.com/Login/index', {method:'post', credentials:'include', body:Qs.stringify(qs), redirect:'follow', headers: {
          'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }})
        })
        .then((loginResponse) => {
          // console.log(loginResponse)
          return loginResponse.text()
        })
        .then((loginResponseText) => {
          console.log(loginResponseText)
          return fetch('http://m.maxbet.com/odds/ShowAllOdds', {method:'post', credentials:'include', body:'GameId=1&DateType=l&BetTypeClass=OU'})
        })
        .then((oddResponse) => {
          return oddResponse.text()
        })
        .then((oddResponseText) => {
          console.log(oddResponseText)
        })


      })
      */

    }
    this.crawl = (marketId) => {
    }
    this.reset = () => {
      this.isLoggedIn = false
      this.login()
    }

    this.start = function () {
      this.reset()
      return true
    }
  }
  return maxbet
})()
module.exports = maxbet

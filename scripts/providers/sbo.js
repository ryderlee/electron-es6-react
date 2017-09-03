const _ = require('lodash');
const numeral = require('numeral');
// var Nightmare = global.require('nightmare')
// var Horseman = require('node-horseman')
// var Zombie = require('zombie')
// const ReactDataGridPlugins = require('react-data-grid/addons')
const cheerio = require('cheerio');
// const got = require('got')
const Url = require('url');
const FormData = require('form-data');
const Promise = require('bluebird');
const Numeral = require('numeral');
const axios = require('axios');
// const fetch = require('fetch-cookie')(require('node-fetch'))
// let needle = require('needle')
const connectionBase = require('./connectionBase');

class sbo extends connectionBase {
  constructor() {
    super();
    this.config = {};
    this._key = '';
    this._username = '';
    this.eventList = [];
    this.updateEventListTimeout = null;
    this.updateEventPriceTimeout = null;
    this.updateAPIKeyTimeout = null;
    this.resetTimeout = null;
    this.refreshTimeout = null;
    this._infoHandler = null;
    this.providerCode = 'sbo';
    this.gameIdToGameType = {};
    this.marketSelectionIdToGameTypeStr = {};
    this.isEventListFirstCallCompleted = false;
    this.isEventPriceFirstCallCompleted = false;
    this.previousEventPriceResponse = '';
    this.previousEventResponse = '';

    this.isLoggedIn= false;
    this.isAPIKeyReady = false;
    this.isMemberInfoReady = false;
    this.lastCallStepArr = {};
    this.gameIdInfoCache = {};
    this.specialCodeInfoCache = {};

    this.baseURL = '';
    this.marketCrawlURL = {};
    this.leagueCrawlURL = {};

    this.defaultOptions = { json: true };
  }
    // this.browser = new Nightmare({show: true}).useragent("Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/8.0 Mobile/11A465 Safari/9537.53")
    // this.browser = new Horseman().userAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/8.0 Mobile/11A465 Safari/9537.53")
    // this.browser = new Zombie()


  isReady(){
    return true;
  }
  setProviderKey(key) {
    this._providerKey = key;
  }
  setConfig(config) {
    super.setConfig(config);
  }

  login() {
    console.log('sbo->login');
    return axios('http://m.beer777.com/web-root/public/login.aspx', { withCredentials: true })
      .then(response => response.data)
      .then((responseText) => {
        // console.log(responseText)
        let $ = cheerio.load(responseText);
        // let fd = new FormData();
        let fd = {};
        _.map($('#loginForm').serializeArray(), (obj) => {
          console.log('setting:%s = %s', obj.name, obj.value);
          // fd.append(obj.name, obj.value);
          fd[obj.name] = obj.value;
        })
        // fd.append('username', this.config.username);
        // fd.append('password', this.config.password);
        fd.username = this.config.username;
        fd.password = this.config.password;
        console.log(fd);
        let url = Url.resolve('http://m.beer777.com/web-root/public/login.aspx', String($('#loginForm').attr('action')));
        // console.log(url)
        return axios(url, { method: 'post', data: fd, withCredentials: true });
      })
      .then((loginResponse) => {
        console.log(loginResponse);
        this.isLoggedIn = true;
        this.baseURL = loginResponse.url;
        console.log(this.baseURL);
        this.marketCrawlURL[0] = Url.resolve(this.baseURL, '/web-root/flexible/odds-display/main.aspx?sport=1&param=1,3&promo=0&promosid=0');
        this.marketCrawlURL[1] = Url.resolve(this.baseURL, '/web-root/flexible/odds-display/main.aspx?sport=1&param=1,1&promo=0&promosid=0');
        this.marketCrawlURL[2] = Url.resolve(this.baseURL, '/web-root/flexible/odds-display/main.aspx?sport=1&param=1,2&promo=0&promosid=0');
        this.leagueCrawlURL[0] = Url.resolve(this.baseURL, '/web-root/flexible/odds-display/tournament.aspx?sportId=1&leagueId=0&marketPageType=3&promo=0');
        this.leagueCrawlURL[1] = Url.resolve(this.baseURL, '/web-root/flexible/odds-display/tournament.aspx?sportId=1&leagueId=0&marketPageType=1&promo=0');
        this.leagueCrawlURL[2] = Url.resolve(this.baseURL, '/web-root/flexible/odds-display/tournament.aspx?sportId=1&leagueId=0&marketPageType=2&promo=0');

        return axios(Url.resolve(this.baseURL, '/web-root/restricted/settings/settings.aspx'), {withCredentials:true});
      })
      .then(settingResponse => settingResponse.data)
      .then((settingResponseText) => {
        let $ = cheerio.load(settingResponseText);
        let fd = new FormData();
        _.map($('#changeForm').serializeArray(), (obj) => {
          // console.log('setting:%s = %s', obj.name, obj.value)
          fd.append(obj.name, obj.value);
        })
        fd.append('oddsStyle', 'HK');
        fd.append('lang', 'en');
        return axios(Url.resolve(this.baseURL, '/web-root/restricted/settings/settings.aspx'), { withCredentials: true, method: 'post', data: fd });
      })
      .then((settingFinishedResponse) => {
        setTimeout(() => { this.crawl(1); }, 1);
      });
  }


  crawl(marketId) {
    return axios(this.leagueCrawlURL[marketId], { withCredentials: true })
      .then(leagueResponse => leagueResponse.data)
      .then((leagueResponseText) => {
        const leagueRegex = /odds-display\/main.aspx\?sport=\d&param=\d*,\d*,(\d*)&promo=0/g;
        let leagueIds = [];
        // console.log(leagueResponseText.match(leagueRegex))
        const leagueRegexMatch = leagueResponseText.match(leagueRegex);
        if (!_.isNull(leagueRegexMatch) && _.isArray(leagueRegexMatch)
          && leagueRegexMatch.length > 0) {
          _.each(leagueResponseText.match(leagueRegex), (leagueRegexLine) => {
            leagueRegex.lastIndex = 0;
            const leagueRegexExec = leagueRegex.exec(leagueRegexLine);
            leagueIds.push(leagueRegexExec[1]);
          });
          return Promise.map(leagueIds, (leagueId) => {
            return new Promise((leagueResolve, leagueReject) => {
              return axios(Url.resolve(this.leagueCrawlURL[marketId], `/web-root/flexible/odds-display/main.aspx?sport=1&param=1,${marketId},${leagueId}&promo=0`), {withCredentials: true})
                .then((eventResponse) => {
                  const aspxPageArr = { 0: 'live-data.aspx', 1: 'today-data.aspx', 2: 'early-market-data.aspx' };
                  if (!(leagueId in this.lastCallStepArr)) this.lastCallStepArr[leagueId] = 0;
                  return axios(Url.resolve(this.leagueCrawlURL[marketId], `/web-root/flexible/odds-display/${aspxPageArr[marketId]}?param=${this.lastCallStepArr[leagueId]},1,${marketId},2,0,0&promo=0` ), {withCredentials: true})
                })
                .then(eventJsonResponse => eventJsonResponse.data)
                .then((eventJsonResponseJSON) => {
                  leagueResolve({ leagueId, responseText: eventJsonResponseJSON });
                })
                .catch((err) => {
                  leagueReject(err);
                });
            });
          }, { concurrency: 1 })
            .then((tmpResponses) => {
              Promise.map(tmpResponses, (jsResponse) => {
                return new Promise ((parseResolve, parseReject) => {
                  // console.log(jsResponse)
                  const leagueId = jsResponse.leagueId;
                  let tmpStr = jsResponse.responseText;
                  if (tmpStr.indexOf('onUpdate') >= 0) {
                    tmpStr = tmpStr.split(');');
                    tmpStr = tmpStr[0].split('onUpdate(');
                    // console.log(tmpStr[1].replace(/\'/g, '"').replace(/,,/g, ',null,').replace(/,,/g, ',null,'))
                    tmpStr = tmpStr[1].replace(/'/g, '"').replace(/,,/g, ',null,').replace(/,,/g, ',null,').replace(/\[,/g, '[null,')
                      .replace(/,]/g, ',null]');
                    // console.log(tmpStr)
                    const tmpJson = JSON.parse(tmpStr);
                    this.lastCallStepArr[leagueId] = tmpJson[0];
                    // console.log(tmpJson)
                    if (!_.isNil(tmpJson[2][0]) && !_.isNil(tmpJson[2][0][0])) {
                      var leagueName = tmpJson[2][0][0][1];
                      // console.log('leagueName: %s', leagueName)
                      // this._infoHandler.delaySetLeague(this.providerCode, leagueId, leagueName)
                      this.DBHandler.delaySetLeague(this.providerCode, leagueId, leagueName);
                    }
                    if (!_.isNil(tmpJson[2][1]) && !_.isNil(tmpJson[2][1][0])) {
                      var eventId = null
                      var homeTeam = null
                      var awayTeam = null
                      _.each(tmpJson[2][1], leagueArr => {
                        eventId = leagueArr[0]
                        console.debug('eventId : %s', eventId)
                        homeTeam = leagueArr[3]
                        awayTeam = leagueArr[4]
                        console.debug('sbo:eventId = %s, leagueId = %s', eventId, leagueId)
                        // this._infoHandler.delaySetEvent(this.providerCode, leagueId, eventId, homeTeam, awayTeam, '0', {})
                        this.DBHandler.delaySetEvent(this.providerCode, leagueId, eventId, homeTeam, awayTeam, '0', {});
                      })
                    }
                    if(!_.isNil(tmpJson[2][2]) && !_.isNil(tmpJson[2][2][0])) {
                      var specialCode = null
                      _.each(tmpJson[2][2], specialCodeEntry => {
                        this.specialCodeInfoCache[specialCodeEntry[0]] = eventId
                      })
                    }
                    if(!_.isNil(tmpJson[2][5]) && !_.isNil(tmpJson[2][5][0])) {
                      var gameId = null
                      var gameTypeStr = ''
                      var gamePeriod = null // 0 - full time , 1 - halftime
                      var gameType = null // 'handicap' or 'ou'
                      var gameTypeDigit = null
                      _.each(tmpJson[2][5], (gameArr) => {
                        gameId = gameArr[0];
                        if (!_.isNull(gameArr[1])) {
                          if (!(gameId in this.gameIdInfoCache)) {
                            this.gameIdInfoCache[gameId] = {};
                            this.gameIdInfoCache[gameId]['eventId'] = null;
                            this.gameIdInfoCache[gameId]['gameTypeDigit'] = null;
                            this.gameIdInfoCache[gameId]['gameTypeStr'] = null;
                          }
                          this.gameIdInfoCache[gameId]['eventId'] = this.specialCodeInfoCache[gameArr[1][0]];
                          this.gameIdInfoCache[gameId]['gameTypeDigit'] = gameArr[1][1];
                          eventId = this.gameIdInfoCache[gameId]['eventId'];
                          gameTypeDigit = gameArr[1][1];
                          switch (gameTypeDigit) {
                            case 1:
                              gamePeriod = 0
                              gameType = 'handicap'
                              break;
                            case 7:
                              gamePeriod = 1
                              gameType = 'handicap'
                              break;
                            case 3:
                              gamePeriod = 0
                              gameType = 'ou'
                              break;
                            case 9:
                              gamePeriod = 0
                              gameType = 'ou'
                              break;
                            default:
                              gamePeriod = null
                              gameType = ''
                          }
                          if(!_.isNull(gamePeriod) && gameType != '') {
                            // gameTypeStr = this._infoHandler.encodeGameType(gamePeriod, 'all', gameType, numeral(Number(gameArr[1][4])).format('0.00'))
                            gameTypeStr = this.DBHandler.encodeGameType(gamePeriod, 'all', gameType, numeral(Number(gameArr[1][4])).format('0.00'));
                            this.gameIdInfoCache[gameId]['gameTypeStr'] = gameTypeStr
                          } else {
                            this.gameIdInfoCache[gameId]['gameTypeStr'] = ''
                            gameTypeStr = ''
                          }
                        } else {
                          if (gameId in this.gameIdInfoCache) {
                            eventId = this.gameIdInfoCache[gameId]['eventId']
                            gameTypeDigit = this.gameIdInfoCache[gameId]['gameTypeDigit']
                            gameTypeStr = this.gameIdInfoCache[gameId]['gameTypeStr']
                          } else {
                            console.warning('sbo: gameId not found in cache : %s', gameId)
                            this.lastCallStepArr[leagueId] = 0
                          }
                        }

                        if(gameTypeStr != '') {
                          this._infoHandler.delaySetGame(this.providerCode, eventId, gameId, gameTypeStr, {})
                          var homeOddsCode = gameId + '-home'
                          var awayOddsCode = gameId + '-away'
                          console.debug('sbo:providerCode:%s, eventId:%s, gameId:%s, gameTypeStr:%s odds: %s - %s, %s', this.providerCode, eventId, gameId, gameTypeStr, gameTypeStr, gameArr[2][0], gameArr[2][1])
                          if (!_.isNull(gameArr[2][0])) this._infoHandler.delaySetOdds(this.providerCode, eventId, gameId, gameTypeStr, homeOddsCode, 0, numeral(Number(gameArr[2][0]) + 1).format('0.000'), -1, {})
                          if (!_.isNull(gameArr[2][1])) this._infoHandler.delaySetOdds(this.providerCode, eventId, gameId, gameTypeStr, awayOddsCode, 1, numeral(Number(gameArr[2][1]) + 1).format('0.000'), -1, {})
                        }
                      })
                    }
                    this._infoHandler.flushLeague()
                    this._infoHandler.flushEvent()
                    this._infoHandler.flushGame()
                    this._infoHandler.flushOdds()
                  }
                  parseResolve(true)
              })
            }, {concurrency: 1})
          })
          setTimeout(() => this.crawl(marketId), this.config.updateDuration)
        } else {
          console.log('no today market from sbo')
        }
    })
  }


  reset() {
    this.isLoggedIn = false;
    // rp(_.extend({}, this.loginOptions, {url: 'http://www.apiisn.com/betting/api/member/login'})).then((response) => {
    return this.login();
  }

  start() {
    console.log('sbo->start');
    return this.reset();
  }
}
module.exports = sbo

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
const qs = require('querystring');
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


    this.gameTypeRegex = /.+? (-?\d*\.{0,1}\d+) @/g;

    this.isLoggedIn= false;
    this.isAPIKeyReady = false;
    this.isMemberInfoReady = false;
    this.lastCallStepArr = {};
    this.gameIdInfoCache = {};
    this.specialCodeInfoCache = {};

    this.baseURL = '';
    this.marketCrawlURL = {};
    this.leagueCrawlURL = {};

    this.defaultOptions = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36' };
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
    return axios('http://wap.beer777.com/web_root/public/login.aspx', { withCredentials: true })
      .then((response) => {
        console.log(response);
        if (_.has(response.request, 'res') && _.has(response.request.res, 'responseUrl')) {
          const targetUrl = response.request.res.responseUrl;
          let $ = cheerio.load(response.data);
          // let fd = new FormData();
          let fd = {};
          fd.ctl01$nUsername = this.config.username;
          fd.ctl01$nPassword = this.config.password;
          fd.__EVENTTARGET = 'cmd_english_login';
          fd.__EVENTARGUMENT = 'Form1';
          const url = Url.resolve(targetUrl, String($('#Form1').attr('action')));
          const origin = Url.parse(targetUrl);
          return axios(url, { method: 'post', data: qs.stringify(fd), withCredentials: true, headers: this.defaultOptions });
          // return axios.post(url, qs.stringify(fd));
        } else {
          return false;
        }

      })
      .then((loginResponse) => {
        console.log('------------------------------------');
        this.isLoggedIn = true;
        this.baseURL = loginResponse.request.res.responseUrl;
        console.log(this.baseURL);
        this.marketCrawlURL['today'] = Url.resolve(this.baseURL, 'odds-sport.aspx?page=1');
        this.marketCrawlURL['live'] = Url.resolve(this.baseURL, 'odds-sport.aspx?page=3');
        this.marketCrawlURL['early'] = Url.resolve(this.baseURL, 'odds-sport.aspx?page=2');

        setTimeout(() => { this.crawl('early'); }, 1);
      });
  }


  extractEventInfo(eventStr) {
    let returnResult = {};
    if (eventStr.substring(0, 1) === '[') {
      returnResult.hasExtraInfo = true;
      const idx = eventStr.indexOf(']') + 1;
      const extraInfo = eventStr.substring(0, idx);
      eventStr = eventStr.substring(idx + 1);

    } else {
      returnResult.hasExtraInfo = false;
    }

    returnResult.homeTeam = eventStr.substring(0, eventStr.indexOf('-vs-')).trim();
    returnResult.awayTeam = eventStr.substring(eventStr.indexOf('-vs-') + 4).trim();

    console.log('extractEventInfo:"home:%s, away:%s"', returnResult.homeTeam, returnResult.awayTeam);
    return returnResult;

  }

  regexMatch(content, pattern) {
    pattern.lastIndex = 0;
    const patternMatch = content.match(pattern);
    const resultArr = [];
    if (!_.isNull(patternMatch) && _.isArray(patternMatch)
    && patternMatch.length > 0) {
      /*
      console.log('--regexMatch');
      console.log(patternMatch);
      console.log('regexMatch--');
      */
      _.each(patternMatch, (matchLine) => {
        pattern.lastIndex = 0;
        resultArr.push(pattern.exec(matchLine));
      });
      return resultArr;
    }
    return []; 
  }

  crawlAndMatch(url, patternRegex, isGame = false) {
    console.log('url:%s' , url);
    return axios(url, _.extend({}, this.defaultOptions, {withCredentials: true}))
      .then((response) => {
        if (!isGame) {
          return Promise.resolve(this.regexMatch(response.data, patternRegex));
        }
        const HDPRegex ={ period:0, gameType:'handicap', pattern: /Handicap[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
        const OURegex = { period:0, gameType:'ou', pattern: /Over\/Under[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
        const firstHalfHDPRegex = { period:1, gameType:'handicap', pattern: /First Half Hdp[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
        const firstHalfOURegex = { period:1, gameType:'ou', pattern: /First Half O\/U[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
        let returnResult = {};
        _.each({ HDPRegex, OURegex, firstHalfHDPRegex, firstHalfOURegex }, (regex) =>{
          // console.log(response.data);
          const patternMatch = this.regexMatch(response.data, regex.pattern);
          // const patternMatch = response.data.match(regex.pattern);
          const resultArr = [];
          if (patternMatch.length > 0) {
            console.log('game found: %s-%s, length:%d', regex.gameType, regex.period, patternMatch.length);
            _.each(patternMatch, (matchLine) => {
              // console.log('--%s--', matchLine);
              const tmpArr = this.regexMatch(matchLine[0], patternRegex);
              // console.log(tmpArr);
              _.each(tmpArr, (tmpArrItem) => {
                resultArr.push([tmpArrItem[0], tmpArrItem[1], tmpArrItem[2]]);
              });
              // console.log(tmpArr[0][2]);
              let tmpStr = (tmpArr[0][2]).split(' @');
              tmpStr = tmpStr[0].split(' ');
              // console.log(tmpStr[tmpStr.length - 1]);
              const gameType = this.DBHandler.encodeGameType(regex.period, 'all', regex.gameType, tmpStr[tmpStr.length - 1]);
              if (!_.has(returnResult, gameType) || !_.isArray(returnResult.gameType)) returnResult[gameType] = [];
              returnResult[gameType].push(resultArr);
            });
            // console.log('returnResult');
            // console.log(returnResult);
          }
        });
        return Promise.resolve(returnResult);
      });
  }

  crawl(marketId) {
    console.log(this.marketCrawlURL[marketId]);
    return axios(this.marketCrawlURL[marketId], _.extend({}, this.defaultOptions, { withCredentials: true }))
      .then(() => this.crawlAndMatch(Url.resolve(this.baseURL, 'odds-league.aspx?sport=1'), /odds-match.aspx\?league=(\d*)">(.+?)<\/a>/g))
        //return axios(Url.resolve(this.baseURL, 'odds-league.aspx?sport=1'), _.extend({}, this.defaultOptions, {withCredentials: true}));
      .catch(error => console.log(error))
      .then((leagueRegexResultArr) => {
        if (leagueRegexResultArr.length > 0) {
          return Promise.map(leagueRegexResultArr, (leagueRegexResult) => {
            const leagueName = leagueRegexResult[2];
            const leagueId = leagueRegexResult[1];
            this.DBHandler.delaySetLeague(this.providerCode, leagueId, leagueName);
            return this.crawlAndMatch(Url.resolve(this.baseURL, `odds-match.aspx?league=${leagueId}`), /odds-main.aspx\?match=(\d*)">(.+?)<\/a>/g)
            .then((matchRegexResultArr) => Promise.map(matchRegexResultArr, (matchRegexResult) => {
              let returnValue = null;
              const matchName = matchRegexResult[2];
              const matchId = matchRegexResult[1];
              const eventInfo = this.extractEventInfo(matchName);
              this.DBHandler.delaySetEvent(this.providerCode, leagueId, matchId,
                eventInfo.homeTeam, eventInfo.awayTeam, '0',
                {});
              const gameRegex = /ticket.aspx\?(.+?)">(.+?)<\/a>/g;
              return this.crawlAndMatch(Url.resolve(this.baseURL, `odds-main.aspx?match=${matchId}`), gameRegex, true)
              .then((gameRegexResult) => {
                console.log('gameRegexResult');
                
                return axios(Url.resolve(this.baseURL, 'odds-league.aspx?page=2&sport=1'), _.extend({}, this.defaultOptions, { withCredentials: true }))
                .then(Promise.all([this.DBHandler.flushLeague(), this.DBHandler.flushEvent()]))
                .then(() => gameRegexResult);
              });
            }))
            .then(tmpResult => tmpResult);
          }, { concurrency: 1 })
          .then((tmpResponses) => {
            console.log('finished?????????');
          })
        } 
        console.log('no today market from sbo');
        return Promise.resolve([]);
      });
      setTimeout(() => this.crawl(marketId), this.config.updateDuration);
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

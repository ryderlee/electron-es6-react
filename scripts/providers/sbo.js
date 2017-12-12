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
const moment = require('moment-timezone');

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
    this.marketIdPage = {};
    this.leagueCrawlURL = {};

    this.defaultOptions = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36' };
  }
    // this.browser = new Nightmare({show: true}).useragent("Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/8.0 Mobile/11A465 Safari/9537.53")
    // this.browser = new Horseman().userAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/8.0 Mobile/11A465 Safari/9537.53")
    // this.browser = new Zombie()

  getUniqueCode(){
    return `${this.providerCode}-${this._username}`;
  }

  isReady(){
    return true;
  }
  setProviderKey(key) {
    this._providerKey = key;
  }
  setConfig(config) {
    super.setConfig(config);
    this._username = this.config.username;
  }

  login() {
    console.debug('sbo->login');
    // return axios('http://wap.beer777.com/web_root/public/login.aspx', { withCredentials: true })
    return this.myCrawl('http://wap.beer777.com/web_root/public/login.aspx')
      .then((response) => {
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
        this.marketIdPage['today'] = 1;
        this.marketIdPage['live'] = 3;
        this.marketIdPage['early'] = 2;

        setTimeout(() => { this.crawl('early'); }, 1);
      });
  }

  // eslint-disable-next-line class-methods-use-this
  extractEventInfo(marketId, eventStr) {
    let returnResult = {};
    if (eventStr.substring(0, 1) === '[') {
      returnResult.hasExtraInfo = true;
      const idx = eventStr.indexOf(']') + 1;
      const extraInfo = eventStr.substring(0, idx);
      let datetime = null;
      let timeInfo = extraInfo.replace('[', '').replace(']', '');
      if(timeInfo.indexOf('!Live') > -1) {
        //today game
        const today = moment.tz('Asia/Hong_Kong').format('YYYY-MM-DD');
        const tomorrow = moment.tz('Asia/Hong_Kong').add(1, 'day').format('YYYY-MM-DD');
        timeInfo = timeInfo.replace(' !Live', '');
        datetime = moment.tz(`${today} ${timeInfo}:00`, 'YYYY-MM-DD HH:mm:ss', 'Asia/Hong_Kong').utc().toDate();
        const now = new Date();
        if(datetime < now) datetime = moment.tz(`${tomorrow} ${timeInfo}:00`, 'YYYY-MM-DD HH:mm:ss', 'Asia/Hong_Kong').utc().toDate();
        returnResult.isLive = false;
      } else if(marketId === 'early') {
        returnResult.isLive = false;
        if(timeInfo.indexOf('**:**') > -1) {
          //future game
          timeInfo = timeInfo.replace(' **:**', '');
          if((timeInfo.split('/').length > 2))  datetime = moment.tz(`${timeInfo} 00:00:00`, 'MM/DD/YYYY HH:mm:ss', 'Asia/Hong_Kong').utc().toDate();
          else datetime = moment.tz(`${timeInfo}/${moment.tz('Asia/Hong_Kong').format('YYYY')} 00:00:00`, 'MM/DD/YYYY HH:mm:ss', 'Asia/Hong_Kong').utc().toDate();
          // console.log('%s %s', timeInfo, moment(datetime).tz('Asia/Hong_Kong').format('YYYYMMDDHHmmss'));
        } else {
          const tmpArr = timeInfo.split(' ');
          const date = tmpArr[0];
          const time = tmpArr[1];
          datetime = moment.tz(`${date}/${moment.tz('Asia/Hong_Kong').format('YYYY')} ${time}:00`, 'MM/DD/YYYY HH:mm:ss', 'Asia/Hong_Kong').utc().toDate();
        }
      } else {
        //live game
        if(timeInfo.indexOf('1H') > -1){
          datetime = moment.tz('Asia/Hong_Kong').subtract(parseInt(timeInfo.replace('1H ', '').replace('\'', '')), 'minutes').utc().toDate();
          returnResult.isLive = true;
        } else if (timeInfo.indexOf('2H') > -1) {
          datetime = moment.tz('Asia/Hong_Kong').subtract(1, 'hour').subtract(parseInt(timeInfo.replace('2H ', '').replace('\'', '')), 'minutes').utc().toDate();
          returnResult.isLive = true;
        } else {
          returnResult.isLive = true;
          datetime = moment.tz('Asia/Hong_Kong').utc().toDate();
        }
      }
      returnResult.datetime = datetime;
      eventStr = eventStr.substring(idx + 1);
    } else {
      returnResult.hasExtraInfo = false;
    }

    returnResult.homeTeam = qs.unescape(eventStr.substring(0, eventStr.indexOf('-vs-')).trim());
    returnResult.awayTeam = qs.unescape(eventStr.substring(eventStr.indexOf('-vs-') + 4).trim());

    // console.log('extractEventInfo:"home:%s, away:%s"', returnResult.homeTeam, returnResult.awayTeam);
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

  async myCrawl(url) {
    console.debug('url:%s', url);
    return axios(url, _.extend({}, this.defaultOptions, { withCredentials: true }));
  }
  async goingBack(responseData) {
    const regex = /<a href="(.[^"]+?)">(.[^"]+?)<\/a> <\/form>/g;
    const matches = this.regexMatch(responseData, regex);
    if (matches.length > 0) {
      console.debug('going back success<------');
      await this.myCrawl(Url.resolve(this.baseURL, matches[0][1]));
    } else {
      // console.log(responseData);
      console.log('no going back <-------');
    }
    return Promise.resolve(this);
  }

  async crawlAndMatch(url, patternRegex, isGoingBack = false, isGame = false, debugInfo = null) {
    const response = await this.myCrawl(url);
    if (!isGame) {
      // console.log(response.data);
      return Promise.resolve(this.regexMatch(response.data, patternRegex));
    }
    const HDPRegex ={ period:0, gameType:'handicap', pattern: /Handicap[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
    const OURegex = { period:0, gameType:'ou', pattern: /Over\/Under[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
    const firstHalfHDPRegex = { period:1, gameType:'handicap', pattern: /First Half Hdp[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
    const firstHalfOURegex = { period:1, gameType:'ou', pattern: /First Half O\/U[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>[\s\S]+?<a href="ticket.aspx?(.+?)">(.+?)<\/a>/g };
    const returnResult = {};
    _.each({ HDPRegex, OURegex, firstHalfHDPRegex, firstHalfOURegex }, (regex) => {
      // console.log(response.data);
      const patternMatch = this.regexMatch(response.data, regex.pattern);
      // const patternMatch = response.data.match(regex.pattern);
      const resultArr = [];
      // if (!_.isNull(debugInfo)) console.log(debugInfo);
      if (patternMatch.length > 0) {
        console.debug('game found: %s %s-%s, length:%d', debugInfo, regex.gameType, regex.period, patternMatch.length);
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
          /*if (!_.has(returnResult, gameType) || !_.isArray(returnResult.gameType)) returnResult[gameType] = [];
          returnResult[gameType].push(resultArr);
          */
          if (!_.has(returnResult, gameType)) returnResult[gameType] = null;
          returnResult[gameType] = resultArr;
        });
        // console.log('returnResult');
        // console.log(returnResult);
      } else {
        console.log('game not found! - %s, %s, %s', debugInfo, regex.gameType, regex.period);
        // console.log(response.data);
      }
    });
    if (isGoingBack) await this.goingBack(response.data);
    return Promise.resolve(returnResult);
  }

  async crawl (marketId) {
    try {
      await this.myCrawl(Url.resolve(this.baseURL, `odds-sport.aspx?page=${this.marketIdPage[marketId]}`));
      // await axios(Url.resolve(this.baseURL, `odds-sport.aspx?page=${this.marketIdPage[marketId]}`), _.extend({}, this.defaultOptions, { withCredentials: true }));
      const leagueRegexResultArr = await this.crawlAndMatch(Url.resolve(this.baseURL, 'odds-league.aspx?sport=1'), /odds-match.aspx\?league=(\d*)">(.+?)<\/a>/g);
      if (leagueRegexResultArr.length > 0) {
        const tmpResponses = await Promise.map(leagueRegexResultArr, async (leagueRegexResult) => {
          const leagueName = leagueRegexResult[2];
          const leagueId = leagueRegexResult[1];
          this.DBHandler.delaySetLeague(this.providerCode, leagueId, leagueName);
          const matchRegexResultArr = await this.crawlAndMatch(Url.resolve(this.baseURL, `odds-match.aspx?league=${leagueId}`)
            , /odds-main.aspx\?match=(\d*)">(.+?)<\/a>/g);
          console.log('%s -> size : %d', leagueId, matchRegexResultArr.length);
          const tmpResult = await Promise.map(matchRegexResultArr, async (matchRegexResult) => {
            const matchName = matchRegexResult[2];
            const matchId = matchRegexResult[1];
            const eventInfo = this.extractEventInfo(marketId, matchName);
            this.DBHandler.delaySetEvent(this.providerCode, leagueId, matchId,
              eventInfo.homeTeam, eventInfo.homeTeam, eventInfo.awayTeam, eventInfo.awayTeam, '0', eventInfo.datetime, eventInfo.isLive);
            const gameRegex = /ticket.aspx\?(.+?)">(.+?)<\/a>/g;
            const gameRegexResults = await this.crawlAndMatch(Url.resolve(this.baseURL, `odds-main.aspx?match=${matchId}`), gameRegex, true, true, `${eventInfo.homeTeam}-${eventInfo.awayTeam}`);
            // console.log('gameRegexResult - %s', `${eventInfo.homeTeam}-${eventInfo.awayTeam}`);
            _.each(gameRegexResults, (gameRegexResult, key) => {
              const gameType = key;
              // console.log(gameRegexResult);
              const gameCode = `${this.providerCode}-${matchId}-${gameType}`;
              this.DBHandler.delaySetGame(this.providerCode, leagueId, matchId, gameCode, gameType);
              _.each(gameRegexResult, (gameRegexResultIndividual) => {
                const urlResult = Url.parse(Url.resolve(this.baseURL, `ticket.aspx?${gameRegexResultIndividual[1]}`), true);
                // console.log(urlResult);
                const isHomeOrAway = (urlResult.query.option === 'h' ? 0 : 1);
                this.DBHandler.delaySetOdds(this.providerCode, leagueId, matchId, gameCode, gameType,
                  // `${leagueId}_${matchId}_${gameCode}_u${urlResult.query.id}_${isHomeOrAway}`, isHomeOrAway, urlResult.query.odds, -1);
                  `${leagueId}_${matchId}_${gameCode}_${isHomeOrAway}`, isHomeOrAway, urlResult.query.odds, -1);
              });
            });
            return Promise.resolve(gameRegexResults);
          }, { concurrency: 4 });
          await this.myCrawl(Url.resolve(this.baseURL, `odds-league.aspx?page=${this.marketIdPage[marketId]}&sport=1`));
          await this.DBHandler.flushLeague();
          await this.DBHandler.flushEvent();
          await this.DBHandler.flushGame();
          await this.DBHandler.flushOdds();
          return tmpResult;
        }, { concurrency: 1 });
        console.log('finished?????????');
      } 
      console.log(`no ${marketId} market from sbo`);
      return Promise.resolve([]);
    } catch (error) {
      console.error(error);
    }
    
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

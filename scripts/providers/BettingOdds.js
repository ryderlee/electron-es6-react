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
const moment = require('moment');
// const fetch = require('fetch-cookie')(require('node-fetch'))
// let needle = require('needle')
const connectionBase = require('./connectionBase');

class bettingOdds extends connectionBase {
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
    this.providerCode = 'bettingOdds';
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

    this.baseURL = 'https://bettingodds-bettingoddsapi-v1.p.mashape.com/';
    this.marketIdPage = {};
    this.leagueCrawlURL = {};

    this.defaultOptions = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36', 'Accept':'application/json' };
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
    this.defaultOptions = _.extend({}, this.defaultOptions, { headers: { 'X-Mashape-Key': config.config.x_mashape_key, 'X-Mashape-Host': config.config.x_mashape_host } });
    return true;
  }
  getUniqueCode() {
    return `${this.providerCode}`;
  }
  async init (){
    return Promise.resolve(true);
  }
  login() {
    console.log('bettingOdds->login');
    // return axios('http://wap.beer777.com/web_root/public/login.aspx', { withCredentials: true })
    return Promise.resolve(true);
  }


  async myCrawl(url) {
    console.log('url:%s', url);
    return axios(url, _.extend({}, this.defaultOptions, { withCredentials: true }));
  }

  async crawl() {
    const leaguePromise = Url.resolve(this.baseURL, '/leagues');
    const todayPromise = Url.resolve(this.baseURL, `/events/${moment.utc().format('YYYY-MM-DD')}`);
    const day1stPromise = Url.resolve(this.baseURL, `/events/${moment.utc().add(1, 'd').format('YYYY-MM-DD')}`);
    const day2ndPromise = Url.resolve(this.baseURL, `/events/${moment.utc().add(2, 'd').format('YYYY-MM-DD')}`);
    const day3rdPromise = Url.resolve(this.baseURL, `/events/${moment.utc().add(3, 'd').format('YYYY-MM-DD')}`);



    const leaguePromiseResult = await this.myCrawl(leaguePromise);

    const leagueCache = {};
    _.each(leaguePromiseResult, (value, key) => {
      if (value.sport === 'Soccer') {
        this.DBHandler.delaySetSOTLeague(this.providerCode, key, value.name);
        leagueCache[key] = value.name;
      }
    });
    await this.DBHandler.flushSOTLeague();

    const promiseResults = await Promise.map([todayPromise, day1stPromise, day2ndPromise, day3rdPromise], async (promise) => {
      return this.myCrawl(promise);
    });
    const resultContentArr = [];
    _.each(promiseResults, (promiseResult) => {
      _.each(promiseResult.data, (value, key) => {
        resultContentArr.push(value);
      });
    });
    const resultContentSortedArr = _.orderBy(resultContentArr, [ function(o) { return o.datetime.value }, function(o) {return o.isAPIKeyReady} ]);
    /*

    [ { datetime: { value: '2017-11-23 00:00:00', timezone: 'UTC' },
    home: { id: 375121, name: 'Alianza Lima' },
    away: { id: 375116, name: 'UTC Cajamarca' },
    league: { id: 20340, name: 'Peru - Primera Division' },
    sport: { id: 10, name: 'Soccer' },
    id: '25789383069' },
  { datetime: { value: '2017-11-23 00:00:00', timezone: 'UTC' },
    home: { id: 375127, name: 'Alianza Atletico' },
    away: { id: 375116, name: 'UTC Cajamarca' },
    league: { id: 20340, name: 'Peru - Primera Division' },
    sport: { id: 10, name: 'Soccer' },
    id: '25789565952' },
    */
    _.each(resultContentSortedArr, (resultContent) => {
      if (!_.has(leagueCache, resultContent.league.id)) {
        this.DBHandler.delaySetSOTLeague(this.providerCode, resultContent.league.id, resultContent.league.name);
        leagueCache[resultContent.league.id] = resultContent.league.name;
      }
      console.log('%s, %s, %s', this.providerCode, resultContent.home.name, resultContent.away.name);
      this.DBHandler.delaySetSOTEvent(this.providerCode, resultContent.league.id,
        resultContent.id, resultContent.home.id, resultContent.home.name,
        resultContent.away.id, resultContent.away.name,
      '0', moment(`${resultContent.datetime.value} +0000`, 'YYYY-MM-DD HH:mm:ss Z').utc().format());
    });
    const result = await Promise.all([this.DBHandler.flushSOTLeague(), this.DBHandler.flushSOTEvent()]);
    return Promise.resolve(result);

  }

  async reset() {
    this.isLoggedIn = false;
    // rp(_.extend({}, this.loginOptions, {url: 'http://www.apiisn.com/betting/api/member/login'})).then((response) => {
    const loginResult = await this.login();
    console.log('loginResult:%s', loginResult);
    if (loginResult) return this.crawl();
    return Promise.reject([]);
  }

  async start() {
    console.log('bettingOdds->start');
    return this.reset();
  }
}
module.exports = bettingOdds

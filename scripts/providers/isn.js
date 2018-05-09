const connectionBase = require('./connectionBase'); 
const _ = require('lodash');
// const rp = require('request-promise')
let numeral = require('numeral');
const moment = require('moment');
const sleep = require('sleep-promise');
const qs = require('querystring');
// const ReactDataGridPlugins = require('react-data-grid/addons')

class isn extends connectionBase {
  constructor() {
    console.log('isn->constructor');
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
    this.loginTimeout = null;
    this.providerCode = 'isn';
    this.gameIdToGameType = {};
    this.eventIdToLeagueCode = {};
    this.marketSelectionIdToGameTypeStr = {};
    this.priceBuffer = [];
    this.isEventListFirstCallCompleted = false;
    this.isEventPriceFirstCallCompleted = false;
    this.previousEventPriceResponse = {};
    this.previousEventResponse = {};

    this.isLogInReady = false;
    this.isAPIKeyReady = false;
    this.isMemberInfoReady = false;
    this.isAvailableForBetting = false;

    this.hasLive = false;

    this.defaultOptions = {
      responseType: 'json', // Automatically parses the JSON string in the response
    };

    this.eventScheduleIdToString = {};
  }
  async start() {
    console.log('isn->start');
    return this.reset();
  }
  isReady() {
    return true;
  }
  setConfig (config) {
    super.setConfig(config);
    this._username = this.config.username;
    this.loginOptions = _.extend({}, this.defaultOptions, {
      method: 'post',
      headers: {
        'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      data: `userName=${this.config.username}&password=${this.config.password}`
    });
    this.apiKeyOptions = _.extend({}, this.defaultOptions, {
      method: 'get',
      headers: {
        userId: '',
        memberToken: '',
      },
    });
    this.apiOptions = _.extend({}, this.apiKeyOptions, {
      method: 'get',
      headers: {
        apiKey: '',
      },
    });
    this.memberInfoOptions = {
      lastRequestKey: '',
      oddsGroupId: '',
      binaryOddsFormat: '',
    };
  }
  async callAPIGetEventList(eventScheduleId) {
    console.log('isn->callAPIGetEventList:%s', eventScheduleId);
    let eventArr = {};
    // rp(_.extend({}, this.apiOptions, { url: ('http://www.apiisn.com/betting/api/event/list/' + this.config.sportId + '/' + this.config.eventScheduleId) })).promise().bind(this).then(function (response) {
    return this.axios(`http://www.apiisn.com/betting/api/event/list/${this.config.sportId}/${eventScheduleId}`, _.extend({}, this.apiOptions))
      .then(async (response) => {
        // let responseStr = JSON.stringify(response);
        // if (responseStr === this.previousEventResponse) {
        if (_.has(this.previousEventResponse, eventScheduleId)) this.previousEventResponse[eventScheduleId] = '';
        if (_.isEqual(response.data, this.previousEventResponse[eventScheduleId])) {
          console.info('eventJson is same');
        } else {
          console.log('eventJson is diff');
          // this.previousEventResponse = responseStr;
          this.previousEventResponse[eventScheduleId] = response.data;
          eventArr = {};
          let leagueCode = '';
          let gameTypeStr = '';
          if (eventScheduleId === 3) this.hasLive = false; // to reset the hasLive flag
          const toInternalEventScheduleIdArr = {1:'2', 2:'1', 3:'0'};
          _.each(response.data, (league) => {
            leagueCode = `${this.providerCode}-${league.leagueName}`;
            this.DBHandler.delaySetLeague(this.providerCode, leagueCode, league.leagueName);
            _.each(league.events, (event) => {
              
              const isLive = String(toInternalEventScheduleIdArr[eventScheduleId]);
              if (eventScheduleId === 3 && !this.hasLive) {
                this.hasLive = true;
              }


              this.DBHandler.delaySetEvent(this.providerCode, leagueCode, event.id, event.homeTeamId, event.homeTeamName, event.awayTeamId, event.awayTeamName, '0', moment.unix(event.startTime / 1000).toDate(), isLive);
              this.eventIdToLeagueCode[event.id] = leagueCode;
              // console.log('%s - %s vs %s', row.leagueName, event.homeTeamName, event.awayTeamName)
              _.each(event.markets, (market) => {
                gameTypeStr = '';
                if (this.gameIdToGameType) {
                  this.gameIdToGameType[String(market.id)] = [];
                }

                switch (market.marketType) {
                  case 'HT OU' :
                  case 'OU' :
                  case 'RB OU':
                  case 'RB HT OU':
                    _.each(market.marketLines, (marketLine) => {
                      const overIdx = _.findIndex(marketLine.marketSelections, { name: 'Over' });
                      const underIdx = _.findIndex(marketLine.marketSelections, { name: 'Under' });
                      if (overIdx < 0 || underIdx < 0) {
                        console.error('Over/under not found');
                      } else {
                        const gamePeriod = (_.includes(market.marketType, 'HT') ? 1 : 0);
                        gameTypeStr = this.DBHandler.encodeGameType(gamePeriod, 'all', 'ou', numeral(Number(marketLine.marketSelections[overIdx].handicap)).format('0.00'));

                        this.gameIdToGameType[String(market.id)][0] = marketLine.marketSelections[overIdx].marketSelectionId;
                        this.gameIdToGameType[String(market.id)][1] = marketLine.marketSelections[underIdx].marketSelectionId;
                        this.marketSelectionIdToGameTypeStr[marketLine.marketSelections[overIdx].marketSelectionId] = gameTypeStr;
                        this.marketSelectionIdToGameTypeStr[marketLine.marketSelections[underIdx].marketSelectionId] = gameTypeStr;
                        this.DBHandler.delaySetGame(this.providerCode, leagueCode, event.id, market.id, gameTypeStr);
                      }
                    });
                    break;
                  case 'HT AH' :
                  case 'AH' :
                  case 'RB AH':
                  case 'RB HT AH':
                    _.each(market.marketLines, (marketLine) => {
                      const homeIdx = _.findIndex(marketLine.marketSelections, { name: event.homeTeamName });
                      const awayIdx = _.findIndex(marketLine.marketSelections, { name: event.awayTeamName });
                      if (homeIdx < 0 || awayIdx < 0) {
                        console.error('home/away team not found');
                      } else {
                        const gamePeriod = (_.includes(market.marketType, 'HT') ? 1 : 0);
                        gameTypeStr = this.DBHandler.encodeGameType(gamePeriod, 'all', 'handicap', numeral(Number(marketLine.marketSelections[homeIdx].handicap)).format('0.00'));
                        this.gameIdToGameType[String(market.id)][0] = marketLine.marketSelections[homeIdx].marketSelectionId;
                        this.gameIdToGameType[String(market.id)][1] = marketLine.marketSelections[awayIdx].marketSelectionId;
                        this.marketSelectionIdToGameTypeStr[marketLine.marketSelections[homeIdx].marketSelectionId] = gameTypeStr;
                        this.marketSelectionIdToGameTypeStr[marketLine.marketSelections[awayIdx].marketSelectionId] = gameTypeStr;
                        this.DBHandler.delaySetGame(this.providerCode, leagueCode, event.id, market.id, gameTypeStr);
                      }
                    });
                    break;
                  default:
                    // TODO:something wrong here
                    break;
                }
                /*
                _.each(market.marketSelections, _.bind(function (marketSelection) {
                  let idx = _.findIndex(this.eventList, {marketSelectionId: marketSelection.marketSelectionId})
                  // console.log('event idx: %d', idx)
                  if (idx < 0) {
                    diffCount++
                    this.priceHandler.setOdds(this.providerCode, event.id, market.id, marketSelection.marketSelectionId, idx, spread.home, period.cutoff, {eventId:event.id, period:{lineId: period.lineId, number: period.number, cutoff: period.cutoff}, spread:spread})

                    eventArr = {nativeOdds: 0.0, lastUpdate: m, addDatetime: m, handicap: 0.0, marketTypeId: market.marketTypeId, marketSelectionId: marketSelection.marketSelectionId, marketType: market.marketType, marketSelectionName: marketSelection.name, league: league.leagueName, homeTeam: event.homeTeamName, awayTeam: event.awayTeamName}
                    this.eventList.push(eventArr)
                  }
                }, this))
                _.each(market.marketLines, _.bind(function (marketLine) {
                  _.each(marketLine.marketSelections, _.bind(function (marketSelection) {
                    let idx = _.findIndex(this.eventList, {marketSelectionId: marketSelection.marketSelectionId})
                    // console.log('event idx: %d', idx)
                    if (idx < 0) {
                      diffCount++
                      // eventList.slice(idx, 1)
                      eventArr = {nativeOdds: 0.0, lastUpdate: m, addDatetime: m, handicap: Number(marketSelection.handicap), marketTypeId: market.marketTypeId, marketSelectionId: marketSelection.marketSelectionId, marketType: market.marketType, marketSelectionName: marketSelection.name, league: row.leagueName, homeTeam: event.homeTeamName, awayTeam: event.awayTeamName}
                      // TODO: pass it to priceHandler
                      this.eventList.push(eventArr)
                    }
                  }, this))
                }, this))
                */
              });
            });
          });
          await this.DBHandler.flushLeague();
          await this.DBHandler.flushEvent();
          await this.DBHandler.flushGame();

          this.isEventPriceFirstCallCompleted = true;
          console.log('end updateEventList');
        }
        return Promise.resolve(true);
      });
  }

  callAPIGetEventPrice (eventScheduleId) {
    console.log('isn->callAPIGetEventPrice:', eventScheduleId);
    // console.log('in updateEventPriceList')
    // console.log('lastRequestKey: %s, %s', this.memberInfoOptions.lastRequestKey, this.isEventReady)
    // rp(_.extend({}, this.apiOptions, {url: 'http://www.apiisn.com/betting/api/event/pricelist/' + this.config.sportId + '/' + this.memberInfoOptions.oddsGroupId + '/' + this.memberInfoOptions.binaryOddsFormat + '/' + this.config.eventScheduleId + '/' + this.memberInfoOptions.lastRequestKey})).promise().bind(this).then(function (response) {
    if (_.isUndefined(this.memberInfoOptions.lastRequestKey)) throw Error();
    return this.axios(`http://www.apiisn.com/betting/api/event/pricelist/${this.config.sportId}/${this.memberInfoOptions.oddsGroupId}/${this.memberInfoOptions.binaryOddsFormat}/${eventScheduleId}/${this.memberInfoOptions.lastRequestKey}`, _.extend({}, this.apiOptions))
      .catch((error) => {
        throw error;
        // this.reset();
      })
      .then((response) => {
        if (!_.has(this.previousEventPriceResponse, eventScheduleId)) this.previousEventPriceResponse[eventScheduleId] = '';
        const responseStr = JSON.stringify(response.data.priceList);
        if (responseStr === this.previousEventPriceResponse[eventScheduleId]) {
          console.log('eventPirceList is same');
          return false;
        }
        // console.log('eventPirceList is diff')
        // console.log('responseStr.length : %d, this.previousEeventPriceResponse.length : %d', responseStr.length, this.previousEventPriceResponse.length)
        this.previousEventPriceResponse[eventScheduleId] = responseStr;
        let tmpIdx;
        let gameTypeStr = null;

        _.each(response.data.priceList, (price) => {
          gameTypeStr = this.marketSelectionIdToGameTypeStr[price.marketSelectionId];
          tmpIdx = _.indexOf(this.gameIdToGameType[String(price.marketId)], price.marketSelectionId);
          if (tmpIdx > -1 && _.isString(gameTypeStr) && !_.isNull(gameTypeStr)) {
            this.DBHandler.delaySetOdds(this.providerCode, this.eventIdToLeagueCode[price.eventId], price.eventId, price.marketId, gameTypeStr, price.marketSelectionId, tmpIdx, price.decimalOdds, -1, price);
          } else {
            // console.log('isn->nogame->no game data yet:', price.eventId, price.marketId, price.marketSelectionId);
            // not found, could be not OU and not AH
          }
          gameTypeStr = null;
        });
        return this.DBHandler.flushOdds()
          .then(() => {
            this.memberInfoOptions.lastRequestKey = response.data.lastRequestKey;
            // this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetEventPrice, this), this.config.eventPriceUpdateDuration);
            return true;
          });
      });
    // console.log('end updateEventPrice')
  }

  async callOnce(setSchedule = false) {
    clearTimeout(this.updateEventListTimeout);
    if (this.isLoggedIn && this.isAPIKeyReady && this.isMemberInfoReady) {
      try {
        if (this.config.market.live === true) {
          await this.callAPIGetEventList(3);
          await this.callAPIGetEventPrice(3);
        }
        if (this.config.market.today === true) {
          await this.callAPIGetEventList(2);
          await this.callAPIGetEventPrice(2);
        }
        if (this.config.market.early === true) {
          await this.callAPIGetEventList(1);
          await this.callAPIGetEventPrice(1);
        }
      } catch (e) {
        console.log(e);
        this.refreshTimeout = _.delay(await _.bind(this.refresh, this), this.config.errorReconnectDuration);
      }
    }
    if (setSchedule) {
      this.updateEventListTimeout = _.delay(_.bind(await this.callOnce, this),
        this.hasLive ? this.config.liveEventUpdateDuration : this.config.eventUpdateDuration, true);
    }
    return Promise.resolve(true);
  }

  async refresh(activateTimeout = false) {
    console.log('isn->refresh');
    if (!_.isNull(this.updateAPIKeyTimeout)) {
      clearTimeout(this.updateAPIKeyTimeout);
    }
    if (this.isLoggedIn) {
      if (activateTimeout) {
        clearTimeout(this.updateEventListTimeout);
      }
      this.isAPIKeyReady = false;
      this.isMemberInfoReady = false;
      console.log('callAPIGetAPIKey');
      // rp(_.extend({}, this.apiKeyOptions, {url: 'http://www.apiisn.com/betting/api/member/apikey'})).promise().bind(this).then(function (response) {
      return this.axios('http://www.apiisn.com/betting/api/member/apikey', _.extend({}, this.apiKeyOptions))
        .catch((error) => {
          this.reset();
          return true;
        })
        .then((response) => {
          // console.log('User API success: %s ', response.apiKey)
          this.apiOptions.headers.apiKey = response.data.apiKey;
          this.isAPIKeyReady = true;
          // this.updateAPIKeyTimeout = setTimeout(_.bind(this.refresh, this), this.config.apiKeyDuration)
          this.updateAPIKeyTimeout = _.delay(_.bind(this.refresh, this), this.config.apiKeyDuration);
          // return rp(_.extend({}, this.apiOptions, {uri: 'http://www.apiisn.com/betting/api/member/info'})).promise().bind(this)
          return this.axios('http://www.apiisn.com/betting/api/member/info', _.extend({}, this.apiOptions)).then();
          // updateEventTimeout = setTimeout(updateEventList, 1, false)
        })
        .then(async (response) => {
          console.log('User info success');
          this.memberInfoOptions.binaryOddsFormat = response.data.binaryOddsFormat;
          this.memberInfoOptions.oddsGroupId = response.data.oddsGroupId;
          this.isMemberInfoReady = true;
          if (activateTimeout) {
            /*
            this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetEventList, this), 1);
            this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetEventPrice, this), 1);
            */
            /*
            this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetEventList, this), 1);
            this.updateEventPriceTimeout = _.delay(_.bind(this.callAPIGetEventPrice, this), 1);
            */
            await this.callOnce(true);
          }
          return true;
        })
        .catch((err) => {
          console.error(err);
          if (!_.isUndefined(this.refreshTimeout) && !_.isNull(this.refreshTimeout)) clearTimeout(this.refreshTimeout);
          this.refreshTimeout = _.delay(_.bind(this.reset, this), this.config.errorReconnectDuration);
        });
    } else {
      return false;
    }
  }
  async login() {
    if (!this.isBetting) {
      this.isLoggedIn = false;
      this.isMemberInfoReady = false;
      this.isAPIKeyReady = false;
      try {
        const response1 = await this.axios('http://www.apiisn.com/betting/api/member/login', _.extend({}, this.loginOptions ));
        console.log(`User login success: ${response1.data.userId}`);
        this.apiKeyOptions.headers.userId = response1.data.userId;
        this.apiKeyOptions.headers.memberToken = response1.data.memberToken;
        this.apiOptions.headers.userId = response1.data.userId;
        this.apiOptions.headers.memberToken = response1.data.memberToken;
        this.memberInfoOptions.lastRequestKey = response1.data.lastRequestKey;
        this.isLoggedIn = true;
        this.isAPIKeyReady = false;
        this.isMemberInfoReady = false;
        console.log('callAPIGetAPIKey');
        // rp(_.extend({}, this.apiKeyOptions, {url: 'http://www.apiisn.com/betting/api/member/apikey'})).promise().bind(this).then(function (response) {
        const apiResponse = await this.axios('http://www.apiisn.com/betting/api/member/apikey', _.extend({}, this.apiKeyOptions));
        this.apiOptions.headers.apiKey = apiResponse.data.apiKey;
        this.isAPIKeyReady = true;

        const apiKeyResponse = await this.axios('http://www.apiisn.com/betting/api/member/info', _.extend({}, this.apiOptions));
        this.memberInfoOptions.binaryOddsFormat = apiKeyResponse.data.binaryOddsFormat;
        this.memberInfoOptions.oddsGroupId = apiKeyResponse.data.oddsGroupId;
        this.isMemberInfoReady = true;
        this.isAvailableForBetting = true;
      } catch (error) {
        this.isLoggedIn = false;
        this.isAPIKeyReady = false;
        this.isMemberInfoReady = false;
        this.isAvailableForBetting = true;
      }
    } else {
      console.log('is betting, can"t login yet');
    }
  }


  async reset() {
    console.log('isn->reset');
    this.isLoggedIn = false;
    this.isAPIKeyReady = false;
    this.isMemberInfoReady = false;
    clearTimeout(this.updateAPIKeyTimeout);
    clearTimeout(this.updateEventListTimeout);
    clearTimeout(this.updateEventPriceTimeout);
    clearTimeout(this.refreshTimeout);
    clearTimeout(this.resetTimeout);
    // rp(_.extend({}, this.loginOptions, {url: 'http://www.apiisn.com/betting/api/member/login'})).then((response) => {
    return this.axios('http://www.apiisn.com/betting/api/member/login', _.extend({}, this.loginOptions))
      .then((response) => {
        console.log('User login success: %s ', response.data.userId);
        this.apiKeyOptions.headers.userId = response.data.userId;
        this.apiKeyOptions.headers.memberToken = response.data.memberToken;
        this.apiOptions.headers.userId = response.data.userId;
        this.apiOptions.headers.memberToken = response.data.memberToken;
        this.memberInfoOptions.lastRequestKey = response.data.lastRequestKey;
        this.isLoggedIn = true;
        // updateAPIKeyTimeout = setTimeout(updateAPIKey, 1)
        _.delay(_.bind(this.refresh, this), 1, true);
        //setTimeout(_.bind(this.refresh, this), 1, true);
      }).catch((err) => {
        _.delay(_.bind(this.reset, this), this.config.errorReconnectDuration);
        // setTimeout(_.bind(this.reset, this), this.config.errorReconnectDuration)
        console.error(err);
      });
  }

  async prepareBet(oddsObj) {
    await this.refreshBetting(true);

    const returnValue = this.getBetResultObj();

    console.log(oddsObj);
    const betDetailResponse = await this.axios(`http://www.apiisn.com/betting/api/bet/betlimit/${oddsObj.rawJson.marketSelectionId}`, _.extend({}, this.apiOptions));
    returnValue.minBet = betDetailResponse.data.minBet;
    returnValue.maxBet = betDetailResponse.data.maxBet;
    returnValue.isReadyToBet = (this.isLoggedIn && this.isAPIKeyReady && this.isMemberInfoReady);
    if (returnValue.isReadyToBet) {
      returnValue.isPrepareBetSuccess = true;
    }
    return returnValue;
  }
  async getCancelSource() {
    return this.axios.CancelToken;
  }
  async cancelBetBySource(source) {
    source.cancel('cancel by source');
    return true;
  }
  handlePlaceBetError(error, oddsObj, bet) {
    if (error.response.status === 400 && _.has(error.response.data, 'errorCode') && error.response.data.errorCode === 'MT004') {
      returnValue.isOddChanged = true;
      returnValue.isError = true;
      returnValue.raw = error;
      throw Error(returnValue);
    }
  }

  async placeBet(oddsObj, bet) {
    const returnValue = this.getBetResultObj();
    console.log('placeBet', oddsObj);
    const param = { selectionId: oddsObj.rawJson.marketSelectionId, stake: bet, odds: oddsObj.odds, handicap: oddsObj.rawJson.handicap, nativeOdds: oddsObj.rawJson.nativeOdds };

    const prepareBetResponse = await this.axios.post('http://www.apiisn.com/betting/api/bet/preparebet', qs.stringify(param), _.extend({}, this.apiOptions));
    console.log('placeBet!!', prepareBetResponse.data);
    if (_.has(prepareBetResponse.data, 'respMessage')) {
      // bet responsed
      if (_.has(prepareBetResponse.data, 'respCode') && prepareBetResponse.data.respCode === 'MT001') {
        returnValue.isPlaceBetSuccess = true;
        console.log('bet success');
        return returnValue;
      }
      const error = {};
      error.response = prepareBetResponse;
      throw Error(error);
    } else {
      // prepare bet
      console.log('isn->placeBet->confirmBet');
      await sleep(Number(prepareBetResponse.data.otherSportsLiveBetDelay));
      const confirmBetParam = { preparedBetId: prepareBetResponse.data.preparedBetId };
      const confirmBetResponse = await this.axios.post('http://www.apiisn.com/betting/api/bet/confirmbet', confirmBetParam, _.extend({}, this.apiOptions));
      if (_.has(confirmBetResponse.data, 'respMessage')) {
        // bet responsed
        if (_.has(confirmBetResponse, 'respCode') && confirmBetResponse.respCode === 'MT001') {
          console.log('bet success');
          return true;
        }
        const error = {};
        error.response = confirmBetResponse;
        throw Error(confirmBetResponse.data);
      }
    }
  }
  async refreshBetting() {
    const setSchedule = true;
    this.loginTimeout = null;
    if (!this.isBetting) {
      await this.login();
    } else if (setSchedule) {
      if (setSchedule) this.loginTimeout = _.delay(() => this.refreshBetting(), 200);
    }
    if (setSchedule) this.loginTimeout = _.delay(() => this.refreshBetting(), 10000);
    return true;
  }

  async getReadyForBetting() {
    return this.refreshBetting();
  }

  init(forBetting = false) {
    super.init();
    if (forBetting) {
      console.log('isn->for Betting');
    }
  }


}
// let exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = isn;

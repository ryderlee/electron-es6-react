const connectionBase = require('./connectionBase');
const _ = require('lodash');
// const rp = require('request-promise')
const axios = require('axios');
let numeral = require('numeral');
const moment = require('moment');
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
    this.providerCode = 'isn';
    this.gameIdToGameType = {};
    this.eventIdToLeagueCode = {};
    this.marketSelectionIdToGameTypeStr = {};
    this.isEventListFirstCallCompleted = false;
    this.isEventPriceFirstCallCompleted = false;
    this.previousEventPriceResponse = '';
    this.previousEventResponse = '';

    this.isLogInReady = false;
    this.isAPIKeyReady = false;
    this.isMemberInfoReady = false;

    this.defaultOptions = {
      responseType: 'json', // Automatically parses the JSON string in the response
    };
  }
  getUniqueCode() {
    return `${this.providerCode}-${this._username}`;
  }
  start() {
    console.log('isn->start');
    return this.reset();
  }
  isReady() {
    return true;
  }
  setInfoHandler (ph) {
    this._infoHandler = ph;
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
  async callAPIGetEventList() {
    console.log('isn->callAPIGetEventList');
    if (!(this.isLoggedIn && this.isAPIKeyReady && this.isMemberInfoReady)) {
      console.warn('callAPIGetEventList failed. isLoggedIn %s, isAPIKeyReady %s, isMemberInfoReady %s', this.isLoggedIn, this.isAPIKeyReady, this.isMemberInfoReady);
      // this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetEventList, this), 100);
      this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetEventList, this), 100);
      return false;
    }
    let eventArr = {};
    // rp(_.extend({}, this.apiOptions, { url: ('http://www.apiisn.com/betting/api/event/list/' + this.config.sportId + '/' + this.config.eventScheduleId) })).promise().bind(this).then(function (response) {
    return axios(`http://www.apiisn.com/betting/api/event/list/${this.config.sportId}/${this.config.eventScheduleId}`, _.extend({}, this.apiOptions))
      .then(response => response.data)
      .then(async (response) => {
        // let responseStr = JSON.stringify(response);
        // if (responseStr === this.previousEventResponse) {
        if (_.isEqual(response, this.previousEventResponse)) {
          console.info('eventJson is same');
        } else {
          console.log('eventJson is diff');
          // this.previousEventResponse = responseStr;
          this.previousEventResponse = response;
          eventArr = {};
          let leagueCode = '';
          let gameTypeStr = '';
          _.each(response, (league) => {
            leagueCode = `${this.providerCode}-${league.leagueName}`;
            this.DBHandler.delaySetLeague(this.providerCode, leagueCode, league.leagueName);
            _.each(league.events, (event) => {
              const isLive = event.eventScheduledId === 3 ? 1 : 0;
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
                        this.DBHandler.delaySetGame(this.providerCode, leagueCode, event.id, market.id, gameTypeStr, { market, marketLine });
                      }
                    });
                    break;
                  case 'HT AH' :
                  case 'AH' :
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
                        this.DBHandler.delaySetGame(this.providerCode, leagueCode, event.id, market.id, gameTypeStr, { market, marketLine });
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
          this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetEventList, this), this.config.eventUpdateDuration);
          console.log('end updateEventList');
        }
        this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetEventList, this), this.config.eventUpdateDuration);
        console.log('end updateEventList');
        return Promise.resolve(true);
      }).catch((err) => {
        console.error(err);
        // this.refreshTimeout = setTimeout(_.bind(this.refresh, this), 1);
        this.refreshTimeout = _.delay(_.bind(this.refresh, this), 1);
      });
  }

  callAPIGetEventPrice () {
    console.log('isn->callAPIGetEventPrice');
    // console.log('in updateEventPriceList')
    // console.log('lastRequestKey: %s, %s', this.memberInfoOptions.lastRequestKey, this.isEventReady)
    if (this.isLoggedIn && this.isAPIKeyReady && this.isMemberInfoReady && this.isEventListFirstCallCompleted) {
      console.log('callAPIGetEventPrice not ready, isLoggedIn: %s, isAPIKeyReady: %s, isMemberInfoReady: %s, isEventListFirstCallCompleted: %s', this.isLoggedIn, this.isAPIKeyReady, this.isMemberInfoReady, this.isEventListFirstCallCompleted);
      // this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetEventPrice, this), 100)
      this.updateEventPriceTimeout = _.delay(_.bind(this.callAPIGetEventPrice, this), 100);
      return true;
    }
    // rp(_.extend({}, this.apiOptions, {url: 'http://www.apiisn.com/betting/api/event/pricelist/' + this.config.sportId + '/' + this.memberInfoOptions.oddsGroupId + '/' + this.memberInfoOptions.binaryOddsFormat + '/' + this.config.eventScheduleId + '/' + this.memberInfoOptions.lastRequestKey})).promise().bind(this).then(function (response) {
    return axios(`http://www.apiisn.com/betting/api/event/pricelist/${this.config.sportId}/${this.memberInfoOptions.oddsGroupId}/${this.memberInfoOptions.binaryOddsFormat}/${this.config.eventScheduleId}/${this.memberInfoOptions.lastRequestKey}`, _.extend({}, this.apiOptions))
      .catch((error) => {
        this.reset();
        return;
      })
      .then((response) => { return response.data; })
      .then((response) => {
        const responseStr = JSON.stringify(response.priceList);
        if (responseStr === this.previousEventPriceResponse) {
          return false;
          // console.log('eventPirceList is same')
        }
        // console.log('eventPirceList is diff')
        // console.log('responseStr.length : %d, this.previousEeventPriceResponse.length : %d', responseStr.length, this.previousEventPriceResponse.length)
        this.previousEventPriceResponse = responseStr;
        let tmpIdx;
        let gameTypeStr = null;
        _.each(response.priceList, (price) => {
          gameTypeStr = this.marketSelectionIdToGameTypeStr[price.marketSelectionId];
          tmpIdx = _.indexOf(this.gameIdToGameType[String(price.marketId)], price.marketSelectionId);
          if (tmpIdx > -1 && _.isString(gameTypeStr) && !_.isNull(gameTypeStr)) {
            this.DBHandler.delaySetOdds(this.providerCode, this.eventIdToLeagueCode[price.eventId], price.eventId, price.marketId, gameTypeStr, price.marketSelectionId, tmpIdx, price.decimalOdds, -1, price);
          } else {
            // TODO: check what if there are not found case
            // not found
          }
          gameTypeStr = null;
        });
        return this.DBHandler.flushOdds()
          .then(() => {
            this.memberInfoOptions.lastRequestKey = response.lastRequestKey;
            // this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetEventPrice, this), this.config.eventPriceUpdateDuration);
            this.updateEventPriceTimeout = _.delay(_.bind(this.callAPIGetEventPrice, this), this.config.eventPriceUpdateDuration);
            return true;
          });
      })
      .catch((err) => {
        console.error(err);
        // this.refreshTimeout = setTimeout(_.bind(this.refresh, this), this.config.errorReconnectDuration)
        this.refreshTimeout = _.delay(_.bind(this.refresh, this), this.config.errorReconnectDuration);
      });
    // console.log('end updateEventPrice')
  }

  refresh(activateTimeout = false) {
    console.log('isn->refresh');
    if (!_.isNull(this.updateAPIKeyTimeout)) {
      clearTimeout(this.updateAPIKeyTimeout);
    }
    if (this.isLoggedIn) {
      if (activateTimeout) {
        clearTimeout(this.updateEventListTimeout);
        clearTimeout(this.updateEventPriceTimeout);
      }
      this.isAPIKeyReady = false;
      this.isMemberInfoReady = false;
      console.log('callAPIGetAPIKey');
      // rp(_.extend({}, this.apiKeyOptions, {url: 'http://www.apiisn.com/betting/api/member/apikey'})).promise().bind(this).then(function (response) {
      return axios('http://www.apiisn.com/betting/api/member/apikey', _.extend({}, this.apiKeyOptions))
        .catch((error) => {
          this.reset();
          return true;
        })
        .then((response) => { return response.data; })
        .then((response) => {
          // console.log('User API success: %s ', response.apiKey)
          this.apiOptions.headers.apiKey = response.apiKey;
          this.isAPIKeyReady = true;
          // this.updateAPIKeyTimeout = setTimeout(_.bind(this.refresh, this), this.config.apiKeyDuration)
          this.updateAPIKeyTimeout = _.delay(_.bind(this.refresh, this), this.config.apiKeyDuration);
          // return rp(_.extend({}, this.apiOptions, {uri: 'http://www.apiisn.com/betting/api/member/info'})).promise().bind(this)
          return axios('http://www.apiisn.com/betting/api/member/info', _.extend({}, this.apiOptions)).then();
          // updateEventTimeout = setTimeout(updateEventList, 1, false)
        })
        .then((response) => { return response.data; })
        .then((response) => {
          console.log('User info success');
          this.memberInfoOptions.binaryOddsFormat = response.binaryOddsFormat;
          this.memberInfoOptions.oddsGroupId = response.oddsGroupId;
          this.isMemberInfoReady = true;
          if (activateTimeout) {
            /*
            this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetEventList, this), 1);
            this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetEventPrice, this), 1);
            */
            this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetEventList, this), 1);
            this.updateEventPriceTimeout = _.delay(_.bind(this.callAPIGetEventPrice, this), 1);
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

  reset() {
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
    return axios('http://www.apiisn.com/betting/api/member/login', _.extend({}, this.loginOptions ))
      .then((response) => {
        return response.data;
      })
      .then((response) => {
        console.log('User login success: %s ', response.userId);
        this.apiKeyOptions.headers.userId = response.userId;
        this.apiKeyOptions.headers.memberToken = response.memberToken;
        this.apiOptions.headers.userId = response.userId;
        this.apiOptions.headers.memberToken = response.memberToken;
        this.memberInfoOptions.lastRequestKey = response.lastRequestKey;
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


}
// let exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = isn;

const connectionBase = require('./connectionBase');
const _ = require('lodash');
const qs = require('querystring');
const numeral = require('numeral');
const axios = require('axios');
// const ReactDataGridPlugins = require('react-data-grid/addons')

class pinbet extends connectionBase {
  constructor() {
    super();
    this.config = {};
    this._providerKey = '';
    this._username = '';
    this.sportId = -1;
    this.eventList = [];
    this.fixtureQueryString = {};
    this.leagueQueryString = {};
    this.fixtureLastQueryString = {};
    this.updateEventListTimeout = null;
    this.updateEventPriceTimeout = null;
    this.updateAPIKeyTimeout = null;
    this.resetTimeout = null;
    this.refreshTimeout = null;
    this.providerCode = 'pinbet';

    this.eventTeamCache = {};

    this.isFixtureFirstCallCompleted = false;

    this.isLogInReady = false;
    this.isAPIKeyReady = false;
    this.isMemberInfoReady = false;

    this.fixtureLastSince = 0;
    this.oddsLastSince = 0;

    this.isSportIdFound = false;

    this.defaultOptions = {
      responseType: 'json', // Automatically parses the JSON string in the response
    };
  }

  isReady() {
    return true;
  }
  setProviderKey(key) {
    this._providerKey = key;
  }

  setConfig(config) {
    super.setConfig(config);
    const b = new Buffer(`${this.config.username}:${this.config.password}`);
    this.getOptions = _.extend({}, this.defaultOptions, {
      method: 'get',
      headers: {
        Authorization: `Basic ${b.toString('base64')}`,
      },
    });
    this.postOptions = _.extend({}, this.defaultOptions, {
      method: 'post',
    });
  }

  callAPIGetLeague() {
    console.log('this.callAPIGetLeague start');
    this.leagueQueryString = { sportId: this.sportId };
    // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/leagues?' + qs.stringify(this.leagueQueryString)})).promise().bind(this).then(function (response){
    return axios(`http://api.pinbet88.com/v1/leagues?${qs.stringify(this.leagueQueryString)}`, _.extend({}, this.getOptions))
      .then(response => response.data)
      .then((response) => {
        const responseStr = JSON.stringify(response);
        if (_.isUndefined(response)) {
          console.log('league:response not found');
          this.updateLeagueListTimeout = _.delay(_.bind(this.callAPIGetLeague, this),
            this.config.leagueUpdateRetryDuration);
          return true;
        }
        if (responseStr === this.lastLeagueCache) {
          console.log('league:response is the same');
          this.updateLeagueListTimeout = _.delay(_.bind(this.callAPIGetLeague, this),
            this.config.leagueUpdateDuration);
          return true;
        }
        this.lastLeagueCache = responseStr;
        _.each(response.leagues, (league) => {
          // this._infoHandler.delaySetLeague(this.providerCode, league.id, league.name)
          this.DBHandler.delaySetLeague(this.providerCode, league.id, league.name);
        });
        return this.DBHandler.flushLeague()
          .then(() => {
            this.updateLeagueListTimeout = _.delay(_.bind(this.callAPIGetLeague, this),
              this.config.leagueUpdateDuration);
            console.log('end callAPIGetLeague');
          });
      }).catch((err) => {
        console.error(err);
        this.updateLeagueListTimeout = _.delay(_.bind(this.callAPIGetLeague, this),
          this.config.leagueUpdateRetryDuration);
        console.log('end callAPIGetLeague');
      });
  }

  callAPIGetFixture() {
    console.log('this.callAPIGetFixtureList start');
    this.eventQueryString = { sportId: this.sportId };
    if (this.fixtureLastSince !== null && this.fixtureLastSince !== 0) {
      this.eventQueryString.since = this.fixtureLastSince;
    }
    // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/fixtures?' + qs.stringify(this.eventQueryString)})).promise().bind(this).then(function (response){
    return axios(`http://api.pinbet88.com/v1/fixtures?${qs.stringify(this.eventQueryString)}`, _.extend({}, this.getOptions))
      .then(response => response.json())
      .then((response) => {
        if (response !== undefined && response.last !== undefined) {
          this.fixtureLastSince = Number(response.last);
          _.each(response.league, (league) => {
            _.each(league.events, (event) => {
              this.eventTeamCache[event.id] = { home: event.home, away: event.away };
              // this._infoHandler.delaySetEvent(this.providerCode, league.id, event.id, event.home, event.away, event.status, {leagueId: league.id, event: event});
              this.DBHandler.delaySetEvent(this.providerCode, league.id, event.id,
                event.home, event.away, event.status,
                { leagueId: league.id, event });
            });
          });
          // this._infoHandler.flushEvent()
          return this.DBHandler.flushEvent()
            .then(() => {
              this.isFixtureFirstCallCompleted = true;
              console.log('fixture done');
              this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetFixture, this), this.config.eventUpdateDuration);
            });
        }
        console.warning('fixture:response not found');
        this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetFixture, this), this.config.eventUpdateRetryDuration);
        console.info('end callAPIGetFixture');
        return true;
      }).catch((err) => {
        if (err.toString() !== 'SyntaxError: Unexpected end of JSON input') {
          console.error(err);
        }
        this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetFixture, this), this.config.eventUpdateRetryDuration);
        console.info('end callAPIGetFixture');
      });
  }

  callAPIGetOdds() {
    console.log('this.callApiGetOdds start');
    if (!this.isFixtureFirstCallCompleted) {
      console.info('this.isFixtureFirstCallCompleted is false');
      this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetOdds, this),
        this.config.eventPriceUpdateRetryDuration);
      return;
    }
    this.oddQueryString = { sportId: this.sportId, oddsFormat: 'DECIMAL' };
    if (this.oddsLastSince !== null && this.oddsLastSince !== 0) {
      this.oddQueryString.since = this.oddsLastSince;
    }
    // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/odds?' + qs.stringify(this.oddQueryString)})).promise().bind(this).then(function (response) {
    axios(`http://api.pinbet88.com/v1/odds?${qs.stringify(this.oddQueryString)}`, _.extend({}, this.getOptions))
      .then(response => response.json())
      .then((response) => {
        if (!_.isUndefined(response) && _.has(response, 'last') && !_.isUndefined(response.last)) {
          let gameType = '';
          let homeOddKey = '';
          let awayOddKey = '';
          let overOddKey = '';
          let underOddKey = '';
          let gameCode = '';
          this.oddsLastSince = Number(response.last);
          _.each(response.leagues, (league) => {
            _.each(league.events, (event) => {
              _.each(event.periods, (period) => {
                _.each(period.spreads, (spread) => {
                  gameType = this.DBHandler.encodeGameType(period.number, 'all', 'handicap', numeral(Number(spread.hdp)).format('0.00'));
                  gameCode = `${this.providerCode}-${event.id}-${gameType}`;
                  homeOddKey = `${gameCode}-home`;
                  awayOddKey = `${gameCode}-away`;
                  this.DBHandler.delaySetGame(this.providerCode, league.id, event.id, gameCode, gameType, {leagueId: league.id, eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}})
                  this.DBHandler.delaySetOdds(this.providerCode, league.id, event.id, gameCode, gameType, homeOddKey, 0, spread.home, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, spread: spread})
                  this.DBHandler.delaySetOdds(this.providerCode, league.id, event.id, gameCode, gameType, awayOddKey, 1, spread.away, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, spread: spread})
                });
                _.each(period.totals, (total) => {
                  gameType = this.DBHandler.encodeGameType(period.number, 'all', 'ou', numeral(Number(total.points)).format('0.00'))
                  gameCode = `${this.providerCode}-${event.id}-${gameType}`;
                  overOddKey = `${gameCode}-over`;
                  underOddKey = `${gameCode}-under`;
                  this.DBHandler.delaySetGame(this.providerCode, league.id, event.id, gameCode, gameType, {leagueId: league.id, eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}})
                  this.DBHandler.delaySetOdds(this.providerCode, league.id, event.id, gameCode, gameType, overOddKey, 0, total.over, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, total: total})
                  this.DBHandler.delaySetOdds(this.providerCode, league.id, event.id, gameCode, gameType, underOddKey, 1, total.under, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, total: total})
                });
              });
            });
          });
          return Promise.all([this.DBHandler.flushGame(), this.DBHandler.flushOdds()])
            .then(() => {
              this.updateEventPriceTimeout = _.delay(() => this.callAPIGetOdds,
                this.config.eventPriceUpdateDuration);
              console.log('end callAPIGetOdds');
              return true;
            });
        }
        console.log('callAPIGetOdds:last not found');
        this.updateEventPriceTimeout = _.delay(() => this.callAPIGetOdds,
          this.config.eventPriceUpdateRetryDuration);
        return true;
      }).catch((err) => {
        if (err.toString() !== 'SyntaxError: Unexpected end of JSON input') {
          console.error(err);
        }
        this.updateEventPriceTimeout = _.delay(() => this.callAPIGetOdds,
          this.config.eventPriceUpdateRetryDuration);
        return true;
      });
  }

  refresh() {
    clearTimeout(this.updateEventListTimeout);
    clearTimeout(this.updateEventPriceTimeout);
    clearTimeout(this.updateLeagueListTimeout);
    console.log('this.refresh start');
    this.updateLeagueListTimeout = _.delay(_.bind(this.callAPIGetLeague, this), 1);
    this.updateEventListTimeout = _.delay(_.bind(this.callAPIGetFixture, this), 1);
    this.updateEventPriceTimeout = _.delay(_.bind(this.callAPIGetOdds, this), 1);
    console.log('this.refresh stop');
  }

  reset() {
    console.log('pin:reset');
    this.isLoggedIn = false;
    clearTimeout(this.updateEventListTimeout);
    clearTimeout(this.updateEventPriceTimeout);
    // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/sports'})).promise().bind(this).then(function (response) {
    return axios('http://api.pinbet88.com/v1/sports', _.extend({}, this.getOptions))
      .then(response => response.json())
      .then((response) => {
        let i = 0;
        for (i = 0; response.sports[i].name !== 'Soccer' && i < response.sports.length; i += 1);
        this.isSportIdFound = true;
        this.sportId = response.sports[i].id;
        // updateAPIKeyTimeout = setTimeout(updateAPIKey, 1)
        // setTimeout(_.bind(this.refresh, this), 1, true)
        _.delay(() => this.refresh, 1);
        console.log('this reset finished');
      }).catch((err) => {
        _.delay(() => this.reset, this.config.errorReconnectDuration);
        console.error(err);
      });
  }

  start() {
    return this.reset();
  }
}
//var exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = pinbet

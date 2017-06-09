'use strict'

const _ = require('lodash')
const rp = require('request-promise')
var qs = require('querystring')
var numeral = require('numeral')
// const ReactDataGridPlugins = require('react-data-grid/addons')

var pinbet = (function () {
  function pinbet() {
    this.config = {}
    this._providerKey = ''
    this._username = ''
    this.sportId = -1
    this.eventList = []
    this.fixtureQueryString = {}
    this.leagueQueryString = {}
    this.fixtureLastQueryString = {}
    this.updateEventListTimeout = null
    this.updateEventPriceTimeout = null
    this.updateAPIKeyTimeout = null
    this.resetTimeout = null
    this.refreshTimeout = null
    this.providerCode = 'pinbet'
    this._infoHandler = null

    this.eventTeamCache = {}

    this.isFixtureFirstCallCompleted = false

    this.isLogInReady = false
    this.isAPIKeyReady = false
    this.isMemberInfoReady = false

    this.fixtureLastSince = 0
    this.oddsLastSince = 0

    this.isSportIdFound = false


    this.defaultOptions = {
      json: true // Automatically parses the JSON string in the response
    }

    this.isReady = function () {
      return true
    }
    this.setProviderKey = function (key) {
      this._providerKey = key
    }
    this.setInfoHandler = function (ph) {
      this._infoHandler = ph
    }


    this.setConfig = function (config) {
      this.config = config

      this.getOptions = _.extend({}, this.defaultOptions, {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + new Buffer(this.config.username + ':' + this.config.password).toString('base64')
        }

      })
      this.postOptions = _.extend({}, this.defaultOptions, {
        method: 'POST'
      })
    }

    this.callAPIGetLeague = function () {
      console.log('this.callAPIGetLeague start')
      this.leagueQueryString = {sportId: this.sportId}
      // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/leagues?' + qs.stringify(this.leagueQueryString)})).promise().bind(this).then(function (response){
      fetch('http://api.pinbet88.com/v1/leagues?' + qs.stringify(this.leagueQueryString), _.extend({}, this.getOptions))
        .then(response => {return response.json()})
        .then((response) => {
        var responseStr = JSON.stringify(response)
        if (response === undefined) {
          console.log('league:response not found')
          this.updateLeagueListTimeout = setTimeout(_.bind(this.callAPIGetLeague, this), this.config.leagueUpdateRetryDuration)
          return
        }
        if (responseStr === this.lastLeagueCache) {
          console.log('league:response is the same')
          this.updateLeagueListTimeout = setTimeout(_.bind(this.callAPIGetLeague, this), this.config.leagueUpdateDuration)
          return
        }
        this.lastLeagueCache = responseStr
        _.each(response.leagues, (league) => {
          this._infoHandler.delaySetLeague(this.providerCode, league.id, league.name)
        })
        this._infoHandler.flushLeague()
        this.updateLeagueListTimeout = setTimeout(_.bind(this.callAPIGetLeague, this), this.config.leagueUpdateDuration)
      }).catch((err) => {
        console.error(err)
        this.updateLeagueListTimeout = setTimeout(_.bind(this.callAPIGetLeague, this), this.config.leagueUpdateRetryDuration)
      })
      console.log('end callAPIGetLeague')
    }

    this.callAPIGetFixture = function () {
      console.log('this.callAPIGetFixtureList start')
      this.eventQueryString = {sportId: this.sportId}
      if (this.fixtureLastSince !== null && this.fixtureLastSince !== 0) {
        this.eventQueryString['since'] = this.fixtureLastSince
      }
      // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/fixtures?' + qs.stringify(this.eventQueryString)})).promise().bind(this).then(function (response){
      fetch('http://api.pinbet88.com/v1/fixtures?' + qs.stringify(this.eventQueryString), _.extend({}, this.getOptions))
      .then(response => {return response.json()})
      .then((response) => {
        if (response !== undefined && response.last !== undefined) {
          this.fixtureLastSince = Number(response.last)
          _.each(response.league, _.bind(function (league) {
            _.each(league.events, _.bind(function (event) {
              this.eventTeamCache[event.id] = {home: event.home, away: event.away}
              this._infoHandler.delaySetEvent(this.providerCode, league.id, event.id, event.home, event.away, event.status, {leagueId: league.id, event: event})
            }, this))
          }, this))
          this._infoHandler.flushEvent()
          this.isFixtureFirstCallCompleted = true
          console.log('fixture done')
          this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetFixture, this), this.config.eventUpdateDuration)
        } else {
          console.warning('fixture:response not found')
          this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetFixture, this), this.config.eventUpdateRetryDuration)
        }
      }).catch((err) => {
        if (err.toString() !== 'SyntaxError: Unexpected end of JSON input')
          console.error(err)
        this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetFixture, this), this.config.eventUpdateRetryDuration)
      })
      console.info('end callAPIGetFixture')
    }

    this.callAPIGetOdds = function () {
      console.log('this.callApiGetOdds start')
      if (!this.isFixtureFirstCallCompleted) {
        console.info('this.isFixtureFirstCallCompleted is false')
        this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetOdds, this), this.config.eventPriceUpdateRetryDuration)
        return
      }
      this.oddQueryString = {sportId: this.sportId, oddsFormat: 'DECIMAL'}
      if (this.oddsLastSince !== null && this.oddsLastSince !== 0) {
        this.oddQueryString['since'] = this.oddsLastSince
      }
      // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/odds?' + qs.stringify(this.oddQueryString)})).promise().bind(this).then(function (response) {
      fetch('http://api.pinbet88.com/v1/odds?' + qs.stringify(this.oddQueryString), _.extend({}, this.getOptions ))
      .then(response => {return response.json()})
      .then((response) => {
        if (response !== undefined && response.last !== undefined) {
          var gameType = ''
          var homeOddKey = ''
          var awayOddKey = ''
          var overOddKey = ''
          var underOddKey = ''
          var gameCode = ''
          this.oddsLastSince = Number(response.last)
          _.each(response.leagues, _.bind(function (league) {
            _.each(league.events, _.bind(function (event) {
              _.each(event.periods, _.bind(function (period) {
                _.each(period.spreads, _.bind(function (spread) {
                  gameType = this._infoHandler.encodeGameType(period.number, 'all', 'handicap', numeral(Number(spread.hdp)).format('0.00'))
                  gameCode = this.providerCode + '-' + event.id + '-' + gameType
                  homeOddKey = gameCode + '-home'
                  awayOddKey = gameCode + '-away'
                  this._infoHandler.delaySetGame(this.providerCode, event.id, gameCode, gameType, {leagueId: league.id, eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}})
                  this._infoHandler.delaySetOdds(this.providerCode, event.id, gameCode, gameType, homeOddKey, 0, spread.home, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, spread: spread})
                  this._infoHandler.delaySetOdds(this.providerCode, event.id, gameCode, gameType, awayOddKey, 1, spread.away, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, spread: spread})
                }, this))
                _.each(period.totals, _.bind(function (total) {
                  gameType = this._infoHandler.encodeGameType(period.number, 'all', 'ou', numeral(Number(total.points)).format('0.00'))
                  gameCode = this.providerCode + '-' + event.id + '-' + gameType
                  overOddKey = gameCode + '-over'
                  underOddKey = gameCode + '-under'
                  this._infoHandler.delaySetGame(this.providerCode, event.id, gameCode, gameType, {leagueId: league.id, eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}})
                  this._infoHandler.delaySetOdds(this.providerCode, event.id, gameCode, gameType, overOddKey, 0, total.over, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, total: total})
                  this._infoHandler.delaySetOdds(this.providerCode, event.id, gameCode, gameType, underOddKey, 1, total.under, period.cutoff, {eventId: event.id, period: {lineId: period.lineId, number: period.number, cutoff: period.cutoff}, total: total})
                }, this))
              }, this))
            }, this))
          }, this))
          this._infoHandler.flushGame()
          this._infoHandler.flushOdds()
          this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetOdds, this), this.config.eventPriceUpdateDuration)
        } else {
          console.log('callAPIGetOdds:last not found')
          this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetOdds, this), this.config.eventPriceUpdateRetryDuration)
        }
      }).catch((err) => {
        if (err.toString() !== 'SyntaxError: Unexpected end of JSON input')
          console.error(err)
        this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetOdds, this), this.config.eventPriceUpdateRetryDuration)
      })
      console.log('end callAPIGetOdds')
    }
    this.refresh = function () {
      clearTimeout(this.updateEventListTimeout)
      clearTimeout(this.updateEventPriceTimeout)
      clearTimeout(this.updateLeagueListTimeout)
      console.log('this.refresh start')
      this.updateLeagueListTimeout = setTimeout(_.bind(this.callAPIGetLeague, this), 1)
      this.updateEventListTimeout = setTimeout(_.bind(this.callAPIGetFixture, this), 1)
      this.updateEventPriceTimeout = setTimeout(_.bind(this.callAPIGetOdds, this), 1)
      console.log('this.refresh stop')
    }
    this.reset = () => {
      console.log('pin:reset')
      this.isLoggedIn = false
      clearTimeout(this.updateEventListTimeout)
      clearTimeout(this.updateEventPriceTimeout)
      // rp(_.extend({}, this.getOptions, {url: 'http://api.pinbet88.com/v1/sports'})).promise().bind(this).then(function (response) {
      fetch('http://api.pinbet88.com/v1/sports', _.extend({}, this.getOptions))
      .then(response => {return response.json()})
      .then((response) => {
        var i = 0
        for (i = 0; response.sports[i]['name'] !== 'Soccer' && i < response.sports.length; i++){}
        this.isSportIdFound = true
        this.sportId = response.sports[i]['id']
        // updateAPIKeyTimeout = setTimeout(updateAPIKey, 1)
        // setTimeout(_.bind(this.refresh, this), 1, true)
        setTimeout(_.bind(this.refresh, this), 1)
        console.log('this reset finished')
      }).catch((err) => {
        setTimeout(_.bind(this.reset, this), this.config.errorReconnectDuration)
        console.error(err)
      })
    }

    this.start = function () {
      this.reset()
      return true
    }
  }
  return pinbet
})()
//var exa = ReactDOM.render(<Example />, document.getElementById('content2'))
module.exports = pinbet

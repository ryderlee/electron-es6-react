'use strict'

const _ = require('lodash')
const InfoHandler = require('./InfoHandler')
// const MatchingHandler = require('./MatchingHandler')
const ViewHandler = require('./ViewHandler')
const StrategyHandler = require('./StrategyHandler')
const BeetingOdds = require('./providers/bettingOdds');

var connectionStore = {}
connectionStore['isn'] = require('./providers/isn')
connectionStore['pinbet'] = require('./providers/pinbet')
connectionStore['sbo'] = require('./providers/sbo')
connectionStore['maxbet'] = require('./providers/maxbet')


var Controller = (function () {
  function Controller() {
    var infoHandler= null
    var strategyHandler= null
    var viewHandler = null
    var config = {}
    var connections = []
    var truthConnection = null
    this.setConfig = function (config) {
      this.config = config
      return true
    }
    this.init = function () {
      console.log('Controller2->init')
      this.connections = []
      this.infoHandler = new InfoHandler()
      this.infoHandler.init()
      this.viewHandler = new ViewHandler()
      this.truthConnection = new BettingOdds()

      this.viewHandler.setConfig(this.config.view)
      this.viewHandler.setInfoHandler(this.infoHandler)
      // this.infoHandler.setMatchingLeagueCallback(_.bind(this.viewHandler.matchingLeagueUpdate, this.viewHandler))
      this.strategyHandler = new StrategyHandler()
      this.strategyHandler.setConfig(this.config.strategyHandler)
      this.strategyHandler.setInfoHandler(this.infoHandler)

      this.viewHandler.setStrategyHandler(this.strategyHandler)
      /*
      this.infoHandler.setUnmatchLeagueCallback(() => this.viewHandler.unmatchLeagueUpdate())
      this.infoHandler.setLeagueGroupCallback(() => this.viewHandler.leagueGroupUpdate())
      this.infoHandler.setUnmatchEventCallback(() => this.viewHandler.unmatchEventUpdate())
      this.infoHandler.setEventGroupCallback(() => this.viewHandler.eventGroupUpdate())
      */
      //this.matchingHandler = new MatchingHandler()

      //this.priceHandler.setMatchingHandler(this.matchingHandler)
      this.truthConnection.setConfig()
      this.strategyHandler.init()
      this.viewHandler.init()
      this.truthConnection.init();

      this.truthConnection.setConfig(this.config.truthConnection[0]);
      this.setProviderKey(this.config.truthConnection[0].connectionKey);
      this.setInfoHandler(this.infoHandler);

      _.each(this.config.connections, _.bind(function (connection) {
        if (connection.enabled && connection.connectionID !== null && connectionStore[connection.connectionID] !== undefined) {
          var conn = new (connectionStore[connection.connectionID])()
          conn.setConfig(connection.config)
          conn.setProviderKey(connection.connectionKey)
          conn.setInfoHandler(this.infoHandler)
          this.connections[connection.connectionKey] = conn
          console.log('register connection: %s', connection.connectionKey)
        } else {
          console.log('connection not registered : %s', connection.connectionKey)
        }
      }, this))
      return true
    }
    this.start = function () {
      this.strategyHandler.start()
      this.truthConnection.start();
      var timeoutFunc = () => {
        this.viewHandler.start()
        this.strategyHandler.start()
        return _.every(_.values(this.connections), _.bind(function (connection) {
          return connection.start()
        }, this))
      }
      //TODO : change the startup flow to a promise flow
      setTimeout(() => timeoutFunc(), 2000)
    }
    this.isReady = function () {
      return _.every(_.values(this.connections), _.bind(function (connection) {
        return connection.isReady()
      }, this))
    }
  }
  return Controller
})()

module.exports = Controller

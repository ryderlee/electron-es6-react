const _ = require('lodash');
// const InfoHandler = require('./InfoHandler');
const DBHandler = require('./DBHandler');
const config = require('./config');
const Promise = require('bluebird');
// const MatchingHandler = require('./MatchingHandler')

const connectionStore = {};
connectionStore.isn = require('./providers/isn');
// const Isn = require('./providers/isn');
connectionStore.pinbet= require('./providers/pinbet');
connectionStore.sbo = require('./providers/sbo');
// connectionStore['maxbet'] = require('./providers/maxbet')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

class ConnectionController {
  constructor() {
    this.connections = [];
    this.infoHandler = null;
    this.DBHandler = new DBHandler();
    return true;

  }
  setConfig(inConfig) {
    this.config = inConfig;
    return Promise.resolve(true);
  }

  init() {
    console.log('Controller->init');
    /*
    let promiseArr = [];
    _.each(this.config.connections, (connection) => {
      const promise = new Promise((resolve, reject) => {
        if (connection.enabled && connection.connectionID !== null
        && connectionStore[connection.connectionID] !== undefined) {
          const conn = new connectionStore[connection.connectionID]();
          conn.setConfig(connection.config);
          conn.setProviderKey(connection.connectionKey);
          conn.setInfoHandler(this.infoHandler);
          // this.connections[connection.connectionKey] = conn;
          this.connections.push(conn);
          console.log('register connection: %s', connection.connectionKey);
          resolve(conn);
        } else {
          console.log('connection not registered : %s', connection.connectionKey);
          resolve(false);
        }
      });
      promiseArr.push(promise);
    });
    return Promise.all(promiseArr);
    */
    return Promise.map(this.config.connections, (connection) => {
      const promise = new Promise((resolve, reject) => {
        if (connection.enabled && connection.connectionID !== null
        && connectionStore[connection.connectionID] !== undefined) {
          const conn = new (connectionStore[connection.connectionID])();
          conn.setConfig(connection.config);
          conn.setProviderKey(connection.connectionKey);
          // conn.setInfoHandler(this.infoHandler);
          conn.setDBHandler(this.DBHandler);
          this.connections.push(conn);
          console.log('register connection: %s', connection.connectionKey);
          resolve(conn);
          return;
        }
        console.log('connection not registered : %s', connection.connectionKey);
        resolve(false);
      });
      return promise;
    });
  }
  start(){
    console.log('start');
    /*
    let isn = new connectionStore['isn']();
    this.connections['isn'] = isn;
    console.log(_.size(this.connections));
    _.each(this.connections, (value, key) => {
      console.log("key:%s" , key);
      this.connections[key].start();
    });
    */
    // console.log(this.connections);
    Promise.map(this.connections, conn => {
      return conn.start();
    }).then(console.log('end start'));
    /*
    let promiseArr = [];
    _.each(this.connections, (conn) => {
      const p = new Promise((resolve, reject) => {
        conn.start();
        resolve(conn);
      });
      promiseArr.push(p);
    });
    return Promise.all(promiseArr)
      .then(console.log('end start'));
      */
      /*
    let promiseArr = [];
    _.each(this.connections, (conn) => {
      const p = new Promise((resolve, reject) => {
        conn.start();
        resolve(conn);
      });
      promiseArr.push(p);
    });
    return Promise.all(promiseArr)
      .then(console.log('end start'));
      */

    /*
    const timeoutFunc = () => _.every(_.values(this.connections),
      connection => connection.start());
    // TODO: change the startup flow to a promise flow
    setTimeout(() => timeoutFunc(), 2000);
    */
  }

  isReady() {
    return _.every(_.values(this.connections), connection => connection.isReady());
  }
}

/*
const Controller = function () {
  function Controller() {
    let infoHandler= null
    let strategyHandler= null
    let viewHandler = null
    let config = {}
    let connections = []
    this.setConfig = function (config) {
      this.config = config
      return true
    }
    this.init = function () {
      console.log('Controller->init')
      this.connections = []
      this.infoHandler = new InfoHandler()
      this.infoHandler.init()
      this.viewHandler = new ViewHandler()
      this.viewHandler.setConfig(this.config.view)
      this.viewHandler.setInfoHandler(this.infoHandler)
      // this.infoHandler.setMatchingLeagueCallback(_.bind(this.viewHandler.matchingLeagueUpdate, this.viewHandler))
      this.strategyHandler = new StrategyHandler()
      this.strategyHandler.setConfig(this.config.strategyHandler)
      this.strategyHandler.setInfoHandler(this.infoHandler)

      this.viewHandler.setStrategyHandler(this.strategyHandler)
      // this.infoHandler.setUnmatchLeagueCallback(() => this.viewHandler.unmatchLeagueUpdate())
      // this.infoHandler.setLeagueGroupCallback(() => this.viewHandler.leagueGroupUpdate())
      // this.infoHandler.setUnmatchEventCallback(() => this.viewHandler.unmatchEventUpdate())
      // this.infoHandler.setEventGroupCallback(() => this.viewHandler.eventGroupUpdate())
      //this.matchingHandler = new MatchingHandler()

      //this.priceHandler.setMatchingHandler(this.matchingHandler)

      this.strategyHandler.init()
      this.viewHandler.init()

      _.each(this.config.connections, _.bind(function (connection) {
        if (connection.enabled && connection.connectionID !== null && connectionStore[connection.connectionID] !== undefined) {
          let conn = new (connectionStore[connection.connectionID])()
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
      let timeoutFunc = () => {
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
  return Controller;
}();
*/
module.exports = ConnectionController;
const cc = new ConnectionController();
cc.setConfig(config.controller)
  .then(cc.init())
  .then(cc.start());

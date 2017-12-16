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

const BettingOdds = require('./providers/bettingOdds');
const messagingBase = require('./messagingBase');
// connectionStore['maxbet'] = require('./providers/maxbet')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

class ConnectionController extends messagingBase{
  constructor() {
    super();
    this.connections = {};
    this.infoHandler = null;
    this.messagingName = 'ConnectionController';
    this.DBHandler = new DBHandler();
    this.SOTConnection = new BettingOdds();
    // this.autoPairingHandler = new RedisAutoParingHandler();
  }

  /*
  static getNewDBHandler() {
    return new DBHandler();
  }
  */

  setConfig(inConfig) {
    this.config = inConfig;
    return Promise.resolve(true);
  }

  async init() {
    console.log('Controller->init');
    if (this.config.sourceOfTruthConnections.enabled) {
      this.SOTConnection.setConfig(this.config.sourceOfTruthConnections);
      this.SOTConnection.setDBHandler(this.DBHandler);
    }
    /*
    this.autoPairingHandler.setConfig();
    this.autoPairingHandler.setDBHandler(ConnectionController.getNewDBHandler());

    await this.autoPairingHandler.init();

    */
    if (this.config.sourceOfTruthConnections.enabled) await this.SOTConnection.init();

    return Promise.map(this.config.connections, (connection) => {
      const promise = new Promise((resolve, reject) => {
        if (connection.enabled && connection.connectionID !== null
        && connectionStore[connection.connectionID] !== undefined) {
          const conn = new (connectionStore[connection.connectionID])();
          conn.setConfig(connection.config);
          conn.setProviderKey(connection.connectionKey);
          // conn.setInfoHandler(this.infoHandler);

          conn.setDBHandler(new DBHandler());
          this.connections[conn.getUniqueCode()] = conn;
          // this.connections.push(conn);
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
  async start() {
    console.log('ConnectionController->start');

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
    if (this.config.sourceOfTruthConnections.enabled) await this.SOTConnection.start();
    // await this.autoPairingHandler.loadSOTContent();
    /*
    await this.autoPairingHandler.monitorForStart('general', 'autoPairingHandler');
    */

    // await Promise.all([this.DBHandler.publish('general', 'start autoPairingHandler'), this.autoPairingHandler.processOnce()]);
    
    return Promise.map(_.values(this.connections), async conn => conn.start())
      .then(console.log('end start'));
  }

  isReady() {
    return _.every(_.values(this.connections), connection => connection.isReady());
  }

  static async kickstart() {
    const cc = new ConnectionController();
    cc.setConfig(config.controller);
    cc.listenerName = 'ConnectionController';
    cc.isListenerMode = true;
    await cc.listen();
  }
}

module.exports = ConnectionController;
ConnectionController.kickstart();

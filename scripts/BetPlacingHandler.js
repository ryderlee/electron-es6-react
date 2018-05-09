'use strict'

const messagingBase = require('./messagingBase');

const _ = require('lodash');
const similarity = require('string-similarity');
const jaro= require('jaro-winkler');
const clj_fuzzy = require('clj-fuzzy');
const querystring = require('querystring');
const Promise = require('bluebird');
const moment = require('moment');
// const GoogleSearch = require('google-search');
const google = require('googleapis');
const Firestore = require('@google-cloud/firestore');
const axios = require('axios');
const DBHandler = require('./DBHandler.js');

const connectionStore = {};
connectionStore.isn = require('./providers/isn');
// const Isn = require('./providers/isn');
connectionStore.pinbet= require('./providers/pinbet');
connectionStore.sbo = require('./providers/sbo');

const config = require('./config');
const sleep = require('sleep-promise');

// const shremote = requireTaskPool(global.require.resolve('./StrategyHandlerRemote'))

class BetPlacingHandler {
  constructor() {
    this.DBHandler = null;
    this.config = null;
    this.connectionsByProviderCode = {};
    this.hasBetWaiting = {};
    this.isBettingByProviderCombo = {};
    // this.googleSearch = new GoogleSearch({ key: 'AIzaSyD--ThlYnbnM1p9qCzfSEkRw8exq71XDcs', cx: '006149041960462827544:zpky3uc3qmq' });
    /*
    this.googleSearch = google.customsearch('v1');
    this.axios = axios.create({baseURL: 'https://www.googleapis.com/' });
    this.firestore = new Firestore({
      projectId: 'valid-shine-187515',
      keyFilename: '../key/wavymap-sports.json',
    });
    */
  }

  isReady(){
    return true;
  }

  setConfig(config) {
    this.config = config;
  }
  setDBHandler(ph) {
    this.DBHandler = ph;
  }

  async init() {
    this.monitorConn = this.DBHandler.getNewConnection();
    this.conn = this.DBHandler.getNewConnection();
    this.config = config.controller.bettingConnections;
    const bettingConnections = _.filter(this.config, { forBetting: true, enabled: true });
    await Promise.map(bettingConnections, (connection) => {
      const promise = new Promise(async (resolve, reject) => {
        if (connection.enabled && connection.connectionID !== null
        && connectionStore[connection.connectionID] !== undefined) {
          const conn = new (connectionStore[connection.connectionID])();
          conn.setConfig(connection.config);
          conn.setProviderKey(connection.connectionKey);
          // conn.setInfoHandler(this.infoHandler);
          conn.setDBHandler(new DBHandler());
          await conn.init(true);
          if (!_.has(this.connectionsByProviderCode, connection.connectionID)) this.connectionsByProviderCode[connection.connectionID] = [];
          this.connectionsByProviderCode[connection.connectionID].push(conn);
          // this.connections.push(conn);
          console.log('register connection: %s->%s', connection.connectionKey, connection.connectionID);
          resolve(conn);
          return;
        }
        console.log('connection not registered : %s->%s', connection.connectionKey, connection.connectionID);
        resolve(false);
      });
      return promise;
    });
    return Promise.resolve(true);
  }

  async bet(leftConnectionObj, rightConnectionObj, leftHandOddsObj, rightHandOddsObj) {
    console.log('bet');
    let count = 3;
    let isBetCompleted = false;
    while (!isBetCompleted && count > 0) {
      console.log('attempt:%d', count);
      count -= 1;
      let minBet = 0;
      try {
        const betInfoObjArr = await Promise.all([leftConnectionObj.prepareBet(leftHandOddsObj), rightConnectionObj.prepareBet(rightHandOddsObj)]);
        if (_.has(betInfoObjArr[0], 'isPrepareBetSuccess') && _.has(betInfoObjArr[1], 'isPrepareBetSuccess')
          && betInfoObjArr[0].isPrepareBetSuccess && betInfoObjArr[1].isPrepareBetSuccess) {
          minBet = this.getBetAmount(betInfoObjArr[0], betInfoObjArr[1]);
          console.log('minbet:', minBet);
          console.log('bet now');
          const results = Promise.all([leftConnectionObj.placeBet(leftHandOddsObj, minBet), rightConnectionObj.placeBet(rightHandOddsObj, minBet)]);
          if (results[0] && results[1]) {
            isBetCompleted = true;
            return true;
          } else if (!results[0] && !results[1]) {
            console.log('bet failed from both');
            await Promise.all([leftConnectionObj.getReadyForBetting(), rightConnectionObj.getReadyForBetting()]);
          } else {
            console.log('bet failed in one side');
          }
          // return results;
        } else {
          console.log('not ready', betInfoObjArr);
          await Promise.all([leftConnectionObj.getReadyForBetting(), rightConnectionObj.getReadyForBetting()]);
        }
      } catch (error) {
        console.log('bet error');
        if (leftConnectionObj.isMyError(error)) {
          if (_.has(error, 'resultType') && error.resultType === 'placeBetResult')
            leftConnectionObj.handleError(error, leftHandOddsObj);
        }
        console.error(error);
        return false;
      }
    }
    console.log('still fail, leaving this bet');
    return true;
  }
  async getReadyForBetting() {
    const promiseArr = [];
    _.each(this.connectionsByProviderCode, (connectionsArr, providerCode) => {
      _.each(this.connectionsByProviderCode[providerCode], (connection) => {
        console.log('providerCode:%s', providerCode);
        promiseArr.push(connection.getReadyForBetting());
      });
    });
    return Promise.all(promiseArr);
  }
  getBetAmount(leftHandOddsObj, rightHandOddsObj) {
    return leftHandOddsObj.minBet > rightHandOddsObj.minBet ? leftHandOddsObj.minBet : rightHandOddsObj.minBet; 
  }

  async start() {
    console.log('sureBet->start');
    try {
      await this.getReadyForBetting();
      await this.monitor();
    } catch (error) {
      console.error(error);
    }
  }

  async onUpdateBetMessageReceived(channel, message) {
    const md = this.DBHandler.consumeMessage(message);
    if (md.command === 'set') {
      const providerComboStr = channel.split('_')[2];
      this.hasBetWaiting[providerComboStr] = true;
      if (!_.has(this.isBettingByProviderCombo, providerComboStr)) this.isBettingByProviderCombo[providerComboStr] = false;
      if (!this.isBettingByProviderCombo[providerComboStr]) {
        this.isBettingByProviderCombo[providerComboStr] = true;
        let betObj = await this.DBHandler.popBet(providerComboStr);
        while (!_.isNil(betObj) && !_.isUndefined(betObj)) {
          const oddsObjArr = betObj.oddsObjArr;
          const leftHandOddsObj = oddsObjArr[0];
          const rightHandOddsObj = oddsObjArr[1];
          const leftHandOddsProviderCode = leftHandOddsObj.providerCode;
          const rightHandOddsProviderCode = rightHandOddsObj.providerCode;
          if (String(leftHandOddsObj.odds) === betObj.leftHandOdds && String(rightHandOddsObj.odds) === betObj.rightHandOdds) {
            const leftHandConnectionIndex = _.findIndex(this.connectionsByProviderCode[leftHandOddsProviderCode], { isAvailableForBetting: true });
            const rightHandConnectionIndex = _.findIndex(this.connectionsByProviderCode[rightHandOddsProviderCode], { isAvailableForBetting: true });
            console.log('connections:', leftHandConnectionIndex, rightHandConnectionIndex, this.isBettingByProviderCombo[providerComboStr]);
            if (leftHandConnectionIndex > -1 && rightHandConnectionIndex > -1
              && !_.isNil(oddsObjArr) && !this.isBettingByProviderCombo[providerComboStr]) {
              console.log('bet->place');
              const betResult = await this.bet(this.connectionsByProviderCode[leftHandOddsProviderCode][leftHandConnectionIndex],
                this.connectionsByProviderCode[rightHandOddsProviderCode][rightHandConnectionIndex],
                leftHandOddsObj, rightHandOddsObj);
              if (betResult) {
                console.log('bet placed');
                return true;
              } else {
                console.log('bet failed');
                return false;
              }
              // await this.DBHandler.pushBet(providerComboStr, betObj.score, leftHandOddsObj, rightHandOddsObj, betObj.leftHandOdds, betObj.rightHandOdds);
            } else {
              console.log('no connections available:', leftHandOddsProviderCode, rightHandOddsProviderCode,
              this.connectionsByProviderCode[leftHandOddsProviderCode].length,
              this.connectionsByProviderCode[rightHandOddsProviderCode].length,
              this.leftHandConnectionIndex, rightHandConnectionIndex);
              this.isBettingByProviderCombo[providerComboStr] = false;
              await this.DBHandler.pushBet(providerComboStr, betObj.score, leftHandOddsObj, rightHandOddsObj, betObj.leftHandOdds, betObj.rightHandOdds);
              await sleep(100);
              betObj = await this.DBHandler.popBet(providerComboStr);
            }
          } else {
            console.log('odds changed, odds removing');
            betObj = await this.DBHandler.popBet(providerComboStr);
          }
        } 
        this.isBettingByProviderCombo[providerComboStr] = false;
        console.log('message received, no bets');
        return false;
      }
    }
    return false;
  }

  async monitor() {
    console.log('sureBet->monitor');
    //TODO: change to use DBHandler methods instead of own method
    await this.monitorConn.psubscribe('topic:sortedSet_bets_*');

    this.monitorConn.on('pmessage', async (pattern, channel, message) => {
      await this.onUpdateBetMessageReceived(channel, message);
    });
    console.log('suerBet->monitor done');
    return Promise.resolve(true);
  }
}
module.exports = BetPlacingHandler;
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

// const shremote = requireTaskPool(global.require.resolve('./StrategyHandlerRemote'))

class RedisSureBetHandler {
  constructor() {
    this.config = {};
    this.monitorConn = null;
    this.conn = null;
    this.eventOdds = {};
    // this.googleSearch = new GoogleSearch({ key: 'AIzaSyD--ThlYnbnM1p9qCzfSEkRw8exq71XDcs', cx: '006149041960462827544:zpky3uc3qmq' });
    this.googleSearch = google.customsearch('v1');
    this.axios = axios.create({baseURL: 'https://www.googleapis.com/' });
    this.firestore = new Firestore({
      projectId: 'valid-shine-187515',
      keyFilename: '../key/wavymap-sports.json',
    });
  }
  setDBHandler(ph) {
    this.DBHandler = ph;
  }
  isReady(){
    return true;
  }
  setConfig(config) {
  }

  setDBHandler (ph) {
    this.DBHandler = ph;
  }

  async loadContentFromDB() {
    return Promise.resolve(true);
  }

  async init() {
    this.monitorConn = this.DBHandler.getNewConnection();
    this.conn = this.DBHandler.getNewConnection();
    await this.loadContentFromDB();
    return Promise.resolve(true);
  }


  async processOnce() {
    /*
    console.log('processOnce');
    const leagueArr = await this.loadContent('obj:l#*');
    if (!_.isNull(leagueArr) && (_.size(leagueArr) > 0)) {
      await Promise.map(_.values(leagueArr), async leagueObj => this.matchLeague(leagueObj));
    }
    */
    return Promise.resolve(true);

  }

  proceedOdds(leftHandOddsObj, leftHandOdds, rightHandOddsObj, rightHandOdds) {
    const cutOffDatetime = moment().subtract(60, 'seconds').utc();
    const rounding = 100;
    const isNewOdds = cutOffDatetime.isBefore(moment(leftHandOddsObj.lastPingDatetime)) && cutOffDatetime.isBefore(moment(rightHandOddsObj.lastPingDatetime)) ;
    console.log('%s odds found@%s: %s|%s|%s|%s -> %s & %s %s %s Profit:%s', isNewOdds?'new':'old', moment().utc().format(),
      leftHandOddsObj.id, rightHandOddsObj.id, 
      leftHandOddsObj.odds, rightHandOddsObj.odds,
      Math.round(leftHandOdds * rounding) / rounding, Math.floor(rightHandOdds * rounding) / rounding,
      leftHandOddsObj.lastPingDatetime, rightHandOddsObj.lastPingDatetime,
      Math.floor((parseFloat(leftHandOdds) + parseFloat(rightHandOdds)) * rounding) / rounding
    );
  }

  findBetByOddsObj(leftHandOddsObj, rightHandOddsObj) {

    // this.findOddsBetsByOddsObj(leftHandOddsObj, rightHandOddsObj);
    const leftHandOdds = (parseFloat(leftHandOddsObj.odds) > 2.0) ? (-1 / (parseFloat(leftHandOddsObj.odds) - 1.00)) : parseFloat(leftHandOddsObj.odds) - 1.00;
    const rightHandOdds = (parseFloat(rightHandOddsObj.odds) > 2.0) ? (-1 / (parseFloat(rightHandOddsObj.odds) - 1.00)) : parseFloat(rightHandOddsObj.odds) - 1.00;
    if ((leftHandOdds + rightHandOdds > 2) || ((leftHandOdds + rightHandOdds) >= 0 && (leftHandOdds < 0 || rightHandOdds < 0))) {
      this.proceedOdds(leftHandOddsObj, leftHandOdds, rightHandOddsObj, rightHandOdds);
    }
    /*
            if (((1 / parseFloat(leftHandOddsObj.odds)) + (1 / parseFloat(rightHandOddsObj.odds))) < 1) {
              console.log('odds found: %s %s, %s %s, %s', leftHandOddsObj.id, leftHandOddsObj.odds,
                rightHandOddsObj.id, rightHandOddsObj.odds,
                ((1 / parseFloat(leftHandOddsObj.odds)) + (1 / parseFloat(rightHandOddsObj.odds))));
            }
            */
  }

  findBetsByOddsArr(leftHandOddsObjArr, rightHandOddsObjArr) {
    _.each(leftHandOddsObjArr, (leftHandOddsObj) => {
      const rightHandOddsHomeOrAway = (leftHandOddsObj.homeOrAway === '0' ? '1' : '0');
      const rightHandOddsObjFilterResult = _.filter(rightHandOddsObjArr, { homeOrAway: rightHandOddsHomeOrAway });
      if (rightHandOddsObjFilterResult.length > 0) {
        const rightHandOddsObj = rightHandOddsObjFilterResult[0];
        this.findBetByOddsObj(leftHandOddsObj, rightHandOddsObj);
      }
    });
  }
  async onUpdateEventGroupMessageReceived(message) {
    const md = this.DBHandler.consumeMessage(message);
    if (md.command === 'set') {
      const eventArr = await this.DBHandler.getEventsOddsForSureBet(md.content);
      this.eventOdds[md.content] = eventArr;
      _.each(eventArr, (eventArrByGame) => {
        for (let i = 0; i < _.size(eventArrByGame); i += 1) {
          const leftHandProviderCode = _.keys(eventArrByGame)[i];
          const leftHandOddsObjArr = eventArrByGame[leftHandProviderCode];
          for (let y = i + 1; y < _.size(eventArrByGame); y += 1) {
            const rightHandProviderCode = _.keys(eventArrByGame)[y];
            const rightHandOddsObjArr = eventArrByGame[rightHandProviderCode];
            this.findBetsByOddsArr(leftHandOddsObjArr, rightHandOddsObjArr);
          }
        }
      });
    }
  }
  async onUpdateOddsMessageReceived(message) {
    const md = this.DBHandler.consumeMessage(message);
    if (md.command === 'set') {
      // console.log('sureBet->incoming:', md.content);
      const eventGroupLinkId = this.DBHandler.eventIdToEventGroupLinkId(this.DBHandler.getEventId(md.content));
      // console.log('sureBet->incoming1:', eventGroupLinkId);
      const eventGroupLinkObj = await this.DBHandler.loadObj(eventGroupLinkId);
      // console.log('sureBet->incoming2:', eventGroupLinkObj.groupKey);
      if (!_.isNil(eventGroupLinkObj) && !_.isUndefined(eventGroupLinkObj)) {
        const sureBetOddsArr= await this.DBHandler.getEventsOddsForSureBet(eventGroupLinkObj.groupKey);
        const leftHandOddsObj = await this.DBHandler.loadObj(md.content);
        // console.log(md.content);
        // console.log(sureBetOddsArr);
        if(_.has(sureBetOddsArr, leftHandOddsObj.gameTypeStr)) {
          const gameTypeOddsArr = sureBetOddsArr[leftHandOddsObj.gameTypeStr];
          delete gameTypeOddsArr[leftHandOddsObj.providerCode];
          const rightHandOddsHomeOrAway = (leftHandOddsObj.homeOrAway === '0' ? '1' : '0');
          _.each(gameTypeOddsArr, (rightHandOddsObjArr, providerCode) => {
            const rightHandOddsObjFilterResult = _.filter(rightHandOddsObjArr, { homeOrAway: rightHandOddsHomeOrAway });
            if (rightHandOddsObjFilterResult.length > 0) {
              const rightHandOddsObj = rightHandOddsObjFilterResult[0];
              // console.log(leftHandOddsObj.id, rightHandOddsObj.id);
              this.findBetByOddsObj(leftHandOddsObj, rightHandOddsObj);
            } 
          });
        }
        /*
        _.each(oddsArr, (oddsPair, key) => {
          if(key === oddsObj.gameTypeStr) {
            const tempOddsPair = _.cloneDeep(oddsPair);
            const leftHandOddsObjArr = tempOddsPair[this.DBHandler.extractProviderCode(md.content)];
            delete tempOddsPair[this.DBHandler.extractProviderCode(md.content)];
            for (let i = 0; i < _.size(tempOddsPair); i += 1) {
              const rightHandProviderCode = _.keys(tempOddsPair)[i];
              const rightHandOddsObjArr = tempOddsPair[rightHandProviderCode];
              this.findBetsByOddsArr(leftHandOddsObjArr, rightHandOddsObjArr);
            }
          }
        });
        */
      } else {
        // console.log('not under monitor:', md.content);
      }
    }
    return Promise.resolve(true);
  }
  async monitor() {
    console.log('sureBet->monitor');
    await this.monitorConn.subscribe('setUpdate_eventGroup', 'objUpdate_odds');
    
    this.monitorConn.on('message', async (channel, message) => {
      switch (channel) {
        case 'setUpdate_eventGroup':
          await this.onUpdateEventGroupMessageReceived(message);
          break;
        case 'objUpdate_odds':
          await this.onUpdateOddsMessageReceived(message);
          break;
        default:
          break;
      }
    });
    console.log('sureBet->monitor done');
    return Promise.resolve(true);
  }





  async start() {
    console.log('sureBet->start');
    return this.monitor();
  }
}
module.exports = RedisSureBetHandler;
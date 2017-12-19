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

class RedissureBetHandler {
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
            _.each(leftHandOddsObjArr, (leftHandOddsObj) => {
              const rightHandOddsHomeOrAway = (leftHandOddsObj.homeOrAway === '0' ? '1' : '0');
              const rightHandOddsObjFilterResult = _.filter(rightHandOddsObjArr, { homeOrAway: rightHandOddsHomeOrAway });
              if (rightHandOddsObjFilterResult.length > 0) {
                const rightHandOddsObj = rightHandOddsObjFilterResult[0];
                if ( parseFloat(leftHandOddsObj.odds) + parseFloat(rightHandOddsObj.odds) > 4) {

                  console.log('odds found: %s %s, %s %s, %s', leftHandOddsObj.id, leftHandOddsObj.odds, rightHandOddsObj.id, rightHandOddsObj.odds, parseFloat(leftHandOddsObj.odds) + parseFloat(rightHandOddsObj.odds));
                }
              }

            });
          }
        }
      });
    }
  }
  async onUpdateOddsMessageReceived(message) {
    return Promise.resolve(true);
  }
  async monitor() {
    console.log('sureBet->monitor');
    await this.monitorConn.subscribe('setUpdate_eventGroup');
    
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
module.exports = RedissureBetHandler;
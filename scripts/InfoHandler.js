'use strict'

const _ = require('lodash')
var ForerunnerDB = require('forerunnerdb')
var Promise = require('bluebird')

// const app = require('electron').app

var InfoHandler = (function () {
  function InfoHandler () {
    this.db = null
    this.leagueCollection = null
    this.eventCollection = null
    this.teamCollection = null
    this.gameCollection = null
    this.oddsCollection = null
    this.leagueGroupCollection = null
    this.leagueBuff = []
    this.eventBuff = []
    this.gameBuff = []
    this.oddsBuff = []
    this.config = {}

    this.leagueUpdateCallbacks = []
    this.leagueGroupUpdateCallbacks = []
    this.eventUpdateCallbacks = []
    this.eventGroupUpdateCallbacks = []
    this.gameUpdateCallbacks = []
    this.oddsUpdateCallbacks = []
    /*
    this.unmatchLeagueCallback = null
    this.leagueGroupCallback = null
    this.ungroupEventCallback = null
    this.eventGroupCallback = null
    */
    var gamePeriodTransform = {0: '1', 1: '2', 2: '3'}
    var gameTeamTransform = {all: '1',
      home: '2',
      away: '3'
    }
    var gameTypeTransform = {handicap: {
      '0.00': '1000',
      '0.25': '1001',
      '0.50': '1002',
      '0.75': '1003',
      '1.00': '1004',
      '1.25': '1005',
      '1.50': '1006',
      '1.75': '1007',
      '2.00': '1008',
      '2.25': '1009',
      '2.50': '1010',
      '2.75': '1011',
      '3.00': '1012',
      '3.25': '1013',
      '3.50': '1014',
      '3.75': '1015',
      '4.00': '1016',
      '4.25': '1017',
      '4.50': '1018',
      '4.75': '1019',
      '5.00': '1020',
      '5.25': '1021',
      '5.50': '1022',
      '5.75': '1023',
      '6.00': '1024',
      '6.25': '1025',
      '6.50': '1026',
      '6.75': '1027',
      '7.00': '1028',
      '7.25': '1029',
      '7.50': '1030',
      '7.75': '1031',
      '8.00': '1032',
      '8.25': '1033',
      '8.50': '1034',
      '8.75': '1035',
      '9.00': '1036',
      '9.25': '1037',
      '9.50': '1038',
      '9.75': '1039',
      '-0.25': '1501',
      '-0.50': '1502',
      '-0.75': '1503',
      '-1.00': '1504',
      '-1.25': '1505',
      '-1.50': '1506',
      '-1.75': '1507',
      '-2.00': '1508',
      '-2.25': '1509',
      '-2.50': '1510',
      '-2.75': '1511',
      '-3.00': '1512',
      '-3.25': '1513',
      '-3.50': '1514',
      '-3.75': '1515',
      '-4.00': '1516',
      '-4.25': '1517',
      '-4.50': '1518',
      '-4.75': '1519',
      '-5.00': '1520',
      '-5.25': '1521',
      '-5.50': '1522',
      '-5.75': '1523',
      '-6.00': '1524',
      '-6.25': '1525',
      '-6.50': '1526',
      '-6.75': '1527',
      '-7.00': '1528',
      '-7.25': '1529',
      '-7.50': '1530',
      '-7.75': '1531',
      '-8.00': '1532',
      '-8.25': '1533',
      '-8.50': '1534',
      '-8.75': '1535',
      '-9.00': '1536',
      '-9.25': '1537',
      '-9.50': '1538',
      '-9.75': '1539'
    }, ou: {
      '0.25': '2001',
      '0.50': '2002',
      '0.75': '2003',
      '1.00': '2004',
      '1.25': '2005',
      '1.50': '2006',
      '1.75': '2007',
      '2.00': '2008',
      '2.25': '2009',
      '2.50': '2010',
      '2.75': '2011',
      '3.00': '2012',
      '3.25': '2013',
      '3.50': '2014',
      '3.75': '2015',
      '4.00': '2016',
      '4.25': '2017',
      '4.50': '2018',
      '4.75': '2019',
      '5.00': '2020',
      '5.25': '2021',
      '5.50': '2022',
      '5.75': '2023',
      '6.00': '2024',
      '6.25': '2025',
      '6.50': '2026',
      '6.75': '2027',
      '7.00': '2028',
      '7.25': '2029',
      '7.50': '2030',
      '7.75': '2031',
      '8.00': '2032',
      '8.25': '2033',
      '8.50': '2034',
      '8.75': '2035',
      '9.00': '2036',
      '9.25': '2037',
      '9.50': '2038',
      '9.75': '2039',
      '10.00': '2040',
      '10.25': '2041',
      '10.50': '2042',
      '10.75': '2043',
      '11.00': '2044',
      '11.25': '2045',
      '11.50': '2046',
      '11.75': '2047',
      '12.00': '2048',
      '12.25': '2049',
      '12.50': '2050',
      '12.75': '2051',
      '13.00': '2052',
      '13.25': '2053',
      '13.50': '2054',
      '13.75': '2055',
      '14.00': '2056',
      '14.25': '2057',
      '14.50': '2058',
      '14.75': '2059',
      '15.00': '2060',
      '15.25': '2061',
      '15.50': '2062',
      '15.75': '2063',
      '16.00': '2064',
      '16.25': '2065',
      '16.50': '2066',
      '16.75': '2067',
      '17.00': '2068',
      '17.25': '2069',
      '17.50': '2070',
      '17.75': '2071',
      '18.00': '2072',
      '18.25': '2073',
      '18.50': '2074',
      '18.75': '2075',
      '19.00': '2076',
      '19.25': '2077',
      '19.50': '2078',
      '19.75': '2079',
      '20.00': '2080',
      '20.25': '2081',
      '20.50': '2082',
      '20.75': '2083',
      '21.00': '2084',
      '21.25': '2085',
      '21.50': '2086',
      '21.75': '2087',
      '22.00': '2088',
      '22.25': '2089',
      '22.50': '2090',
      '22.75': '2091',
      '23.00': '2092',
      '23.25': '2093',
      '23.50': '2094',
      '23.75': '2095',
      '24.00': '2096',
      '24.25': '2097',
      '24.50': '2098',
      '24.75': '2099',
      '25.00': '2100',
      '25.25': '2101',
      '25.50': '2102',
      '25.75': '2103',
      '26.00': '2104',
      '26.25': '2105',
      '26.50': '2106',
      '26.75': '2107',
      '27.00': '2108',
      '27.25': '2109',
      '27.50': '2110',
      '27.75': '2111',
      '28.00': '2112',
      '28.25': '2113',
      '28.50': '2114',
      '28.75': '2115',
      '29.00': '2116',
      '29.25': '2117',
      '29.50': '2118',
      '29.75': '2119',
      '30.00': '2120',
      '30.25': '2121',
      '30.50': '2122',
      '30.75': '2123',
      '31.00': '2124',
      '31.25': '2125',
      '31.50': '2126',
      '31.75': '2127',
      '32.00': '2128',
      '32.25': '2129',
      '32.50': '2130',
      '32.75': '2131',
      '33.00': '2132',
      '33.25': '2133',
      '33.50': '2134',
      '33.75': '2135',
      '34.00': '2136'
    }}
    this.setConfig = function (config) {
      this.config = config
      return true
    }
    this.init = function () {
      var fdb = new ForerunnerDB()
      this.db = fdb.db('InfoDB')
      this.persistentDB = fdb.db('persistentDB')

      // tmp storage
      this.leagueCollection = this.db.collection('league')
      this.teamCollection = this.db.collection('team')
      this.eventCollection = this.db.collection('event')
      this.gameCollection = this.db.collection('game')
      this.oddsCollection = this.db.collection('odds')

      this.leagueObjArr = this.leagueCollection.find()
      this.teamObjArr = this.teamCollection.find()
      this.eventObjArr = this.eventCollection.find()
      this.gameObjArr = this.gameCollection.find()
      this.oddsObjArr = this.oddsCollection.find()

      this.leagueGroupObjArr = []
      this.eventGroupObjArr = []
      // presistent storage
      console.log('loading cache from infoHandler')
      this.persistentDB.collection('leagueGroup').load((err, response, op) => {
        if (!err) {
          this.leagueGroupCollection = this.persistentDB.collection('leagueGroup')
          this.leagueGroupObjArr = this.leagueGroupCollection.find()
        } else {
          console.log(err + ':' + response)
        }
      })
      this.persistentDB.collection('eventGroup').load((err, response, op) => {
        if (!err) {
          this.eventGroupCollection = this.persistentDB.collection('eventGroup')
          this.eventGroupObjArr = this.eventGroupCollection.find()
        } else {
          console.log(err + ':' + response)
        }
      })
      return true
    }
    this.addLeagueUpdateCallback = (callback) => {
      this.leagueUpdateCallbacks.push(callback)
    }
    this.addLeagueGroupUpdateCallback = (callback) => {
      this.leagueGroupUpdateCallbacks.push(callback)
    }
    this.addEventUpdateCallback = (callback) => {
      this.eventUpdateCallbacks.push(callback)
    }
    this.addEventGroupUpdateCallback = (callback) => {
      this.eventGroupUpdateCallbacks.push(callback)
    }
    this.addGameUpdateCallback = (callback) => {
      this.gameUpdateCallbacks.push(callback)
    }
    this.addOddsUpdateCallback = (callback) => {
      this.oddsUpdateCallbacks.push(callback)
    }

    this.proceedCallbacks = (value, callbacks = []) => {
      if (callbacks.length > 0) {
        Promise.map(callbacks, (callback) => {
          return new Promise((resolve, reject) => {
            /*
            console.log('promise here')
            console.log(callback)
            console.log(value)
            */
            var returnValue = callback(value)
            if (typeof returnValue !== 'undefined' && returnValue !== null) {
              returnValue ? resolve(returnValue) : reject(returnValue)
            } else {
              resolve(true)
            }
          })
        }, {concurrency: 1})
      } else {
        console.log('nothing in callbacks')
      }
    }
    // setCollection insert works, update not working
    this.setCollection = (collection, inputObjArr, callbacks = [], isToSave = false) => {

      // TODO use promise to handle the each for optimization
      var objArr = (!(inputObjArr instanceof Array)) ? [inputObjArr] : inputObjArr
      var callbackResult = {}
      var insertObjs = []
      var updateObjs = []
      var beforeUpdateObjs = []
      var failedUpdateObjs = []
      var triggerCallbacks = false
      if (collection.count() > 0) {
        // find what to update
        _.each(objArr, (obj) => {
          var objFromCollection = collection.findById(obj._id)
          if (!_.isNil(objFromCollection)) {
            if (_.isEqual(obj, objFromCollection)) {
              failedUpdateObjs.push(obj)
            } else {
              updateObjs.push(obj)
            }
          } else {
            insertObjs.push(obj)
          }
        })
          /*
        _.each(objArr, (obj) => {
          var objs = collection.find({_id: {$eeq: obj._id}})
          if (objs.length > 0) {
            if (_.isEqual(obj, objs[0])) {
              failedUpdateObjs.push(obj)
            } else {
              updateObjs.push(obj)
            }
          } else {
            insertObjs.push(obj)
          }
        })
          */
        if (updateObjs.length > 0) {
          var collectionObjs = collection.find()
          var collectionByIds = _.groupBy(collectionObjs, '_id')
          _.each(updateObjs, (updateObj) => {
            beforeUpdateObjs.push(collectionByIds[updateObj._id][0])
            collection.updateById(updateObj._id, updateObj)
          })
          triggerCallbacks = true
        }
      } else {
        insertObjs = objArr
      }
      // console.log('insert: %s, update: %s', insertObjs.length, updateObjs.length)

      const followUpUpdateCollection = (collection, updateObjs, callbacks, isToSave) => {
        if (updateObjs.length > 0) {
          triggerCallbacks = true
          callbackResult['updated'] = updateObjs
          callbackResult['beforeUpdated'] = beforeUpdateObjs
        } else {
          callbackResult['updated'] = []
          callbackResult['beforeUpdated'] = []
        }
        callbackResult['failedUpdate'] = failedUpdateObjs
        if (isToSave && (updateObjs.length > 0 || insertObjs.length > 0)) {
          collection.save((err) => {
            if(err){
              console.debug('set collection saved success')
            } else {
              console.warning(err)
            }
          })
        }
        // console.log('before triggerCallback ')
        if (triggerCallbacks) this.proceedCallbacks(callbackResult, callbacks)
        // console.log('triggerCallbacks:%s, size: %d, %d', triggerCallbacks, callbackResult.inserted.length, callbackResult.updated.length)
        // if (triggerCallbacks) this.proceedCallbacks(callbackResult, callbacks)
      }
      if (insertObjs.length > 0) {
        collection.insert(insertObjs, (result) => {
          // console.debug('getting insert result')
          if ('inserted' in result && result.inserted.length > 0) {
            triggerCallbacks = true
            console.debug('set Collection insertion success : %s', result.inserted.length)
            callbackResult = result
          } else {
            console.warning('set collection insertion failed %s', ('inserted' in result ? 'nothing has been inserted?[something wrong]' : 'insert queue:' + result.inserted.length))
          }
          followUpUpdateCollection(collection, updateObjs, callbacks, isToSave)
        })
      } else {
        callbackResult['inserted'] = []
        followUpUpdateCollection(collection, updateObjs, callbacks, isToSave)
      }
    }

    this.clearCollection = (collection, callbacks = [], isToSave = false, cache = []) => {
      if(cache.length == 0)
      var collectionObjs = collection.find()
      var triggerCallbacks = true
      if (collectionObjs.length > 0) {
        collection.remove()
        if (isToSave) {
          collection.save((err) => {
            if (!err) {
              console.log('collection saved success')
            } else {
              triggerCallbacks = false
              console.log('fail saving')
            }
          })
        }
        if (triggerCallbacks && _.isArray(callbacks) && callbacks.length > 0) {
          this.proceedCallbacks(callbacks, { removed: collectionObjs })
        } else {
          console.log('no callbacks')
        }
      }
    }

    this.setEventGroup = (leagueGroupId, name, eventObj) => {
      var eventGroupObj = {
        leagueGroupId: leagueGroupId,
        name: name,
        events: eventObj
      }
      var returnValue = this.setCollection(this.eventGroupCollection, [eventGroupObj], this.eventGroupUpdateCallbacks, true)
      this.eventGroupObjArr = this.eventGroupCollection.find()
      return returnValue
    }

    this.clearEventGroup = () => {
      var returnValue = this.clearCollection(this.eventGroupCollection, this.eventGroupUpdateCallbacks, true)
      this.eventGroupObjArr = this.eventGroupCollection.find()
      return returnValue
    }

    this.setLeagueGroup = (name, leagues) => {
      var leagueGroupObj = {
        name: name,
        leagues: leagues
      }
      var returnValue = this.setCollection(this.leagueGroupCollection, [leagueGroupObj], this.leagueGroupUpdateCallbacks, true)
      this.leagueGroupObjArr = this.leagueGroupCollection.find()
      return returnValue
    }

    this.clearLeagueGroup = () => {
      var returnValue = this.clearCollection(this.leagueGroupCollection, this.leagueGroupUpdateCallbacks, true)
      this.leagueGroupObjArr = this.leagueGroupCollection.find()
      return returnValue
    }

    this.flushTeam = function () {
      this.setCollection(this.teamCollection, this.teamBuff, this.teamUpdateCallbacks, false)
      this.teamBuff = []
      this.teamObjArr = this.teamCollection.find()
    }

    this.delaySetTeam = function (providerCode, teamCode, teamName) {
      this.teamBuff.push({
        _id: String(providerCode) + '|team|' + String(teamCode),
        providerCode: String(providerCode),
        teamCode: String(teamCode),
        teamName: String(teamName)
      })
    }

    this.setTeam = function (provideCode, teamCode, teamName) {
      this.delaySetTeam(provideCode, teamCode, teamName)
      return this.flushTeam()
    }

    this.delaySetLeague = function (providerCode, leagueCode, leagueName) {
      this.leagueBuff.push({
        _id: String(providerCode) + '|league|' + String(leagueCode),
        providerCode: String(providerCode),
        leagueCode: String(leagueCode),
        leagueName: String(leagueName)
      })
    }

    this.flushLeague = function () {
      this.setCollection(this.leagueCollection, this.leagueBuff, this.leagueUpdateCallbacks, false)
      this.leagueBuff = []
      this.leagueObjArr = this.leagueCollection.find()
      return true
    }

    this.setLeague = function (providerCode, leagueCode, leagueName) {
      this.delaySetLeague(providerCode, leagueCode, leagueName)
      return this.flushLeague()
    }

    this.flushEvent = function () {
      this.setCollection(this.eventCollection, this.eventBuff, this.eventUpdateCallbacks, false)
      this.eventBuff = []
      this.eventObjArr = this.eventCollection.find()
    }

    this.delaySetEvent = function (providerCode, leagueCode, eventCode, homeTeamCode, awayTeamCode, eventStatus, rawJson) {
      this.eventBuff.push({
        _id: String(providerCode) + '|event|' + String(eventCode),
        providerCode: String(providerCode),
        leagueCode: String(leagueCode),
        eventCode: String(eventCode),
        homeTeamCode: String(homeTeamCode),
        awayTeamCode: String(awayTeamCode),
        eventStatus: String(eventStatus),
        rawJson: rawJson
      })
    }
    this.setEvent = function (providerCode, leagueCode, eventCode, homeTeam, awayTeam, eventStatus, rawJson) {
      this.delaySetEvent(providerCode, leagueCode, eventCode, homeTeam, awayTeam, eventStatus, rawJson)
      return this.flushEvent()
    }

    this.getEventByEventId = (providerCode, eventId) => {
      return this.eventCollection.findById(String(providerCode) + '|event|' + String(eventId))
    }
    // TODO: think about the parameters again

    this.flushGame = function () {
      this.setCollection(this.gameCollection, this.gameBuff, this.gameUpdateCallbacks, false)
      this.gameBuff = []
      this.gameObjArr = this.gameCollection.find()
      return true
    }
    this.delaySetGame = function (providerCode, eventCode, gameCode, gameTypeStr, rawJson) {
      this.gameBuff.push({
        _id: String(providerCode) + '|game|' + String(gameCode),
        providerCode: String(providerCode),
        eventCode: String(eventCode),
        gameCode: String(gameCode),
        gameTypeStr: String(gameTypeStr),
        rawJson: rawJson
      })
    }
    this.setGame = function (providerCode, eventCode, gameCode, gameTypeStr, rawJson) {
      this.delaySetGame(providerCode, eventCode, gameCode, gameTypeStr, rawJson)
      return this.flushGame()
    }

    this.setOdds = function (providerCode, eventCode, gameCode, gameTypeStr, oddCode, homeOrAway, odds, cutOffTimestamp, rawJson) {
      // console.log('setOdd - providerCode:%s, eventId:%s, gameTypeStr:%s, oddCode:%s, optionNum:%s, odds:%s, cutOffTimestamp:%s', providerCode, eventId, gameTypeStr, oddCode, optionNum, odds, cutOffTimestamp )
      this.delaySetOdds(providerCode, eventCode, gameCode, gameTypeStr, oddCode, homeOrAway, odds, cutOffTimestamp, rawJson)
      return this.flushOdds()
    }

    this.flushOdds = function () {
      this.setCollection(this.oddsCollection, this.oddsBuff, this.oddsUpdateCallbacks, false)
      this.oddsBuff = []
      this.oddsObjArr = this.oddsCollection.find()
      return true
    }

    this.delaySetOdds = function (providerCode, eventCode, gameCode, gameTypeStr, oddCode, homeOrAway, odds, cutOffTimestamp, rawJson) {
      this.oddsBuff.push({
        _id: String(providerCode) + '|odds|' + String(oddCode),
        providerCode: String(providerCode),
        eventCode: String(eventCode),
        gameCode: String(gameCode),
        gameTypeStr: String(gameTypeStr),
        oddCode: String(oddCode),
        homeOrAway: String(homeOrAway),
        odds: Number(odds),
        cutOffTimestamp: cutOffTimestamp,
        rawJson: rawJson
      })
    }

    this.encodeGameType = function (period, team, gameType, gameTypeDetail) {
      var gameTypeStr = ''
      gameTypeStr += gamePeriodTransform[period] + gameTeamTransform[team] + gameTypeTransform[gameType][gameTypeDetail]
      if (gameTypeStr.length !== 6) {
        console.error('something wrong. gameTypeStr:%s period:%s team:%s gameType:%s gameTypeDetail:%s', gameTypeStr, period, team, gameType, gameTypeDetail)
      }
      return gameTypeStr
    }
  }
  return InfoHandler
})()

module.exports = InfoHandler

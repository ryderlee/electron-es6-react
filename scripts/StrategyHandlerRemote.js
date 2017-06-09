const _ = require('lodash')

const generateEventGroupArrFromCache = (eventGroupsCache, callbackObj) => {
  var eventGroupObjs = []
  if (callbackObj['inserted'] > 0 || callbackObj['updated'] > 0) {
    _.each(['inserted', 'updated'], (key) => {
      var gameObjArr = callbackObj[key]
      _.each(gameObjArr, (gameObj) => {
        if (typeof this.eventGroupsCache[gameObj.providerCode] !== 'undefined' && typeof this.eventGroupsCache[gameObj.providerCode][gameObj.eventCode] !== 'undefined') {
          eventGroupObjs.push(this.eventGroupsCache[gameObj.providerCode][gameObj.eventCode])
        } else {
          // console.log('oddUpdate->eventGroup not monitor')
        }
      })
    })
  }
  return {eventGroupObjs: eventGroupObjs};
}

module.exports = { generateEventGroupArrFromCache }

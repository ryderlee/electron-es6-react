

var config = require('./config')
var Controller = require('./Controller')
//var PriceHandler = require('./PriceHandler')
// var connection = require('./connection')
// var strategyHandler = require('./strategyHandler')

var controller = new Controller()
//var priceHandler = new PriceHandler()
if (controller.setConfig(config.controller)) {
  controller.init()
  /*
  priceHandler.init()
  controller.priceHandler = priceHandler
  strategyHandler.setConfig(config.strategy1)
  controller.strategyHandler = strategyHandler
  */

  if (controller.isReady()) {
    console.log('starting')
    controller.start()
  } else {
    console.log('not ready')
  }
}

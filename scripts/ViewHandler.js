'use strict'

var React = require('react')
var ReactDOM = require('react-dom')
import Main from './components/Main.jsx' // Our custom react component
var injectTapEventPlugin = require('react-tap-event-plugin')

const _ = require('lodash')
injectTapEventPlugin()

var ViewHandler = (function () {
  function ViewHandler () {
    this.config = {}
    this.infoHandler = null
    this.strategyHandler = null
    this.unmatchLeagues = []

    this.setInfoHandler = function (handler) {
      this.infoHandler = handler

      handler.addLeagueUpdateCallback((callbackObj) => this.unmatchLeagueUpdate(callbackObj))
      handler.addLeagueGroupUpdateCallback((callbackObj) => this.leagueGroupUpdate(callbackObj))
      handler.addEventUpdateCallback((callbackObj) => this.unmatchEventUpdate(callbackObj))
      handler.addEventGroupUpdateCallback((callbackObj) => this.eventGroupUpdate(callbackObj))
    }

    this.setStrategyHandler = (handler) => {
      this.strategyHandler = handler
    }

    this.setConfig = function (config) {
      this.config = config
      return true
    }

    this.unmatchLeagueUpdate = function () {
      this.unmatchLeagues = this.infoHandler.leagueObjArr
      this.render()
    }

    this.leagueGroupUpdate = () => {
      this.leagueGroups = this.infoHandler.leagueGroupObjArr
      this.render()
    }

    this.unmatchEventUpdate = function () {
      this.unmatchEvents = this.infoHandler.eventObjArr
      this.render()
    }

    this.eventGroupUpdate = () => {
      this.eventGroups = this.infoHandler.eventGroupObjArr
      this.render()
    }

    this.handleClearLeagueGroup = (event) => {
      this.infoHandler.clearLeagueGroup()
      this.leagueGroupUpdate()
    }

    this.handleCreateLeagueGroup = (event, name, leagueObjArr) => {
      this.infoHandler.setLeagueGroup(name, leagueObjArr)
    }

    this.handleCreateEventGroup = (event, leagueId, name, eventObjArr) => {
      this.infoHandler.setEventGroup(leagueId, name, eventObjArr)
    }

    this.handleClearEventGroup = (event) => {
      this.infoHandler.clearEventGroup()
      this.eventGroupUpdate()
    }

    this.start = () => {
      this.leagueGroupUpdate()
      this.eventGroupUpdate()
      this.render()
    }

    this.init = function () {
    }

    this.render = function () {
      ReactDOM.render(<Main infoHandler={this.infoHandler} viewHandler={this} unmatchLeagues={this.unmatchLeagues} leagueGroups={this.leagueGroups} unmatchEvents={this.unmatchEvents} eventGroups={this.eventGroups} onCreateLeagueGroup={this.handleCreateLeagueGroup} config={this.config} /> , document.getElementById('app'))
      return true
    }
  }
  return ViewHandler
})()
module.exports = ViewHandler

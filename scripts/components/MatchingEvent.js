/**
 * In this file, we create a React component
 * which incorporates components providedby material-ui.
 */

const _ = require('lodash')

import React from 'react';
import { Container, Row, Col, Visible, Hidden } from 'react-grid-system';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';

import Avatar from 'material-ui/Avatar';
import Chip from 'material-ui/Chip';
import Dialog from 'material-ui/Dialog';
import {FlatButton, RaisedButton} from 'material-ui';
import stringSimilarity from 'string-similarity'

//import {blue300, blue100, red300, red100} from 'material-ui/styles/colors';
import * as colors from 'material-ui/styles/colors';

import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';

class MatchingEvent extends React.Component {
  constructor (props, context) {
    super(props, context)
    this.styles = {
      chip: {
        margin: 4
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap'
      }
    }
    this.state = this.getDefaultState()
    this.leagueChipsCache = {}
    this.menuItemsCache = []
    this.groupedLeaguesCache = []
    this.selectedLeagueMatchingCache = {}
    this.groupedEventsByEventIdCache = {}

    this.unmatchEventsByLeague = {}
  }
  generateUnmatchEventsByLeague () {
    _.each(this.props.leagueGroup.leagues, (league) => {
      this.unmatchEventsByLeague[league._id] = _.filter(this.props.unmatchEvents, ['leagueCode', league.leagueCode])
      /*
      unmatchEventsByLeague[league._id] = _.filter(this.unmatchEvents, (event) => {
        return event.leagueCode == league.leagueCode && _.findIndex(groupedEvents, ['_id', event._id])
      })
      */
    })
  }
  getDefaultState () {
    return {
      selectedLeagueId: '',
      leaguesByProvider: {},
      matchingLeaguesByProvider: {},
      selectedEvents: [],
      matchingLeaguePage: 0,
      lastSelectedLeague: null,
      duplicateProviderSelection: false
    }
  }
  getChipColor (obj, colorDeep) {
    return colors[this.props.config.connections[obj.providerCode].chipColor + colorDeep]
  }

  getDefaultSelectedLeagueId (selectedEvents) {
    var tmpSelectedLeagueId = ''
    var tmpExcludedLeagueCodeArr = []
    _.each(selectedEvents, (eventObj) => {
      tmpExcludedLeagueCodeArr.push(eventObj.leagueCode)
    })
    console.log(tmpExcludedLeagueCodeArr)
    var found = false
    _.each(this.props.leagueGroup.leagues, (league) => {
      if (!found && (_.indexOf(tmpExcludedLeagueCodeArr, league.leagueCode) === -1)) {
        found = true
        tmpSelectedLeagueId = league._id
      }
    })
    return tmpSelectedLeagueId
  }
  handleUnmatchedEventChipTouched (event, obj) {
    // this.leagueChipsCache[obj.providerCode] = []
    var tmpSelectedEvents = this.state.selectedEvents
    tmpSelectedEvents.push(obj)
    var selectedLeague = this.getDefaultSelectedLeagueId(tmpSelectedEvents)
    console.log(selectedLeague)

    /*
    _.every(this.props.leagueGroup.leagues, (league) => {
      if (league._id === this.state.selectedLeagueId) {
        return true
      } else {
        selectedLeague = league._id
        return false
      }
    })
    */

    this.setState({selectedEvents: tmpSelectedEvents, lastSelectedLeague: obj, selectedLeagueId: selectedLeague})
  }
  handleLeagueSelectFieldChange (event, index, value) {
    this.setState({selectedLeagueId: value})
  }

  handleCreateEventGroup (e) {
    if (this.state.selectedEvents.length > 1) {
      this.props.viewHandler.handleCreateEventGroup(e, this.props.leagueGroup._id, this.state.selectedEvents[0].name, this.state.selectedEvents)
    }
    this.setState({selectedEvents: []})
  }

  isLeagueInUnmatchEvents (league) {
    return (league._id in this.unmatchEventsByLeague && (this.unmatchEventsByLeague[league._id]).length > 0)
  }

  generateGroupedEventsByEventIdCache () {
    this.groupedEventsByEventIdCache = {}
    _.each(this.props.eventGroups, (eventGroup) => {
      _.each(eventGroup.events, (eventObj) => {
        this.groupedEventsByEventIdCache[eventObj._id] = eventObj
      })
    })
  }

  isEventInEventGroups (eventObj) {
    // TODO filter out those eventgroup
  }

  generateUnmatchEventByLeagueCleanedCache () {
    this.unmatchEventsByLeagueCleanedCache = this.unmatchEventsByLeague
    // console.log('unmatchEventsByLeague')
    // console.log(this.unmatchEventsByLeague)
    // console.log(this.groupedEventsByEventIdCache)
    _.each(this.props.leagueGroup.leagues, (league) => {
      if (this.isLeagueInUnmatchEvents(league)) {
        if (league._id in this.unmatchEventsByLeagueCleanedCache) {
          _.remove(this.unmatchEventsByLeagueCleanedCache[league._id], (eventObj) => {
            return ((eventObj._id in this.groupedEventsByEventIdCache))
          })
        } else {
          this.unmatchEventsByLeagueCleanedCache[league._id] = []
        }
        // console.log('this.unmatchEventsByLeagueCleanedCache[league._id]')
        // console.log(this.unmatchEventsByLeagueCleanedCache[league._id])
      }
    })
  }
  render () {
    this.generateUnmatchEventsByLeague()
    this.generateGroupedEventsByEventIdCache()
    this.generateUnmatchEventByLeagueCleanedCache()

    var titleArr = {0: 'Very likely', 1: 'likely', 2: 'Probably', 3: 'Not Likely'}
    var str = []

    if (this.state.selectedEvents.length > 0) {
      _.each(this.unmatchEventsByLeague[this.state.selectedLeagueId], (eventObj) => {
        if (!('matchingScore' in eventObj)) {
          eventObj.matchingScore = []
        }
        if (!((this.state.selectedEvents[0])._id in eventObj.matchingScore)) {
          var lhs = (this.state.selectedEvents[0]).homeTeamCode + '-' + (this.state.selectedEvents[0]).awayTeamCode
          var rhs = eventObj.homeTeamCode + '-' + eventObj.awayTeamCode
          eventObj.matchingScore[ (this.state.selectedEvents[0])._id ] = stringSimilarity.compareTwoStrings(lhs, rhs)
        }
      })
      var tmpEventObjByScoreLevel = _.sortBy(this.unmatchEventsByLeague[this.state.selectedLeagueId], [(o) => {
        return o.matchingScore[(this.state.selectedEvents[0])._id]
      }]).reverse()

      tmpEventObjByScoreLevel = _.groupBy(tmpEventObjByScoreLevel, (eventObj) => {
        switch (true) {
          case (eventObj.matchingScore[(this.state.selectedEvents[0])._id] > 0.9):
            return 0
          case (eventObj.matchingScore[(this.state.selectedEvents[0])._id] > 0.7):
            return 1
          case (eventObj.matchingScore[(this.state.selectedEvents[0])._id] > 0.5):
            return 2
          default:
            return 3
        }
      })
    }

    _.each(this.props.leagueGroup.leagues, (league) => {
      // str.push((this.props.config.connections[league.providerCode]).connectionName + ':' + (this.unmatchEventsByLeague[league._id]).length)
      if ((league._id in this.unmatchEventsByLeagueCleanedCache) && ((this.unmatchEventsByLeagueCleanedCache[league._id]).length > 0)) str.push((this.props.config.connections[league.providerCode]).connectionName + ':' + (this.unmatchEventsByLeagueCleanedCache[league._id]).length)
    })

    if (str.length > 1) {
      return (
          <Card>
          <CardHeader title={this.props.leagueGroup.name + ' ' + _.join(str, '/')} actAsExpander={true} showExpandableButton={true} />
          <CardText expandable={true}>
            {this.state.selectedEvents.length > 0 &&
            <Container>
              <Row><Col sm={10}>
                <div style={this.styles.wrapper}>
                {_.map(this.state.selectedEvents, (eventObj) => {
                  return (
                    <Chip style={this.styles.chip} onTouchTap={(event) => this.selectedEventChipTouched(event, eventObj)} key={'selectedEvent' + eventObj._id} ref={'selectedEvent' + eventObj._id}><Avatar size={32}>{this.props.config.connections[eventObj.providerCode].chipShortForm}</Avatar> {eventObj.homeTeamCode + '/' + eventObj.awayTeamCode} </Chip>
                  )
                })}
                </div></Col><Col sm={2}>
                <RaisedButton label="Pair" primary={true} keyboardFocused={true} disabled={this.state.selectedEvents.length < 2} onTouchTap={(e) => this.handleCreateEventGroup(e)} />
               </Col></Row>
              <Row><Col sm={12}><Divider /></Col></Row>
            </Container>
            }
            <Container>
              <Row><Col sm={12}>
                <SelectField
                  floatingLabelText="Leagues"
                  value={this.state.selectedLeagueId}
                  onChange={(event, index, value) => this.handleLeagueSelectFieldChange(event, index, value)} >
                  {_.map(this.props.leagueGroup.leagues, (league) => {
                    if (!_.every(this.state.selectedEvents, (eventObj) => {
                      return eventObj.providerCode !== league.providerCode
                    })) {
                      return null
                    }

                    if (league._id in this.unmatchEventsByLeagueCleanedCache) {
                      return (
                        <MenuItem key={league._id} value={league._id} primaryText={(this.props.config.connections[league.providerCode]).connectionName + '-' + league.leagueName + '(' + (this.unmatchEventsByLeagueCleanedCache[league._id]).length + ')'} />
                      )
                    }
                  })}
                </SelectField>
              </Col></Row>
            </Container>
            {(this.state.selectedEvents.length === 0) ? (
              <Container>
                <Row><Col sm={12}>
                  <div style={this.styles.wrapper}>
                  {_.map(this.unmatchEventsByLeagueCleanedCache[this.state.selectedLeagueId], (eventObj) => {
                    return (
                      <Chip style={this.styles.chip} key={eventObj._id} ref={eventObj._id} onTouchTap={(event) => this.handleUnmatchedEventChipTouched(event, eventObj)}><Avatar size={32}>{this.props.config.connections[eventObj.providerCode].chipShortForm}</Avatar> {eventObj.homeTeamCode + '/' + eventObj.awayTeamCode} </Chip>
                    )
                  })}
                  </div>
                </Col></Row>
              </Container>
            ) : (
              <Container>
                  {_.map(tmpEventObjByScoreLevel, (eventsByScore, key) => {
                    return (
                      <Row><Col sm={12}>
                        <Card>
                          <CardHeader title={titleArr[key]} actAsExpander={true} showExpandableButton={true} />
                          <CardText expandable={true}>
                            <div style={this.styles.wrapper}>
                            {_.map(eventsByScore, (eventObj) => {
                              return (
                                <Chip style={this.styles.chip} key={eventObj._id} ref={eventObj._id} onTouchTap={(event) => this.handleUnmatchedEventChipTouched(event, eventObj)}><Avatar size={32}>{this.props.config.connections[eventObj.providerCode].chipShortForm}</Avatar> {eventObj.homeTeamCode + '/' + eventObj.awayTeamCode} </Chip>
                              )
                            })}
                            </div>
                          </CardText>
                        </Card>
                      </Col></Row>
                    )
                  })
                  }
              </Container>
            )}
          </CardText>
          </Card>
      )
    } else {
      return null
    }
  }
}

export default MatchingEvent

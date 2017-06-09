/**
 * In this file, we create a React component
 * which incorporates components providedby material-ui.
 */

const _ = require('lodash')

import React from 'react';
import { Container, Row, Col, Visible, Hidden } from 'react-grid-system';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

import Avatar from 'material-ui/Avatar';
import Chip from 'material-ui/Chip';
import Dialog from 'material-ui/Dialog';
import {FlatButton, RaisedButton} from 'material-ui';
import stringSimilarity from 'string-similarity'

//import {blue300, blue100, red300, red100} from 'material-ui/styles/colors';
import * as colors from 'material-ui/styles/colors';

import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';

class MatchingLeague extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.styles = {
      chip: {
        margin: 4
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap'
      },
    }
    this.state = {
      providerCodeFilter: '',
      leaguesByProvider: {},
      matchingLeaguesByProvider: {},
      selectedLeagues: [],
      matchingLeaguePage: 0,
      lastSelectedLeague: null,
      duplicateProviderSelection: false
    }
    this.leagueChipsCache = {}
    this.menuItemsCache = []
    this.groupedLeaguesCache = []
    this.selectedLeagueMatchingCache = {}
  }
  getChipColor (obj, colorDeep) {
    return colors[this.props.config.connections[obj.providerCode].chipColor + colorDeep]
  }
  handleUnmatchedChipTouched (event, obj) {
    // this.leagueChipsCache[obj.providerCode] = []
    this.leagueChipsCache = _.omit(this.leagueChipsCache, obj.providerCode)
    var tmpArr = this.state.leaguesByProvider
    var tmpSelectedLeagues = this.state.selectedLeagues
    // calculate leaguesByProvider
    //var arr = _.pull(this.state.leaguesByProvider[obj.providerCode], obj)
    //tmpArr[obj.providerCode] = arr
    // calculate selected leagues
    tmpSelectedLeagues.push(obj)

    var keys = _.keys(this.state.leaguesByProvider)
    var idx = _.indexOf(keys, obj.providerCode)
    var nextProviderCode = ''
    if (idx > -1){
      if (idx + 1 < keys.length) {
        nextProviderCode = keys[idx + 1]
      } else {
        nextProviderCode = keys[0]
      }
    } else {
      nextProviderCode = ''
    }
    this.menuItemsCache = []
    this.selectionMatchingArray = {}
    this.setState({leaguesByProvider: tmpArr, selectedLeagues: tmpSelectedLeagues, lastSelectedLeague:obj, providerCodeFilter: nextProviderCode})
  }
  handleCreateLeagueGroup (event) {
    this.props.viewHandler.handleCreateLeagueGroup(event, this.state.selectedLeagues[0].leagueName, this.state.selectedLeagues)
    this.groupedLeaguesCache = []
    this.leagueChipsCache = {}
    this.setState({selectedLeagues: []})
  }
  handleSelectedChipTouched (event, obj) {
    var tmpList = this.state.selectedLeagues
    _.remove(tmpList, {_id: obj._id})
    this.menuItemsCache = []
    _.omit(this.leagueChipsCache, obj.providerCode)
    this.setState({selectedLeagues: tmpList, providerCodeFilter: obj.providerCode})
  }
  handleDialogClose () {
    this.setState({duplicateProviderSelection: false})
  }

  handleProviderCodeFilterChange (event, index, value) {
    this.setState({providerCodeFilter: value})
  }

  componentWillReceiveProps (props) {
    var newState = {}
    if (!(_.isEqual(this.props.unmatchLeagues.sort(), props.unmatchLeagues.sort()))) {
      this.menuItemsCache = []
      newState = _.extend(newState, {leaguesByProvider: _(props.unmatchLeagues).groupBy('providerCode').value()})
    }

    if (!(_.isEqual(this.props.leagueGroups, props.leagueGroups))) {
      console.log('new leagueGroups')
      this.groupedLeaguesCache = []
      this.leagueChipsCache = {}
    }
    this.setState(newState)
  }
  computeGroupedLeaguesCache () {
    console.log('computeGroupedLeaguesCache')
    this.groupedLeaguesCache = []
    _.each(this.props.leagueGroups, (obj) => {
      this.groupedLeaguesCache = _.union(this.groupedLeaguesCache, obj.leagues)
    })
    console.log(this.groupedLeaguesCache)
  }
  computeLeagueChipsCache (providerCode) {
    this.leagueChipsCache[providerCode] = []
    console.log('computeLeagueChipsCache')
    var chipList = []
    var isFound = -1
    var mapper = (obj) => {
      isFound = _.findIndex(this.groupedLeaguesCache, {'_id' :obj._id})
      if (isFound === -1) {
        chipList.push(<Chip style={this.styles.chip} backgroundColor={this.getChipColor(obj, 100)} onTouchTap={(event) => this.handleUnmatchedChipTouched(event, obj)} key={obj.leagueCode} ref={obj.leagueCode}><Avatar size={32}>{this.props.config.connections[obj.providerCode].chipShortForm}</Avatar> {obj.leagueName} </Chip>)
      } else {
      }
    }
    // chipList = _(this.props.leagues).filter((obj) => { return obj.providerCode === this.state.providerCodeFilter }).map(mapper).value()
    if (providerCode !== '') {
      _.forEach(this.state.leaguesByProvider[providerCode], mapper)
    }
    this.leagueChipsCache[providerCode] = chipList
    console.log('finish generate cache')
  }

  render () {
    var chipList = []
    var selectedProviderCodes = _(this.state.selectedLeagues).map('providerCode').uniq().value()

    if (this.menuItemsCache.length === 0) {
      _.each(this.state.leaguesByProvider, (value, key) => {
        if (!(_.indexOf(selectedProviderCodes, key) > -1)) {
          this.menuItemsCache.push(<MenuItem key={key} value={key} primaryText={(this.props.config.connections[key]).connectionName + '(' + value.length + ')'} />)
        }
      })
    }
    var nothingToShow = (this.menuItemsCache.length === 0)

    if(this.props.leagueGroups.length > 0 && this.groupedLeaguesCache.length < 1) {
      this.computeGroupedLeaguesCache()
    }


    if (!(this.state.providerCodeFilter in this.leagueChipsCache)) {
      this.computeLeagueChipsCache(this.state.providerCodeFilter)
    }
    chipList = (this.leagueChipsCache[this.state.providerCodeFilter]).slice(0, 50)

    // calculate selection matching %%
    if (this.state.selectedLeagues.length > 0) {
      var lhs = (this.state.lastSelectedLeague).leagueName
      var matchingLeaguesByProvider = {}
      var categoriseTheRating = (score) => {
        if (score > 0.9) {
          return 0
        } else if (score > 0.5) {
          return 1
        } else if (score > 0.3) {
          return 2
        } else {
          return 3
        }
      }
      var ratingLevel = 0
      _.map(this.state.leaguesByProvider[this.state.providerCodeFilter], (obj) => {
        if (!obj.hasOwnProperty('matchingScore')) {
          obj.matchingScore = {}
        }
        obj.matchingScore[lhs] = stringSimilarity.compareTwoStrings(lhs, obj.leagueName)
        ratingLevel = categoriseTheRating(obj.matchingScore[lhs])
        if (!matchingLeaguesByProvider.hasOwnProperty(ratingLevel)) {
          matchingLeaguesByProvider[ratingLevel] = []
        }
        (matchingLeaguesByProvider[ratingLevel]).push(obj)
      })
    }

    var selectedLeaguesChips = []
    _.each(this.state.selectedLeagues, (obj) => {
      selectedLeaguesChips.push(<Chip style={this.styles.chip} onRequestDelete={(event) => this.handleSelectedChipTouched(event, obj)} onTouchTap={(event) => this.handleSelectedChipTouched(event, obj)} key={obj.leagueCode} ref={obj.leagueCode}><Avatar size={32}>{this.props.config.connections[obj.providerCode].chipShortForm}</Avatar> {obj.leagueName} </Chip>)
    })

    const actions = [
      <FlatButton
        label="OK"
        primary={true}
        keyboardFocused={true}
        onTouchTap={(e) => this.handleDialogClose(this) }
      />,
    ]
    var titleArr = {0: 'Very likely', 1: 'likely', 2: 'Probably', 3: 'Not Likely'}

    return (
      <Card>
      <CardHeader title="League to be Match" actAsExpander={true} showExpandableButton={true} />
      <CardText expandable={true}>

        <Container>
          <Row>
            <Col sm={10}>
              <div style={this.styles.wrapper}>
              {selectedLeaguesChips}
              </div>
            </Col>
            <Col sm={2}>
            <RaisedButton
        label="Pair"
        primary={true}
        keyboardFocused={true}
        disabled={selectedLeaguesChips.length < 2}
        onTouchTap={(e) => this.handleCreateLeagueGroup(e) }
      />
            </Col>
          </Row>
        </Container>
      {(!nothingToShow) ? (
        <Container>
          <Row>
            <Col sm={3}>
              <SelectField
                floatingLabelText="Provider"
                value={this.state.providerCodeFilter}
                onChange={_.bind(this.handleProviderCodeFilterChange, this)}>
                  {this.menuItemsCache}
              </SelectField>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              {(this.state.lastSelectedLeague !== null && this.state.selectedLeagues.length > 0) ? (
                <Container>
                {_.map(matchingLeaguesByProvider, (matchingLeagues, key) => {
                  return (
          <Row><Col sm={12}>
          <Card>
            <CardHeader title={titleArr[key]} actAsExpander={true} showExpandableButton={true} />
            <CardText expandable={true}>
              <div style={this.styles.wrapper}>
              {_.sortBy(matchingLeagues, (league) => {
                return league.matchingScore[(this.state.lastSelectedLeague).leagueName]
              }).reverse().map((matchingLeague, key) => {
                return (
                <Chip style={this.styles.chip} onTouchTap={(event) => this.handleUnmatchedChipTouched(event, matchingLeague)} key={matchingLeague.leagueCode} ref={matchingLeague.leagueCode}><Avatar size={32}>{this.props.config.connections[matchingLeague.providerCode].chipShortForm}</Avatar> {matchingLeague.leagueName} </Chip>
                )
              })}
              </div>
          </CardText>
        </Card>
        </Col></Row>
                )
                })}
                </Container>
              ) : (
              <div style={this.styles.wrapper}>
                {chipList}
              </div>
              )}
            </Col>
          </Row>
        </Container>
      ):( 
        <Container>
        <Row>
          <Col sm={12}>
          nothing to set
          </Col>
          </Row>
        </Container>
      )}  
      </CardText>
      </Card>
    )
  }
}

export default MatchingLeague

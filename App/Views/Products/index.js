var React = require('react-native');
var styles = require('./styles.js');

var api = require('../../Utils/api.js');
var Loading = require('../Loading');
var Cell = require('./Cell');
var Comments = require('../Comments');

var moment = require('moment');
var ActivityView = require('react-native-activity-view');
var Icon = require('EvilIcons');

var {
  Text,
  View,
  ListView,
  TouchableHighlight,
  AlertIOS,
  AppStateIOS,
  ActivityIndicatorIOS
} = React;

var Products = React.createClass({
  getInitialState: function() {
    return {
      accessToken: this.props.accessToken,
      currentDay: 0,
      dataBlob: {},
      dataSource: new ListView.DataSource({
        rowHasChanged: (r1, r2) => r1 !== r2,
        sectionHeaderHasChanged: (s1, s2) => s1 !== s2
        }),
      loaded: false
    }
  },

  componentWillMount: function() {
    Icon.getImageSource('share-apple', 30)
      .then((source) => {
        this.setState({ shareIcon: source })
      });
    if (!this.state.loaded) {
      this.getAllPosts()
    }
  },

  componentDidMount: function () {
    AppStateIOS.addEventListener('change', this.handleAppStateChange);
  },

  componentWillUnmount: function() {
    AppStateIOS.removeEventListener('change', this.handleAppStateChange);
  },

  handleAppStateChange: function(state) {
    if (!this.state.loaded) {
      this.getAllPosts()
    }
  },

  getAllPosts: function() {
    api.getAllPosts(this.state.accessToken, this.state.currentDay)
      .then((responseData) => {
        var tempDataBlob = this.state.dataBlob;

        if (!responseData.posts[0].day) {
          this.setState({
            currentDay: this.state.currentDay + 1
          });
          return this.getAllPosts();
        } else {
            var postDate = responseData.posts[0].day;
            var date;

            if (postDate === moment().format('YYYY[-]MM[-]DD')) {
              date = moment(postDate).format('[Today,] MMMM Do');
            } else if (postDate === moment().subtract(1, 'days').format('YYYY[-]MM[-]DD')) {
              date = moment(postDate).format('[Yesterday,] MMMM Do')
            } else {
              date = moment(postDate).format('dddd[,] MMMM Do')
            }
            tempDataBlob[date] = responseData.posts;
            this.setState({
              currentDay: this.state.currentDay + 1,
              dataBlob: tempDataBlob
            });
          }
      }).then(() => {
        this.setState({
          dataSource: this.state.dataSource.cloneWithRowsAndSections(this.state.dataBlob),
          loaded: true
        })
      })
      .catch((error) => {
        if (!this.state.loaded) {
          AlertIOS.alert('Error', 'You need to be connected to the internet')
        }
      })
      .done();
  },

  render: function() {
    if (!this.state.loaded) {
      return (
        this.renderLoading()
        )
    }
    return (
      this.renderListView()
      )
  },

  renderLoading: function() {
    return (
      <View style={styles.container}>
        <Loading
          loaded={this.state.loaded} />
      </View>
      )
  },
  renderListView: function() {
    return (
      <ListView
        dataSource={this.state.dataSource}
        renderRow={this.renderPostCell}
        renderSectionHeader={this.renderSectionHeader}
        renderFooter={this.renderFooter}
        onEndReached={() => {this.getAllPosts(this.state.currentDay)}}
        onEndReachedThreshold={40}
        style={styles.postsListView} />
      )
  },

  renderPostCell: function(post) {
    return (
        <Cell
          onSelect={() => this.selectPost(post)}
          post={post} />
    )
  },

  renderSectionHeader: function(sectionData, sectionID) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionText}>{sectionID}</Text>
      </View>
      )
  },

  renderFooter: function() {
    return (
      <View>
        <ActivityIndicatorIOS
          animating={true}
          size={'large'} />
      </View>)
  },

  selectPost: function(post) {
    this.props.navigator.push({
      title: 'Details',
      component: Comments,
      backButtonTitle: ' ',
      rightButtonIcon: this.state.shareIcon,
      onRightButtonPress: () => this.shareSheet(post),
      passProps: {postId: post.id,
                  accessToken: this.state.accessToken,
                  shareIcon: this.state.shareIcon}
    })
  },

  shareSheet: function(post) {
    return (
      ActivityView.show({
        text: 'Check out ' + post.name + ' on Product Hunt',
        url: post.redirect_url,
        imageUrl: post.screenshot_url['300px']
      })
      )
  }
})

module.exports = Products;

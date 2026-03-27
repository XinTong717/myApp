export default defineAppConfig({
    pages: [
      'pages/explore/index',
      'pages/schools/index',
      'pages/events/index',
      'pages/profile/index',
      'pages/school-detail/index',
      'pages/event-detail/index',
      'pages/school-map/index',
      'pages/index/index',
    ],
  
    window: {
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black',
      navigationBarTitleText: '自由学社',
      backgroundColor: '#FFF9F2',
      backgroundTextStyle: 'light',
    },
  
    tabBar: {
      color: '#999999',
      selectedColor: '#E76F51',
      backgroundColor: '#FFFFFF',
      borderStyle: 'white',
      list: [
        {
          pagePath: 'pages/explore/index',
          text: '探索',
          iconPath: 'assets/tab-explore.png',
          selectedIconPath: 'assets/tab-explore-active.png',
        },
        {
          pagePath: 'pages/schools/index',
          text: '学习社区',
          iconPath: 'assets/tab-school.png',
          selectedIconPath: 'assets/tab-school-active.png',
        },
        {
          pagePath: 'pages/events/index',
          text: '活动',
          iconPath: 'assets/tab-event.png',
          selectedIconPath: 'assets/tab-event-active.png',
        },
        {
          pagePath: 'pages/profile/index',
          text: '我的',
          iconPath: 'assets/tab-profile.png',
          selectedIconPath: 'assets/tab-profile-active.png',
        },
      ],
    },
  })

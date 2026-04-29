export default defineAppConfig({
  pages: [
    'pages/explore/index',
    'pages/schools/index',
    'pages/events/index',
    'pages/profile/index',
    'pages/user-agreement/index',
    'pages/privacy-policy/index',
  ],

  subPackages: [
    {
      root: 'pkg/schools',
      pages: ['submit/index'],
    },
    {
      root: 'pkg/events',
      pages: ['submit/index'],
    },
    {
      root: 'pages/school-detail',
      pages: ['index'],
    },
    {
      root: 'pages/event-detail',
      pages: ['index'],
    },
    {
      root: 'pages/admin',
      pages: ['event-reviews/index'],
    },
  ],

  window: {
    navigationBarBackgroundColor: '#FFF8F2',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '可雀',
    backgroundColor: '#FFF8F2',
    backgroundTextStyle: 'light',
  },

  tabBar: {
    color: '#8C776A',
    selectedColor: '#B85540',
    backgroundColor: '#FFFCF8',
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

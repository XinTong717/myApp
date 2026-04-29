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
    navigationBarBackgroundColor: '#FAF8F4',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '可雀',
    backgroundColor: '#FAF8F4',
    backgroundTextStyle: 'light',
  },

  tabBar: {
    color: '#5F5E5A',
    selectedColor: '#B85540',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/explore/index',
        text: '探索',
        iconPath: 'assets/tab-explore-stamp.svg',
        selectedIconPath: 'assets/tab-explore-stamp-active.svg',
      },
      {
        pagePath: 'pages/schools/index',
        text: '学习社区',
        iconPath: 'assets/tab-school-stamp.svg',
        selectedIconPath: 'assets/tab-school-stamp-active.svg',
      },
      {
        pagePath: 'pages/events/index',
        text: '活动',
        iconPath: 'assets/tab-event-stamp.svg',
        selectedIconPath: 'assets/tab-event-stamp-active.svg',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab-profile-stamp.svg',
        selectedIconPath: 'assets/tab-profile-stamp-active.svg',
      },
    ],
  },
})

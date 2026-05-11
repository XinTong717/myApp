export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/explore/index',
    'pages/schools/index',
    'pages/events/index',
    'pages/profile/index',
  ],
  subPackages: [
    { root: 'pkg/schools', pages: ['submit/index'] },
    { root: 'pkg/events', pages: ['submit/index'] },
    { root: 'pkg/legal', pages: ['user-agreement/index', 'privacy-policy/index'] },
    { root: 'pages/school-detail', pages: ['index'] },
    { root: 'pages/event-detail', pages: ['index'] },
    { root: 'pages/admin', pages: ['index', 'event-reviews/index', 'school-submissions/index'] },
  ],
  preloadRule: {
    'pages/events/index': {
      network: 'all',
      packages: ['pages/event-detail'],
    },
    'pages/schools/index': {
      network: 'all',
      packages: ['pages/school-detail'],
    },
    'pages/profile/index': {
      network: 'wifi',
      packages: ['pkg/legal'],
    },
  },
  window: {
    navigationBarBackgroundColor: '#FFF9F3',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '可雀',
    backgroundColor: '#FFF9F3',
    backgroundTextStyle: 'light',
  },
  tabBar: {
    color: '#5F5E5A',
    selectedColor: '#B85540',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/explore/index', text: '探索', iconPath: 'assets/tab-explore-stamp.png', selectedIconPath: 'assets/tab-explore-stamp-active.png' },
      { pagePath: 'pages/schools/index', text: '学习社区', iconPath: 'assets/tab-school-stamp.png', selectedIconPath: 'assets/tab-school-stamp-active.png' },
      { pagePath: 'pages/events/index', text: '活动', iconPath: 'assets/tab-event-stamp.png', selectedIconPath: 'assets/tab-event-stamp-active.png' },
      { pagePath: 'pages/profile/index', text: '我的', iconPath: 'assets/tab-profile-stamp.png', selectedIconPath: 'assets/tab-profile-stamp-active.png' },
    ],
  },
})

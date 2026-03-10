export default defineAppConfig({
    pages: [
      'pages/index/index',
      'pages/schools/index',
      'pages/events/index',
      'pages/school-detail/index',
    ],
  
    window: {
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black',
      navigationBarTitleText: '自由学社',
      backgroundColor: '#f7f7f7',
      backgroundTextStyle: 'light',
    },
  
    tabBar: {
      color: '#666666',
      selectedColor: '#111111',
      backgroundColor: '#ffffff',
      borderStyle: 'black',
      list: [
        {
          pagePath: 'pages/index/index',
          text: '首页',
        },
        {
          pagePath: 'pages/schools/index',
          text: '学校',
        },
        {
          pagePath: 'pages/events/index',
          text: '活动',
        },
      ],
    },
  })
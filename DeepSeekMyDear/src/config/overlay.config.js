// 音乐播放器与文字动效的统一配置文件。
// 修改后保存即可在 dev server 中立即生效。
export default {
  audio: {
    // 不自动播放：等用户第一次按下空格键（或点击播放按钮）后，
    // 音乐、信件与中间动画才一起开始。
    autoPlay: false,
    loop: true,
    volume: 0.8
  },

  player: {
    seekEnabled: true,
    idleOpacity: 0, // 鼠标不悬浮时完全透明
    hoverOpacity: 1
  },

  // 初始画面（音乐还没开始播放时）的漫画翻页。
  comic: {
    autoPlay: true, // 不点击时自动翻页
    interval: 5000 // 自动翻页间隔，单位 ms；到最后一页后自动停止
  },

  letter: {
    // 'duration'：整封信在歌曲总时长内走完一轮（跟随音乐暂停/继续）
    // 'fixed'：按下面的 speed 匀速滚动，与歌曲时长无关
    mode: 'duration',
    speedMultiplier: 1.25, // 1 = 一首歌走完一轮；2.5 = 快 2.5 倍
    speed: 24, // fixed 模式下的滚动速度，单位 px/s
    left: '3vw', // 信件区域距页面左侧的距离
    // 信件与歌词都收窄一些，把页面中间让给动画
    width: '38vw',
    maxWidth: '560px',
    fontSize: '22px',
    fadeSize: '80px' // 上下边缘淡出高度
  },

  // 歌词出现的时机来自 src/config/lyricsTime.config.js，
  // 这里的参数只控制停留、淡出与排版样式。
  lyrics: {
    holdDuration: 9000, // 一组歌词停留多久后整组淡出，单位 ms
    fadeDuration: 1200, // 淡出耗时，单位 ms
    areaWidth: '24vw',
    areaMaxWidth: '360px',
    areaRight: '3vw',
    fontSize: '38px'
  }

  // 图片的显示时机、位置、缩放与运动轨迹在独立配置文件中：
  // src/config/picture.timeline.js
}

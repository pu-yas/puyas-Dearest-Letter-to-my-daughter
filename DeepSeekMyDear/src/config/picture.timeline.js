// 图片时间轴配置：根据歌曲播放时间控制图片的切换、位置、缩放、旋转与透明度。
//
// 活动区域：动画层铺满整个视口，图片可以延伸到任意位置，
//   只在接近屏幕边缘时柔和淡出。信件与歌词的层级更高，
//   所以放大后的图片不会盖住文字。
//
// 坐标：x / y 都是视口百分比，50 / 50 表示画面正中心。
//   例如 x: 42 表示比中心偏左 8vw，y: 60 表示比中心偏下 10vh。
// 时间：单位为秒，也可以写成 "1:05" 这样的形式。
// 缓动：linear | easeInOutSine | easeInOutQuad | easeInOutCubic | easeOutCubic
// 轨迹：一个 cue 可以直接用 from / to，也可以用 path 写多段折线。
//       同一张图片可以拆成多个首尾相接的 cue，形成更长的运动路线。
//
// 修改后保存即可在 dev server 中立即生效。

// 运动轨迹库：只描述「怎么动」，不描述「什么时候出现」。
// timeline 里的每个片段通过 comic 引用这里的一条轨迹。
const cues = [
  {
    // 0.从中下方缓慢向上漂移，回到区域中心附近
    from: { x: 50, y: 60, scale: 1.6, rotate: -4, opacity: 0.72 },
    to: { x: 60, y: 60, scale: 2.0, rotate: 3, opacity: 1 }
  },
  {
    // 1.从中下方缓慢升到中上方
    from: { x: 50, y: 62, scale: 1.8, rotate: -1, opacity: 1 },
    to: { x: 80, y: 55, scale: 1.8, rotate: 1, opacity: 0.72 },
    easing: 'easeInOutSine'

  },
  {
    // 2.
    from: { x: 80, y: 65, scale: 1.22, rotate: 2, opacity: 0.72 },
    to: { x: 58, y: 65, scale: 1.24, rotate: -2, opacity: 1 },
    easing: 'easeInOutQuad'
  },
  {
    // 3.
    from: { x: 58, y: 5, scale: 2.06, rotate: -1, opacity: 1.85 },
    to: { x: 58, y: 65, scale: 1.94, rotate: 1, opacity: 1 },
    easing: 'easeInOutQuad'
  },
  {
    // 4.
    from: { x: 85, y: 60, scale: 1.5, rotate: -1, opacity: 0.85 },
    to: { x: 65, y: 55, scale: 1.6, rotate: 0, opacity: 1 },
    easing: 'easeOutCubic'
  },
  {
    // 5
    from: { x: 85, y: 60, scale: 1.5, rotate: -1, opacity: 0.85 },
    to: { x: 55, y: 55, scale: 1.6, rotate: 0, opacity: 1 },
    easing: 'easeOutCubic'
  },
  {
    // 6
    from: { x: 55, y: 55, scale: 1.6, rotate: 0, opacity: 1 },
    to: { x: 55, y: 55, scale: 1.6, rotate: 0, opacity: 1 },
    easing: 'easeOutCubic'
  },
  {
    // 4.从右上方回落到左下方
    from: { x: 56, y: 38, scale: 1.96, rotate: 3, opacity: 0.75 },
    to: { x: 44, y: 62, scale: 2.04, rotate: -4, opacity: 1 },
    easing: 'easeInOutCubic'
  }
]

export default {
  // 歌曲时间超过最后一段后，是否从头循环整条时间轴
  loop: true,

  // 播放速度：0.75 = 原速度的 75%，数值越小，运动越慢、一轮时间越长
  speed: 0.75,

  // 两张图片交叉淡入淡出的时长，单位 ms
  transition: 1200,

  // 音乐开始播放后，画面整体淡入的时长，单位 ms
  revealDuration: 800,

  // 默认缓动，cue 未单独指定时使用
  easing: 'easeInOutSine',

  // 舞台尺寸的参照区域：左右自动贴合信件与歌词之间的空隙，
  // 上下留出和文字区域一致的距离。
  area: {
    top: '72px',
    bottom: '108px',
    sideGap: '28px'
  },

  // 图片的基础尺寸与整体透明度（每段 cue 的 scale 在此基础上放大）。
  // widthRatio / heightRatio 是相对上面参照区域的比例；
  // 动画层本身是全屏的，放大后的图片可以越过这个参照区域铺到屏幕边缘。
  stage: {
    widthRatio: 0.92,
    heightRatio: 0.88,
    maxWidth: '600px',
    maxHeight: '860px',
    opacity: 1
  },

  // 运动轨迹库
  cues,

  // 展示动画时间轴：控制每张图片「什么时候出现、出现多久、用什么轨迹」。
  // start：在歌曲中的起始时间；duration：这一段持续的秒数；
  // comic：引用上面 cues 中对应序号的运动轨迹。
  timeline: [
    {
      // 00.png：从 0:00 开始，持续 10 秒
      image: '00',
      start: '0:06',
      duration: 10,
      comic: cues[0]
    },
    {
      // 01.png：从 0:12 开始，持续 10 秒
      image: '01',
      start: '0:15',
      duration: 11,
      comic: cues[1]
    },
    {
      // 02.png：从 0:22 开始，持续 8 秒
      image: '02',
      start: '0:23',
      duration: 14,
      comic: cues[2]
    },
    {
      // 03.png：从 0:30 开始，持续 10 秒
      image: '03',
      start: '0:37',
      duration: 13,
      comic: cues[3]
    },
    {
      // 05.png：从 0:52 开始，持续 8 秒
      image: '05',
      start: '0:49',
      duration: 11,
      comic: cues[4]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '04',
      start: '1:01',
      duration: 12,
      comic: cues[5]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '04',
      start: '1:13',
      duration: 14,
      comic: cues[6]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '02',
      start: '1:27',
      duration: 14,
      comic: cues[6]
    },
    {
      // 01.png：从 0:12 开始，持续 10 秒
      image: '01',
      start: '1:41',
      duration: 12,
      comic: cues[1]
    },
    {
      // 02.png：从 0:22 开始，持续 8 秒
      image: '02',
      start: '1:55',
      duration: 10,
      comic: cues[2]
    },
    {
      // 03.png：从 0:30 开始，持续 10 秒
      image: '03',
      start: '2:08',
      duration: 7,
      comic: cues[6]
    },
    {
      // 05.png：从 0:52 开始，持续 8 秒
      image: '05',
      start: '2:15',
      duration: 11,
      comic: cues[4]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '04',
      start: '2:26',
      duration: 30,
      comic: cues[6]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '01',
      start: '2:57',
      duration: 14,
      comic: cues[6]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '02',
      start: '3:12',
      duration: 10,
      comic: cues[6]
    },
    {
      // 04.png：从 0:52 开始，持续 8 秒
      image: '05',
      start: '3:22',
      duration: 10,
      comic: cues[6]
    }
  ]
}

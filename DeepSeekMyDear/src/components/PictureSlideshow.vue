<template>
  <div class="picture-layer" aria-hidden="true">
    <div
      ref="stage"
      class="picture-stage"
      :class="{ 'is-revealed': started }"
      :style="stageStyle"
    >
      <img
        v-for="picture in pictures"
        :key="picture.id"
        ref="images"
        class="picture-item"
        :src="picture.src"
        alt=""
      >
    </div>
  </div>
</template>

<script>
import pic00 from '@/assets/picture/00.png'
import pic01 from '@/assets/picture/01.png'
import pic02 from '@/assets/picture/02.png'
import pic03 from '@/assets/picture/03.png'
import pic04 from '@/assets/picture/04.png'
import pic05 from '@/assets/picture/05.png'
import pictureTimeline from '@/config/picture.timeline'
import overlayConfig from '@/config/overlay.config'

const DEFAULT_STATE = {
  x: 100,
  y: 100,
  scale: 1,
  rotate: 0,
  opacity: 1
}

const EASINGS = {
  linear: function (progress) {
    return progress
  },
  easeInOutSine: function (progress) {
    return 0.5 - Math.cos(Math.PI * progress) / 2
  },
  easeInOutQuad: function (progress) {
    if (progress < 0.5) {
      return 2 * progress * progress
    }

    return 1 - Math.pow(-2 * progress + 2, 2) / 2
  },
  easeOutCubic: function (progress) {
    return 1 - Math.pow(1 - progress, 3)
  },
  easeInOutCubic: function (progress) {
    if (progress < 0.5) {
      return 4 * progress * progress * progress
    }

    return 1 - Math.pow(-2 * progress + 2, 3) / 2
  }
}

function parseTime (value) {
  if (typeof value === 'number') {
    return value
  }

  const text = String(value || '').trim()

  if (!text) {
    return 0
  }

  if (text.indexOf(':') === -1) {
    return Number(text) || 0
  }

  return text.split(':').reduce(function (total, part) {
    return total * 60 + (Number(part) || 0)
  }, 0)
}

function mergeState (base, target) {
  const merged = {
    x: base.x,
    y: base.y,
    scale: base.scale,
    rotate: base.rotate,
    opacity: base.opacity
  }

  if (!target) {
    return merged
  }

  if (typeof target.x === 'number') {
    merged.x = target.x
  }
  if (typeof target.y === 'number') {
    merged.y = target.y
  }
  if (typeof target.scale === 'number') {
    merged.scale = target.scale
  }
  if (typeof target.rotate === 'number') {
    merged.rotate = target.rotate
  }
  if (typeof target.opacity === 'number') {
    merged.opacity = target.opacity
  }

  return merged
}

function copyPoint (point, at) {
  return {
    at: at,
    x: point.x,
    y: point.y,
    scale: point.scale,
    rotate: point.rotate,
    opacity: point.opacity
  }
}

// 时间轴优先使用 config.timeline：
// 每一项用 start（歌曲时间）+ duration（持续秒数）描述档期，
// 并通过 comic 引用 config.cues 里的一条运动轨迹。
function resolveTimelineCues (config) {
  const timeline = config.timeline

  if (!timeline || !timeline.length) {
    return config.cues || []
  }

  return timeline.map(function (entry) {
    const motion = entry.comic && typeof entry.comic === 'object' ? entry.comic : entry

    return {
      start: entry.start,
      end: entry.end,
      duration: entry.duration,
      image: typeof entry.image !== 'undefined' ? entry.image : motion.image,
      from: motion.from,
      to: motion.to,
      path: motion.path,
      easing: motion.easing || entry.easing
    }
  })
}

function normalizeCue (cue, defaultEasing, speed) {
  // speed < 1 时整条时间轴按比例拉长，画面运动随之变慢。
  const timeScale = 1 / (speed > 0 ? speed : 1)
  const start = parseTime(cue.start) * timeScale
  const hasDuration = cue.duration !== undefined && cue.duration !== null && cue.duration !== ''
  // 新写法用 duration 表示持续时长，旧写法仍可直接写 end
  const end = hasDuration
    ? start + parseTime(cue.duration) * timeScale
    : parseTime(cue.end) * timeScale

  if (!(end > start)) {
    return null
  }

  let points = []

  if (cue.path && cue.path.length) {
    let previous = mergeState(DEFAULT_STATE, null)

    cue.path.forEach(function (point, index) {
      let at = point.at

      if (typeof at !== 'number') {
        at = index === 0 ? 0 : 1
      }

      previous = mergeState(previous, point)
      points.push(copyPoint(previous, at))
    })
  } else {
    points = [
      copyPoint(mergeState(DEFAULT_STATE, cue.from), 0),
      copyPoint(mergeState(DEFAULT_STATE, cue.to), 1)
    ]
  }

  points.sort(function (a, b) {
    return a.at - b.at
  })

  if (points[0].at > 0) {
    points.unshift(copyPoint(points[0], 0))
  }

  if (points[points.length - 1].at < 1) {
    points.push(copyPoint(points[points.length - 1], 1))
  }

  return {
    start: start,
    end: end,
    image: String(cue.image),
    path: points,
    easing: EASINGS[cue.easing] || EASINGS[defaultEasing] || EASINGS.linear
  }
}

export default {
  name: 'PictureSlideshow',
  props: {
    playing: {
      type: Boolean,
      default: false
    },
    currentTime: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      timelineConfig: pictureTimeline,
      pictures: [
        { id: '00', src: pic00 },
        { id: '01', src: pic01 },
        { id: '02', src: pic02 },
        { id: '03', src: pic03 },
        { id: '04', src: pic04 },
        { id: '05', src: pic05 }
      ],
      started: false
    }
  },
  computed: {
    // 动画层铺满整个视口，放大后的图片可以向四周延伸到全屏。
    // 舞台尺寸仍以「信件与歌词之间的空间」为基准，避免图片在默认缩放下过大；
    // 文字层（信件 / 歌词）在动画之上，所以文字始终保持可读。
    stageStyle () {
      const letter = overlayConfig.letter
      const lyrics = overlayConfig.lyrics
      const area = this.timelineConfig.area
      const stage = this.timelineConfig.stage
      const letterWidth = 'min(' + letter.width + ', ' + (letter.maxWidth || letter.width) + ')'
      const lyricsWidth = 'min(' + lyrics.areaWidth + ', ' + (lyrics.areaMaxWidth || lyrics.areaWidth) + ')'
      const corridorWidth = '100vw - (' + letter.left + ' + ' + letterWidth + ') - (' +
        lyrics.areaRight + ' + ' + lyricsWidth + ') - (' + area.sideGap + ' * 2)'
      const corridorHeight = '100vh - ' + area.top + ' - ' + area.bottom

      return {
        width: 'calc((' + corridorWidth + ') * ' + stage.widthRatio + ')',
        height: 'calc((' + corridorHeight + ') * ' + stage.heightRatio + ')',
        maxWidth: stage.maxWidth,
        maxHeight: stage.maxHeight,
        transitionDuration: this.timelineConfig.revealDuration + 'ms'
      }
    }
  },
  watch: {
    currentTime (value) {
      this._time = value

      if (this.started && !this.playing) {
        this.renderFrame()
      }
    },
    playing (value) {
      if (value) {
        this.start()
      } else {
        this._time = this.currentTime
      }
    }
  },
  created () {
    const pictureIds = this.pictures.map(function (picture) {
      return picture.id
    })

    this._destroyed = false
    this._time = this.currentTime
    this._lastTs = 0
    this._rafId = null
    this._opacities = this.pictures.map(function () {
      return 0
    })
    this._cues = resolveTimelineCues(this.timelineConfig).map((cue) => {
      return normalizeCue(cue, this.timelineConfig.easing, Number(this.timelineConfig.speed))
    }).filter(function (cue) {
      return cue && pictureIds.indexOf(cue.image) !== -1
    })
    this._duration = this._cues.reduce(function (max, cue) {
      return Math.max(max, cue.end)
    }, 0)
  },
  mounted () {
    if (this.playing) {
      this.start()
    }
  },
  beforeDestroy () {
    this._destroyed = true

    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  },
  methods: {
    start () {
      if (this.started) {
        return
      }

      this.started = true
      this._time = this.currentTime
      this._lastTs = 0
      this.renderFrame()

      if (!this._rafId) {
        this._rafId = window.requestAnimationFrame(this.tick)
      }
    },
    tick (timestamp) {
      if (this._destroyed) {
        return
      }

      if (!this._lastTs) {
        this._lastTs = timestamp
      }

      const delta = Math.min((timestamp - this._lastTs) / 1000, 0.1)
      this._lastTs = timestamp

      if (this.playing) {
        this._time += delta
        this.renderFrame(delta)
      }

      this._rafId = window.requestAnimationFrame(this.tick)
    },
    resolveTime () {
      if (this._duration <= 0) {
        return 0
      }

      let time = Number(this._time) || 0

      if (time < 0) {
        time = 0
      }

      if (this.timelineConfig.loop) {
        return time % this._duration
      }

      return Math.min(time, this._duration)
    },
    findCue (time) {
      for (let i = 0; i < this._cues.length; i += 1) {
        const cue = this._cues[i]

        if (time >= cue.start && time < cue.end) {
          return cue
        }
      }

      return null
    },
    sampleCue (cue, time) {
      const span = cue.end - cue.start
      const progress = span > 0
        ? Math.max(0, Math.min(1, (time - cue.start) / span))
        : 1
      const path = cue.path
      let from = path[0]
      let to = path[path.length - 1]

      for (let i = 0; i < path.length - 1; i += 1) {
        if (progress <= path[i + 1].at) {
          from = path[i]
          to = path[i + 1]
          break
        }
      }

      const segment = to.at - from.at
      const local = segment > 0 ? (progress - from.at) / segment : 0
      const eased = cue.easing(Math.max(0, Math.min(1, local)))

      return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        scale: from.scale + (to.scale - from.scale) * eased,
        rotate: from.rotate + (to.rotate - from.rotate) * eased,
        opacity: from.opacity + (to.opacity - from.opacity) * eased
      }
    },
    renderFrame (delta) {
      const stage = this.$refs.stage
      const images = this.$refs.images

      if (!stage || !images || !images.length) {
        return
      }

      const time = this.resolveTime()
      const cue = this.findCue(time)
      const state = cue ? this.sampleCue(cue, time) : null
      const stageOpacity = this.timelineConfig.stage.opacity
      const fadeMs = Math.max(1, Number(this.timelineConfig.transition) || 1)
      const fadeStep = typeof delta === 'number' ? (delta * 1000) / fadeMs : 1

      for (let i = 0; i < images.length; i += 1) {
        const image = images[i]
        const active = cue && state && this.pictures[i].id === cue.image
        const target = active
          ? Math.max(0, Math.min(1, state.opacity * stageOpacity))
          : 0
        let current = this._opacities[i] || 0

        if (target > current) {
          current = Math.min(target, current + fadeStep)
        } else {
          current = Math.max(target, current - fadeStep)
        }

        this._opacities[i] = current
        image.style.opacity = String(current)

        if (active) {
          // x / y 是视口百分比：50 是画面正中心，42 表示向左侧移动 8vw。
          const offsetX = (state.x - 50).toFixed(3)
          const offsetY = (state.y - 50).toFixed(3)

          image.style.transform = 'translate(-50%, -50%) translate(' + offsetX + 'vw, ' + offsetY + 'vh) scale(' + state.scale.toFixed(4) + ') rotate(' + state.rotate.toFixed(3) + 'deg)'
        }
      }
    }
  }
}
</script>

<style scoped>
/*
 * 动画层铺满整个视口，放大后的图片可以向四周延伸到全屏；
 * 遮罩只让图片在接近屏幕边缘时柔和淡出。
 * 层级低于信件（10）和歌词（20），文字不会被动画盖住。
 */
.picture-layer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse at center, #000 78%, transparent 100%);
  mask-image: radial-gradient(ellipse at center, #000 78%, transparent 100%);
}

/* 舞台在画面正中，以中间区域的实际尺寸为基准等比缩放 */
.picture-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition-property: opacity;
  transition-timing-function: ease;
}

.picture-stage.is-revealed {
  opacity: 1;
  visibility: visible;
}

.picture-item {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
  will-change: opacity, transform;
}

@media (max-width: 960px) {
  .picture-layer {
    display: none;
  }
}
</style>

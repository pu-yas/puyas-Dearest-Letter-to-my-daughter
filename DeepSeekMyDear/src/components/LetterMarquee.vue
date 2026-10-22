<template>
  <div class="letter-sheet" :class="{ 'is-revealed': started }" :style="sheetStyle" aria-hidden="true">
    <div class="letter-paper"></div>

    <div class="letter-marquee" :style="maskStyle">
      <div class="letter-focus"></div>

      <div ref="ghostTrack" class="letter-track letter-ghost">
        <div class="letter-copy" :style="textStyle">
          <p
            v-for="(line, index) in lines"
            :key="'ghost-first-' + index"
            :class="line.className"
          >{{ line.text }}</p>
        </div>
        <div class="letter-copy" :style="textStyle">
          <p
            v-for="(line, index) in lines"
            :key="'ghost-second-' + index"
            :class="line.className"
          >{{ line.text }}</p>
        </div>
      </div>

      <div ref="track" class="letter-track letter-main">
        <div ref="copy" class="letter-copy" :style="textStyle">
          <p
            v-for="(line, index) in lines"
            :key="'first-' + index"
            :class="[line.className, { 'is-active': index === activeLineIndex }]"
          >{{ line.text }}</p>
        </div>
        <div class="letter-copy" :style="textStyle">
          <p
            v-for="(line, index) in lines"
            :key="'second-' + index"
            :class="[line.className, { 'is-active': index === activeLineIndex }]"
          >{{ line.text }}</p>
        </div>
      </div>
    </div>

    <span class="letter-rule"></span>
  </div>
</template>

<script>
import letterRaw from '@/assets/letter.md'
import overlayConfig from '@/config/overlay.config'

function parseLetter (raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  const source = text.split(/\r?\n/)
  const lines = []
  let isFirstContent = true

  source.forEach((rawLine) => {
    const trimmed = rawLine.trim()

    if (!trimmed) {
      if (lines.length && lines[lines.length - 1].text !== '') {
        lines.push({ text: '', className: 'letter-blank' })
      }
      return
    }

    if (/^-{3,}$/.test(trimmed)) {
      return
    }

    const isHeading = /^#{1,6}\s*/.test(trimmed)
    const clean = trimmed.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim()

    if (!clean) {
      return
    }

    lines.push({
      text: clean,
      className: isFirstContent && isHeading ? 'letter-line letter-title' : 'letter-line'
    })
    isFirstContent = false
  })

  return lines
}

export default {
  name: 'LetterMarquee',
  props: {
    playing: {
      type: Boolean,
      default: false
    },
    // 音乐是否已经开始过：信纸背景等渲染效果在这之后才淡入
    started: {
      type: Boolean,
      default: false
    },
    duration: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      letterConfig: overlayConfig.letter,
      lines: parseLetter(letterRaw),
      contentHeight: 0,
      containerHeight: 0,
      // 当前停在阅读位置（信件垂直中心）的那一句
      activeLineIndex: -1
    }
  },
  computed: {
    speed () {
      const config = this.letterConfig

      if (config.mode === 'duration' && this.duration > 0 && this.contentHeight > 0) {
        return (this.contentHeight * config.speedMultiplier) / this.duration
      }

      return config.speed
    },
    sheetStyle () {
      const config = this.letterConfig

      return {
        left: config.left,
        width: config.width,
        maxWidth: config.maxWidth
      }
    },
    maskStyle () {
      const fade = this.letterConfig.fadeSize
      const mask = 'linear-gradient(to bottom, transparent 0, #000 ' + fade + ', #000 calc(100% - ' + fade + '), transparent 100%)'

      return {
        WebkitMaskImage: mask,
        maskImage: mask
      }
    },
    textStyle () {
      return {
        fontSize: this.letterConfig.fontSize
      }
    }
  },
  mounted () {
    this._offset = 0
    this._lastTs = 0
    this._rafId = null
    this._destroyed = false

    this.measure()
    this._offset = -this.containerHeight
    this.applyTransform()
    this.applyGhostTransform()

    window.addEventListener('resize', this.handleResize)
    this._rafId = window.requestAnimationFrame(this.tick)
  },
  beforeDestroy () {
    this._destroyed = true

    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId)
    }

    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    measure () {
      const copy = this.$refs.copy

      if (!copy) {
        return
      }

      this.contentHeight = copy.offsetHeight
      this.containerHeight = this.$el.clientHeight
      this.measureLines(copy)
    },
    measureLines (copy) {
      const nodes = copy.children
      const metrics = []

      for (let i = 0; i < nodes.length; i += 1) {
        metrics.push({
          top: nodes[i].offsetTop,
          height: nodes[i].offsetHeight
        })
      }

      this._lineMetrics = metrics
    },
    handleResize () {
      this.measure()

      if (this.contentHeight > 0) {
        this._offset = this._offset % this.contentHeight
      }

      this.applyTransform()
      this.applyGhostTransform()
    },
    applyTransform () {
      const track = this.$refs.track

      if (track) {
        track.style.transform = 'translate3d(0, ' + (-this._offset) + 'px, 0)'
      }

      this.updateActiveLine()
    },
    // 旧句子以更慢的速度在纸面上流淌，像反复阅读留下的残影。
    applyGhostTransform () {
      const ghost = this.$refs.ghostTrack

      if (!ghost || this.contentHeight <= 0) {
        return
      }

      let offset = this._offset * 0.55 + this.contentHeight * 0.3
      offset = offset % this.contentHeight

      if (offset < 0) {
        offset += this.contentHeight
      }

      ghost.style.transform = 'translate3d(0, ' + (-offset) + 'px, 0)'
    },
    updateActiveLine () {
      const metrics = this._lineMetrics

      if (!metrics || !metrics.length) {
        return
      }

      const focus = this.containerHeight / 2
      let active = -1
      let best = Infinity

      for (let i = 0; i < metrics.length; i += 1) {
        const line = this.lines[i]

        // 跳过空行，让光晕始终落在真正有文字的句子上
        if (!line || !line.text) {
          continue
        }

        const center = metrics[i].top + metrics[i].height / 2 - this._offset
        const distance = Math.abs(center - focus)

        if (distance < best) {
          best = distance
          active = i
        }
      }

      if (active !== this.activeLineIndex) {
        this.activeLineIndex = active
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

      if (this.playing && this.contentHeight > 0) {
        this._offset += this.speed * delta

        while (this._offset >= this.contentHeight) {
          this._offset -= this.contentHeight
        }

        this.applyTransform()
        this.applyGhostTransform()
      }

      this._rafId = window.requestAnimationFrame(this.tick)
    }
  }
}
</script>

<style scoped>
.letter-sheet {
  position: fixed;
  top: 72px;
  bottom: 108px;
  left: 5vw;
  pointer-events: none;
  z-index: 10;
  text-align: left;
}

/* 一层几乎看不见的纸：暖白底色、一道浅浅的折痕、柔和的边缘 */
.letter-paper {
  position: absolute;
  top: -18px;
  right: -24px;
  bottom: -12px;
  left: -22px;
  z-index: 0;
  border-radius: 12px;
  /* 信纸背景等播放开始后再淡入 */
  opacity: 0;
  transition: opacity 1.2s ease;
  background:
    linear-gradient(
      90deg,
      transparent 35.6%,
      rgba(120, 102, 74, 0.045) 36%,
      transparent 36.4%
    ),
    linear-gradient(
      166deg,
      rgba(255, 253, 247, 0.66) 0%,
      rgba(250, 246, 236, 0.38) 52%,
      rgba(243, 240, 232, 0.16) 100%
    );
  box-shadow: 0 26px 60px rgba(91, 80, 60, 0.05);
  -webkit-mask-image: radial-gradient(ellipse 94% 96% at 50% 50%, #000 48%, transparent 100%);
  mask-image: radial-gradient(ellipse 94% 96% at 50% 50%, #000 48%, transparent 100%);
  overflow: hidden;
  pointer-events: none;
}

/* 纸张纤维：极细的噪点，让纸面有一点点被触摸过的颗粒感 */
.letter-paper::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.6'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  opacity: 0.055;
  mix-blend-mode: multiply;
  pointer-events: none;
}

/* 缓慢游走的光，像窗外的天光在纸面上移动 */
.letter-paper::after {
  content: '';
  position: absolute;
  top: -35%;
  left: -35%;
  width: 170%;
  height: 150%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 252, 238, 0.6) 0%,
    rgba(255, 252, 238, 0.2) 42%,
    transparent 70%
  );
  opacity: 0.7;
  animation: letter-light-drift 26s ease-in-out infinite alternate;
  will-change: transform, opacity;
  pointer-events: none;
}

@keyframes letter-light-drift {
  0% {
    transform: translate3d(-5%, -3%, 0) scale(1) rotate(-2deg);
    opacity: 0.5;
  }
  55% {
    opacity: 0.82;
  }
  100% {
    transform: translate3d(6%, 8%, 0) scale(1.12) rotate(2deg);
    opacity: 0.68;
  }
}

.letter-marquee {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  overflow: hidden;
}

/* 阅读位置的一小片柔光：句子经过这里时会被轻轻照亮 */
.letter-focus {
  position: absolute;
  top: 50%;
  right: -12%;
  left: -12%;
  z-index: 0;
  height: 26%;
  transform: translateY(-50%);
  background: radial-gradient(
    ellipse at center,
    rgba(255, 252, 240, 0.72) 0%,
    rgba(255, 252, 240, 0.24) 44%,
    transparent 72%
  );
  opacity: 0.72;
  animation: letter-focus-breathe 7s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes letter-focus-breathe {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 0.9;
  }
}

/* 旧句子以更慢的速度留在纸面上，像反复阅读后没有散去的残影 */
.letter-ghost {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 0;
  opacity: 0;
  filter: blur(0.6px);
  pointer-events: none;
  transition: opacity 1.2s ease;
}

/* 音乐开始后，信纸背景、残影文字和底边线一起淡入 */
.letter-sheet.is-revealed .letter-paper,
.letter-sheet.is-revealed .letter-rule {
  opacity: 1;
}

.letter-sheet.is-revealed .letter-ghost {
  opacity: 0.07;
}

.letter-main {
  position: relative;
  z-index: 1;
}

/* 信纸底部的横线 */
.letter-rule {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  height: 1px;
  opacity: 0;
  transition: opacity 1.2s ease;
  background: linear-gradient(
    90deg,
    rgba(44, 62, 80, 0.02) 0%,
    rgba(44, 62, 80, 0.3) 6%,
    rgba(44, 62, 80, 0.3) 94%,
    rgba(44, 62, 80, 0.02) 100%
  );
  pointer-events: none;
}

.letter-track {
  will-change: transform;
}

.letter-copy {
  padding-bottom: 48px;
  font-family: "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif;
  background: transparent;
}

.letter-line {
  margin: 0 0 0.55em;
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: rgba(44, 62, 80, 0.8);
  transition: color 0.9s ease, text-shadow 0.9s ease;
}

/* 正停在阅读位置的句子：墨色稍深，并浮起一圈很轻的光 */
.letter-line.is-active {
  color: rgba(36, 52, 72, 0.96);
  text-shadow:
    0 0 14px rgba(255, 252, 240, 0.9),
    0 0 30px rgba(150, 186, 218, 0.42);
}

.letter-title {
  margin-bottom: 1em;
  font-size: 1.5em;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgba(44, 62, 80, 0.95);
}

.letter-blank {
  height: 0.55em;
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  .letter-paper::after,
  .letter-focus {
    animation: none;
  }
}

@media (max-width: 600px) {
  .letter-copy {
    font-size: 16px !important;
  }
}
</style>

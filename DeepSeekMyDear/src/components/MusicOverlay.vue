<template>
  <div class="music-overlay">
    <transition name="comic-fade" appear>
      <comic-viewer v-if="!playbackStarted" />
    </transition>

    <picture-slideshow :playing="isPlaying" :current-time="currentTime" />
    <letter-marquee :playing="isPlaying" :started="playbackStarted" :duration="duration" />
    <lyrics-board :playing="isPlaying" :current-time="currentTime" />

    <audio
      ref="audio"
      class="bgm-audio"
      :src="audioSrc"
      :loop="audioConfig.loop"
      preload="auto"
      @play="handlePlay"
      @pause="handlePause"
      @loadedmetadata="handleMetadata"
      @durationchange="handleMetadata"
      @timeupdate="handleTimeUpdate"
      @ended="handleEnded"
    ></audio>

    <div
      class="music-dock"
      :style="dockStyle"
      @mouseenter="dockHovered = true"
      @mouseleave="dockHovered = false"
      @focusin="dockHovered = true"
      @focusout="dockHovered = false"
    >
      <button
        class="play-btn"
        type="button"
        :aria-label="isPlaying ? '暂停音乐' : '播放音乐'"
        @click="togglePlay"
      >
        <span v-if="isPlaying" class="icon-pause"></span>
        <span v-else class="icon-play"></span>
      </button>

      <div
        ref="track"
        class="progress-track"
        role="slider"
        aria-label="音乐进度"
        aria-valuemin="0"
        :aria-valuemax="Math.round(duration)"
        :aria-valuenow="Math.round(currentTime)"
        @pointerdown="startSeek"
      >
        <div class="progress-rail"></div>
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
      </div>

      <span class="time-label">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script>
import bgmSrc from '@/assets/【洛天依】亲爱的（Love Elegia Ver.）【X STUDIO COVER】 - 苍钻.mp3'
import overlayConfig from '@/config/overlay.config'
import ComicViewer from '@/components/ComicViewer.vue'
import LetterMarquee from '@/components/LetterMarquee.vue'
import LyricsBoard from '@/components/LyricsBoard.vue'
import PictureSlideshow from '@/components/PictureSlideshow.vue'

export default {
  name: 'MusicOverlay',
  components: {
    ComicViewer,
    LetterMarquee,
    LyricsBoard,
    PictureSlideshow
  },
  data () {
    return {
      audioSrc: bgmSrc,
      audioConfig: overlayConfig.audio,
      playerConfig: overlayConfig.player,
      isPlaying: false,
      playbackStarted: false,
      dockHovered: false,
      currentTime: 0,
      duration: 0,
      seeking: false
    }
  },
  computed: {
    progressPercent () {
      if (!this.duration) {
        return 0
      }

      return Math.min(100, Math.max(0, (this.currentTime / this.duration) * 100))
    },
    dockStyle () {
      const opacity = this.dockHovered ? this.playerConfig.hoverOpacity : this.playerConfig.idleOpacity
      const offset = this.dockHovered ? '0px' : '8px'

      return {
        opacity: opacity,
        transform: 'translate(-50%, ' + offset + ')'
      }
    }
  },
  mounted () {
    window.addEventListener('keydown', this.handleKeydown)

    const audio = this.$refs.audio

    if (!audio) {
      return
    }

    audio.volume = this.audioConfig.volume

    if (this.audioConfig.autoPlay) {
      this.playAudio()
    }
  },
  beforeDestroy () {
    this.stopSeekListeners()
    window.removeEventListener('keydown', this.handleKeydown)

    if (this.$refs.audio) {
      this.$refs.audio.pause()
    }
  },
  methods: {
    playAudio () {
      const audio = this.$refs.audio

      if (!audio) {
        return
      }

      const playPromise = audio.play()

      if (playPromise && typeof playPromise.catch === 'function') {
        // The browser may block autoplay; the triangle button stays available.
        playPromise.catch(() => {})
      }
    },
    handlePlay () {
      this.isPlaying = true
      // 音乐开始后进入正式画面，初始画面的漫画随即淡出。
      this.playbackStarted = true
    },
    handlePause () {
      this.isPlaying = false
    },
    handleMetadata () {
      const audio = this.$refs.audio

      if (audio && isFinite(audio.duration)) {
        this.duration = audio.duration
      }
    },
    handleTimeUpdate () {
      const audio = this.$refs.audio

      if (audio && !this.seeking) {
        this.currentTime = audio.currentTime
      }
    },
    handleEnded () {
      this.isPlaying = false
      this.currentTime = 0

      if (this.$refs.audio) {
        this.$refs.audio.currentTime = 0
      }
    },
    togglePlay () {
      const audio = this.$refs.audio

      if (!audio) {
        return
      }

      if (audio.paused) {
        this.playAudio()
      } else {
        audio.pause()
      }
    },
    // 空格键是主要入口：第一次按下时音乐、信件滚动和中间动画一起开始；
    // 之后再按则在播放 / 暂停之间切换。
    handleKeydown (event) {
      if (event.code !== 'Space' && event.key !== ' ') {
        return
      }

      // 按住空格时不要连续切换播放 / 暂停
      if (event.repeat) {
        return
      }

      const target = event.target
      const tagName = target && target.tagName

      // 焦点落在按钮或输入框上时，把空格留给它们自己处理，
      // 否则一次按键会同时触发原生点击和这里的播放切换。
      if (target && (
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON'
      )) {
        return
      }

      event.preventDefault()
      this.togglePlay()
    },
    formatTime (seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0))
      const minutes = Math.floor(total / 60)
      const rest = total % 60
      const padded = rest < 10 ? '0' + rest : String(rest)

      return minutes + ':' + padded
    },
    startSeek (event) {
      if (!this.playerConfig.seekEnabled || !this.duration) {
        return
      }

      event.preventDefault()
      this.seeking = true
      this.seekToEvent(event)

      window.addEventListener('pointermove', this.handleSeekMove)
      window.addEventListener('pointerup', this.stopSeek)
      window.addEventListener('pointercancel', this.stopSeek)
    },
    handleSeekMove (event) {
      if (this.seeking) {
        this.seekToEvent(event)
      }
    },
    seekToEvent (event) {
      const track = this.$refs.track
      const audio = this.$refs.audio

      if (!track || !audio || !this.duration) {
        return
      }

      const rect = track.getBoundingClientRect()

      if (!rect.width) {
        return
      }

      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))

      this.currentTime = ratio * this.duration
      audio.currentTime = this.currentTime
    },
    stopSeek () {
      this.seeking = false
      this.stopSeekListeners()
    },
    stopSeekListeners () {
      window.removeEventListener('pointermove', this.handleSeekMove)
      window.removeEventListener('pointerup', this.stopSeek)
      window.removeEventListener('pointercancel', this.stopSeek)
    }
  }
}
</script>

<style scoped>
.music-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  pointer-events: none;
}

.bgm-audio {
  display: none;
}

.comic-fade-enter-active,
.comic-fade-leave-active {
  transition: opacity 0.6s ease;
}

.comic-fade-enter,
.comic-fade-leave-to {
  opacity: 0;
}

.music-dock {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 14px;
  width: calc(100vw - 32px);
  max-width: 720px;
  height: 56px;
  padding: 0 18px;
  box-sizing: border-box;
  border-radius: 28px;
  background: rgba(24, 28, 36, 0.86);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  transition: opacity 0.35s ease, transform 0.35s ease;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.play-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.play-btn:focus {
  outline: 2px solid rgba(155, 231, 255, 0.8);
  outline-offset: 2px;
}

.icon-play {
  display: block;
  width: 0;
  height: 0;
  margin-left: 4px;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 15px solid #ffffff;
}

.icon-pause {
  display: block;
  width: 14px;
  height: 18px;
  box-sizing: border-box;
  border-left: 4px solid #ffffff;
  border-right: 4px solid #ffffff;
}

.progress-track {
  position: relative;
  flex: 1;
  height: 20px;
  cursor: pointer;
  touch-action: none;
}

.progress-rail {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  margin-top: -2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}

.progress-fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 4px;
  margin-top: -2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #9be7ff, #b6f0c9);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: #ffffff;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.progress-track:hover .progress-thumb {
  opacity: 1;
}

.time-label {
  flex: 0 0 auto;
  min-width: 86px;
  font-size: 12px;
  text-align: right;
  color: rgba(255, 255, 255, 0.72);
  font-variant-numeric: tabular-nums;
}

@media (hover: none) {
  .music-dock {
    opacity: 1 !important;
    transform: translate(-50%, 0) !important;
  }
}
</style>

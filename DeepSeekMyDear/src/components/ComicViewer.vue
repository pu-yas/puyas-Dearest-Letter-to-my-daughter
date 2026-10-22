<template>
  <div class="comic-viewer">
    <div class="comic-shell">
      <div class="comic-frame">
        <transition :name="'comic-' + direction" mode="out-in">
          <img
            :key="pages[currentIndex].id"
            class="comic-page"
            :src="pages[currentIndex].src"
            :alt="pages[currentIndex].alt"
            draggable="false"
          >
        </transition>

        <button
          class="comic-arrow comic-arrow-prev"
          type="button"
          aria-label="上一页漫画"
          :disabled="currentIndex === 0"
          @click="goPrev"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              d="M15 4.5 7.5 12l7.5 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          class="comic-arrow comic-arrow-next"
          type="button"
          aria-label="下一页漫画"
          :disabled="currentIndex === pages.length - 1"
          @click="goNext"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              d="M9 4.5 16.5 12 9 19.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="comic-meta">
        <span class="comic-counter">{{ paddedIndex }} / {{ paddedTotal }}</span>
        <span class="comic-hint">按空格键开始</span>
      </div>
    </div>
  </div>
</template>

<script>
import comic01 from '@/assets/comic/01.jpg'
import comic02 from '@/assets/comic/02.jpg'
import comic03 from '@/assets/comic/03.jpg'
import comic04 from '@/assets/comic/04.jpg'
import comic05 from '@/assets/comic/05.jpg'
import comic06 from '@/assets/comic/06.jpg'
import overlayConfig from '@/config/overlay.config'

const COMIC_TITLE = '妈妈留在我身上'

export default {
  name: 'ComicViewer',
  data () {
    return {
      comicConfig: overlayConfig.comic,
      pages: [
        { id: '01', src: comic01, alt: COMIC_TITLE + ' 第 1 页' },
        { id: '02', src: comic02, alt: COMIC_TITLE + ' 第 2 页' },
        { id: '03', src: comic03, alt: COMIC_TITLE + ' 第 3 页' },
        { id: '04', src: comic04, alt: COMIC_TITLE + ' 第 4 页' },
        { id: '05', src: comic05, alt: COMIC_TITLE + ' 第 5 页' },
        { id: '06', src: comic06, alt: COMIC_TITLE + ' 第 6 页' }
      ],
      currentIndex: 0,
      direction: 'next'
    }
  },
  computed: {
    paddedIndex () {
      return this.padNumber(this.currentIndex + 1)
    },
    paddedTotal () {
      return this.padNumber(this.pages.length)
    }
  },
  watch: {
    // 手动翻页或自动翻页后，都重新开始计时；到了最后一页就不再自动前进。
    currentIndex () {
      this.scheduleAuto()
    }
  },
  created () {
    this._autoTimer = null
  },
  mounted () {
    this.preloadPages()
    window.addEventListener('keydown', this.handleKeydown)
    this.scheduleAuto()
  },
  beforeDestroy () {
    this.stopAuto()
    window.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    padNumber (value) {
      return value < 10 ? '0' + value : String(value)
    },
    preloadPages () {
      this.pages.forEach((page) => {
        const image = new window.Image()
        image.src = page.src
      })
    },
    scheduleAuto () {
      this.stopAuto()

      if (!this.comicConfig.autoPlay || this.currentIndex >= this.pages.length - 1) {
        return
      }

      this._autoTimer = window.setTimeout(() => {
        this._autoTimer = null
        this.goTo(this.currentIndex + 1)
      }, this.comicConfig.interval)
    },
    stopAuto () {
      if (this._autoTimer) {
        window.clearTimeout(this._autoTimer)
        this._autoTimer = null
      }
    },
    goTo (index) {
      if (index < 0 || index >= this.pages.length || index === this.currentIndex) {
        return
      }

      this.direction = index > this.currentIndex ? 'next' : 'prev'
      this.currentIndex = index
    },
    goPrev () {
      this.goTo(this.currentIndex - 1)
    },
    goNext () {
      this.goTo(this.currentIndex + 1)
    },
    handleKeydown (event) {
      if (event.key === 'ArrowLeft') {
        this.goPrev()
      } else if (event.key === 'ArrowRight') {
        this.goNext()
      }
    }
  }
}
</script>

<style scoped>
.comic-viewer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.comic-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.comic-frame {
  position: relative;
  /* 尽量撑满视口高度，只给底部页码留一点空间 */
  height: min(calc(100vh - 56px), 64vw);
  aspect-ratio: 2 / 3;
  border-radius: 4px;
  background: #fdfbf7;
  box-shadow:
    0 28px 60px rgba(44, 62, 80, 0.18),
    0 4px 12px rgba(44, 62, 80, 0.08);
  pointer-events: auto;
}

.comic-page {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: contain;
  background: #fdfbf7;
  user-select: none;
  -webkit-user-drag: none;
  will-change: opacity, transform;
}

.comic-arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-top: -21px;
  padding: 0;
  border: 1px solid rgba(44, 62, 80, 0.12);
  border-radius: 50%;
  background: rgba(253, 251, 247, 0.88);
  color: rgba(44, 62, 80, 0.78);
  box-shadow: 0 8px 20px rgba(44, 62, 80, 0.16);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, visibility 0.3s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.comic-arrow-prev {
  left: -21px;
}

.comic-arrow-next {
  right: -21px;
}

.comic-frame:hover .comic-arrow,
.comic-frame:focus-within .comic-arrow {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.comic-arrow:hover:not(:disabled) {
  background: #ffffff;
  color: #2c3e50;
  transform: scale(1.06);
}

.comic-arrow:focus {
  outline: 2px solid rgba(44, 62, 80, 0.35);
  outline-offset: 2px;
}

.comic-arrow:disabled {
  opacity: 0.22;
  cursor: default;
}

.comic-meta {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
  font-family: "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif;
  font-size: 12px;
  letter-spacing: 0.28em;
  color: rgba(44, 62, 80, 0.45);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.comic-counter {
  padding-left: 0.28em;
}

/* 开场提示：第一次按下空格后，音乐、信件和动画一起开始 */
.comic-hint {
  padding-left: 18px;
  border-left: 1px solid rgba(44, 62, 80, 0.18);
  color: rgba(44, 62, 80, 0.58);
}

/* 翻页动画：旧页淡出后新页从对应方向轻轻滑入 */
.comic-next-enter-active,
.comic-next-leave-active,
.comic-prev-enter-active,
.comic-prev-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.comic-next-enter {
  opacity: 0;
  transform: translateX(32px);
}

.comic-next-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}

.comic-prev-enter {
  opacity: 0;
  transform: translateX(-32px);
}

.comic-prev-leave-to {
  opacity: 0;
  transform: translateX(32px);
}

@media (hover: none) {
  .comic-arrow {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

@media (max-width: 700px) {
  .comic-arrow {
    width: 36px;
    height: 36px;
    margin-top: -18px;
  }

  .comic-arrow-prev {
    left: -18px;
  }

  .comic-arrow-next {
    right: -18px;
  }

  .comic-meta {
    margin-top: 10px;
    font-size: 11px;
  }
}
</style>

<template>
  <div class="lyrics-board" :style="boardStyle" aria-hidden="true">
    <div class="lyrics-columns">
      <div
        v-for="column in columns"
        :key="column.id"
        class="lyric-col"
        :class="{ 'is-leaving': column.leaving }"
        :style="columnStyle"
      >{{ column.text }}</div>
    </div>
  </div>
</template>

<script>
import lyricsTimeConfig from '@/config/lyricsTime.config'
import overlayConfig from '@/config/overlay.config'

function parseLyricTime (value) {
  if (typeof value === 'number') {
    return isFinite(value) ? value : null
  }

  const text = String(value || '').trim()

  if (!text) {
    return null
  }

  const parts = text.split(':')

  if (parts.length === 1) {
    const seconds = Number(parts[0])
    return isFinite(seconds) ? seconds : null
  }

  let total = 0

  for (let i = 0; i < parts.length; i += 1) {
    const part = Number(parts[i])

    if (!isFinite(part)) {
      return null
    }

    total = total * 60 + part
  }

  return total
}

function buildCues (config) {
  const entries = (config && config.lyrics) || {}
  const autoInterval = Number(config && config.autoInterval) || 8
  const cues = []
  let lastTime = 0

  Object.keys(entries).forEach(function (key) {
    const entry = entries[key]

    if (!entry) {
      return
    }

    const text = String(entry.lyrics || entry.text || '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) {
      return
    }

    let time = parseLyricTime(entry.time)

    if (time === null) {
      time = cues.length ? lastTime + autoInterval : autoInterval
    }

    if (time < lastTime) {
      time = lastTime
    }

    cues.push({ text: text, time: time })
    lastTime = time
  })

  cues.sort(function (a, b) {
    return a.time - b.time
  })

  return cues
}

function buildGroups (config) {
  const cues = buildCues(config)
  const perGroup = Math.max(1, Math.floor(Number(config && config.linesPerAppearance) || 2))
  const groups = []

  for (let i = 0; i < cues.length; i += perGroup) {
    const slice = cues.slice(i, i + perGroup)

    groups.push({
      time: slice[0].time,
      texts: slice.map(function (cue) {
        return cue.text
      })
    })
  }

  return groups
}

export default {
  name: 'LyricsBoard',
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
      lyricsConfig: overlayConfig.lyrics,
      columns: []
    }
  },
  computed: {
    boardStyle () {
      return {
        right: this.lyricsConfig.areaRight,
        width: this.lyricsConfig.areaWidth,
        maxWidth: this.lyricsConfig.areaMaxWidth
      }
    },
    columnStyle () {
      return {
        fontSize: this.lyricsConfig.fontSize,
        transitionDuration: this.lyricsConfig.fadeDuration + 'ms'
      }
    }
  },
  watch: {
    currentTime (value) {
      this.handleTime(value)
    },
    playing (value) {
      if (value) {
        this.resumeScheduling()
        this.syncPlaying(this.currentTime)
      } else {
        this.pauseScheduling()
      }
    }
  },
  created () {
    this._destroyed = false
    this._index = -1
    this._columnSeq = 0
    this._groupSeq = 0
    this._lastSongTime = null
    this._pendingGroup = null
    this._holdTimers = {}
    this._fadeTimers = {}
    this._holdDeadlines = {}
    this._fadeDeadlines = {}
    this._holdRemaining = {}
    this._fadeRemaining = {}
    this._groups = buildGroups(lyricsTimeConfig)
  },
  mounted () {
    if (this.playing) {
      this.resumeScheduling()
      this.syncPlaying(this.currentTime)
    }
  },
  beforeDestroy () {
    this._destroyed = true
    this.clearAllTimers()
  },
  methods: {
    handleTime (value) {
      if (!this._groups.length) {
        this._lastSongTime = value
        return
      }

      if (!this.playing) {
        const previous = this._lastSongTime

        if (previous !== null && Math.abs(value - previous) < 0.5) {
          this._lastSongTime = value
          return
        }

        const activeIndex = this.findActiveIndex(value)

        this.resetColumns()
        this._index = activeIndex
        this._lastSongTime = value

        if (activeIndex >= 0) {
          this.showGroup(this._groups[activeIndex])
          this.pauseScheduling()
        }

        return
      }

      this.syncPlaying(value)
    },
    syncPlaying (time) {
      const previous = this._lastSongTime
      const activeIndex = this.findActiveIndex(time)
      const jumped = previous !== null && (time < previous - 0.5 || time - previous > 3)

      this._lastSongTime = time

      if (jumped) {
        this.resetColumns()
        this._index = activeIndex

        if (activeIndex >= 0) {
          this.showGroup(this._groups[activeIndex])
        }

        return
      }

      if (activeIndex > this._index) {
        this._index = activeIndex
        this.requestGroup(this._groups[activeIndex])
      }
    },
    findActiveIndex (time) {
      let index = -1

      for (let i = 0; i < this._groups.length; i += 1) {
        if (this._groups[i].time <= time) {
          index = i
        } else {
          break
        }
      }

      return index
    },
    requestGroup (group) {
      if (!group) {
        return
      }

      const activeGroupId = this.getVisibleGroupId()

      if (activeGroupId === null) {
        this.showGroup(group)
        return
      }

      this._pendingGroup = group
      this.beginFadeGroup(activeGroupId)
    },
    showGroup (group) {
      if (!group || !group.texts.length) {
        return
      }

      const groupId = ++this._groupSeq

      group.texts.forEach((text) => {
        this.columns.push({
          id: ++this._columnSeq,
          groupId: groupId,
          text: text,
          leaving: false
        })
      })

      this.scheduleHold(groupId)
    },
    getVisibleGroupId () {
      return this.columns.length ? this.columns[0].groupId : null
    },
    resetColumns () {
      this.clearAllTimers()
      this.columns = []
      this._pendingGroup = null
      this._index = -1
    },
    resumeScheduling () {
      if (this._destroyed) {
        return
      }

      const groupId = this.getVisibleGroupId()

      if (groupId === null) {
        return
      }

      const leaving = this.columns.some((column) => column.leaving)

      if (leaving) {
        if (!this._fadeTimers[groupId]) {
          const remaining = this._fadeRemaining[groupId]

          delete this._fadeRemaining[groupId]
          this.scheduleRemoval(
            groupId,
            remaining === undefined ? this.lyricsConfig.fadeDuration : remaining
          )
        }
      } else if (!this._holdTimers[groupId]) {
        const remaining = this._holdRemaining[groupId]

        delete this._holdRemaining[groupId]
        this.scheduleHold(
          groupId,
          remaining === undefined ? this.lyricsConfig.holdDuration : remaining
        )
      }
    },
    pauseScheduling () {
      const now = Date.now()

      Object.keys(this._holdTimers).forEach((id) => {
        const timer = this._holdTimers[id]

        if (!timer) {
          return
        }

        this._holdRemaining[id] = Math.max(0, (this._holdDeadlines[id] || now) - now)
        window.clearTimeout(timer)
        this._holdTimers[id] = null
      })

      Object.keys(this._fadeTimers).forEach((id) => {
        const timer = this._fadeTimers[id]

        if (!timer) {
          return
        }

        this._fadeRemaining[id] = Math.max(0, (this._fadeDeadlines[id] || now) - now)
        window.clearTimeout(timer)
        this._fadeTimers[id] = null
      })
    },
    scheduleHold (groupId, delay) {
      const wait = typeof delay === 'number' ? Math.max(0, delay) : this.lyricsConfig.holdDuration

      this._holdDeadlines[groupId] = Date.now() + wait
      this._holdTimers[groupId] = window.setTimeout(() => {
        this._holdTimers[groupId] = null
        delete this._holdDeadlines[groupId]
        this.beginFadeGroup(groupId)
      }, wait)
    },
    beginFadeGroup (groupId) {
      const groupColumns = this.columns.filter((column) => column.groupId === groupId)

      if (!groupColumns.length) {
        return
      }

      groupColumns.forEach((column) => {
        column.leaving = true
      })

      if (this._holdTimers[groupId]) {
        window.clearTimeout(this._holdTimers[groupId])
        this._holdTimers[groupId] = null
      }

      delete this._holdDeadlines[groupId]
      delete this._holdRemaining[groupId]

      if (!this._fadeTimers[groupId]) {
        this.scheduleRemoval(groupId, this.lyricsConfig.fadeDuration)
      }
    },
    scheduleRemoval (groupId, delay) {
      const wait = typeof delay === 'number' ? Math.max(0, delay) : this.lyricsConfig.fadeDuration

      this._fadeDeadlines[groupId] = Date.now() + wait
      this._fadeTimers[groupId] = window.setTimeout(() => {
        this._fadeTimers[groupId] = null
        delete this._fadeDeadlines[groupId]
        delete this._fadeRemaining[groupId]
        this.removeGroup(groupId)
      }, wait)
    },
    removeGroup (groupId) {
      this.columns = this.columns.filter((column) => column.groupId !== groupId)
      delete this._holdTimers[groupId]
      delete this._fadeTimers[groupId]
      delete this._holdDeadlines[groupId]
      delete this._fadeDeadlines[groupId]
      delete this._holdRemaining[groupId]
      delete this._fadeRemaining[groupId]

      const pending = this._pendingGroup

      this._pendingGroup = null

      if (pending) {
        this.showGroup(pending)

        if (!this.playing) {
          this.pauseScheduling()
        }
      }
    },
    clearAllTimers () {
      Object.keys(this._holdTimers).forEach((id) => {
        if (this._holdTimers[id]) {
          window.clearTimeout(this._holdTimers[id])
        }
      })
      Object.keys(this._fadeTimers).forEach((id) => {
        if (this._fadeTimers[id]) {
          window.clearTimeout(this._fadeTimers[id])
        }
      })

      this._holdTimers = {}
      this._fadeTimers = {}
      this._holdDeadlines = {}
      this._fadeDeadlines = {}
      this._holdRemaining = {}
      this._fadeRemaining = {}
    }
  }
}
</script>

<style scoped>
.lyrics-board {
  position: fixed;
  top: 72px;
  bottom: 108px;
  overflow: hidden;
  pointer-events: none;
  z-index: 20;
  text-align: left;
}

.lyrics-columns {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-start;
  align-items: flex-start;
  height: 100%;
}

.lyric-col {
  flex: 0 0 auto;
  margin-left: 18px;
  max-height: 100%;
  white-space: nowrap;
  writing-mode: vertical-rl;
  -webkit-writing-mode: vertical-rl;
  text-orientation: upright;
  -webkit-text-orientation: upright;
  font-family: "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif;
  line-height: 1.5;
  letter-spacing: 0.16em;
  color: rgba(44, 62, 80, 0.82);
  opacity: 1;
  transform: translateY(0);
  will-change: opacity, transform;
  animation: lyric-in 0.9s ease-out;
  transition: opacity 1.2s ease, transform 1.2s ease;
}

.lyric-col.is-leaving {
  opacity: 0;
  transform: translateY(-18px);
}

@keyframes lyric-in {
  from {
    opacity: 0;
    transform: translateY(-18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .lyric-col {
    margin-left: 10px;
    font-size: 19px !important;
  }
}

@media (max-width: 380px) {
  .lyric-col {
    margin-left: 6px;
    font-size: 17px !important;
  }
}
</style>

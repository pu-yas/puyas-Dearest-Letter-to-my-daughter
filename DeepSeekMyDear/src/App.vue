<template>
  <div id="app" :style="backgroundStyle">
    <music-overlay/>
  </div>
</template>

<script>
import MusicOverlay from '@/components/MusicOverlay.vue'
import backgroundImage from '@/assets/finalBackground.png'

export default {
  name: 'App',
  components: { MusicOverlay },
  computed: {
    backgroundStyle () {
      // 背景图交给 webpack 打包，url 随构建产物一起更新
      return {
        backgroundImage: 'url("' + backgroundImage + '")'
      }
    }
  }
}
</script>

<style>
html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #dfe9f1;
}

#app {
  min-height: 100vh;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  /* 背景图铺满整个视口，按比例裁切并保持居中 */
  background-color: #dfe9f1;
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  background-attachment: fixed;
}
</style>

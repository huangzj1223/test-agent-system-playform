<template>
  <div class="orange-marker">
    <div class="marker-txt-row">
      <svg
        class="bracket-svg"
        width="10"
        height="26"
        viewBox="0 0 14 42"
        fill="none"
        overflow="visible"
      >
        <defs>
          <filter
            :id="`gL-${uid}`"
            x="-300%"
            y="-100%"
            width="700%"
            height="300%"
            color-interpolation-filters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M1 13.1 L10.1 21.1 L1 29.1 Z" fill="black" fill-opacity="0.8" />
        <g :filter="`url(#gL-${uid})`">
          <path d="M0 9.8 L3 12.4 V29.8 L0 32.4 Z" fill="#FFD000" />
        </g>
      </svg>

      <div class="marker-text">{{ text }}</div>

      <svg
        class="bracket-svg"
        width="10"
        height="26"
        viewBox="0 0 14 42"
        fill="none"
        overflow="visible"
      >
        <defs>
          <filter
            :id="`gR-${uid}`"
            x="-300%"
            y="-100%"
            width="700%"
            height="300%"
            color-interpolation-filters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M13 13.1 L3.9 21.1 L13 29.1 Z" fill="black" fill-opacity="0.8" />
        <g :filter="`url(#gR-${uid})`">
          <path d="M14 9.8 L11 12.4 V29.8 L14 32.4 Z" fill="#FFD000" />
        </g>
      </svg>
    </div>

    <svg class="pin-arrow" viewBox="-8 -5 62 58" width="36" height="34" fill="none">
      <defs>
        <linearGradient
          :id="`Ps-${uid}`"
          x1="23"
          y1="0"
          x2="55"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#34271B" />
          <stop offset="1" stop-color="#271E15" stop-opacity="0" />
        </linearGradient>
        <radialGradient
          :id="`Pg-${uid}`"
          gradientUnits="userSpaceOnUse"
          :gradientTransform="`translate(23,5.3) rotate(90) scale(20.3,12.2)`"
        >
          <stop stop-color="#FF5900" />
          <stop offset="1" stop-color="#FF8C00" />
        </radialGradient>
        <linearGradient
          :id="`Prf-${uid}`"
          x1="23"
          y1="0"
          x2="23"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FF7700" />
          <stop offset="1" stop-color="#DEDE00" />
        </linearGradient>
        <linearGradient
          :id="`Prs-${uid}`"
          x1="23"
          y1="0"
          x2="23"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FFC400" />
          <stop offset="1" stop-color="white" />
        </linearGradient>
        <linearGradient
          :id="`Pth-${uid}`"
          x1="23"
          y1="3"
          x2="23"
          y2="11"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="white" />
          <stop offset="1" stop-color="#FF9D00" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          :id="`Plf-${uid}`"
          x1="12"
          y1="0"
          x2="12"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FFAA00" />
          <stop offset="1" stop-color="white" />
        </linearGradient>
        <linearGradient
          :id="`Pls-${uid}`"
          x1="12"
          y1="0"
          x2="12"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FFC400" />
          <stop offset="1" stop-color="white" />
        </linearGradient>
        <linearGradient
          :id="`Pbh-${uid}`"
          x1="23"
          y1="9"
          x2="23"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#FFF175" />
          <stop offset="1" stop-color="#FF7700" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          :id="`Pbs-${uid}`"
          x1="23"
          y1="5"
          x2="23"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="white" />
          <stop offset="1" stop-color="#FFB700" stop-opacity="0" />
        </linearGradient>
        <radialGradient
          :id="`Pig-${uid}`"
          gradientUnits="userSpaceOnUse"
          :gradientTransform="`translate(23,11.6) rotate(90) scale(12.3,7.5)`"
        >
          <stop stop-color="#F8FF9D" />
          <stop offset="1" stop-color="#FFAA00" />
        </radialGradient>
        <filter :id="`Pglw-${uid}`" color-interpolation-filters="sRGB">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter :id="`Pshw-${uid}`" color-interpolation-filters="sRGB">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter :id="`Pign-${uid}`" color-interpolation-filters="sRGB">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>
      <g opacity="0.49" :filter="`url(#Pshw-${uid})`">
        <path d="M23.3 42.1 L54.7 30 L47.7 41.1 L54 50.8 L23.3 42.1 Z" :fill="`url(#Ps-${uid})`" />
      </g>
      <g :filter="`url(#Pglw-${uid})`">
        <path d="M23 27.6 L36.8 4.9 L23 0 L9.2 4.9 Z" :fill="`url(#Pg-${uid})`" />
      </g>
      <path d="M23 42.1 L46 0 L23 15.8 L0 0 Z" fill="#D16200" />
      <path
        d="M44.5 1.6 L23.5 16 V40.2 Z"
        :fill="`url(#Prf-${uid})`"
        :stroke="`url(#Prs-${uid})`"
        stroke-width="0.8"
      />
      <path d="M23 5.8 L46 0 L23 15.8 L0 0 Z" fill="#FF9100" />
      <path d="M23 5.8 L46 0 L23 10.5 L0 0 Z" :fill="`url(#Pth-${uid})`" />
      <path
        d="M2.6 1.2 L22.5 6.2 V14.8 Z"
        :fill="`url(#Plf-${uid})`"
        :stroke="`url(#Pls-${uid})`"
        stroke-width="0.8"
      />
      <path
        d="M43.9 2.1 L23.3 16.2 L23 16.4 L22.7 16.2 L2.1 2.1 L23 30.8 Z"
        :fill="`url(#Pbh-${uid})`"
        :stroke="`url(#Pbs-${uid})`"
        stroke-width="0.8"
      />
      <g :filter="`url(#Pign-${uid})`" style="mix-blend-mode: plus-lighter">
        <path d="M23 25.1 L31.4 11.4 L23 8.4 L14.6 11.4 Z" :fill="`url(#Pig-${uid})`" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'DpDwOrange' })
  defineProps<{ text: string }>()
  const uid = Math.random().toString(36).slice(2, 8)
</script>

<style scoped lang="scss">
  .orange-marker {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }

  .marker-txt-row {
    display: flex;
    align-items: stretch;
    height: 26px;
    gap: 2px;
    background: rgba(42, 25, 8, 0.8);
    border-top: 1px solid rgba(255, 123, 0, 0.6);
    border-bottom: 1px solid rgba(255, 123, 0, 0.6);
  }

  .marker-text {
    display: flex;
    align-items: center;
    padding: 0 8px;
    color: #fff;
    font-family: 'YouSheBiaoTiHei', sans-serif;
    font-size: 13px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 1px;
    white-space: nowrap;
    text-shadow: 0 0 8px rgba(255, 85, 0, 0.3);
  }

  .bracket-svg,
  .pin-arrow {
    flex-shrink: 0;
  }
</style>

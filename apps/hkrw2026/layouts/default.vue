<script setup lang="ts">

</script>

<template>
  <div class="pageContainer">
    <Header />
    <div class="body">
      <slot />
    </div>
    <Footer />
  </div>
</template>

<style scoped lang="scss">
.pageContainer{
  width:100%;
  height: 100%;
  min-height:100%;
  display:flex;
  flex-flow: column nowrap;
  // gap: 12px;
  justify-content: flex-start;
  align-items: stretch;
  background-image: url('/SLF2026_main_background.png');
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}
.body{
  width:100%;
  height: 100%;
  margin: 0 auto;
  min-height: calc( 100vh - var(--header-height) - 20px );
}
</style>
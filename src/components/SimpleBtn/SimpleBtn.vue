<template>
  <button :class="hasClass" class="simple-btn">{{text}}</button>
</template>

<script>
export default {
  name: "SimpleBtn",
  props: {
    text: {
      type: String
    },
    outline: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    hasClass() {
      return {
        "btn-outline": this.outline
      };
    }
  }
};
</script>

<style lang="scss">
.simple-ui {
  padding: 7px 14px;
}
</style>
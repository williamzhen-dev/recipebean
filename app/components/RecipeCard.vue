<script setup lang="ts">
import type { SerializedRecipe } from '~~/shared/schemas/recipes'
import { Clock, Heart, Image, Utensils } from '@lucide/vue'

const props = defineProps<{
  recipe: SerializedRecipe
}>()

const { mediaUrl } = useMediaUrl()

const totalTime = computed(() => props.recipe.prepTime + props.recipe.cookTime)

const isFavorite = ref(props.recipe.isFavorite)

async function toggleFavorite() {
  const next = !isFavorite.value
  isFavorite.value = next
  try {
    await $fetch(`/api/recipes/${props.recipe.id}/favorite`, {
      method: 'PATCH',
      body: { isFavorite: next },
    })
  }
  catch {
    isFavorite.value = !next
  }
}
</script>

<template>
  <div class="bg-white border w-full rounded-xl overflow-hidden h-70 flex flex-col">
    <div class="relative flex items-center justify-center bg-muted h-40">
      <Button
        size="icon"
        :variant="isFavorite ? 'default' : 'secondary'"
        class="absolute top-2 right-2 z-10 rounded-full"
        :aria-label="isFavorite ? 'Remove from favourites' : 'Add to favourites'"
        :aria-pressed="isFavorite"
        @click.prevent.stop="toggleFavorite"
      >
        <Heart :size="18" />
      </Button>
      <img
        v-if="props.recipe.image"
        :src="mediaUrl(props.recipe.image.key)"
        :alt="props.recipe.name"
        :width="props.recipe.image.width ?? undefined"
        :height="props.recipe.image.height ?? undefined"
        class="absolute inset-0 h-full w-full object-cover"
      >
      <Image v-else :size="18" class="text-muted-foreground" />
    </div>
    <div class="flex flex-1 flex-col items-stretch p-3 min-h-0">
      <h3 class="font-serif text-lg line-clamp-2">
        {{ props.recipe.name }}
      </h3>
      <div class="mt-auto flex items-center gap-6 text-muted-foreground">
        <div class="text-sm flex items-center gap-1.5">
          <Clock :size="18" /> {{ totalTime }} min
        </div>
        <div class="text-sm flex items-center gap-1.5">
          <Utensils :size="18" /> serves {{ props.recipe.servings }}
        </div>
      </div>
    </div>
  </div>
</template>

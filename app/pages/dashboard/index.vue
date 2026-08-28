<script setup lang="ts">
import type { SerializedRecipe } from '~~/shared/schemas/recipes'
import RecipeCard from '~/components/RecipeCard.vue'

definePageMeta({
  layout: 'dashboard',
})

// Keyed so the dashboard layout's RecipeSearch reuses this fetch instead of
// making its own. The entry outlives this page, because RecipeSearch sits in the
// layout, but every route that adds or deletes a recipe uses the default layout
// and so unmounts RecipeSearch, which clears the entry. Coming back here after a
// change therefore always refetches.
const { data, status } = await useFetch('/api/recipes', {
  key: 'recipes',
  default: () => [] as SerializedRecipe[],
  dedupe: 'defer',
})
</script>

<template>
  <div class="flex flex-col gap-6 py-6 px-6">
    <header class="flex items-start justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-4xl font-serif font-medium">
          All recipes
        </h1>
        <p v-if="status === 'success' && data" class="text-sm text-muted-foreground">
          {{ data.length }} {{ data.length === 1 ? 'recipe' : 'recipes' }}
        </p>
      </div>
      <div>
        <Button as-child>
          <NuxtLink to="/dashboard/new">
            Add recipe
          </NuxtLink>
        </Button>
      </div>
    </header>
    <template v-if="status === 'success' && data">
      <div v-if="data.length === 0" class="flex flex-col gap-3 h-120 items-center justify-center">
        <p class="text-muted-foreground italic">
          No recipes
        </p>
        <Button as-child>
          <NuxtLink to="/dashboard/new">
            Add recipe
          </NuxtLink>
        </Button>
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <NuxtLink v-for="recipe in data" :key="recipe.id" :to="`/dashboard/${recipe.id}`">
          <RecipeCard :recipe />
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

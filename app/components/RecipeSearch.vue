<script setup lang="ts">
import type { SerializedRecipe } from '~~/shared/schemas/recipes'
import { Image, X } from '@lucide/vue'
import { VisuallyHidden } from 'reka-ui'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const { open } = useRecipeSearch()
const { mediaUrl } = useMediaUrl()

// Shares Nuxt's cache with the dashboard list page (same URL/key), so no extra request there.
const { data: recipes } = useFetch('/api/recipes', {
  default: () => [] as SerializedRecipe[],
})

// Text the built-in Command filter matches against (name is visible, ingredients are sr-only).
function ingredientText(recipe: SerializedRecipe) {
  return recipe.ingredients
    .filter(i => i.type === 'ingredient')
    .map(i => i.raw)
    .join(' ')
}

function selectRecipe(id: string) {
  open.value = false
  navigateTo(`/dashboard/${id}`)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="overflow-hidden p-0 gap-0 sm:max-w-lg max-md:h-svh max-md:max-w-none max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0"
    >
      <VisuallyHidden>
        <DialogTitle>Search recipes</DialogTitle>
        <DialogDescription>Search your recipes by name or ingredient.</DialogDescription>
      </VisuallyHidden>

      <Command class="max-md:h-full">
        <div class="relative">
          <CommandInput placeholder="Search recipes" class="pr-10" />
          <button
            type="button"
            aria-label="Close search"
            class="absolute right-2 top-1.5 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 md:hidden"
            @click="open = false"
          >
            <X class="size-4" />
          </button>
        </div>

        <CommandList class="max-md:max-h-none max-md:flex-1">
          <CommandEmpty>
            No recipes found.
          </CommandEmpty>
          <CommandGroup heading="Recipes">
            <CommandItem
              v-for="recipe in recipes"
              :key="recipe.id"
              :value="recipe.id"
              class="gap-3 py-2"
              @select="selectRecipe(recipe.id)"
            >
              <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                <img
                  v-if="recipe.image"
                  :src="mediaUrl(recipe.image.key)"
                  :alt="recipe.name"
                  class="size-full object-cover"
                >
                <Image v-else class="size-4 text-muted-foreground" />
              </div>
              <span class="truncate font-serif">{{ recipe.name }}</span>
              <span class="sr-only">{{ ingredientText(recipe) }}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
</template>

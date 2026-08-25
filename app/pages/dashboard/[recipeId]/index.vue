<script setup lang="ts">
import { Heart, Image, Minus, Plus } from '@lucide/vue'
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput, NumberFieldRoot } from 'reka-ui'
import { cn } from '~/lib/utils'
import { withInstructionSteps, withScaledIngredients } from '~/utils/recipes'

const route = useRoute()
const router = useRouter()
const recipeId = computed(() => route.params.recipeId)

function goBack() {
  if (window.history.state.back) {
    router.back()
  }
  else {
    router.push('/dashboard')
  }
}

const { data, status } = await useFetch(`/api/recipes/${recipeId.value}`)

const isFavorite = ref(data.value?.isFavorite ?? false)
const servings = ref(data.value?.servings ?? 1)

/** How far the cook has moved the stepper from the recipe's own yield. */
const factor = computed(() => {
  const base = data.value?.servings ?? 0
  return base > 0 ? servings.value / base : 1
})

const scaledIngredients = computed(() => withScaledIngredients(data.value?.ingredients ?? [], factor.value))

const numberedInstructions = computed(() => withInstructionSteps(data.value?.instructions ?? []))

async function toggleFavorite() {
  const next = !isFavorite.value
  isFavorite.value = next
  try {
    await $fetch(`/api/recipes/${recipeId.value}/favorite`, {
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
  <div>
    <header class="flex items-center h-20 border-b">
      <div class="flex items-center justify-between container">
        <button @click="goBack">
          <Logo class="h-7" />
        </button>

        <div class="flex items-center gap-1">
          <button
            :aria-label="isFavorite ? 'Remove from favourites' : 'Add to favourites'"
            :aria-pressed="isFavorite"
            @click="toggleFavorite"
          >
            <Heart
              :size="26"
              :class="cn({
                'fill-primary stroke-primary': isFavorite,
              })"
            />
          </button>
        </div>
      </div>
    </header>
    <section class="container">
      <div v-if="status === 'success' && data" class="flex flex-col gap-6 py-8">
        <h1 class="text-center font-medium text-5xl font-serif">
          {{ data.name }}
        </h1>
        <p v-if="data.description" class="mx-auto max-w-2xl text-muted-foreground text-lg text-center">
          {{ data.description }}
        </p>
        <div class="mx-auto max-w-md w-full">
          <div class="flex divide-x divide-border rounded-xl border bg-white p-1">
            <div class="flex flex-1 flex-col items-center justify-center py-2 px-3">
              <div class="text-xs uppercase text-muted-foreground font-semibold">
                Prep
              </div>
              <div class="text-xl font-serif">
                {{ data.prepTime }} min
              </div>
            </div>
            <div class="flex flex-1 flex-col items-center justify-center py-2 px-3">
              <div class="text-xs uppercase text-muted-foreground font-semibold">
                Cook
              </div>
              <div class="text-xl font-serif">
                {{ data.cookTime }} min
              </div>
            </div>
            <div class="flex flex-1 flex-col items-center justify-center py-2 px-3">
              <div class="text-xs uppercase text-muted-foreground font-semibold">
                Serves
              </div>
              <div class="text-xl font-serif">
                {{ servings }}
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center w-full h-95 bg-muted rounded-xl overflow-hidden">
          <img
            v-if="data.imageUrl"
            :src="data.imageUrl"
            :alt="data.name"
            class="inset-0 h-full w-full object-cover"
          >
          <Image v-else :size="36" class="text-muted-foreground" />
        </div>

        <div class="relative flex flex-col md:grid md:grid-cols-[330px_1fr] gap-10">
          <!-- Ingredients -->
          <div class="relative w-full md:sticky md:top-6 self-start flex flex-col gap-3 py-6 px-4 border bg-white rounded-xl">
            <h2 class="font-serif font-medium text-2xl">
              Ingredients
            </h2>
            <NumberFieldRoot
              id="servings"
              v-model="servings"
              :min="1"
              class="flex py-2 px-3 items-center justify-between border bg-background rounded-lg"
            >
              <label
                for="servings"
                class="text-sm text-muted-foreground font-bold"
              >
                Servings
              </label>
              <div class="flex items-center gap-1">
                <NumberFieldDecrement as-child>
                  <Button size="icon" variant="outline" class="bg-white h-7 w-7">
                    <Minus :size="16" />
                  </Button>
                </NumberFieldDecrement>
                <NumberFieldInput class="text-center w-10 font-bold" />
                <NumberFieldIncrement as-child>
                  <Button size="icon" class="h-7 w-7">
                    <Plus :size="16" />
                  </Button>
                </NumberFieldIncrement>
              </div>
            </NumberFieldRoot>
            <div class="flex flex-col">
              <template v-for="{ ingredient, text, index } of scaledIngredients" :key="`ingredient-${index}`">
                <div v-if="ingredient.type === 'header'" class="py-3 text-primary font-semibold">
                  {{ ingredient.title }}
                </div>
                <div v-else class="flex items-start gap-3 border-b py-3 px-2 last:border-b-0">
                  <Checkbox :id="`ingredient-${index}`" />
                  <Label
                    :for="`ingredient-${index}`"
                    class="text-regular peer-data-[state=checked]:line-through peer-data-[state=checked]:text-muted-foreground"
                  >{{ text }}</Label>
                </div>
              </template>
            </div>
          </div>

          <!-- Instructions -->
          <div class="flex flex-col gap-3">
            <h2 class="font-serif font-medium text-2xl">
              Method
            </h2>
            <div class="flex flex-col">
              <template v-for="{ instruction, step, index } of numberedInstructions" :key="`instruction-${index}`">
                <div v-if="instruction.type === 'header'" class="py-3 text-primary font-semibold">
                  {{ instruction.title }}
                </div>
                <div v-else class="flex items-start gap-3 py-3 px-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-serif font-semibold text-primary">
                    {{ step }}
                  </div>
                  <p class="min-w-0 flex-1 leading-6">
                    {{ instruction.raw }}
                  </p>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { RecipeInput } from '~~/shared/schemas/recipes'

const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit(values: RecipeInput) {
  if (loading.value)
    return

  loading.value = true
  error.value = null

  try {
    const recipeId = await $fetch('/api/recipes', {
      method: 'POST',
      body: values,
    })
    await navigateTo(`/dashboard/${recipeId}`)
  }
  catch {
    error.value = 'That recipe could not be saved. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <RecipeForm
    title="New Recipe"
    submit-label="Save recipe"
    cancel-to="/dashboard"
    :submitting="loading"
    :error-message="error"
    @submit="onSubmit"
  />
</template>

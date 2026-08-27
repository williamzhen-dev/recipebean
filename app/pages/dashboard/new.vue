<script setup lang="ts">
import type { ImportedRecipeResponse, RecipeInput } from '~~/shared/schemas/recipes'
import { Link2 } from '@lucide/vue'

const loading = ref(false)
const error = ref<string | null>(null)

const importOpen = ref(false)
const initialValue = ref<Partial<RecipeInput>>({})
const initialImageUrl = ref<string | null>(null)

// RecipeForm seeds its Regle state once at setup, so an import that lands after
// mount has to remount it. Bumping this key is that remount, and it doubles as
// the "something has already been imported" flag.
const formKey = ref(0)

const { mediaUrl } = useMediaUrl()

function onImported(recipe: ImportedRecipeResponse) {
  const { imageKey, ...values } = recipe

  initialValue.value = values
  initialImageUrl.value = mediaUrl(imageKey) ?? null
  formKey.value++
}

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
  <div>
    <RecipeForm
      :key="formKey"
      title="New Recipe"
      submit-label="Save recipe"
      cancel-to="/dashboard"
      :initial-value="initialValue"
      :initial-image-url="initialImageUrl"
      :submitting="loading"
      :error-message="error"
      @submit="onSubmit"
    >
      <template #header-actions>
        <Button type="button" variant="outline" @click="importOpen = true">
          <Link2 :size="16" />
          Import from link
        </Button>
      </template>
    </RecipeForm>

    <!-- Outside RecipeForm: the header-actions slot is destroyed by the remount. -->
    <RecipeImportDialog
      v-model:open="importOpen"
      :form-has-content="formKey > 0"
      @imported="onImported"
    />
  </div>
</template>

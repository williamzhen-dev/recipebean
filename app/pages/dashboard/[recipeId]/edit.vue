<script setup lang="ts">
import type { RecipeInput } from '~~/shared/schemas/recipes'
import { Trash2 } from '@lucide/vue'
import { toRecipeInput } from '~/utils/recipes'

const { mediaUrl } = useMediaUrl()

const route = useRoute()
const recipeId = computed(() => route.params.recipeId)

const { data } = await useFetch(`/api/recipes/${recipeId.value}`)

const loading = ref(false)
const error = ref<string | null>(null)

const confirmingDelete = ref(false)
const deleting = ref(false)

async function onSubmit(values: RecipeInput) {
  if (loading.value)
    return

  loading.value = true
  error.value = null

  try {
    // `categoryIds` is dropped rather than sent empty: the form has no category
    // picker, so an empty array would wipe whatever the recipe already has.
    const { categoryIds: _categoryIds, ...body } = values

    await $fetch(`/api/recipes/${recipeId.value}`, {
      method: 'PUT',
      body,
    })
    await navigateTo(`/dashboard/${recipeId.value}`)
  }
  catch {
    error.value = 'That recipe could not be saved. Please try again.'
  }
  finally {
    loading.value = false
  }
}

async function onDelete() {
  if (deleting.value)
    return

  deleting.value = true

  try {
    await $fetch(`/api/recipes/${recipeId.value}`, { method: 'DELETE' })
    await navigateTo('/dashboard')
  }
  catch {
    confirmingDelete.value = false
    error.value = 'That recipe could not be deleted. Please try again.'
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <RecipeForm
    v-if="data"
    title="Edit Recipe"
    submit-label="Save changes"
    :cancel-to="`/dashboard/${recipeId}`"
    :initial-value="toRecipeInput(data)"
    :initial-image-url="mediaUrl(data.image?.key)"
    :submitting="loading"
    :error-message="error"
    @submit="onSubmit"
  >
    <template #header-actions>
      <Dialog v-model:open="confirmingDelete">
        <DialogTrigger as-child>
          <Button type="button" variant="ghost" class="text-destructive hover:text-destructive">
            <Trash2 :size="18" /> Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this recipe?</DialogTitle>
            <DialogDescription>
              “{{ data.name }}” will be removed permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose as-child>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" :disabled="deleting" @click="onDelete">
              {{ deleting ? "Deleting…" : "Delete recipe" }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </template>
  </RecipeForm>
</template>

import type { SerializedRecipe } from '~~/shared/schemas/recipes'
import { StorageSerializers } from '@vueuse/core'

interface CookingProgress {
  servings: number
  checked: number[]
  recipeUpdatedAt: string
  savedAt: number
}

/** Progress untouched for this long belongs to an earlier cook, not this one. */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000

/**
 * Keeps the servings stepper and the ticked ingredients for one recipe in
 * localStorage. Mobile browsers unload a background tab while the phone
 * sleeps, so state held only in memory is gone when the cook wakes it again.
 * Saved progress is dropped once it goes stale, or when the recipe has been
 * edited since, because the ticks are keyed by ingredient position.
 */
export function useCookingProgress(
  recipeId: string,
  recipe: Pick<SerializedRecipe, 'servings' | 'updatedAt'> | null | undefined,
) {
  const stored = useLocalStorage<CookingProgress | null>(
    `recipebean:cooking:${recipeId}`,
    null,
    { serializer: StorageSerializers.object },
  )

  const recipeUpdatedAt = recipe?.updatedAt ?? ''
  const saved = stored.value
  const isCurrent = saved !== null
    && saved.recipeUpdatedAt === recipeUpdatedAt
    && Date.now() - saved.savedAt < STALE_AFTER_MS

  if (saved && !isCurrent)
    stored.value = null

  const servings = ref(isCurrent ? saved.servings : (recipe?.servings ?? 1))
  const checked = ref<number[]>(isCurrent ? saved.checked : [])

  watch([servings, checked], () => {
    stored.value = {
      servings: servings.value,
      checked: checked.value,
      recipeUpdatedAt,
      savedAt: Date.now(),
    }
  }, { deep: true })

  function isChecked(index: number) {
    return checked.value.includes(index)
  }

  function setChecked(index: number, value: boolean) {
    checked.value = value
      ? [...checked.value, index]
      : checked.value.filter(i => i !== index)
  }

  return { servings, isChecked, setChecked }
}

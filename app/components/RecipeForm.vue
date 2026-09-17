<script setup lang="ts">
import type { Ingredient } from '~~/shared/lib/ingredient-parser'
import type { RecipeInput } from '~~/shared/schemas/recipes'
import { Check, GripVertical, Plus, X } from '@lucide/vue'
import { useRegleSchema } from '@regle/schemas'
import { VueDraggable } from 'vue-draggable-plus'
import { formatIngredient, parseIngredient } from '~~/shared/lib/ingredient-parser'
import { createRecipeSchema } from '~~/shared/schemas/recipes'
import { cn } from '~/lib/utils'
import { withInstructionSteps } from '~/utils/recipes'

const props = defineProps<{
  title: string
  submitLabel: string
  cancelTo: string
  /** Seeds the form. Omitted fields fall back to the blank-recipe defaults. */
  initialValue?: Partial<RecipeInput>
  /** Banner already saved on the recipe, shown until the cook picks a new one. */
  initialImageUrl?: string | null
  submitting?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  submit: [values: RecipeInput]
}>()

// Seeded once at setup, so a page that fetches first must mount this component
// behind a `v-if` on its data.
const { r$ } = useRegleSchema({
  name: '',
  imageFileId: null,
  description: '',
  prepTime: 0,
  cookTime: 0,
  servings: 1,
  ingredients: [],
  instructions: [],
  notes: '',
  categoryIds: [],
  ...props.initialValue,
}, createRecipeSchema, {
  autoDirty: false,
})

const currentIngredient = ref('')
const currentInstruction = ref('')

// Ingredients header editor
const addingIngredientHeader = ref(false)
const ingredientHeaderTitle = ref('')
const ingredientHeaderInput = useTemplateRef<HTMLInputElement>('ingredientHeaderInput')

// Instructions header editor
const addingInstructionHeader = ref(false)
const instructionHeaderTitle = ref('')
const instructionHeaderInput = useTemplateRef<HTMLInputElement>('instructionHeaderInput')

// Inline row editors. At most one row per list is open, `null` meaning none.
// The index is into the value array, so anything that shifts indices (delete,
// drag) closes the editor first.
const editingIngredientIndex = ref<number | null>(null)
const editingIngredientText = ref('')
const editingInstructionIndex = ref<number | null>(null)
const editingInstructionText = ref('')

/**
 * Template ref for the open row editor. Vue calls this once on mount, so the
 * field takes focus without a `nextTick` dance; the guard keeps a stray call
 * from stealing the caret back mid-typing.
 */
function focusEditor(el: unknown) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement))
    return
  if (document.activeElement === el)
    return
  el.focus()
  el.select()
}

function addIngredient() {
  const currIngredient = currentIngredient.value.trim()

  if (currIngredient.length === 0)
    return

  const parsedIngredient = parseIngredient(currIngredient)

  r$.$value.ingredients.push({ type: 'ingredient', ...parsedIngredient })
  currentIngredient.value = ''
}

function deleteIngredient(index: number) {
  cancelEditIngredient()
  r$.$value.ingredients.splice(index, 1)
}

/** Seeds the editor with the text the row shows, so editing is WYSIWYG. */
function startEditIngredient(index: number) {
  const ingredient = r$.$value.ingredients[index]

  if (!ingredient)
    return

  editingIngredientIndex.value = index
  editingIngredientText.value = ingredient.type === 'header'
    ? ingredient.title
    : formatIngredient(ingredient as Ingredient)
}

function commitEditIngredient() {
  const index = editingIngredientIndex.value

  if (index === null)
    return

  const ingredient = r$.$value.ingredients[index]
  const text = editingIngredientText.value.trim()

  editingIngredientIndex.value = null
  editingIngredientText.value = ''

  // Blanking a row is not a delete: leave it as it was and let the X do that.
  if (!ingredient || text.length === 0)
    return

  r$.$value.ingredients[index] = ingredient.type === 'header'
    ? { type: 'header', title: text }
    : { type: 'ingredient', ...parseIngredient(text) }
}

function cancelEditIngredient() {
  editingIngredientIndex.value = null
  editingIngredientText.value = ''
}

function addInstruction() {
  const currInstruction = currentInstruction.value.trim()

  if (currInstruction.length === 0)
    return

  r$.$value.instructions.push({ type: 'instruction', raw: currInstruction })
  currentInstruction.value = ''
}

function deleteInstruction(index: number) {
  cancelEditInstruction()
  r$.$value.instructions.splice(index, 1)
}

function startEditInstruction(index: number) {
  const instruction = r$.$value.instructions[index]

  if (!instruction)
    return

  editingInstructionIndex.value = index
  editingInstructionText.value = instruction.type === 'header'
    ? instruction.title
    : instruction.raw
}

function commitEditInstruction() {
  const index = editingInstructionIndex.value

  if (index === null)
    return

  const instruction = r$.$value.instructions[index]
  const text = editingInstructionText.value.trim()

  editingInstructionIndex.value = null
  editingInstructionText.value = ''

  if (!instruction || text.length === 0)
    return

  r$.$value.instructions[index] = instruction.type === 'header'
    ? { type: 'header', title: text }
    : { type: 'instruction', raw: text }
}

function cancelEditInstruction() {
  editingInstructionIndex.value = null
  editingInstructionText.value = ''
}

async function startIngredientHeader() {
  addingIngredientHeader.value = true
  ingredientHeaderTitle.value = ''
  await nextTick()
  ingredientHeaderInput.value?.focus()
}

function commitIngredientHeader() {
  if (!addingIngredientHeader.value)
    return
  const title = ingredientHeaderTitle.value.trim()
  addingIngredientHeader.value = false
  ingredientHeaderTitle.value = ''
  if (title.length === 0)
    return
  r$.$value.ingredients.push({ type: 'header', title })
}

function cancelIngredientHeader() {
  addingIngredientHeader.value = false
  ingredientHeaderTitle.value = ''
}

async function startInstructionHeader() {
  addingInstructionHeader.value = true
  instructionHeaderTitle.value = ''
  await nextTick()
  instructionHeaderInput.value?.focus()
}

function commitInstructionHeader() {
  if (!addingInstructionHeader.value)
    return
  const title = instructionHeaderTitle.value.trim()
  addingInstructionHeader.value = false
  instructionHeaderTitle.value = ''
  if (title.length === 0)
    return
  r$.$value.instructions.push({ type: 'header', title })
}

function cancelInstructionHeader() {
  addingInstructionHeader.value = false
  instructionHeaderTitle.value = ''
}

const numberedInstructions = computed(() => withInstructionSteps(r$.$value.instructions))

async function onSubmit() {
  const { valid, data } = await r$.$validate()

  if (!valid || props.submitting)
    return

  emit('submit', data)
}
</script>

<template>
  <div>
    <header class="flex items-center bg-white border-b h-20">
      <div class="container flex items-center justify-between">
        <h1 class="text-2xl font-serif font-medium">
          {{ props.title }}
        </h1>
        <div class="flex gap-3">
          <slot name="header-actions" />
          <Button variant="outline" as-child>
            <NuxtLink :to="props.cancelTo">
              Cancel
            </NuxtLink>
          </Button>
          <Button type="submit" form="recipe-form" :disabled="props.submitting">
            {{ props.submitting ? "Saving…" : props.submitLabel }}
          </Button>
        </div>
      </div>
    </header>
    <section class="container">
      <p v-if="props.errorMessage" class="mt-6 rounded-lg border border-destructive/50 bg-destructive/5 py-3 px-4 text-sm text-destructive">
        {{ props.errorMessage }}
      </p>
      <form id="recipe-form" class="flex flex-col md:grid md:grid-cols-[400px_1fr] gap-10 py-10" @submit.prevent="onSubmit">
        <FieldSet>
          <FieldGroup>
            <ImageUpload v-model="r$.$value.imageFileId" :initial-url="props.initialImageUrl" />
            <Field :data-invalid="r$.name.$error" class="gap-1">
              <FieldLabel for="recipe-form-name">
                Recipe Name
              </FieldLabel>
              <Input
                id="recipe-form-name"
                v-model="r$.$value.name"
                type="text"
                class="bg-white"
                :aria-invalid="r$.name.$error"
              />
            </Field>
            <Field :data-invalid="r$.description.$error" class="gap-1">
              <FieldLabel for="recipe-form-description">
                Description
              </FieldLabel>
              <Textarea
                id="recipe-form-description"
                v-model="r$.$value.description"
                type="text"
                class="h-20 bg-white resize-none"
                :aria-invalid="r$.description.$error"
              />
            </Field>
            <div class="grid grid-cols-3 gap-3">
              <Field :data-invalid="r$.prepTime.$error" class="gap-1">
                <FieldLabel for="recipe-form-prep-time">
                  Prep time
                </FieldLabel>
                <NumberField
                  id="recipe-form-prep-time"
                  v-model="r$.$value.prepTime"
                  :min="0"
                >
                  <NumberFieldContent>
                    <NumberFieldInput class="bg-white" :aria-invalid="r$.prepTime.$error" />
                  </NumberFieldContent>
                </NumberField>
              </Field>
              <Field :data-invalid="r$.cookTime.$error" class="gap-1">
                <FieldLabel for="recipe-form-cook-time">
                  Cook time
                </FieldLabel>
                <NumberField
                  id="recipe-form-cook-time"
                  v-model="r$.$value.cookTime"
                  :min="0"
                >
                  <NumberFieldContent>
                    <NumberFieldInput class="bg-white" :aria-invalid="r$.cookTime.$error" />
                  </NumberFieldContent>
                </NumberField>
              </Field>
              <Field :data-invalid="r$.servings.$error" class="gap-1">
                <FieldLabel for="recipe-form-servings">
                  Servings
                </FieldLabel>
                <NumberField
                  id="recipe-form-servings"
                  v-model="r$.$value.servings"
                  :min="1"
                >
                  <NumberFieldContent>
                    <NumberFieldInput class="bg-white" :aria-invalid="r$.servings.$error" />
                  </NumberFieldContent>
                </NumberField>
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>

        <div class="flex flex-col gap-6">
          <FieldSet class="gap-1">
            <div class="flex justify-between items-center">
              <FieldLegend class="font-serif text-2xl">
                Ingredients
              </FieldLegend>
              <span class="text-sm text-muted-foreground font-semibold">
                {{ r$.$value.ingredients.length }} items
              </span>
            </div>
            <FieldGroup class="gap-5">
              <div class="flex flex-col gap-1.5">
                <Field orientation="horizontal" class="gap-1">
                  <Input
                    v-model="currentIngredient"
                    type="text"
                    placeholder="e.g. 400g bronze-cut rigatoni"
                    class="bg-white"
                    @keydown.enter.prevent="addIngredient"
                  />
                  <Button
                    type="button"
                    size="icon"
                    @click="addIngredient"
                  >
                    <Plus :size="18" />
                  </Button>
                </Field>
                <template v-if="addingIngredientHeader">
                  <Field orientation="horizontal" class="gap-1">
                    <input
                      ref="ingredientHeaderInput"
                      v-model="ingredientHeaderTitle"
                      type="text"
                      placeholder="Section header (e.g. For the sauce)"
                      class="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      @keydown.enter.prevent="commitIngredientHeader"
                      @keydown.esc.prevent="cancelIngredientHeader"
                      @blur="commitIngredientHeader"
                    >
                    <Button
                      type="button"
                      size="icon"
                      @mousedown.prevent
                      @click="commitIngredientHeader"
                    >
                      <Check :size="18" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      @mousedown.prevent
                      @click="cancelIngredientHeader"
                    >
                      <X :size="18" />
                    </Button>
                  </Field>
                </template>
                <button v-else type="button" class="flex items-center gap-1 text-xs font-bold w-fit rounded-full bg-accent py-2 px-3 border border-primary text-primary" @click="startIngredientHeader">
                  <Plus :size="16" /> Add section header
                </button>
              </div>
              <VueDraggable
                v-model="r$.$value.ingredients"
                class="flex flex-col"
                handle=".drag-handle"
                ghost-class="opacity-40"
                :animation="150"
                @start="cancelEditIngredient"
              >
                <div
                  v-for="(ingredient, index) of r$.$value.ingredients" :key="`ingredient-${index}`" :class="cn('flex items-start gap-3 py-3 px-2', {
                    'border-b': ingredient.type === 'ingredient',
                  })"
                >
                  <GripVertical :size="16" class="drag-handle mt-1 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <template v-if="editingIngredientIndex === index">
                    <input
                      :ref="focusEditor"
                      v-model="editingIngredientText"
                      type="text"
                      class="min-w-0 flex-1 rounded-md border border-input bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      @keydown.enter.prevent="commitEditIngredient"
                      @keydown.esc.prevent="cancelEditIngredient"
                      @blur="commitEditIngredient"
                    >
                    <Button
                      type="button"
                      size="icon-sm"
                      class="shrink-0"
                      @mousedown.prevent
                      @click="commitEditIngredient"
                    >
                      <Check :size="16" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      class="shrink-0"
                      @mousedown.prevent
                      @click="cancelEditIngredient"
                    >
                      <X :size="16" />
                    </Button>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      :class="cn('min-w-0 flex-1 text-left', ingredient.type === 'header' ? 'text-primary font-semibold' : 'leading-6')"
                      @click="startEditIngredient(index)"
                    >
                      {{ ingredient.type === 'header' ? ingredient.title : formatIngredient(ingredient as Ingredient) }}
                    </button>
                    <button type="button" class="mt-1 shrink-0" @click="deleteIngredient(index)">
                      <X :size="18" class="text-muted-foreground" />
                    </button>
                  </template>
                </div>
              </VueDraggable>
            </FieldGroup>
          </FieldSet>
          <FieldSet class="gap-1">
            <div class="flex justify-between items-center">
              <FieldLegend class="font-serif text-2xl">
                Instructions
              </FieldLegend>
              <span class="text-sm text-muted-foreground font-semibold">
                {{ r$.$value.instructions.length }} items
              </span>
            </div>
            <FieldGroup class="gap-5">
              <div class="flex flex-col gap-1.5">
                <Field orientation="horizontal" class="gap-1">
                  <Input
                    v-model="currentInstruction"
                    type="text"
                    placeholder="e.g. Make sauce"
                    class="bg-white"
                    @keydown.enter.prevent="addInstruction"
                  />
                  <Button
                    type="button"
                    size="icon"
                    @click="addInstruction"
                  >
                    <Plus :size="18" />
                  </Button>
                </Field>
                <template v-if="addingInstructionHeader">
                  <Field orientation="horizontal" class="gap-1">
                    <input
                      ref="instructionHeaderInput"
                      v-model="instructionHeaderTitle"
                      type="text"
                      placeholder="Section header (e.g. For the sauce)"
                      class="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      @keydown.enter.prevent="commitInstructionHeader"
                      @keydown.esc.prevent="cancelInstructionHeader"
                      @blur="commitInstructionHeader"
                    >
                    <Button
                      type="button"
                      size="icon"
                      @mousedown.prevent
                      @click="commitInstructionHeader"
                    >
                      <Check :size="18" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      @mousedown.prevent
                      @click="cancelInstructionHeader"
                    >
                      <X :size="18" />
                    </Button>
                  </Field>
                </template>
                <button v-else type="button" class="flex items-center gap-1 text-xs font-bold w-fit rounded-full bg-accent py-2 px-3 border border-primary text-primary" @click="startInstructionHeader">
                  <Plus :size="16" /> Add section header
                </button>
              </div>
              <VueDraggable
                v-model="r$.$value.instructions"
                class="flex flex-col"
                handle=".drag-handle"
                ghost-class="opacity-40"
                :animation="150"
                @start="cancelEditInstruction"
              >
                <div v-for="{ instruction, step, index } of numberedInstructions" :key="`instruction-${index}`" class="flex items-start gap-3 py-3 px-2">
                  <GripVertical :size="16" class="drag-handle mt-1 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <div v-if="instruction.type === 'instruction'" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-serif font-semibold text-primary">
                    {{ step }}
                  </div>
                  <template v-if="editingInstructionIndex === index">
                    <textarea
                      :ref="focusEditor"
                      v-model="editingInstructionText"
                      class="h-24 min-w-0 flex-1 resize-none rounded-md border border-input bg-white px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      @keydown.enter.prevent="commitEditInstruction"
                      @keydown.esc.prevent="cancelEditInstruction"
                      @blur="commitEditInstruction"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      class="shrink-0"
                      @mousedown.prevent
                      @click="commitEditInstruction"
                    >
                      <Check :size="16" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      class="shrink-0"
                      @mousedown.prevent
                      @click="cancelEditInstruction"
                    >
                      <X :size="16" />
                    </Button>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      :class="cn('min-w-0 flex-1 text-left', instruction.type === 'header' ? 'text-primary font-semibold' : 'leading-6')"
                      @click="startEditInstruction(index)"
                    >
                      {{ instruction.type === 'header' ? instruction.title : instruction.raw }}
                    </button>
                    <button type="button" class="mt-1 shrink-0" @click="deleteInstruction(index)">
                      <X :size="18" class="text-muted-foreground" />
                    </button>
                  </template>
                </div>
              </VueDraggable>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldGroup class="gap-1">
              <div class="flex justify-between items-center">
                <FieldLegend class="font-serif text-2xl">
                  Notes
                </FieldLegend>
                <span class="text-sm text-muted-foreground font-semibold">
                  Optional
                </span>
              </div>
              <Field :data-invalid="r$.notes.$error" class="gap-1">
                <Textarea
                  v-model="r$.$value.notes"
                  type="text"
                  placeholder="Swaps, tips, the story behind it, what to serve alongside…"
                  class="h-26 bg-white"
                  :aria-invalid="r$.notes.$error"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      </form>
    </section>
  </div>
</template>

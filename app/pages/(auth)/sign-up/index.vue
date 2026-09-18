<script setup lang="ts">
import { useRegleSchema } from '@regle/schemas'
import { z } from 'zod'
import GoogleButton from '~/components/auth/GoogleButton.vue'
import PasswordInput from '~/components/auth/PasswordInput.vue'
import { cn } from '~/lib/utils'

definePageMeta({ layout: false })

const { isLoaded, signUp, setActive } = useSignUp()

const { r$ } = useRegleSchema({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
}, z.object({
  firstName: z.string().min(1, { error: 'Required' }),
  lastName: z.string().min(1, { error: 'Required' }),
  email: z.email(),
  password: z.string().min(8, { error: 'Minimum 8 characters' }),
}))

const errorMessage = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!isLoaded.value || !signUp.value || !setActive.value)
    return

  const { valid, data } = await r$.$validate()

  if (!valid || loading.value)
    return

  errorMessage.value = ''
  loading.value = true

  try {
    const result = await signUp.value.create({
      firstName: data.firstName,
      lastName: data.lastName,
      emailAddress: data.email,
      password: data.password,
    })
    if (result.status === 'complete' && result.createdSessionId) {
      await setActive.value({ session: result.createdSessionId })
      await navigateTo('/dashboard')
      return
    }
    await signUp.value.prepareEmailAddressVerification({ strategy: 'email_code' })
    await navigateTo('/sign-up/verify')
  }
  catch (err: any) {
    errorMessage.value
      = err?.errors?.[0]?.longMessage
        ?? err?.errors?.[0]?.message
        ?? 'Could not create your account. Please try again.'
  }
  finally {
    loading.value = false
  }
}

async function onGoogle() {
  if (!isLoaded.value || !signUp.value || loading.value)
    return

  errorMessage.value = ''
  loading.value = true

  try {
    await signUp.value.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/dashboard',
    })

    // `loading` deliberately stays set. This resolves once the redirect is
    // under way, not once the browser has left, so clearing it here flashes the
    // form back to enabled for a frame before the page goes.
  }
  catch (err: any) {
    errorMessage.value
      = err?.errors?.[0]?.longMessage
        ?? err?.errors?.[0]?.message
        ?? 'Could not start Google sign up.'
    loading.value = false
  }
}
</script>

<template>
  <section class="grid grid-rows-1 min-h-[768px] min-h-screen max-md:grid-cols-1 md:grid-cols-[min(50%,640px)_1fr]">
    <div class="hidden md:flex relative border-l overflow-hidden h-full min-h-[240px]">
      <img src="/chicken-pasta-foxes-love-lemons.jpg" class="absolute inset-0 object-cover w-full h-full">
      <div
        class="absolute inset-0 pointer-events-none bg-[linear-gradient(165deg,rgba(255,89,109,0.2)_0%,rgba(43,36,34,0.1)_45%,rgba(43,36,34,0.52)_100%)]"
      />
    </div>

    <div
      :class="cn(
        'flex flex-col gap-6 px-4 py-4',
        'md:px-8 md:py-8',
        'lg:px-14 lg:py-11',
      )"
    >
      <NuxtLink to="/" class="w-fit">
        <Logo class="h-7" />
      </NuxtLink>

      <div class="flex-1 flex items-start md:items-center">
        <div class="w-full max-w-md mx-auto flex flex-col gap-6 md:mx-0">
          <div v-if="errorMessage" class="border rounded-md text-sm py-3 px-4 text-destructive bg-destructive/5 font-medium border-destructive">
            {{ errorMessage }}
          </div>

          <div>
            <h1 class="font-serif text-4xl font-medium">
              Start your <span class="text-primary italic">cookbook</span>.
            </h1>
            <p class="text-muted-foreground">
              Save the recipes worth making again.
            </p>
          </div>

          <GoogleButton :disabled="loading || !isLoaded" label="Sign up with Google" @click="onGoogle" />

          <div class="flex items-center gap-3">
            <div class="h-px flex-1 bg-border" />
            <span class="text-xs text-muted-foreground uppercase tracking-wider">
              or continue with email
            </span>
            <div class="h-px flex-1 bg-border" />
          </div>

          <form id="signup-form" @submit.prevent="onSubmit">
            <FieldSet :disabled="loading">
              <FieldGroup class="gap-3 sm:gap-7">
                <div class="flex flex-col sm:flex-row gap-3">
                  <Field :data-invalid="r$.firstName.$error" class="gap-1 flex-1">
                    <FieldLabel for="signup-form-first-name">
                      First name
                    </FieldLabel>
                    <Input
                      id="signup-form-first-name"
                      v-model="r$.$value.firstName"
                      type="text"
                      autocomplete="given-name"
                      class="bg-white"
                      :aria-invalid="r$.firstName.$error"
                    />
                  </Field>
                  <Field :data-invalid="r$.lastName.$error" class="gap-1 flex-1">
                    <FieldLabel for="signup-form-last-name">
                      Last name
                    </FieldLabel>
                    <Input
                      id="signup-form-last-name"
                      v-model="r$.$value.lastName"
                      type="text"
                      autocomplete="family-name"
                      class="bg-white"
                      :aria-invalid="r$.lastName.$error"
                    />
                  </Field>
                </div>
                <Field :data-invalid="r$.email.$error" class="gap-1">
                  <FieldLabel for="signup-form-email">
                    Email
                  </FieldLabel>
                  <Input
                    id="signup-form-email"
                    v-model="r$.$value.email"
                    type="email"
                    autocomplete="email"
                    class="bg-white"
                    :aria-invalid="r$.email.$error"
                  />
                </Field>
                <Field :data-invalid="r$.password.$error" class="gap-1">
                  <FieldLabel for="signup-form-password">
                    Password
                  </FieldLabel>
                  <PasswordInput
                    id="signup-form-password"
                    v-model="r$.$value.password"
                    type="password"
                    autocomplete="new-password"
                    class="bg-white"
                    :aria-invalid="r$.password.$error"
                  />
                  <FieldDescription class="text-xs">
                    At least 8 characters.
                  </FieldDescription>
                </Field>
                <div id="clerk-captcha" />
                <div class="flex flex-col gap-3 w-full">
                  <Button type="submit" form="signup-form" size="lg" :disabled="loading || !isLoaded">
                    {{ loading ? "Creating account…" : "Create account" }}
                  </Button>
                  <p class="text-center text-xs text-muted-foreground">
                    By continuing you agree to our <span class="font-bold">Terms</span> & <span class="font-bold">Privacy Policy</span>.
                  </p>
                </div>
              </FieldGroup>
            </FieldSet>
          </form>

          <div class="text-sm text-muted-foreground font-semibold">
            Already have an account? <NuxtLink to="/login" class="text-primary font-bold">
              Sign in
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

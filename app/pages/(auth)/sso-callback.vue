<script setup lang="ts">
definePageMeta({ layout: false })

const clerk = useClerk()
const route = useRoute()

/**
 * Clerk hands back whatever URL it resolved, which may be absolute. Reduce a
 * same-origin one to a path so `navigateTo` routes it inside the SPA, and leave
 * anything off-origin for a full external redirect.
 */
function resolveTarget(url: string) {
  const resolved = new URL(url, window.location.origin)

  return resolved.origin === window.location.origin
    ? { to: `${resolved.pathname}${resolved.search}${resolved.hash}`, external: false }
    : { to: resolved.href, external: true }
}

onMounted(async () => {
  try {
    await until(() => clerk.value).toBeTruthy()

    // /login forwards its `?r=` here so a user bounced off a deep link lands
    // back on it. Clerk still picks the URL — the force options only change
    // what it resolves "done" to, leaving its own intermediate steps alone.
    const afterAuth = safeRedirectPath(route.query.r)

    // Clerk drives the final redirect itself, from inside `setActive`, so this
    // hook sees only its intermediate steps — a first factor, or a sign-up that
    // needs more details. Record those and move once `handleRedirectCallback`
    // has resolved, rather than mid-flight: whatever Clerk already navigated to
    // is then the route we are on, and this settles on the right one either way.
    let target = afterAuth

    await clerk.value!.handleRedirectCallback(
      {
        signInForceRedirectUrl: afterAuth,
        signUpForceRedirectUrl: afterAuth,
      },
      async (to) => {
        target = to
      },
    )

    const { to, external } = resolveTarget(target)

    if (to !== route.fullPath)
      await navigateTo(to, { external })
  }
  catch (e: any) {
    await navigateTo(`/login?error=${encodeURIComponent(e?.message ?? 'sso_failed')}`)
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <h1 class="font-serif font-medium text-4xl -tracking-[0.015em] leading-[1.1]">
      Signing you <span class="text-primary italic">in</span>…
    </h1>
    <p class="text-muted-foreground">
      Hang tight — we're finishing up your sign in.
    </p>

    <div class="flex justify-center py-4">
      <div class="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  </div>
</template>

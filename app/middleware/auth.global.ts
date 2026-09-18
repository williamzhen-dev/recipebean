const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
const isAuthRoute = createRouteMatcher(['/login', '/sign-up(.*)', '/sso-callback'])

// Clerk JS is fetched after hydration, so the first client navigation has to
// wait for it. Later navigations must not wait, and this flag is what stops
// them. `isLoaded` reports false in two different situations: before Clerk JS
// has loaded, and during the short transitive state that `signOut()` sets while
// it awaits its own redirect. Waiting in the second case deadlocks. Clerk sets
// `session`/`user` to undefined, then awaits `navigate('/login')`, and only
// restores the signed-out state after that navigation resolves — but the
// navigation is this middleware, so nothing ever resolves and the redirect
// never happens.
//
// Module scope is safe here because the handler returns before this is read on
// the server.
let clerkHasLoaded = false

export default defineNuxtRouteMiddleware(async (to) => {
  // Auth redirects only matter client-side: protected and auth routes are all
  // `ssr: false`, and `/` is public. Running this during the server prerender of
  // `/` would block on `until(isLoaded)` (Clerk never "loads" in that context).
  if (import.meta.server)
    return

  const { isSignedIn, isLoaded } = useAuth()

  if (!clerkHasLoaded) {
    if (!isLoaded.value)
      await until(isLoaded).toBe(true)

    clerkHasLoaded = true
  }

  // Same transitive state, reached the other way. `setActive` also blanks
  // `session`/`user`, awaits its own redirect, and restores the real state only
  // once that navigation resolves — so Clerk's post-OAuth redirect to
  // /dashboard arrives here looking signed out and was bounced to /login,
  // flashing the login page before the callback page could finish. Clerk picked
  // that redirect while holding the real state, so let it through untouched.
  if (!isLoaded.value)
    return

  // `isSignedIn` is undefined, not false, while Clerk is mid-sign-out. That
  // reads as "not signed in" below, which is what we want: the redirect to
  // /login is let through instead of being bounced back to /dashboard.
  if (isProtectedRoute(to) && !isSignedIn.value) {
    return navigateTo(`/login?r=${encodeURIComponent(to.fullPath)}`)
  }

  if (isAuthRoute(to) && isSignedIn.value) {
    return navigateTo('/dashboard')
  }
})

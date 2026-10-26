import type { RouteLocationNormalized, RouteLocationRaw, RouteLocationResolved, Router } from 'vue-router'

type BackTarget = { fullPath: string; position: number }
const stateKey = 'nbaBackTarget'

// Sections, filters and anchors belong to the same detail page.
function pageKey(route: RouteLocationNormalized | RouteLocationResolved) {
    if (route.name === 'TeamDetail') return `team:${String(route.params.abbr).toUpperCase()}`
    if (route.name === 'PlayerPage') return `player:${route.params.name}`
    if (route.name === 'PreGame' || route.name === 'GameDetail') return `game:${route.params.gameId}`
    return route.path
}

function readTarget(value: unknown): BackTarget | null {
    if (!value || typeof value !== 'object') return null
    const target = value as BackTarget
    return typeof target.fullPath === 'string' && target.fullPath.startsWith('/') &&
        !target.fullPath.startsWith('//') && Number.isInteger(target.position) && target.position >= 0
        ? { fullPath: target.fullPath, position: target.position } : null
}

export function installBackNavigation(router: Router) {
    let previous: { route: RouteLocationNormalized; position: number; target: BackTarget | null } | undefined

    router.afterEach((to, _from, failure) => {
        if (failure) return
        const history = router.options.history
        const position = Number(history.state.position)
        let target = readTarget(history.state[stateKey])

        if (previous && Number.isInteger(position)) {
            if (position === previous.position) {
                // Replacements (including automatic match redirects) keep the entry's origin.
                target = previous.target
            } else if (position > previous.position && !(stateKey in history.state)) {
                target = pageKey(to) === pageKey(previous.route)
                    ? previous.target
                    : { fullPath: previous.route.fullPath, position: previous.position }
            }
        }

        // Persist per history entry so reload, browser Back and Forward preserve the origin.
        history.replace(to.fullPath, { ...history.state, [stateKey]: target })
        previous = { route: to, position, target }
    })
}

export function navigateBack(router: Router, fallback: RouteLocationRaw) {
    const history = router.options.history
    const target = readTarget(history.state[stateKey])
    const position = Number(history.state.position)
    if (target && target.position < position) {
        const resolved = router.resolve(target.fullPath)
        if (resolved.matched.length && pageKey(resolved) !== pageKey(router.currentRoute.value)) {
            router.go(target.position - position)
            return
        }
    }
    // A direct link/new tab has no known in-app origin. Replace avoids a return loop.
    void router.replace(fallback)
}

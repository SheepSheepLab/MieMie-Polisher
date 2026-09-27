# Product Identity and Native Launcher

`POLISHER_PRODUCT` in `product-identity.js` is the source of `name`, `englishName`,
and `launcherName`. UI markup/aria/title/alt and generated asset display names
consume it. The build verifies static manifest display fields match. Protocol
`miemie.polisher`, helper script ID and historical business storage keys remain
unchanged. Follow this small pattern for other official applications; do not
variable-rename protocol identity.

`native-launcher.js` plus `assets/native-launcher.css` owns one presentation:
64px circular native entry, pointer threshold/drag, left/right Dock, safe-area and
visual-viewport bounds, hover/press, keyboard activation and reduced motion.
`miemie_polisher_dock_v1` stores side/ratio for both modes independently of Hub's
legacy Dock key. No prior standalone position key existed. Animation duration
and easing live in native CSS motion tokens. `dispose()` cancels flights, removes
faces/listeners and the entry. Rotation finishes at updated geometry.

Standalone automatically mounts this component and uses its local show/close
adapter for Orb → Panel → Orb. Hub mode registers optional
`api.registerShortcutLauncher`; Hub mounts the same component only after the
user enables “显示悬浮球” in Installed. Its click calls supplied `open` to enter
Hub Surface with Shortcut origin. It does not create a second Polisher factory,
settings store, fetch hook or panel. Hub Honeycomb remains available.

Hub absence/reappearance follows the existing serialized dual-mode handoff,
including memory-only API configuration and unsaved form state. Older Hubs
without the capability remain compatible; new Hubs default Shortcut off.
Surface closure never deletes settings or ends the Extension lifecycle.

Validation covers the full built business script, native mouse/touch Dock,
reduced motion, rotation/cancellation, stale calls and mode handoff. Physical
mobile Safari/WebView animation feel still requires device review before release.

## Entrance-based native presentation

Standalone and Hub Shortcut now call the same `createNativeFloatingPresentation`
from `native-floating-presentation.js`. It owns geometry, native flights, historical
blur/header splash, cancellation and panel-follow position. The native launcher
owns pointer/drag/dock and shared persisted position. Neither module knows Hub
Runtime, Registry or business settings.

Standalone `show/close` retains the small local UI lifecycle. The Shortcut mount
returns `presentation` (`place`, `run`, `cancel`, `release`), letting Hub control
lifecycle while using those exact native pixels. Presentation methods never set
hidden/inert or remove the business panel. Disposing the Shortcut only releases
visuals and removes its orb; Hub can still close the panel via safe origin fallback.
Honeycomb opens always use Hub's separate Surface Motion. Older Hub versions ignore
this additive optional handle field and keep their existing fallback.

Validation: Polisher 42 tests, Hub 297, actual artifact integration 30, ecosystem
16 passed. Regression checks compare the actual native keyframes, duration/easing,
geometry and resize results between both external entrance modes. No protocol ID,
storage key, business controller or Extension instance change.

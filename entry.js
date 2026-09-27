// The optional launcher adapter owns this script's connection, never its data.
const polisherSource = createPolisherDualMode({
  host: window.parent, frame: window, manifest: POLISHER_MANIFEST,
  factory: createPolisherExtension, icon: POLISHER_ASSETS.icon, launcherStyles:POLISHER_ASSETS.launcherStyles,
});
void polisherSource.ready;

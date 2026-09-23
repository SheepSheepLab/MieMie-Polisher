// Bundled with resources.js and legacy-tool.js into a separate Tavern Helper script.
export function createPolisherExtension(api) {
  const host = window.parent;
  const resources = createPolisherResources(api, host);
  let tool;
  return {
    activate() {
      if (api.signal.aborted) return;
      tool = mountPolisherTool(api, resources, POLISHER_ASSETS);
      tool.panel.querySelector('.mm-tool-titles > strong').textContent = `${POLISHER_MANIFEST.name} - ${POLISHER_MANIFEST.version}`;
      api.attachPanel(tool.panel, {icon: POLISHER_ASSETS.icon});
    },
    open() { return api.showPanel(); },
    // Private, in-memory handoff between this script's two launcher modes.
    captureSession() { return tool?.captureSession(); },
    restoreSession(state) { tool?.restoreSession(state); },
    deactivate() { tool = null; return resources.dispose(); },
  };
}

# Hub API2 development integration

This development branch targets Hub 0.9.0 Extension API **2**. It is not a new
published product version. Existing public API1 releases and their assets remain
unchanged. Formal versions, release assets and production rollout require Owner
review. Do not distribute a different build under an existing released version.

## Runtime contract

The root manifest declares `schemaVersion: 1`, `apiVersion: 2` and
`hubApi: {min: 2, max: 2}`. Only a Hub advertising API2 is adopted; an API1 Hub
is not treated as an API2 runtime. Standalone remains available without API2.

The source adapter serializes Standalone/Hub transfer and waits for cleanup before
starting a replacement business session. Surface/Native entry changes within a
Hub session reuse the same business instance. A runtime disable does not create a
Standalone instance that bypasses the user's selection.

Every Surface open/close forwards the captured SurfaceLease. Native presentation
uses `registerNativeWindow`, with synchronous mount/open/release boundaries. The
extension owns its native window, animation, drag and close behavior. Release
invalidates pending native work, cancels presentation and restores owned root
styles before Hub takes the panel. Late completion cannot reclaim a revoked lease.
The Native preference controls presentation, not business activation. No API1
Runtime, Shortcut Runtime, shared Core native presentation or product-specific
Core fallback is introduced.

## Managed Package contract

Runtime compatibility and managed installation are separate gates. Manifest,
Managed Package, machine metadata and Build Identity schemas remain **1**. Product,
stable script, repository, author and version identities are unchanged. The Build
Identity does not declare apiVersion; it is not proof of API compatibility.

A target must pass the exact-version manifest and full Package v1 identity/hash
checks before installation or update writes. An already-installed API1 script
must not be activated as API2 or deleted because it is incompatible. A safe
upgrade needs a strictly newer, fully verified compatible target and preserved
instance ID, custom name, data, order and enabled state. The current development
build is not a new official online update candidate merely because its API changed.

## Verification and scope

`npm test` runs the existing business suite and additional API2 contract tests.
`npm run build` creates a development package with the same machine schema.
Pinned, unmodified Hub API2 test sources and SHA-256 provenance are under
`tests/fixtures/hub-api2`; these fixtures are not included in the product bundle.
DOM contract tests use controlled Surface/Native boundaries. Real browser and
isolated Tavern results must be recorded separately; they cannot be inferred from
machine validation or a mock boundary.

Historical API1 references, release reports, test records and contributor credits
remain evidence for their original versions. They do not certify this API2 branch.
Production Registry API2, production Origin, published online install/update,
physical mobile Safari and Owner acceptance remain independent release gates.

## API2-only cleanup

Only API2 Hub factories are adopted. Required lifecycle/Surface methods, the
Source ready/release contract and Hub whenDisposed boundary must be present;
a failed ready result is reported as failure. Disposal still waits for the
current API2 completion boundary and this extension's own cleanup, rather than
treating the synchronous disposed notification as completed teardown.

Native Window and Back remain optional API2 capabilities. A Surface-only host
may omit them; no Native availability or Shortcut integration is claimed in
that case. Their capability checks do not dispatch an API1 implementation.
Standalone uses the extension's own close route and data, independently of Hub.
Historical API1 fixtures and published packages remain evidence only, outside
the current production build closure.

## 润色工具的实际接入与状态交接

入口链为 `entry.js → createPolisherDualMode（launcher-adapter.js）→ currentHub → extensions.provide → trackedFactory → createPolisherExtension（polisher.js）`。只采用 API2；必需 signal／onCleanup／attachPanel／showPanel／closePanel、Source ready/release 与 whenDisposed 缺失时报告失败，不能伪称集成。`hub-api2.js` 的 `createAPI2NativeBridge` 仅在可选 registerNativeWindow 存在时注册；缺少它仍可使用 Surface，不宣称已提供 Native。

Surface 的 open／close 使用捕获 Lease；Native bridge 把同一 instance.open 的 Lease 路由到产品自身 Launcher。release 同步使 nativeLease 失效并取消动画；入口 OFF 只移除展示，不卸载业务。润色、翻译、发送拦截、配置、提示词与资源清理由原工厂负责。

Standalone 与 Hub 之间采用串行 remount：先 captureSession、abort、deactivate 和 LIFO cleanup，再创建下一会话。页面内未记住 Key、未保存接口字段、tab 和开关私有交接，不持久化给 Hub；进行中的请求取消，不复制到新会话。同一 Hub Session 内蜂窝／Native 入口共享一份业务和面板，不把跨宿主 remount 误写成所有时候同一个对象。当前验收见 [TESTING](TESTING.md#api2-pre-main2026-10-20)，最低要求及待发行资料见 [新版发行草稿](RELEASE-API2-DRAFT.md)。

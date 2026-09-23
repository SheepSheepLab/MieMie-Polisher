# 可选 Launcher 双模式协议 v1

MieMie Polisher 1.1.2 是该可选协议的参考实现。社区作品无需适配即可作为 Catalog 外部项目被收录；本协议不是安装资格或作者认证。

## 约定

- 父页面 `window.parent.__MieMieHub` 提供 `apiVersion: 1` 和 `extensions.provide(manifest, factory)`。
- Hub 发布 `miemie:hub-ready`、`miemie:hub-disposed` 事件，`detail` 为对应 Hub 对象；以对象身份区分重载前后实例。
- `provide` 返回 `{ok, ready, release}`。`ready` 等待注册/激活处理，`release()` 撤回当前来源并清理正在运行的实例。
- 新 Hub 的可选 `whenDisposed` Promise 在整个 Runtime 清理结束后完成。兼容旧 Hub 时，适配器也要跟踪自己 `onCleanup` 的完成，不能把 disposed 事件直接当作全部资源已经销毁。
- `contributes.launcher` 只声明可选启动能力。有后台 `activate/deactivate` 而无 Launcher 的 Extension 仍可由 Runtime 管理。普通第三方脚本无需被强制套入该模型。

## 作者负责自己的独立入口

作者自行创建、显示、隐藏和移除自己的 Launcher；Hub 不扫描或移除其他人的悬浮球。MieMie 品牌视觉不是协议要求。

最小适配流程示例：

```js
// 独立模式由作者自己的代码负责，不依赖 Hub。
await startStandalone();

async function useHub(hub) {
  await stopStandalone(); // 先撤销业务 Hook、监听和 DOM
  const lease = hub.extensions.provide(manifest, factory);
  if (!lease.ok) throw new Error(lease.error);
  await lease.ready;
  return lease;
}

// Hub 消失后：等待旧 Runtime 完成自己的清理，再启动独立实例。
// 不能在 Hub 中“停用 Extension”时立即绕过用户设置重新独立启动。
```

这是顺序说明，完整可运行处理见本仓库 `launcher-adapter.js`：串行状态切换、source iframe 卸载、旧 Hub 清理跟踪、重复来源拒绝和重载交接均在该文件中实现。

## Polisher 的选择

默认 `keepStandalone: false`：无 Hub 显示独立球；有兼容 Hub 时独立球消失，Hub Launcher 打开原 UI。停用或 Runtime 注销扩展时，只要 Hub 仍存在，就不自行复活业务。

参考适配器支持 `keepStandalone: true`：Hub 存在时仍保留作者的球，但该球委托 `hub.extensions.open(id)`，不会再启动第二份业务或第二层 Hook。Hub 已停用扩展时，该入口不会绕过停用状态。

```js
createPolisherDualMode({
  host: window.parent,
  frame: window,
  manifest,
  factory: createPolisherExtension,
  icon: ownIcon,
  keepStandalone: true,
});
```

这个具体适配器包含 Polisher 专用 DOM 和重复实例标记，社区作者应按协议实现自己的适配，而非照搬 Polisher 产品身份。

## 状态边界

Hub/独立模式切换先清理再激活；正在进行的业务请求会安全取消，不尝试无刷新迁移正在等待的网络请求。持久业务数据继续使用原有存储。Polisher 额外通过私有内存 handoff 保留本页 Key、未保存接口输入、当前 tab 和自动开关，不写入 localStorage、Manifest 或日志。完全停止/重载 Polisher 自身脚本后，本页未持久信息按原语义丢弃。关闭 Polisher 自身的酒馆助手脚本时会彻底撤回来源、监听、球和业务 Hook。

Hub 自更新、Extension 更新以及真正宿主脚本卸载由 Hub 的包管理实现；此适配器不自行下载或修改脚本。

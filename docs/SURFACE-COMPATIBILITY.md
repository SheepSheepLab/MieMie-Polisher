# Hub Surface compatibility

Polisher retains its dual-mode adapter and API v1 contract.

- With a compatible Hub, the existing attached panel opens through `api.showPanel()` and returns through `api.closePanel()`. The Hub owns Launcher Origin, motion, and honeycomb scroll restoration. Closing the UI does not deactivate Polisher or clear settings, keys, backups, or world books.
- With an older Hub lacking `closePanel`, the existing `hub.open()` return remains the fallback.
- Without a Hub, the Standalone adapter implements `closePanel` locally. Its launcher, Back and Escape continue to work independently. A revoked Standalone API cannot affect a replacement session.
- Panel creation, cleanup, registration and Hub/Standalone switching are unchanged. No version bump or release is included in this local adaptation.

Validation: the adapter suite exercises local close and revoked context; Hub artifact integration verifies returning to the original honeycomb scroll position while retaining the same panel and enabled instance. Ecosystem tests cover install, update, uninstall and returning to Standalone when Hub stops. Actual phone animation smoothness remains a visual acceptance item.

## Architecture Polish · 2026-09-27

隐藏的历史 open/close 控件也改走 showPanel/closePanel，避免绕过 Hub Surface 状态。Standalone 的 Back / Escape 进入本地 closePanel，旧 session 无法关闭新的独立实例；旧 Hub 缺少 closePanel 时仍保留兼容 fallback。

本轮 Polisher 全量 25/25；Hub 278/278；两份实际构建的组合验证 29/29，安装/更新/卸载生态流程 14/14。组合测试也实际点击了 Polisher 历史隐藏控件，确认 Surface open/closed 状态和原 scroll 恢复。版本保持 1.1.4，未提交或发布，未改翻译/润色算法。

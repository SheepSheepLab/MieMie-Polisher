# 静态兼容基线

从咩咩工具箱 1.0.1 原始导出文件中提取本项目负责部分，仅用于回归测试，不参与构建，也不加载另一项目的源码。

原始文件 SHA-256：`e28585ed12e7937af2ff4ea1852c3d1dd6584470d0217f16f3561799a5c8f233`。

`toolbox-polisher-core.txt` 是从 `const DEFAULT_RULES` 到 `  const host=window.parent` 之前的算法与默认提示词；`toolbox-polisher-markup.html` 是润色 `root.innerHTML` 原始模板。测试仅允许已确认的两处产品标签变化。

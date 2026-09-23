# Polisher GitHub Package

正式来源：`https://github.com/SheepSheepLab/MieMie-Polisher`。Hub 从这个作者仓库的 Release 获取文件，不复制到 Hub 或 Registry 仓库。

每次构建生成：

- `MieMie-Polisher-Extension-<version>.json`：酒馆助手单脚本包；与中文文件名产物字节一致。
- `manifest.json`：Extension 身份及可选 Launcher 声明。
- `MieMie-Extension-update.json`：机器安装/更新元数据。

元数据格式：

```json
{
  "schemaVersion": 1,
  "format": "tavern-helper-script",
  "productId": "miemie.polisher",
  "version": "1.1.2",
  "tag": "v1.1.2",
  "scriptId": "4dd658f1-9d4b-4f74-bba8-305c4ef2a9c8",
  "manifest": { "...": "完整的正式 Manifest" },
  "asset": {
    "name": "MieMie-Polisher-Extension-1.1.2.json",
    "size": 0,
    "sha256": "构建时计算的最终 JSON 原始字节 SHA-256"
  },
  "contentSha256": "构建时计算的脚本 content UTF-8 SHA-256"
}
```

示例中的 size/hash 是说明字段，不是可发布元数据；只能发布构建产生的真实文件。JSON 的固定 scriptId 用于校验产品包，不代表用户安装实例 ID。安装或更新必须使用宿主实际实例 ID，并保留用户数据。

脚本 content 第一行包含 `MieMie-Extension-Build` 身份声明，绑定 schemaVersion、productId、version、scriptId、repository。Manifest 的 `apiVersion: 1` 和 `hubApi: {min: 1, max: 1}` 声明 Hub API v1 兼容范围。`icon` 使用仓库相对路径；发布 metadata 不嵌入大 Base64 图片，运行脚本自行嵌入自己的图像。

Hash/Digest 只能验证附件完整性，不证明作者身份或代码安全。Registry 默认上架和机器安装兼容均不表示安全审核。

所有新版本只使用 `MAJOR.MINOR.PATCH`。1.1.0 新增独立 Launcher 和 Hub 自动收纳；1.1.2 仅替换正式 Icon 并提升 PATCH。保留 1.1.1 Release 作为本轮真实更新测试基线。

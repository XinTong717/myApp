# Design System Guardrails

可雀的小程序界面要保持温暖、安全、独立、自由，但实现上必须收敛：颜色、字号、间距和组件都尽量从统一入口取，避免每个页面长出自己的小森林。

## 颜色

- TS/TSX 中优先使用 `src/theme/palette.ts`。
- WXSS/SCSS 中优先使用 `src/app.scss` 里的 CSS variables，例如 `var(--color-brand)`。
- 不要在 `src/**/*.tsx` 里新增裸 hex，例如 `#B85540`。确实需要临时例外时，把例外写进 `scripts/check-design-system.cjs` 的 allowlist，并补一句原因。

## 字号

- TS/TSX inline style 中优先使用 `src/theme/typography.ts`，例如 `style={{ ...typography.body }}`。
- className 中优先使用全局文字类：`.text-title`、`.text-section-title`、`.text-card-title`、`.text-body`、`.text-body-strong`、`.text-meta`、`.text-caption`、`.text-micro`、`.text-button`。
- 不要新增裸 `fontSize:`。确实需要例外时，写进 design-system check allowlist。

## 间距和圆角

- TS/TSX inline style 中优先使用 `src/theme/spacing.ts` 里的 `space()`、`radius`、`elevation`。
- 不要新增裸 `padding: '12px'`、`marginBottom: '8px'`、`borderRadius: '16px'` 这类像素字面量。
- `0`、`100%`、WeChat 组件要求的尺寸值，以及确实不属于设计 token 的渲染参数可以保留，但要避免在普通 UI 中继续扩散。

## 组件

优先使用 `src/components/common/`：

- 页面：`AppPage`、`AppPageHeader`
- 卡片：`AppCard`
- 按钮：`AppPrimaryButton`、`AppMiniButton`
- 筛选：`AppChip`、`AppFilterRow`、`PillSelect`
- 表单：`FormInputBox`、`AppSearchBox`
- 状态：`Skeleton`、`StateCards`

`src/components/profile/` 是历史包袱区。上线测试前不要大迁移，但新功能不要继续往里面新增一套视觉语言。

## 例外：地图 Marker Label

WeChat Map 的 marker label 配置不是普通页面 UI。`src/pages/explore/index.tsx` 里传给 `<Map />` markers 的 `label` 对象，可能需要使用微信地图 API 要求的 `fontSize`、`borderRadius`、`padding`、`anchorX`、`anchorY` 等数字或像素值，以确保地图气泡在原生地图层正确渲染。

这些 marker label 值可以作为窄例外处理：

- 只允许出现在地图 marker / callout / label 配置附近。
- 不要把这个例外扩展到普通卡片、表单、按钮、列表或 profile 组件。
- 如果以后 design-system check 需要 allowlist，说明里要写明这是原生 Map API 配置，不是应用 UI 样式漂移。

## 新代码检查

运行：

```bash
npm run check:design-system
```

这个脚本会扫描 `src/**/*.tsx`，拦截未列入 allowlist 的裸 hex、裸 `fontSize:`、裸圆角和裸间距像素值。它不是审美警察，是防止界面变成调色盘事故现场的护栏。

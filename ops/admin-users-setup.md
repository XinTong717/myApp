# admin_users 初始化说明

Last updated: 2026-04-19

## 用途

管理员审核页和以下云函数会检查 `admin_users`：
- `checkAdminAccess`
- `listEventSubmissions`
- `getEventPublishPayload`
- `reviewEventSubmission`

只有存在有效管理员记录的用户，才能访问活动审核台和修改审核状态。

---

## collection 名称

```text
admin_users
```

---

## 最小字段

建议至少包含：

```json
{
  "openid": "用户的 openid",
  "name": "Xin",
  "role": "admin",
  "isActive": true,
  "createdAt": "serverDate()",
  "updatedAt": "serverDate()"
}
```

### 字段说明
- `openid`: 必填，管理员身份的真实判定字段
- `name`: 选填但建议填，会用于 `reviewedBy` 默认值
- `role`: 目前只做展示，建议填 `admin`
- `isActive`: 必填，只有 `true` 才会被视为管理员

---

## 如何拿到自己的 openid

当前 repo 里的 `getMe` 云函数会返回当前用户 openid。

你可以：
1. 在小程序前端调用 `getMe`
2. 看返回结果里的 `openid`
3. 把这个值写入 `admin_users`

---

## 初始化步骤

### 方式 A：CloudBase Console 手动建一条
1. 打开 CloudBase Console
2. 创建 collection：`admin_users`
3. 新增一条记录，填入：
   - `openid`
   - `name`
   - `role = admin`
   - `isActive = true`
4. 保存

### 方式 B：以后多人协作时继续加人
每个管理员一条记录即可。

---

## 当前鉴权规则

当前代码的判断条件是：

```text
openid 匹配 && isActive = true
```

也就是说：
- 只有 `role = admin` 但 `isActive = false` → 不能访问
- `name` 为空但 `openid` 匹配且 `isActive = true` → 可以访问

---

## 建议权限

`admin_users` 本身建议不要让客户端随便读写。

当前最稳妥的做法：
- 只允许云函数读取
- 管理员增删通过 Console 手动操作

---

## 验证方式

完成初始化后：
1. 部署 `checkAdminAccess`
2. 在小程序打开管理员审核页
3. 如果能看到列表而不是“无权限”，说明配置成功

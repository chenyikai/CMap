# 开发、网页部署与版本发布

本仓库将日常检查、GitHub Pages 演示站和 npm 正式发布拆成三条独立流程：

```text
功能分支 / Pull Request  -> CI 检查，不部署
main                     -> 自动部署 GitHub Pages
Changesets               -> 更新版本和 CHANGELOG，发布 npm 并创建 Tag
```

这样 npm 鉴权或发布失败不会影响演示站，普通 Pull Request 也不会覆盖线上页面。

## 环境要求

- Node.js 24
- pnpm 10.33.0

仓库在 `package.json` 中固定了 pnpm 版本，GitHub Actions 使用相同版本。

安装依赖：

```bash
pnpm install --frozen-lockfile
```

## 日常开发

启动 Demo 开发服务器：

```bash
pnpm dev
```

默认访问 `http://localhost:5173/`。

Vite 本地服务器保留了 `/ship` 代理。需要覆盖默认后端时，复制环境变量示例：

```bash
cp .env.example .env.local
```

然后修改 `.env.local` 中的 `SHIP_PROXY_TARGET`。该代理只存在于本地开发服务器，GitHub Pages 不提供反向代理能力。

提交 Pull Request 前执行：

```bash
pnpm run check
```

该命令依次检查 ESLint、TypeScript、对外类型声明和 Demo 构建。

也可以单独运行：

```bash
pnpm run lint
pnpm run type-check
pnpm run test:types
pnpm run build:demo
pnpm run preview:demo
```

Pull Request 会触发 `.github/workflows/ci.yml`，执行同一套检查，但不会部署网页或发布 npm。

## GitHub Pages 演示站

### 首次配置

进入 GitHub 仓库：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

完成后，`main` 每次更新都会触发 `.github/workflows/pages.yml`。工作流会：

1. 安装固定版本的 Node.js 和 pnpm。
2. 执行 `pnpm run check`。
3. 使用 `DEMO_BASE_PATH=/CMap/` 构建 Demo。
4. 上传 `dist-demo` 构建产物。
5. 部署到 GitHub Pages。

默认站点地址：

```text
https://chenyikai.github.io/CMap/
```

Pages 只接收 Actions 构建产物，仓库不再提交 `haitu-demo/` 或 `dist-demo/`。

### 手动重新部署

进入 GitHub 仓库的 **Actions -> Deploy GitHub Pages -> Run workflow**，选择 `main` 后运行即可。

### 自定义域名

使用自定义域名时，需要同步完成两项配置：

1. 在 GitHub Pages 设置中填写域名并配置 DNS。
2. 将 `pages.yml` 中的 `DEMO_BASE_PATH` 从 `/CMap/` 改为 `/`。

### 前端接口与 Token

- GitHub Pages 是纯静态托管，不能使用 Vite 的 `/ship` 开发代理。
- 正式接口必须支持 HTTPS，并允许 Pages 域名跨域访问。
- `VITE_*` 变量及构建时注入的值最终都会进入浏览器，不能用于保存私密 Token。
- 地图类公开 Token 应在服务商后台限制允许访问的域名。

## npm 正式发布

项目使用 Changesets 管理版本号和 `CHANGELOG.md`，使用 `.github/workflows/release.yml` 发布 npm。

### 记录一次变更

功能或修复完成后运行：

```bash
pnpm change
```

选择版本类型：

- `patch`：兼容性问题修复，例如 `0.2.1 -> 0.2.2`
- `minor`：向下兼容的新功能，例如 `0.2.1 -> 0.3.0`
- `major`：包含破坏性变更，例如 `0.2.1 -> 1.0.0`

填写面向使用者的变更说明后，Changesets 会在 `.changeset/` 生成 Markdown 文件。该文件必须与代码一起提交。

示例：

```bash
git add src .changeset
git commit -m "feat: add map option exports"
git push
```

### 自动发布过程

包含 changeset 的代码合并到 `main` 后：

1. Release Action 创建或更新版本 Pull Request。
2. 版本 Pull Request 更新 `package.json`、消费 changeset，并写入 `CHANGELOG.md`。
3. 审核并合并版本 Pull Request。
4. Release Action 执行 `pnpm run release`。
5. `release` 先构建库，再执行 `changeset publish`。
6. 发布成功后生成对应的 `vX.Y.Z` Git Tag 和 GitHub Release。

不要手动修改版本号来代替 changeset，否则版本 Pull Request 和更新日志可能不一致。

## npm 身份验证

推荐使用 npm Trusted Publishing（OIDC），不在 GitHub 中长期保存 npm Token。需要在 npm 包设置中添加 GitHub Actions Trusted Publisher，并填写：

- GitHub 用户或组织：`chenyikai`
- Repository：`CMap`
- Workflow：`release.yml`

仓库的 Release 工作流已经包含 OIDC 所需的 `id-token: write` 权限。

如果暂时使用传统 Token，则在 GitHub 仓库中添加：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
Name: NPM_TOKEN
```

工作流会把该 Secret 作为 `NODE_AUTH_TOKEN` 交给 npm。

## 手动发布

自动发布是默认方式。只有在 GitHub Actions 无法使用且确认本机 npm 身份、分支和工作区状态正确时，才使用本地命令：

```bash
pnpm pub
```

也可以显式指定版本级别：

```bash
pnpm pub:patch
pnpm pub:minor
pnpm pub:major
```

这些命令会修改版本、发布 npm，并创建和推送 Tag，执行前必须确认工作区干净。不要与正在运行的 Release Action 同时操作。

## 常见问题

### `No changesets found. Attempting to publish...`

这是 Changesets Action 的正常分支：当前没有待生成版本的 changeset，因此它会检查本地版本是否尚未发布。如果尚未发布，就调用 `pnpm run release`。

### `Missing script: release`

表示触发工作流的那个提交中没有 `release` 脚本，或者工作流检出的分支不是预期分支。当前仓库的发布命令为：

```json
"release": "pnpm run build && changeset publish"
```

### npm 发布返回 `E404 Not Found - PUT`

发布操作中的 E404 通常不是安装时所说的“包不存在”，而是 npm 没有确认当前身份有权创建或更新该包。检查：

1. Trusted Publisher 的仓库名和工作流文件名是否完全一致。
2. `NPM_TOKEN` 是否存在、有效且拥有目标包写权限。
3. 当前 npm 账号是否拥有 `cmap-core` 包名。
4. `publishConfig.registry` 是否仍为 `https://registry.npmjs.org/`。

### Pages 页面空白或资源 404

检查构建后的资源地址是否以 `/CMap/assets/` 开头，并确认 `pages.yml` 中：

```yaml
DEMO_BASE_PATH: /CMap/
```

### 本地正常，但 Pages 接口失败

本地 `/ship` 请求由 Vite 代理，Pages 上没有该代理。生产页面必须改用支持 HTTPS 和 CORS 的绝对接口地址，或部署单独的后端代理服务。

## 回滚

- 网页异常：在 GitHub Actions 中重新运行上一个正常提交的 Pages 工作流，或回滚对应代码提交。
- npm 包异常：已经发布的版本不能覆盖。修复后创建新的 patch changeset，再发布一个新版本。
- Git Tag 错误：先确认 npm 实际发布状态，再处理 Tag；不要直接复用已经发布过的 npm 版本号。

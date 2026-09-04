import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'

export default tseslint.config(
    // 1. 全局忽略
    { ignores: ['dist', 'node_modules', 'coverage', '**/*.d.ts'] },

    // 2. 扩展规则集
    js.configs.recommended,
    // 🔥 开启最严格的类型检查 (Strict Type Checked)
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // 3. 语言选项与解析器
    {
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: {
          project: ['./tsconfig.json', './tests/types/tsconfig.json'], // 👈 必须指向你的 TS 配置
          tsconfigRootDir: import.meta.dirname,
        },
      },
      plugins: {
        'prettier': prettierPlugin,
        'simple-import-sort': simpleImportSort,
        'unused-imports': unusedImports,
      },
      rules: {
        // 集成 Prettier (格式问题报错)
        ...eslintConfigPrettier.rules,
        'prettier/prettier': 'error',

        // --- ☠️ CMap 专用严格规则 ---
        '@typescript-eslint/no-explicit-any': 'off', // 严禁 any
        '@typescript-eslint/explicit-function-return-type': 'error', // 导出函数必须写返回类型
        '@typescript-eslint/consistent-type-imports': 'error', // 强制 import type
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/no-floating-promises': 'off', // 必须处理异步
        '@typescript-eslint/no-confusing-void-expression': 'error',
        '@typescript-eslint/no-useless-constructor': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',

        // --- 🧹 自动清理与排序 ---
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error', // 自动删除未使用的 import

        // --- 实用规则 ---
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    }
)

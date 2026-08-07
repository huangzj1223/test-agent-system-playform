import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // 忽略文件
  {
    ignores: ['node_modules', 'dist', 'public', '*.min.js']
  },

  // JavaScript 推荐规则
  js.configs.recommended,

  // Vue 3 推荐规则
  ...pluginVue.configs['flat/recommended'],

  // Prettier 集成
  prettier,

  // 全局变量和自定义规则
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      // Vue 规则
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',

      // JavaScript 规则
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
]

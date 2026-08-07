/** SidePanel 入口：挂载 Vue 应用 */
import { createApp } from 'vue'
import SidePanel from './SidePanel.vue'
import '../shared/theme.css'
import './sidepanel.css'

createApp(SidePanel).mount('#app')

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getImpactApi, type ImpactGraph } from '@/api/impact'
import { Search, Aim } from '@element-plus/icons-vue'

const instanceId = ref<number | null>(null)
const depth = ref(3)
const loading = ref(false)
const graph = ref<ImpactGraph | null>(null)
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

async function analyze() {
    if (!instanceId.value) { ElMessage.warning('请输入实例 ID'); return }
    loading.value = true
    try {
        const resp = await getImpactApi({ instance_id: instanceId.value, depth: depth.value })
        graph.value = resp.data
        renderChart(resp.data)
    } catch (e: any) {
        ElMessage.error(e?.message || '影响分析失败')
        graph.value = null
    } finally {
        loading.value = false
    }
}

function renderChart(g: ImpactGraph) {
    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)
    const nodes = g.nodes.map(n => ({
        id: String(n.instance_id),
        name: n.asset_name || n.asset_id || String(n.instance_id),
        symbolSize: n.instance_id === g.root.instance_id ? 44 : 28,
        itemStyle: { color: n.instance_id === g.root.instance_id ? '#7170ff' : '#3b3f46' },
        category: n.depth,
    }))
    const links = g.edges.map(e => ({
        source: String(e.source_id),
        target: String(e.target_id),
    }))
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { formatter: (p: any) => p.dataType === 'node' ? p.data.name : `${p.data.source} → ${p.data.target}` },
        series: [{
            type: 'graph',
            layout: 'force',
            data: nodes,
            links,
            roam: true,
            draggable: true,
            label: { show: true, position: 'bottom', color: '#d0d6e0', fontSize: 11 },
            force: { repulsion: 220, edgeLength: 120 },
            lineStyle: { color: '#5e6ad2', opacity: 0.5 },
            emphasis: { focus: 'adjacency' },
        }],
    })
}

function onResize() { chart?.resize() }

onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); chart?.dispose() })
</script>

<template>
  <div class="impact">
    <div class="page-head">
      <h1 class="page-title">影响分析</h1>
      <p class="page-subtitle">评估配置变更的波及范围（blast radius）</p>
    </div>

    <div class="query-bar">
      <el-input v-model.number="instanceId" placeholder="输入实例 ID" class="id-input" :prefix-icon="Search" clearable @keyup.enter="analyze" />
      <el-input-number v-model="depth" :min="1" :max="10" class="depth-input" />
      <el-button type="primary" :icon="Aim" :loading="loading" @click="analyze">分析</el-button>
    </div>

    <div v-if="graph" class="result">
      <div class="result-stats">
        <div class="stat"><span class="stat-num" style="color: var(--accent-blue)">{{ graph.root.asset_name || graph.root.asset_id }}</span><span class="stat-label">根节点</span></div>
        <div class="stat"><span class="stat-num">{{ graph.upstream_count }}</span><span class="stat-label">上游依赖</span></div>
        <div class="stat"><span class="stat-num">{{ graph.downstream_count }}</span><span class="stat-label">下游影响</span></div>
      </div>

      <div class="chart" ref="chartRef" />

      <div class="node-list">
        <div v-for="n in graph.nodes" :key="n.instance_id" class="node-row" :class="{ root: n.instance_id === graph.root.instance_id }">
          <span class="depth-badge">L{{ n.depth }}</span>
          <span class="node-name">{{ n.asset_name || n.asset_id }}</span>
          <code class="node-model">{{ n.model_uid }}</code>
        </div>
      </div>
    </div>

    <div v-else class="empty-hint">
      <el-icon :size="40"><Aim /></el-icon>
      <p>输入实例 ID 开始分析</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.impact { max-width: 1100px; }

.page-head { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-tertiary); margin: 0; }

.query-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
.id-input { width: 280px; }
.depth-input { width: 120px; }

.result { }
.result-stats {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
}
.stat-num { font-size: 18px; font-weight: 600; }
.stat-label { font-size: 12px; color: var(--text-tertiary); }

.chart {
  height: 420px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  margin-bottom: 16px;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.node-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;

  &.root { border-color: rgba(113, 112, 255, 0.4); background: rgba(113, 112, 255, 0.06); }
}
.depth-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
}
.node-name { font-size: 13.5px; font-weight: 500; }
.node-model { margin-left: auto; font-size: 12px; color: var(--text-tertiary); }

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>

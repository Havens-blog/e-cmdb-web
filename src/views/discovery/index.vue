<script setup lang="ts">
// 发现同步：真实对接 e-cam-service 多云证书发现导入编排（编排层转发）。
// 流程：snapshot-status（快照状态/引导）→ sync（手动触发增量同步）→
//       preview（基于最近 done 快照的预览清单）→ 勾选 import（创建会话，202）→
//       import/:sessionId 进度轮询至终态。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
    getDiscoveryPreviewApi, getSnapshotStatusApi, createDiscoveryImportApi,
    getImportSessionApi, triggerDiscoverySyncApi,
    type DiscoveryPreviewEntry, type DiscoverySnapshotStatus, type DiscoveryImportSession,
} from '@/api/discovery'
import { Cloudy, RefreshRight, VideoPlay } from '@element-plus/icons-vue'

const loading = ref(false)
const syncing = ref(false)
const snapshot = ref<DiscoverySnapshotStatus | null>(null)
const entries = ref<DiscoveryPreviewEntry[]>([])
const snapshotId = ref('')
const snapshotStartedAt = ref('')
const noSnapshot = ref(false)
const selected = ref<DiscoveryPreviewEntry[]>([])

// 导入会话进度
const sessionVisible = ref(false)
const session = ref<DiscoveryImportSession | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const providerLabel = (c: string) => ({ aliyun: '阿里云', tencent: '腾讯云', aws: 'AWS', azure: 'Azure', huawei: '华为云', volcano: '火山引擎' }[c] || c)

async function load() {
    loading.value = true
    noSnapshot.value = false
    try {
        // 快照状态（空态不视为错误）
        try {
            const s = await getSnapshotStatusApi()
            snapshot.value = s.data
        } catch { snapshot.value = null }
        // 预览（无 done 快照 → 上游 409，信封 code=409 引导触发同步）
        try {
            const resp = await getDiscoveryPreviewApi()
            entries.value = resp.data.items || []
            snapshotId.value = resp.data.snapshotId || ''
            snapshotStartedAt.value = resp.data.snapshotStartedAt || ''
        } catch (e: any) {
            entries.value = []
            if (String(e?.message || '').includes('SNAPSHOT') || e?.code === 409) noSnapshot.value = true
            else throw e
        }
    } catch (e: any) {
        ElMessage.error(e?.message || '加载发现预览失败')
    } finally {
        loading.value = false
    }
}

async function handleSync() {
    syncing.value = true
    try {
        await triggerDiscoverySyncApi()
        ElMessage.success('增量同步已触发完成，正在刷新预览')
        await load()
    } catch (e: any) {
        ElMessage.error(e?.message || '触发同步失败（需要 OpsEngineer 角色）')
    } finally {
        syncing.value = false
    }
}

const selectable = (row: DiscoveryPreviewEntry) => row.parseable && !row.inLedger

async function handleImport() {
    if (selected.value.length === 0) return
    try {
        const resp = await createDiscoveryImportApi(selected.value.map(e => ({
            cloud: e.cloud, accountKey: e.accountKey, cloudCertId: e.cloudCertId,
        })))
        session.value = resp.data
        sessionVisible.value = true
        startPolling(resp.data.sessionId)
    } catch (e: any) {
        ElMessage.error(e?.message || '创建导入会话失败')
    }
}

function startPolling(sessionId: string) {
    stopPolling()
    pollTimer = setInterval(async () => {
        try {
            const resp = await getImportSessionApi(sessionId)
            session.value = resp.data
            if (resp.data.status !== 'running') {
                stopPolling()
                if (resp.data.status === 'completed') ElMessage.success('导入全部成功')
                else ElMessage.warning('导入部分失败，可查看失败原因后重试')
                await load()
            }
        } catch { /* 轮询失败静默，下次重试 */ }
    }, 2000)
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }

const sessionDone = computed(() => session.value && session.value.status !== 'running')

function fmtTime(iso?: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function fmtNotAfter(v: string) {
    if (!v) return '—'
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toLocaleDateString()
}

onMounted(load)
onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="discovery" v-loading="loading">
    <div class="page-head">
      <div>
        <h1 class="page-title">发现同步</h1>
        <p class="page-subtitle">多云证书发现导入（复用 e-cam-service 发现编排：扫描 → 预览 → 导入）</p>
      </div>
      <div class="head-actions">
        <el-button :icon="VideoPlay" :loading="syncing" @click="handleSync">触发增量同步</el-button>
        <el-button :icon="RefreshRight" circle @click="load" />
      </div>
    </div>

    <!-- 快照状态条 -->
    <div class="snapshot-bar">
      <div class="snapshot-item">
        <span class="s-label">快照状态</span>
        <span class="s-value" :class="snapshot?.status || ''">
          {{ !snapshot?.hasSnapshot ? '无快照' : snapshot.status === 'done' ? '就绪' : snapshot.status === 'running' ? '扫描中' : snapshot.status === 'failed' ? '失败' : '—' }}
        </span>
      </div>
      <div class="snapshot-item">
        <span class="s-label">快照时间</span>
        <span class="s-value">{{ fmtTime(snapshotStartedAt || snapshot?.startedAt) }}</span>
      </div>
      <div class="snapshot-item" v-if="snapshotId">
        <span class="s-label">快照 ID</span>
        <code class="s-value mono">{{ snapshotId.slice(-8) }}</code>
      </div>
      <div class="snapshot-item" v-if="snapshot?.failReason">
        <span class="s-label">失败原因</span>
        <span class="s-value warn">{{ snapshot.failReason }}</span>
      </div>
    </div>

    <!-- 无快照引导 -->
    <div v-if="noSnapshot" class="empty-guide">
      <el-icon :size="40"><Cloudy /></el-icon>
      <p>尚无可用的发现快照——请先点击右上角「触发增量同步」完成一轮多云扫描</p>
    </div>

    <!-- 预览清单 -->
    <template v-else>
      <div class="table-head">
        <span class="table-title">发现清单（{{ entries.length }}）</span>
        <el-button type="primary" size="small" :disabled="selected.length === 0" @click="handleImport">
          导入选中（{{ selected.length }}）
        </el-button>
      </div>

      <el-table
        :data="entries"
        style="width: 100%"
        @selection-change="(rows: DiscoveryPreviewEntry[]) => selected = rows"
      >
        <el-table-column type="selection" width="42" :selectable="selectable" />
        <el-table-column label="云厂商" width="110">
          <template #default="{ row }">{{ providerLabel(row.cloud) }}</template>
        </el-table-column>
        <el-table-column prop="accountKey" label="云账号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="cloudCertId" label="云证书 ID" min-width="180" show-overflow-tooltip />
        <el-table-column label="名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.label || '—' }}</template>
        </el-table-column>
        <el-table-column prop="refCount" label="关联资源" width="90" align="center" />
        <el-table-column label="台账到期" width="120">
          <template #default="{ row }">{{ row.inLedger ? fmtNotAfter(row.notAfter) : '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.inLedger" type="success" size="small">已入库</el-tag>
            <el-tag v-else-if="!row.parseable" type="info" size="small">不可解析</el-tag>
            <el-tag v-else type="warning" size="small">待导入</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 导入进度对话框 -->
    <el-dialog v-model="sessionVisible" title="导入进度" width="560px" :close-on-click-modal="!sessionDone">
      <div v-if="session" class="session">
        <el-progress
          :percentage="session.progress.total ? Math.round(((session.progress.succeeded + session.progress.failed) / session.progress.total) * 100) : 0"
          :status="session.status === 'completed' ? 'success' : session.status === 'partial_failed' ? 'warning' : undefined"
        />
        <div class="session-stats">
          <span>共 {{ session.progress.total }}</span>
          <span class="ok">成功 {{ session.progress.succeeded }}</span>
          <span class="fail">失败 {{ session.progress.failed }}</span>
          <el-tag size="small" :type="session.status === 'running' ? 'primary' : session.status === 'completed' ? 'success' : 'warning'">
            {{ session.status === 'running' ? '导入中' : session.status === 'completed' ? '已完成' : '部分失败' }}
          </el-tag>
        </div>
        <el-table :data="session.items" size="small" max-height="280">
          <el-table-column label="云厂商" width="90">
            <template #default="{ row }">{{ providerLabel(row.cloud) }}</template>
          </el-table-column>
          <el-table-column prop="cloudCertId" label="云证书 ID" min-width="160" show-overflow-tooltip />
          <el-table-column label="结果" width="150">
            <template #default="{ row }">
              <el-tag v-if="row.result === 'success'" type="success" size="small">成功</el-tag>
              <el-tag v-else-if="row.result === 'failed'" type="danger" size="small">失败</el-tag>
              <el-tag v-else size="small">等待</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.errorReason || row.mappedCertId || '—' }}</template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button :disabled="!sessionDone" type="primary" @click="sessionVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.discovery { max-width: 1200px; }

.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }
.head-actions { margin-left: auto; display: flex; gap: 10px; }

.snapshot-bar {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}
.snapshot-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  min-width: 130px;
}
.s-label { font-size: 11px; color: var(--text-tertiary); }
.s-value { font-size: 14px; font-weight: 500;
  &.running { color: var(--accent-blue); }
  &.done { color: var(--accent-green); }
  &.failed { color: var(--accent-red); }
  &.warn { color: var(--accent-yellow); font-weight: 400; font-size: 12.5px; }
  &.mono { font-family: var(--font-mono); }
}

.empty-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px;
  color: var(--text-tertiary);
  font-size: 14px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border-base);
  border-radius: 12px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.table-title { font-size: 15px; font-weight: 600; }

.session {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.session-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: var(--text-secondary);
  .ok { color: var(--accent-green); }
  .fail { color: var(--accent-red); }
}
</style>

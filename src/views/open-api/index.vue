<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    createTokenApi, listTokensApi, revokeTokenApi,
    createWebhookApi, listWebhooksApi, deleteWebhookApi,
    type ApiToken, type Webhook,
} from '@/api/open-api'
import { Plus, Delete, DocumentCopy, RefreshRight } from '@element-plus/icons-vue'
import { formatTimestamp } from '@/utils/time'

const activeTab = ref<'tokens' | 'webhooks'>('tokens')

// ==================== Token ====================
const tokens = ref<ApiToken[]>([])
const tokenLoading = ref(false)
const tokenDialogVisible = ref(false)
const tokenForm = ref({ name: '', ttl_days: 30, scopes: ['read', 'write'] })
const createdToken = ref('')

async function loadTokens() {
    tokenLoading.value = true
    try {
        const resp = await listTokensApi({ limit: 100 })
        tokens.value = resp.data.items
    } catch (e: any) {
        ElMessage.error(e?.message || '加载 Token 失败')
    } finally {
        tokenLoading.value = false
    }
}

async function handleCreateToken() {
    try {
        const resp = await createTokenApi({ ...tokenForm.value })
        createdToken.value = resp.data.token
        tokenDialogVisible.value = false
        await loadTokens()
    } catch (e: any) {
        ElMessage.error(e?.message || '创建 Token 失败')
    }
}

async function handleRevokeToken(t: ApiToken) {
    await ElMessageBox.confirm(`确认吊销 Token「${t.name}」？`, '提示', { type: 'warning' })
    try {
        await revokeTokenApi(t.id)
        ElMessage.success('已吊销')
        await loadTokens()
    } catch (e: any) {
        ElMessage.error(e?.message || '吊销失败')
    }
}

function copyToken() {
    if (!createdToken.value) return
    navigator.clipboard?.writeText(createdToken.value)
    ElMessage.success('已复制，仅显示一次，请妥善保存')
}

// ==================== Webhook ====================
const webhooks = ref<Webhook[]>([])
const webhookLoading = ref(false)
const webhookDialogVisible = ref(false)
const webhookForm = ref({ name: '', target_url: '', secret: '', event_types: ['instance.created', 'instance.updated', 'instance.deleted'] })

const eventOptions = [
    { value: 'instance.created', label: '实例创建' },
    { value: 'instance.updated', label: '实例更新' },
    { value: 'instance.deleted', label: '实例删除' },
    { value: 'relation.created', label: '关系创建' },
    { value: 'relation.deleted', label: '关系删除' },
]

async function loadWebhooks() {
    webhookLoading.value = true
    try {
        const resp = await listWebhooksApi({ limit: 100 })
        webhooks.value = resp.data.items
    } catch (e: any) {
        ElMessage.error(e?.message || '加载 Webhook 失败')
    } finally {
        webhookLoading.value = false
    }
}

async function handleCreateWebhook() {
    try {
        await createWebhookApi({ ...webhookForm.value })
        ElMessage.success('已创建订阅')
        webhookDialogVisible.value = false
        await loadWebhooks()
    } catch (e: any) {
        ElMessage.error(e?.message || '创建 Webhook 失败')
    }
}

async function handleDeleteWebhook(w: Webhook) {
    await ElMessageBox.confirm(`确认删除订阅「${w.name}」？`, '提示', { type: 'warning' })
    try {
        await deleteWebhookApi(w.id)
        ElMessage.success('已删除')
        await loadWebhooks()
    } catch (e: any) {
        ElMessage.error(e?.message || '删除失败')
    }
}

onMounted(() => { loadTokens(); loadWebhooks() })
</script>

<template>
  <div class="open-api">
    <div class="page-head">
      <h1 class="page-title">开放 API</h1>
      <p class="page-subtitle">API Token 与 Webhook 订阅管理</p>
    </div>

    <el-tabs v-model="activeTab">
      <!-- ==================== Token ==================== -->
      <el-tab-pane label="API Token" name="tokens">
        <div class="toolbar">
          <el-button type="primary" :icon="Plus" @click="tokenDialogVisible = true">创建 Token</el-button>
          <el-button :icon="RefreshRight" circle @click="loadTokens" />
        </div>

        <el-table :data="tokens" v-loading="tokenLoading" style="width: 100%">
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column label="权限" width="180">
            <template #default="{ row }">
              <el-tag v-for="s in row.scopes" :key="s" size="small" class="scope-tag">{{ s }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <span class="status" :class="row.status">{{ row.status === 'active' ? '有效' : '已吊销' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="过期时间" width="180">
            <!-- 统一走共享格式化（补零 + 时分）；原实现 toLocaleString() 依赖环境 locale 且不补零 -->
            <template #default="{ row }">{{ row.expire_at ? formatTimestamp(row.expire_at) : '永不过期' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'active'" type="danger" link :icon="Delete" @click="handleRevokeToken(row)">吊销</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== Webhook ==================== -->
      <el-tab-pane label="Webhook 订阅" name="webhooks">
        <div class="toolbar">
          <el-button type="primary" :icon="Plus" @click="webhookDialogVisible = true">创建订阅</el-button>
          <el-button :icon="RefreshRight" circle @click="loadWebhooks" />
        </div>

        <el-table :data="webhooks" v-loading="webhookLoading" style="width: 100%">
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column label="订阅事件" min-width="220">
            <template #default="{ row }">
              <el-tag v-for="e in row.event_types" :key="e" size="small" class="scope-tag">{{ e }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="target_url" label="目标 URL" min-width="220" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <span class="status" :class="row.status">{{ row.status === 'active' ? '启用' : '停用' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link :icon="Delete" @click="handleDeleteWebhook(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- Token 创建对话框 -->
    <el-dialog v-model="tokenDialogVisible" title="创建 API Token" width="480px" :close-on-click-modal="false">
      <div v-if="!createdToken">
        <el-form label-width="80px">
          <el-form-item label="名称"><el-input v-model="tokenForm.name" placeholder="如 cicd-pipeline" /></el-form-item>
          <el-form-item label="有效期"><el-input-number v-model="tokenForm.ttl_days" :min="0" :max="3650" /> 天（0 = 永不过期）</el-form-item>
        </el-form>
      </div>
      <div v-else class="token-result">
        <div class="token-result-title">Token 创建成功（仅显示一次）</div>
        <div class="token-box">
          <code>{{ createdToken }}</code>
          <el-button :icon="DocumentCopy" circle @click="copyToken" />
        </div>
      </div>
      <template #footer>
        <el-button v-if="!createdToken" @click="tokenDialogVisible = false">取消</el-button>
        <el-button v-if="!createdToken" type="primary" :loading="tokenLoading" @click="handleCreateToken">创建</el-button>
        <el-button v-else type="primary" @click="createdToken = ''; tokenDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- Webhook 创建对话框 -->
    <el-dialog v-model="webhookDialogVisible" title="创建 Webhook 订阅" width="520px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="webhookForm.name" placeholder="如 notify-slack" /></el-form-item>
        <el-form-item label="目标 URL"><el-input v-model="webhookForm.target_url" placeholder="https://example.com/hook" /></el-form-item>
        <el-form-item label="签名密钥"><el-input v-model="webhookForm.secret" placeholder="HMAC 签名密钥（可选）" /></el-form-item>
        <el-form-item label="订阅事件">
          <el-select v-model="webhookForm.event_types" multiple style="width: 100%">
            <el-option v-for="e in eventOptions" :key="e.value" :label="e.label" :value="e.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="webhookDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="webhookLoading" @click="handleCreateWebhook">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.open-api { max-width: 1100px; }

.page-head { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }

.toolbar { display: flex; gap: 12px; margin-bottom: 14px; }

.scope-tag { margin-right: 6px; margin-bottom: 4px; }

.status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  &.active { background: rgba(16, 185, 129, 0.12); color: var(--accent-green); }
  &.revoked, &.disabled { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); }
}

.token-result { }
.token-result-title { font-size: 14px; font-weight: 500; margin-bottom: 12px; color: var(--accent-green); }
.token-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--border-base);
  border-radius: 8px;

  code { flex: 1; font-size: 12px; word-break: break-all; color: var(--accent-blue); font-family: var(--font-mono); }
}
</style>

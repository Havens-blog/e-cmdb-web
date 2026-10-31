<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    createTokenApi, listTokensApi, revokeTokenApi,
    createWebhookApi, listWebhooksApi, deleteWebhookApi, updateWebhookApi,
    type ApiToken, type Webhook,
} from '@/api/open-api'
import { Plus, Delete, DocumentCopy, RefreshRight, Edit } from '@element-plus/icons-vue'
import { formatTimestamp } from '@/utils/time'

const activeTab = ref<'tokens' | 'webhooks'>('tokens')

// ==================== Token ====================
const tokens = ref<ApiToken[]>([])
const tokenLoading = ref(false)
/**
 * 两个 tab 各自的加载失败文案（null = 无错误）。
 *
 * 本页两个 tab 数据独立（Token / Webhook），任一侧失败不应影响另一侧，
 * 故按 tab 分别维护错误态，而非整页错误态。
 */
const tokenError = ref<string | null>(null)
const webhookError = ref<string | null>(null)
const tokenDialogVisible = ref(false)
const tokenForm = ref({ name: '', ttl_days: 30, scopes: ['read', 'write'] })
const createdToken = ref('')

async function loadTokens() {
    tokenLoading.value = true
    tokenError.value = null
    try {
        const resp = await listTokensApi({ limit: 100 })
        tokens.value = resp.data.items
    } catch (e: any) {
        tokenError.value = 'Token 列表加载失败'
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
/**
 * 编辑中的 Webhook id；为空表示「创建」模式。
 *
 * 背景：后端已有 PUT /webhooks/:id，前端 api/open-api.ts 也已封装
 * updateWebhookApi，但页面此前只有「创建/删除」两个入口，
 * 导致用户创建订阅后无法修改（只能删了重建）。
 */
const editingWebhookId = ref<number | null>(null)
const webhookForm = ref({ name: '', target_url: '', secret: '', event_types: ['instance.created', 'instance.updated', 'instance.deleted'] })

const isEditingWebhook = computed(() => editingWebhookId.value !== null)

const eventOptions = [
    { value: 'instance.created', label: '实例创建' },
    { value: 'instance.updated', label: '实例更新' },
    { value: 'instance.deleted', label: '实例删除' },
    { value: 'relation.created', label: '关系创建' },
    { value: 'relation.deleted', label: '关系删除' },
]

async function loadWebhooks() {
    webhookLoading.value = true
    webhookError.value = null
    try {
        const resp = await listWebhooksApi({ limit: 100 })
        webhooks.value = resp.data.items
    } catch (e: any) {
        webhookError.value = 'Webhook 列表加载失败'
        ElMessage.error(e?.message || '加载 Webhook 失败')
    } finally {
        webhookLoading.value = false
    }
}

/** 打开「创建」对话框：清空表单与编辑态 */
function openCreateWebhook() {
    editingWebhookId.value = null
    webhookForm.value = {
        name: '',
        target_url: '',
        secret: '',
        event_types: ['instance.created', 'instance.updated', 'instance.deleted'],
    }
    webhookDialogVisible.value = true
}

/**
 * 打开「编辑」对话框：回填现有值。
 *
 * secret 不回填：列表接口不返回密钥明文，留空表示「不修改密钥」，
 * 提交时不传该字段（避免把空字符串写成密钥）。
 */
function openEditWebhook(w: Webhook) {
    editingWebhookId.value = w.id
    webhookForm.value = {
        name: w.name || '',
        target_url: w.target_url || '',
        secret: '',
        event_types: [...(w.event_types || [])],
    }
    webhookDialogVisible.value = true
}

async function handleCreateWebhook() {
    try {
        if (editingWebhookId.value !== null) {
            const payload: Record<string, unknown> = {
                name: webhookForm.value.name,
                target_url: webhookForm.value.target_url,
                event_types: webhookForm.value.event_types,
            }
            // 仅在用户填写了新密钥时才提交 secret，避免覆盖为空
            if (webhookForm.value.secret) payload.secret = webhookForm.value.secret
            await updateWebhookApi(editingWebhookId.value, payload)
            ElMessage.success('已更新订阅')
        } else {
            await createWebhookApi({ ...webhookForm.value })
            ElMessage.success('已创建订阅')
        }
        webhookDialogVisible.value = false
        editingWebhookId.value = null
        await loadWebhooks()
    } catch (e: any) {
        ElMessage.error(e?.message || (editingWebhookId.value !== null ? '更新 Webhook 失败' : '创建 Webhook 失败'))
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

          <!-- 错误态优先于空态：加载失败时若只显示「暂无数据」，会误判为「真的没有 Token」 -->
          <template #empty>
            <div v-if="tokenError" class="api-empty-error" role="alert">
              <p class="api-error-title">{{ tokenError }}</p>
              <p class="api-error-desc">请稍后重试；若持续失败请联系管理员</p>
              <el-button size="small" @click="loadTokens">重试</el-button>
            </div>
            <div v-else class="api-empty-normal">暂无 API Token</div>
          </template>
        </el-table>
      </el-tab-pane>

      <!-- ==================== Webhook ==================== -->
      <el-tab-pane label="Webhook 订阅" name="webhooks">
        <div class="toolbar">
          <el-button type="primary" :icon="Plus" @click="openCreateWebhook">创建订阅</el-button>
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
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link :icon="Edit" @click="openEditWebhook(row)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="handleDeleteWebhook(row)">删除</el-button>
            </template>
          </el-table-column>

          <!-- 错误态优先于空态：与 Token tab 独立，一侧失败不影响另一侧 -->
          <template #empty>
            <div v-if="webhookError" class="api-empty-error" role="alert">
              <p class="api-error-title">{{ webhookError }}</p>
              <p class="api-error-desc">请稍后重试；若持续失败请联系管理员</p>
              <el-button size="small" @click="loadWebhooks">重试</el-button>
            </div>
            <div v-else class="api-empty-normal">暂无 Webhook 订阅</div>
          </template>
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
    <el-dialog v-model="webhookDialogVisible" :title="isEditingWebhook ? '编辑 Webhook 订阅' : '创建 Webhook 订阅'" width="520px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="webhookForm.name" placeholder="如 notify-slack" /></el-form-item>
        <el-form-item label="目标 URL"><el-input v-model="webhookForm.target_url" placeholder="https://example.com/hook" /></el-form-item>
        <el-form-item label="签名密钥">
          <el-input
            v-model="webhookForm.secret"
            :placeholder="isEditingWebhook ? '留空表示不修改现有密钥' : 'HMAC 签名密钥（可选）'"
          />
        </el-form-item>
        <el-form-item label="订阅事件">
          <el-select v-model="webhookForm.event_types" multiple style="width: 100%">
            <el-option v-for="e in eventOptions" :key="e.value" :label="e.label" :value="e.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="webhookDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="webhookLoading" @click="handleCreateWebhook">{{ isEditingWebhook ? '保存' : '创建' }}</el-button>
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

/* 两个 tab 各自的错误态：与 models / relations / instances / dns / audit / quality 保持一致 */
.api-empty-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 12px;
}

.api-error-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-red, #f56c6c);
}

.api-error-desc {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-tertiary, #909399);
}

.api-empty-normal {
  padding: 28px 12px;
  font-size: 13px;
  color: var(--text-tertiary, #909399);
}</style>

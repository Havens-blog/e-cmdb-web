<template>
  <div class="instances-page">
    <!-- 读屏加载/结果播报（v-loading 无 live region） -->
    <LiveStatus :text="loading ? '正在加载资源实例…' : `共 ${pagination.total} 个资源实例`" />
    <!-- 页面头部：本页没有其它 h1，主标题用 h1（此前是 h2，导致整页无 h1） -->
    <ManagerHeader title="资源实例" subtitle="CMDB 资源实例管理" :title-level="1">
      <template #stats>
        <div class="stat-item">
          <span class="stat-label">总数</span>
          <span class="stat-value">{{ pagination.total }}</span>
        </div>
      </template>
      <template #actions>
        <el-button type="primary" size="small" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新建实例
        </el-button>
      </template>
    </ManagerHeader>

    <!-- 筛选器 -->
    <div class="filters">
      <div class="filters-left">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索名称/ID"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.asset_type"
          placeholder="资产类型"
          clearable
          style="width: 140px"
          @change="handleAssetTypeChange"
        >
          <el-option
            v-for="item in assetTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.provider"
          placeholder="云平台"
          clearable
          style="width: 120px"
          @change="handleSearch"
        >
          <el-option label="阿里云" value="aliyun" />
          <el-option label="腾讯云" value="tencent" />
          <el-option label="华为云" value="huawei" />
          <el-option label="AWS" value="aws" />
          <el-option label="火山引擎" value="volcengine" />
        </el-select>
        <el-select
          v-model="filters.region"
          placeholder="区域"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option
            v-for="region in regionOptions"
            :key="region"
            :label="region"
            :value="region"
          />
        </el-select>
        <el-tag
          v-if="filters.model_uid"
          closable
          type="warning"
          size="small"
          class="model-filter-tag"
          @close="handleClearModelFilter"
        >
          按模型过滤: {{ filters.model_uid }}
        </el-tag>
      </div>
      <div class="filters-right">
        <el-button size="small" circle @click="handleRefresh" title="刷新">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button size="small" circle @click="exportDialogVisible = true" title="导出">
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button size="small" circle @click="columnSettingsVisible = true" title="自定义列">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <el-table
        :data="instances"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        @sort-change="handleSortChange"
        :default-sort="defaultSort"
        row-key="id"
        style="width: 100%"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column
          prop="asset_name"
          label="名称"
          min-width="180"
          fixed="left"
          sortable="custom"
        >
          <template #default="{ row }">
            <span class="name-link" @click.stop="handleViewDetail(row)">
              {{ row.asset_name || row.asset_id || '-' }}
            </span>
          </template>
        </el-table-column>
        <!-- 动态列 -->
        <el-table-column
          v-for="col in visibleColumns"
          :key="col.key"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :sortable="isSortableColumn(col.key) ? 'custom' : false"
        >
          <template #default="{ row }">
            <!-- 资产类型 -->
            <template v-if="col.key === 'asset_type'">
              <el-tag size="small" :type="safeTagType(getAssetTypeTagType(row.model_uid))">
                {{ getAssetTypeLabel(row.model_uid) }}
              </el-tag>
            </template>
            <!-- 云平台 -->
            <template v-else-if="col.key === 'provider'">
              <div class="provider-cell">
                <IconFont :type="getProviderIcon(row.attributes?.provider)" :size="16" />
                <span>{{ getProviderLabel(row.attributes?.provider) }}</span>
              </div>
            </template>
            <!-- 区域 -->
            <template v-else-if="col.key === 'region'">
              {{ row.attributes?.region || '-' }}
            </template>
            <!-- 可用区 -->
            <template v-else-if="col.key === 'zone'">
              {{ row.attributes?.zone || '-' }}
            </template>
            <!-- 状态 -->
            <template v-else-if="col.key === 'status'">
              <span class="status-badge" :class="getStatusClass(row.attributes?.status)">
                {{ getStatusLabel(row.attributes?.status) }}
              </span>
            </template>
            <!-- 云账号 -->
            <template v-else-if="col.key === 'account'">
              {{ row.attributes?.cloud_account_name || '-' }}
            </template>
            <!-- 资产ID -->
            <template v-else-if="col.key === 'asset_id'">
              <span class="asset-id">{{ row.asset_id || '-' }}</span>
            </template>
            <!-- 创建时间 -->
            <template v-else-if="col.key === 'create_time'">
              {{ formatTime(row.attributes?.creation_time || row.create_time) }}
            </template>
            <!-- 更新时间 -->
            <template v-else-if="col.key === 'update_time'">
              {{ formatTime(row.update_time) }}
            </template>
            <!-- 标签 -->
            <template v-else-if="col.key === 'tags'">
              <span class="tags-text">{{ formatTags(row.attributes?.tags) }}</span>
            </template>
            <template v-else>-</template>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="primary" link size="small" @click.stop="handleViewDetail(row)">
              查看
            </el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <!--
          错误态优先于空态：加载失败时表格为空，若只显示默认「暂无数据」，
          用户会误以为「库里没有资产」，而不是「请求失败了」。
          与 service-tree / models / relations 的既有做法保持一致。
        -->
        <template #empty>
          <div v-if="loadError" class="table-empty-error" role="alert">
            <el-icon :size="36"><WarningFilled /></el-icon>
            <p class="empty-error-title">{{ loadError }}</p>
            <p class="empty-error-desc">请稍后重试；若持续失败请联系管理员</p>
            <el-button size="small" @click="fetchInstances">重试</el-button>
          </div>
          <div v-else class="table-empty-normal">暂无资产实例</div>
        </template>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :page-sizes="[20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <!--
      窄屏修复（实测 2026-11-01，390×844 视口）：
      原实现 `width="600px"` 固定宽度，在 390px 手机屏上对话框宽 600px、
      左右越界 210px；叠加「按模型定义渲染字段」后表单增至 22 个字段，
      内容高 2860px，而主体 overflow 为 visible（不可滚动），
      「确定」按钮位于 2812px 处 —— **完全在视口外且无法滚动到**，
      窄屏下编辑功能实际不可用。
      修复：宽度自适应视口 + 限制最大高度 + 主体内部滚动，
      保证页脚按钮始终可达（对话框关闭按钮与底部按钮都不再被挤出屏幕）。
    -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑实例' : '新建实例'"
      width="min(600px, 92vw)"
      top="6vh"
      class="instance-form-dialog"
      :close-on-click-modal="false"
    >
      <InstanceForm ref="formRef" :instance="currentInstance" :is-edit="isEdit" :models="modelOptions" />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导出对话框 -->
    <AssetExportDialog
      v-model:visible="exportDialogVisible"
      :instances="instances"
      :selected-ids="selectedIds"
      :total="pagination.total"
      :fetch-all-rows="fetchAllExportRows"
      :config="exportConfig"
    />

    <!-- 自定义列对话框 -->
    <ColumnSettingsDialog
      v-model:visible="columnSettingsVisible"
      :columns="columnSettings"
      @update:columns="handleColumnSettingsChange"
    />
  </div>
</template>

<script setup lang="ts">
import { deleteCmdbInstanceApi, listCmdbInstancesApi, listCmdbModelsApi } from '@/api'
import type { InstanceVO, ModelVO } from '@/api/types/cmdb'
import { AssetExportDialog, type ExportFieldConfig } from '@haven/ui/AssetExportDialog'
import { IconFont } from '@haven/ui/IconFont'
import { ManagerHeader } from '@haven/ui/ManagerHeader'
import { safeTagType, getProviderLabel as getProviderLabelRaw, getProviderLabel as getProviderLabelShared } from '@/utils/constants'
import { fetchAllRows } from '@/utils/exportAll'
import { formatTimestamp } from '@/utils/time'
import { resolveAssetTypeKey, resolveAssetTypeLabel } from '@/utils/assetType'
import { buildInstanceListParams } from '@/utils/instanceQuery'
import { Download, Plus, Refresh, Search, Setting, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ColumnSettingsDialog, { type ColumnConfig } from './components/ColumnSettingsDialog.vue'
import InstanceForm from './components/InstanceForm.vue'

const route = useRoute()
// 用于把筛选/排序/分页同步到 URL（router.replace，不新增历史记录）
const router = useRouter()

// 资产类型映射 - 用于跳转到对应详情页
const assetTypeRouteMap: Record<string, { label: string; icon: string; route: string; tagType: string }> = {
  ecs: { label: '云服务器', icon: 'caise-computer', route: '/compute/ecs', tagType: '' },
  rds: { label: 'RDS', icon: 'caise-database', route: '/databases/rds', tagType: 'success' },
  redis: { label: 'Redis', icon: 'caise-database', route: '/databases/redis', tagType: 'danger' },
  mongodb: { label: 'MongoDB', icon: 'caise-database', route: '/databases/mongodb', tagType: 'success' },
  vpc: { label: 'VPC', icon: 'caise-network_devices', route: '/network/vpc', tagType: 'info' },
  eip: { label: '弹性公网IP', icon: 'caise-network_devices', route: '/network/eip', tagType: 'info' },
  nas: { label: '文件存储', icon: 'caise-storage_device', route: '/storage/nas', tagType: 'warning' },
  oss: { label: '对象存储', icon: 'caise-storage_device', route: '/storage/oss', tagType: 'warning' },
  kafka: { label: 'Kafka', icon: 'caise-middleware', route: '/middleware/kafka', tagType: '' },
  elasticsearch: { label: 'Elasticsearch', icon: 'caise-middleware', route: '/middleware/elasticsearch', tagType: '' },
}

// 资产类型中文名映射（仅用于展示友好名，不再是筛选选项的唯一来源）
// 历史问题：此处原为硬编码的 10 项数组，与后端模型表（80 个）和实例实际的
// model_uid 脱节。实测存在 10 个 model_uid（volcengine_vswitch 291 条、
// aliyun_lb 184 条、aws_vswitch 136 条等，共约 976 条实例）不在硬编码列表内，
// 导致用户在「资源实例」页无法通过模型下拉筛选到这些数据（虽然直接改 URL 可查）。
const ASSET_TYPE_LABELS: Record<string, string> = {
  ecs: '云服务器',
  rds: 'RDS',
  redis: 'Redis',
  mongodb: 'MongoDB',
  vpc: 'VPC',
  eip: '弹性公网IP',
  nas: '文件存储',
  oss: '对象存储',
  kafka: 'Kafka',
  elasticsearch: 'Elasticsearch',
}

// 状态
const loading = ref(false)
/** 列表加载失败时的持久错误文案（null 表示无错误） */
const loadError = ref<string | null>(null)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const currentInstance = ref<InstanceVO | null>(null)
const selectedIds = ref<number[]>([])
const exportDialogVisible = ref(false)
const columnSettingsVisible = ref(false)

// 数据
const instances = ref<InstanceVO[]>([])
const modelOptions = ref<ModelVO[]>([])
const regionOptions = ref<string[]>([])


// 筛选条件
const filters = reactive({
  keyword: '',
  asset_type: '',
  provider: '',
  region: '',
  model_uid: '',
})

// 资产类型下拉选项：由后端模型列表动态生成（替代原硬编码列表）。
// 说明：模型表 80 项、实例实际出现的 model_uid 可能更多（含历史/未注册模型），
// 两者取并集才能保证「有数据的类型都可筛选」。
const assetTypeOptions = computed(() => {
  const seen = new Set<string>()
  const opts: Array<{ label: string; value: string }> = []
  for (const m of modelOptions.value) {
    const uid = (m as any).uid
    if (!uid || seen.has(uid)) continue
    seen.add(uid)
    opts.push({ label: ASSET_TYPE_LABELS[uid] || (m as any).name || uid, value: uid })
  }
  // 兜底：已选中但不在模型表中的 uid（例如直接带 URL 参数进入），仍需可回显
  if (filters.model_uid && !seen.has(filters.model_uid)) {
    const uid = filters.model_uid
    opts.push({ label: ASSET_TYPE_LABELS[uid] || `${uid}（未注册模型）`, value: uid })
  }
  return opts
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0,
})

// 列配置
const defaultColumnSettings: ColumnConfig[] = [
  { key: 'asset_type', label: '资产类型', width: 110, visible: true },
  { key: 'provider', label: '云平台', width: 100, visible: true },
  { key: 'region', label: '区域', width: 120, visible: true },
  { key: 'status', label: '状态', width: 90, visible: true },
  { key: 'asset_id', label: '资产ID', width: 200, visible: true },
  { key: 'account', label: '云账号', width: 120, visible: false },
  { key: 'zone', label: '可用区', width: 120, visible: false },
  { key: 'create_time', label: '创建时间', width: 160, visible: true },
  { key: 'update_time', label: '更新时间', width: 160, visible: false },
  { key: 'tags', label: '标签', width: 150, visible: false },
]

const columnSettings = ref<ColumnConfig[]>([])
const visibleColumns = computed(() => columnSettings.value.filter(c => c.visible))

// 初始化列配置
const initColumnSettings = () => {
  const saved = localStorage.getItem('cmdb-instances-column-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        columnSettings.value = parsed
        return
      }
    } catch (e) {
      console.error('解析列设置失败:', e)
    }
  }
  columnSettings.value = JSON.parse(JSON.stringify(defaultColumnSettings))
}

const handleColumnSettingsChange = (columns: ColumnConfig[]) => {
  columnSettings.value = columns
}

// 获取资产类型标签
//
// 修复：原实现用 `uid.split('_')[0]` 查 10 项 assetTypeRouteMap，
// 实测 80 个模型中 70 个（88%）匹配不到，列表「资产类型」列会显示
// 英文原文或被截断的前缀（cdn→"cdn"、snapshot→"snapshot"、
// security_group→"security"、lb→"lb"）。
// 现改为复用 utils/assetType 的公共解析（优先后端模型表中文名，
// 未注册模型再回退），与导出「资产类型」列保持同一口径。
const getAssetTypeLabel = (uid: string) => {
  const label = resolveAssetTypeLabel(uid, modelOptions.value)
  return label || '-'
}

// 标签配色仍按模型前缀推断（仅影响 el-tag 的 type，不影响文案）
const getAssetTypeTagType = (uid: string) => {
  const type = uid?.split('_')[0] || uid
  return assetTypeRouteMap[type]?.tagType || ''
}

// 获取云平台图标和标签
const getProviderIcon = (provider: string) => {
  const iconMap: Record<string, string> = {
    aliyun: 'caise-aliyun',
    tencent: 'caise-tengxunyun',
    huawei: 'caise-huaweiyun',
    aws: 'caise-aws',
    volcengine: 'caise-huoshanyinqing',
  }
  return iconMap[provider] || 'caise-public_cloud'
}

/** 云厂商展示名统一走 utils/constants 单源（含 volcengine/bytedance 等变体归一） */
const getProviderLabel = (provider: string) => (provider ? getProviderLabelShared(provider) : '-')

// 获取状态样式和标签
const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    running: 'status-running',
    Running: 'status-running',
    available: 'status-running',
    Available: 'status-running',
    active: 'status-running',
    stopped: 'status-stopped',
    Stopped: 'status-stopped',
    pending: 'status-pending',
    Pending: 'status-pending',
    creating: 'status-pending',
    error: 'status-error',
    Error: 'status-error',
  }
  return classMap[status] || 'status-default'
}

const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    running: '运行中',
    Running: '运行中',
    available: '可用',
    Available: '可用',
    active: '活跃',
    stopped: '已停止',
    Stopped: '已停止',
    pending: '创建中',
    Pending: '创建中',
    creating: '创建中',
    error: '异常',
    Error: '异常',
  }
  return labelMap[status] || status || '-'
}

// 格式化时间（毫秒时间戳；create_time/update_time 均为 Unix 毫秒，勿再 ×1000）
const formatTime = (time: number | string | undefined) => formatTimestamp(time)

// 格式化标签
const formatTags = (tags: Record<string, string> | undefined) => {
  if (!tags || typeof tags !== 'object') return '-'
  const entries = Object.entries(tags)
  if (entries.length === 0) return '-'
  return entries.slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ') + (entries.length > 3 ? '...' : '')
}

/** 组装列表查询参数（列表分页与导出全量拉取共用，保证筛选口径一致）
 *
 * 逻辑抽到 @/utils/instanceQuery（含单测）。修复点：资产类型下拉（asset_type）
 * 优先于 URL 带入的 model_uid —— 原实现相反，导致「带 ?model_uid=xxx 进入后
 * 在下拉里改选类型，筛选完全不生效」（实测请求仍是旧 model_uid）。
 */
/**
 * 排序状态（列头排序）。
 *
 * 背景（实测 2026-11-01）：实例列表此前**完全不支持排序** ——
 * 表格没有可排序列，后端也硬编码按 ctime 倒序。
 * 用户无法按名称/状态/区域等排序，只能翻页手工找。
 *
 * 本实现把列头的 sortable="custom" 映射到后端的 `sort_by` + `order` 参数；
 * 后端有白名单校验，非法字段会回退默认排序，不会造成扫表或注入。
 */
const sortState = ref<{ by: string; desc: boolean } | null>(null)

/**
 * 列 key → 后端可排序字段的映射。
 *
 * 只映射后端白名单内的字段（见 e-cmdb-service dao.sortableFields），
 * 不在表内的列不显示排序箭头，避免点了没反应。
 */
const SORTABLE_COLUMN_MAP: Record<string, string> = {
  asset_name: 'asset_name',
  asset_id: 'asset_id',
  model_uid: 'model_uid',
  account_id: 'account_id',
  creation_time: 'ctime',
  update_time: 'utime',
  provider: 'attributes.provider',
  region: 'attributes.region',
  status: 'attributes.status',
  zone: 'attributes.zone',
  os_type: 'attributes.os_type',
}

const REVERSE_SORT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SORTABLE_COLUMN_MAP).map(([k, v]) => [v, k]),
)
const isSortableColumn = (key: string): boolean => Boolean(SORTABLE_COLUMN_MAP[key])

/**
 * 把 sortState 反映到表格列头的排序视觉状态。
 *
 * 缺陷修复（实测 2026-11-01）：从 URL 恢复排序后，**数据确实按 sort 排序了，
 * 但列头不显示排序箭头** —— 因为 `default-sort` 只在表格初始化时生效，
 * 而 el-table 挂载时 sortState 还没恢复（同一 tick 内恢复 + 渲染的时序）。
 * 改用响应式 computed，恢复完成后列头自动同步出箭头。
 */
const defaultSort = computed(() => {
  if (!sortState.value) return undefined
  const colKey = REVERSE_SORT_MAP[sortState.value.by]
  if (!colKey) return undefined
  return { prop: colKey, order: sortState.value.desc ? 'descending' : 'ascending' } as const
})

/** el-table 的 sort-change 回调：prop 为列 key，order 为 'ascending' | 'descending' | null */
const handleSortChange = ({ prop, order }: { prop: string | null; order: string | null }) => {
  const field = prop ? SORTABLE_COLUMN_MAP[prop] : undefined
  if (!field || !order) {
    // 取消排序 → 回到后端默认（ctime 倒序）
    sortState.value = null
  } else {
    sortState.value = { by: field, desc: order === 'descending' }
  }
  pagination.page = 1
  fetchInstances()
}

const buildListParams = (page: number, size: number): Record<string, any> => {
  const params = buildInstanceListParams(filters, page, size)
  if (sortState.value) {
    params.sort_by = sortState.value.by
    params.order = sortState.value.desc ? 'desc' : 'asc'
  }
  return params
}

/**
 * 把筛选 / 排序 / 分页同步到 URL query。
 *
 * 缺陷修复（实测 2026-11-01）：此前只有 `model_uid` 会从 URL 读取，
 * 其余筛选与排序**完全不落 URL**。实测：设置「云平台=阿里云」（31 条）+ 名称升序，
 * 刷新后变回全量 33025 条、排序箭头消失 —— 用户精心筛好的视图一次刷新即归零，
 * 也无法把该视图的链接分享给同事。
 *
 * 设计：
 * - 用 `router.replace` 而非 push，避免每改一次筛选就往历史栈塞一条
 * - 只写非空值，URL 保持干净（默认状态不产生任何 query）
 * - 排序的反向映射复用 SORTABLE_COLUMN_MAP，保证 URL 里存的是**列 key**（可读、稳定），
 *   而不是 `attributes.provider` 这种后端字段名
 */


/** 将当前 UI 状态写入 URL（仅替换 query，不新增历史记录） */
const syncStateToUrl = () => {
  const q: Record<string, string> = {}
  if (filters.model_uid) q.model_uid = filters.model_uid
  if (filters.keyword) q.keyword = filters.keyword
  if (filters.provider) q.provider = filters.provider
  if (filters.region) q.region = filters.region
  if (sortState.value) {
    const colKey = REVERSE_SORT_MAP[sortState.value.by]
    if (colKey) {
      q.sort = colKey
      q.order = sortState.value.desc ? 'desc' : 'asc'
    }
  }
  if (pagination.size !== 20) q.size = String(pagination.size)
  if (pagination.page > 1) q.page = String(pagination.page)

  // 保留租户等非本页管理的 query
  const merged: Record<string, any> = { ...route.query }
  for (const k of ['model_uid', 'keyword', 'provider', 'region', 'sort', 'order', 'size', 'page']) {
    delete merged[k]
  }
  Object.assign(merged, q)

  const before = new URLSearchParams(
    Object.entries(route.query).map(([k, v]) => [k, String(v ?? '')]),
  ).toString()
  const after = new URLSearchParams(
    Object.entries(merged).map(([k, v]) => [k, String(v ?? '')]),
  ).toString()
  if (before !== after) {
    void router.replace({ query: merged })
  }
}

/** 从 URL query 恢复 UI 状态（在首次请求之前调用） */
const restoreStateFromUrl = () => {
  const q = route.query
  const str = (v: unknown) => (typeof v === 'string' ? v : '')

  if (str(q.model_uid)) filters.model_uid = str(q.model_uid)
  if (str(q.keyword)) filters.keyword = str(q.keyword)
  if (str(q.provider)) filters.provider = str(q.provider)
  if (str(q.region)) filters.region = str(q.region)

  const sortCol = str(q.sort)
  const sortField = sortCol ? SORTABLE_COLUMN_MAP[sortCol] : undefined
  if (sortField) {
    sortState.value = { by: sortField, desc: str(q.order) === 'desc' }
  }

  const size = Number(str(q.size))
  if (Number.isFinite(size) && [20, 50, 100].includes(size)) pagination.size = size
  const page = Number(str(q.page))
  if (Number.isFinite(page) && page > 0) pagination.page = page
}

// 加载数据
const fetchInstances = async () => {
  loading.value = true
  loadError.value = null
  try {
    const res = await listCmdbInstancesApi(buildListParams(pagination.page, pagination.size))
    const data = res.data?.data || res.data
    instances.value = data?.instances || []
    pagination.total = data?.total || 0

    // 提取区域选项
    const regions = new Set<string>()
    instances.value.forEach(item => {
      if (item.attributes?.region) regions.add(item.attributes.region)
    })
    regionOptions.value = Array.from(regions).sort()

    // 列表加载成功后把当前筛选/排序/分页同步到 URL，供刷新与分享复用
    syncStateToUrl()
  } catch (error) {
    console.error('加载实例列表失败:', error)
    // 持久错误态：仅靠 ElMessage 的话，toast 几秒后消失，
    // 页面只剩「暂无数据」空表格，用户无法区分「加载失败」与「真的没有资产」。
    // 这与 service-tree / models / relations 的既有做法保持一致。
    loadError.value = '资产实例加载失败'
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 加载模型列表
const fetchModels = async () => {
  try {
    const res = await listCmdbModelsApi({ limit: 100 })
    // 请求层已解包外层信封（res.data 即 { models, total }），与列表接口同口径做兼容取值，
    // 原写法 res.data?.data?.models 多取一层，恒为 undefined，导致「新建实例」模型下拉为空。
    const data = res.data?.data || res.data
    modelOptions.value = data?.models || []
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败')
  }
}

/** 导出「全部数据」：按当前筛选分页拉取全量（cmdb H-04），供 ExportDialog 调用 */
const fetchAllExportRows = async (onProgress?: (fetched: number, total: number) => void): Promise<InstanceVO[]> =>
  fetchAllRows<InstanceVO>(async (page, pageSize) => {
    const res = await listCmdbInstancesApi(buildListParams(page, pageSize))
    const data = res.data?.data || res.data
    return { list: data?.instances || [], total: data?.total || 0 }
  }, { onProgress })

/** 导出配置：字段/取值逐字自原 components/ExportDialog.vue 迁移（零漂移） */
const exportConfig: ExportFieldConfig<InstanceVO> = {
  fields: [
    { key: 'asset_id', label: '资产ID' },
    { key: 'asset_name', label: '名称' },
    { key: 'uid', label: '资产类型' },
    { key: 'provider', label: '云平台' },
    { key: 'region', label: '区域' },
    { key: 'zone', label: '可用区' },
    { key: 'status', label: '状态' },
    { key: 'cloud_account_name', label: '云账号' },
    { key: 'creation_time', label: '创建时间' },
    { key: 'tags', label: '标签' },
  ],
  getValue: (instance: InstanceVO, key: string): string => {
    if (key === 'asset_id' || key === 'asset_name') {
      return instance[key] || ''
    }
    if (key === 'uid') {
      // 资产类型解析抽到 @/utils/assetType（含单测），避免再次出现
      // 「取 uid 前缀 + 10 项硬编码表」导致 88% 模型显示错误的问题。
      return resolveAssetTypeLabel(instance.model_uid, modelOptions.value)
    }
    const attr = instance.attributes || {}
    if (key === 'status') {
      const map: Record<string, string> = {
        running: '运行中', Running: '运行中', RUNNING: '运行中',
        stopped: '已停止', Stopped: '已停止', STOPPED: '已停止',
        available: '可用', Available: '可用',
        pending: '创建中', Pending: '创建中',
        error: '异常', Error: '异常'
      }
      return map[attr.status] || attr.status || ''
    }
    if (key === 'provider') return getProviderLabelRaw(attr.provider || '')
    if (key === 'tags') {
      const tags = attr.tags
      if (tags && typeof tags === 'object') {
        return Object.entries(tags).map(([k, v]) => `${k}:${v}`).join('; ')
      }
      return ''
    }
    if (key === 'creation_time') {
      const time = attr.creation_time || instance.create_time
      if (!time) return ''
      return formatTimestamp(time, true)
    }
    return attr[key] || ''
  },
  filename: '资源实例列表',
  defaultFields: ['asset_id', 'asset_name', 'uid', 'provider', 'region', 'status'],
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchInstances()
}

// 清除模型过滤标签，回到全量列表
const handleClearModelFilter = () => {
  filters.model_uid = ''
  handleSearch()
}

/**
 * 资产类型下拉变更。
 *
 * 资产类型与「按模型过滤」共用后端 model_uid 参数，且资产类型优先
 * （见 utils/instanceQuery 的 buildInstanceListParams）。因此用户一旦显式选了
 * 资产类型，就应清掉 URL 带入的 model_uid；否则页面会残留
 * 「按模型过滤: <旧值>」标签，与实际列表内容不符（实测存在）。
 */
const handleAssetTypeChange = () => {
  if (filters.asset_type && filters.model_uid) {
    filters.model_uid = ''
  }
  handleSearch()
}

// 刷新
const handleRefresh = () => {
  fetchInstances()
}

// 分页
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  fetchInstances()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchInstances()
}

// 选择
const handleSelectionChange = (selection: InstanceVO[]) => {
  selectedIds.value = selection.map(item => item.id)
}

// 行点击
const handleRowClick = (row: InstanceVO) => {
  handleViewDetail(row)
}

// 查看详情 - 跳转到对应类型的详情页
const handleViewDetail = (row: InstanceVO) => {
  // 路由匹配仍按模型前缀推断（e-cam-web 详情页只覆盖少数基础类型）；
  // 但提示文案改用与列表一致的中文模型名，避免同一页面出现
  // 「列表显示快照、点查看提示 snapshot」的不一致（实测存在）。
  //
  // 修复（实测 2026-10-31，采样 200 条实例）：原实现用
  // `model_uid.split('_')[0]` 取类型键，对带厂商前缀的 uid 会取到厂商名：
  //   aws_eip → "aws"、volcengine_ecs → "volcengine"、aliyun_snapshot → "aliyun"
  // 结果 200 条里「可查看 0 条、不可查看 200 条」，几乎全部只弹「暂不支持查看」。
  // 现改用 resolveAssetTypeKey（先剥离厂商前缀再取资源类型）。
  const assetType = resolveAssetTypeKey(row.model_uid, Object.keys(assetTypeRouteMap))
  const routeInfo = assetTypeRouteMap[assetType]

  if (routeInfo) {
    // 资产详情页在 e-cam-web（nginx /cam/ 前缀）——跨应用新窗口打开并带搜索
    // 参数定位实例；SPA 内 router.push 会命中 CMDB 的 catch-all（跳仪表盘）
    const search = encodeURIComponent(row.asset_name || row.asset_id || '')
    window.open(`/cam${routeInfo.route}?search=${search}`, '_blank')
  } else {
    const label = resolveAssetTypeLabel(row.model_uid, modelOptions.value) || assetType
    ElMessage.warning(`暂不支持查看「${label}」类型的详情`)
  }
}

// 新建
const handleAdd = () => {
  isEdit.value = false
  currentInstance.value = null
  dialogVisible.value = true
}

/**
 * 编辑既有实例。
 *
 * 缺陷修复（实测 2026-11-01）：
 * 此前 `isEdit.value = true` 在整个文件里**从未出现**，
 * `currentInstance` 也只在新建时被置为 null。
 * 即 InstanceForm 里完整的「编辑实例」逻辑（含 `updateCmdbInstanceApi` 调用、
 * 「编辑实例」标题、「更新成功」提示）**没有任何入口能触发** ——
 * 用户能新建、能删除，唯独不能修改已录入的实例。
 *
 * 后端 `PUT /cmdb/instances/:id` 与表单的更新逻辑都是现成的，
 * 本函数只是把断掉的入口接回去，不改变任何更新语义。
 */
const handleEdit = (row: InstanceVO) => {
  isEdit.value = true
  currentInstance.value = row
  dialogVisible.value = true
}

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    await formRef.value.submit()
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    fetchInstances()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 删除
const handleDelete = async (row: InstanceVO) => {
  try {
    await ElMessageBox.confirm(`确定要删除实例 "${row.asset_name || row.asset_id}" 吗？`, '删除确认', {
      type: 'warning',
    })
    await deleteCmdbInstanceApi(row.id)
    ElMessage.success('删除成功')
    fetchInstances()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 初始化
onMounted(() => {
  initColumnSettings()
  // H-02：必须在首次 fetch 前读取路由 query，避免先全量后过滤的二次请求
  // 这里一次性恢复筛选 / 排序 / 分页（此前只恢复 model_uid，其余刷新即丢）
  restoreStateFromUrl()
  fetchInstances()
  fetchModels()
})
</script>

<style lang="scss" scoped>
.instances-page {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filters {
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .filters-left {
    display: flex;
    gap: 12px;
    flex: 1;
  }

  .model-filter-tag {
    align-self: center;
  }

  .filters-right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.table-container {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;

  :deep(.el-table) {
    background: transparent;
    
    th.el-table__cell {
      background: var(--table-header-bg);
    }
    
    tr {
      cursor: pointer;
      
      &:hover > td.el-table__cell {
        background: var(--table-row-hover-bg);
      }
    }
  }
}

.name-link {
  /* --el-color-primary(#5e6ad2) 在深色底上仅 4.05:1（AA 需 4.5）→ 与白混 65% 提亮，保留色相 */
  color: color-mix(in srgb, var(--el-color-primary) 65%, #fff);
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
}

.provider-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.asset-id {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  
  &.status-running {
    background: rgba(103, 194, 58, 0.1);
    color: var(--el-color-success);
  }
  
  &.status-stopped {
    background: rgba(144, 147, 153, 0.1);
    /* tertiary 在淡灰底上仅 2.9:1（AA 需 4.5）→ 次文字色 */
    color: var(--text-secondary);
  }
  
  &.status-pending {
    background: rgba(230, 162, 60, 0.1);
    color: var(--el-color-warning);
  }
  
  &.status-error {
    background: rgba(245, 108, 108, 0.1);
    color: var(--el-color-danger);
  }
  
  &.status-default {
    background: rgba(144, 147, 153, 0.1);
    /* tertiary 在淡灰底上仅 2.9:1（AA 需 4.5）→ 次文字色 */
    color: var(--text-secondary);
  }
}

.tags-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pagination-container {
  padding: 16px;
  display: flex;
  justify-content: flex-end;

  /* 分页当前页：白字在 --el-color-primary 上仅 3.84:1 → 压暗填充 */
  :deep(.el-pager li.is-active) {
    background: color-mix(in srgb, var(--el-color-primary) 82%, #000);
  }
}

/* 行内「查看」是 el-button--primary 的 link 形态：文字取 --el-color-primary 仅 4.05:1
   （放在顶层，因为按钮在表格单元格里，不在 .pagination-container 内） */
:deep(.el-button--primary.is-link),
:deep(.el-button--primary.is-text) {
  color: color-mix(in srgb, var(--el-color-primary) 65%, #fff);
}

/* 筛选区 el-select 的占位「资产类型」：muted 仅 2.09:1
   （需连 .is-transparent 一起写：EP 的 `.el-select__placeholder.is-transparent` 与本规则同优先级，
     且 EP 样式后加载，会覆盖；提高特异性才能稳定生效） */
.filters :deep(.el-select .el-select__placeholder.is-transparent) {
  color: var(--text-secondary);
}

/* 表格空态：错误态（可重试）与正常空态区分展示 */
.table-empty-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 16px;
  color: var(--text-secondary, #909399);
}

.empty-error-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-red, #f56c6c);
}

.empty-error-desc {
  margin: 0 0 6px;
  font-size: 12px;
}

.table-empty-normal {
  padding: 28px 16px;
  font-size: 13px;
  color: var(--text-tertiary, #909399);
}
/* 实例表单对话框：内容高（最多 22 个模型字段），需主体内部滚动且页脚常驻可达 */
/*
 * 实例表单对话框：限高 + 主体内部滚动。
 *
 * 踩坑记录（实测 2026-11-01）：
 *  - 只给 .el-dialog 设 max-height 无效 —— 子元素不会自动获得滚动条，
 *    实测 footer 仍被推到 2719px；
 *  - `:deep()` 也无效 —— el-dialog 的根元素**不继承父组件的 scoped 属性**
 *    （实测 .instance-form-dialog 只有 class/tabindex/style，没有 data-v-xxx），
 *    因此 `.instance-form-dialog[data-v-xxx] .el-dialog__body` 永不匹配。
 * 故用独立的非 scoped 样式块，靠 class 名限定作用域。
 */
/* 窄屏额外收窄内边距，给输入框留出更多宽度 */
@media (max-width: 560px) {
  .instance-form-dialog {
    :deep(.el-dialog__header) {
      padding: 14px 16px 8px;
    }
    :deep(.el-dialog__body) {
      padding: 8px 16px;
    }
    :deep(.el-dialog__footer) {
      padding: 10px 16px 14px;
    }
  }
}
</style>

<!--
  实例表单对话框的限高与滚动：必须放在**非 scoped** 样式块中。
  el-dialog 的根元素不继承父组件的 scoped 属性，scoped 规则无法命中其内部节点
  （实测 .instance-form-dialog 上只有 class/tabindex/style，没有 data-v-xxx）。
  作用域由 .instance-form-dialog 这个专属 class 保证。
-->
<style lang="scss">
.instance-form-dialog {
  margin-top: 6vh;
  margin-bottom: 6vh;

  .el-dialog__body {
    /* 减去标题栏与页脚高度，保证页脚按钮留在视口内 */
    max-height: calc(88vh - 150px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .el-dialog__footer {
    border-top: 1px solid var(--border-subtle);
    padding-top: 12px;
  }
}
</style>
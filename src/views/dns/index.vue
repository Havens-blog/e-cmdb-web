<script setup lang="ts">
/**
 * DNS 解析记录管理
 *
 * 背景：后端 internal/cam/dns/handler.go 提供 7 个接口
 *（domains / records CRUD / batch-delete / search / stats），
 * 前端 src/api/dns.ts 的 8 个方法也已就绪，但**一直没有任何页面入口**，
 * 导致 73 个域名 / 4246 条解析记录在界面上完全不可见、不可管理。
 *
 * 本页补齐该缺口：域名列表 → 选中域名 → 查看/搜索/筛选其解析记录。
 * 本轮只做「只读浏览 + 筛选 + 搜索」，不包含增删改（见需求卡的非目标）。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import {
    getDnsDomainsApi,
    getDnsRecordsApi,
    getDnsStatsApi,
    searchDnsRecordsApi,
} from '@/api/dns'
import type { DnsDomain, DnsRecord, DnsStats } from '@/api/types/dns'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'

const PROVIDER_LABELS: Record<string, string> = {
    aliyun: '阿里云',
    tencent: '腾讯云',
    huawei: '华为云',
    aws: 'AWS',
}

const RECORD_TYPE_OPTIONS = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA']

// 域名列表
const domains = ref<DnsDomain[]>([])
const domainsLoading = ref(false)
const domainTotal = ref(0)
const domainQuery = reactive({ keyword: '', provider: '', offset: 0, limit: 50 })

// 统计
const stats = ref<DnsStats | null>(null)

// 当前选中域名及其记录
const activeDomain = ref('')
const records = ref<DnsRecord[]>([])
const recordsLoading = ref(false)
const recordTotal = ref(0)
const recordQuery = reactive({
    keyword: '',
    record_type: '',
    offset: 0,
    limit: 50,
})

// 全局搜索模式（跨域名搜索记录）
const globalSearchMode = ref(false)
const globalSearchKeyword = ref('')

const providerOptions = computed(() =>
    Object.entries(stats.value?.provider_distribution || {}).map(([key, count]) => ({
        value: key,
        label: `${PROVIDER_LABELS[key] || key} (${count})`,
    }))
)

const getProviderLabel = (p: string) => PROVIDER_LABELS[p] || p || '-'

async function loadStats() {
    try {
        const resp = await getDnsStatsApi()
        stats.value = (resp.data as any)?.data || resp.data
    } catch {
        // 统计失败不阻塞主流程
        stats.value = null
    }
}

async function loadDomains() {
    domainsLoading.value = true
    try {
        const resp = await getDnsDomainsApi({
            keyword: domainQuery.keyword || undefined,
            provider: domainQuery.provider || undefined,
            offset: domainQuery.offset,
            limit: domainQuery.limit,
        })
        const data = (resp.data as any)?.data || resp.data
        domains.value = data?.items || []
        domainTotal.value = data?.total || 0
        // 首次加载自动选中第一个域名，避免右侧空白
        const first = domains.value[0]
        if (!activeDomain.value && first) {
            await selectDomain(first.domain_name)
        }
    } catch (e: any) {
        ElMessage.error(e?.message || '加载域名列表失败')
    } finally {
        domainsLoading.value = false
    }
}

async function selectDomain(domainName: string) {
    activeDomain.value = domainName
    globalSearchMode.value = false
    recordQuery.offset = 0
    recordQuery.keyword = ''
    recordQuery.record_type = ''
    await loadRecords()
}

async function loadRecords() {
    if (!activeDomain.value) return
    recordsLoading.value = true
    try {
        const resp = await getDnsRecordsApi(activeDomain.value, {
            keyword: recordQuery.keyword || undefined,
            record_type: recordQuery.record_type || undefined,
            offset: recordQuery.offset,
            limit: recordQuery.limit,
        })
        const data = (resp.data as any)?.data || resp.data
        records.value = data?.items || []
        recordTotal.value = data?.total || 0
    } catch (e: any) {
        ElMessage.error(e?.message || '加载解析记录失败')
        records.value = []
        recordTotal.value = 0
    } finally {
        recordsLoading.value = false
    }
}

async function runGlobalSearch() {
    const kw = globalSearchKeyword.value.trim()
    if (!kw) {
        ElMessage.warning('请输入要搜索的记录值/主机记录')
        return
    }
    globalSearchMode.value = true
    recordsLoading.value = true
    try {
        const resp = await searchDnsRecordsApi({ keyword: kw, limit: 100 })
        const data = (resp.data as any)?.data || resp.data
        const items: DnsRecord[] = data?.items || data || []
        records.value = items
        recordTotal.value = items.length
    } catch (e: any) {
        ElMessage.error(e?.message || '搜索失败')
        records.value = []
        recordTotal.value = 0
    } finally {
        recordsLoading.value = false
    }
}

function exitGlobalSearch() {
    globalSearchMode.value = false
    globalSearchKeyword.value = ''
    loadRecords()
}

function handleDomainPage(page: number) {
    domainQuery.offset = (page - 1) * domainQuery.limit
    loadDomains()
}

function handleRecordPage(page: number) {
    recordQuery.offset = (page - 1) * recordQuery.limit
    loadRecords()
}

function handleRefresh() {
    loadStats()
    loadDomains()
    if (activeDomain.value && !globalSearchMode.value) loadRecords()
}

onMounted(() => {
    loadStats()
    loadDomains()
})
</script>

<template>
    <div class="dns-page">
        <div class="page-head">
            <div>
                <h2>DNS 解析</h2>
                <p class="subtitle">查看云解析域名与解析记录</p>
            </div>
            <el-button size="small" circle @click="handleRefresh" title="刷新">
                <el-icon><Refresh /></el-icon>
            </el-button>
        </div>

        <!-- 统计卡片 -->
        <div v-if="stats" class="metric-row">
            <div class="metric-card">
                <div class="metric-value">{{ stats.total_domains }}</div>
                <div class="metric-label">域名总数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{ stats.total_records }}</div>
                <div class="metric-label">解析记录总数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{ Object.keys(stats.provider_distribution || {}).length }}</div>
                <div class="metric-label">云厂商数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{ Object.keys(stats.record_type_distribution || {}).length }}</div>
                <div class="metric-label">记录类型数</div>
            </div>
        </div>

        <div class="main-area">
            <!-- 左侧：域名列表 -->
            <div class="domain-panel">
                <div class="panel-head">
                    <span class="panel-title">域名</span>
                    <span class="panel-count">{{ domainTotal }}</span>
                </div>
                <div class="panel-filters">
                    <el-input
                        v-model="domainQuery.keyword"
                        placeholder="搜索域名"
                        size="small"
                        clearable
                        @keyup.enter="loadDomains"
                    >
                        <template #prefix><el-icon><Search /></el-icon></template>
                    </el-input>
                    <el-select
                        v-model="domainQuery.provider"
                        placeholder="云厂商"
                        size="small"
                        clearable
                        @change="loadDomains"
                    >
                        <el-option
                            v-for="opt in providerOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                        />
                    </el-select>
                </div>
                <div v-loading="domainsLoading" class="domain-list">
                    <div
                        v-for="d in domains"
                        :key="d.domain_id || d.domain_name"
                        class="domain-item"
                        :class="{ active: activeDomain === d.domain_name && !globalSearchMode }"
                        @click="selectDomain(d.domain_name)"
                    >
                        <div class="domain-name">{{ d.domain_name }}</div>
                        <div class="domain-meta">
                            <span>{{ getProviderLabel(d.provider) }}</span>
                            <span class="record-count">{{ d.record_count }} 条</span>
                        </div>
                    </div>
                    <el-empty v-if="!domainsLoading && domains.length === 0" description="暂无域名" :image-size="60" />
                </div>
                <el-pagination
                    v-if="domainTotal > domainQuery.limit"
                    small
                    layout="prev, pager, next"
                    :page-size="domainQuery.limit"
                    :total="domainTotal"
                    @current-change="handleDomainPage"
                />
            </div>

            <!-- 右侧：解析记录 -->
            <div class="record-panel">
                <div class="panel-head">
                    <span class="panel-title">
                        {{ globalSearchMode ? `全局搜索结果` : activeDomain || '解析记录' }}
                    </span>
                    <span class="panel-count">{{ recordTotal }}</span>
                </div>

                <div class="panel-filters">
                    <el-input
                        v-model="globalSearchKeyword"
                        placeholder="跨域名搜索记录（主机记录/记录值）"
                        size="small"
                        clearable
                        style="flex: 1"
                        @keyup.enter="runGlobalSearch"
                    >
                        <template #prefix><el-icon><Search /></el-icon></template>
                    </el-input>
                    <el-button size="small" @click="runGlobalSearch">搜索</el-button>
                    <el-button v-if="globalSearchMode" size="small" @click="exitGlobalSearch">返回</el-button>
                    <template v-if="!globalSearchMode">
                        <el-select
                            v-model="recordQuery.record_type"
                            placeholder="记录类型"
                            size="small"
                            clearable
                            style="width: 120px"
                            @change="loadRecords"
                        >
                            <el-option v-for="t in RECORD_TYPE_OPTIONS" :key="t" :label="t" :value="t" />
                        </el-select>
                    </template>
                </div>

                <el-table
                    v-loading="recordsLoading"
                    :data="records"
                    size="small"
                    height="calc(100vh - 420px)"
                    empty-text="暂无解析记录"
                >
                    <el-table-column prop="rr" label="主机记录" width="150" show-overflow-tooltip />
                    <el-table-column prop="type" label="类型" width="90" />
                    <el-table-column prop="value" label="记录值" min-width="220" show-overflow-tooltip />
                    <el-table-column prop="line" label="线路" width="90" />
                    <el-table-column prop="ttl" label="TTL" width="80" />
                    <el-table-column label="状态" width="90">
                        <template #default="{ row }">
                            <el-tag
                                size="small"
                                :type="row.status === 'enable' ? 'success' : 'info'"
                            >
                                {{ row.status === 'enable' ? '启用' : '停用' }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column v-if="globalSearchMode" prop="domain" label="域名" width="160" show-overflow-tooltip />
                    <el-table-column label="云厂商" width="90">
                        <template #default="{ row }">{{ getProviderLabel(row.provider) }}</template>
                    </el-table-column>
                </el-table>

                <el-pagination
                    v-if="!globalSearchMode && recordTotal > recordQuery.limit"
                    small
                    layout="total, prev, pager, next"
                    :page-size="recordQuery.limit"
                    :total="recordTotal"
                    @current-change="handleRecordPage"
                />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.dns-page {
    padding: 16px 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    h2 {
        margin: 0;
        font-size: 20px;
    }

    .subtitle {
        margin: 4px 0 0;
        font-size: 13px;
        color: var(--text-secondary, #909399);
    }
}

.metric-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

.metric-card {
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--bg-card, rgba(255, 255, 255, 0.04));
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));

    .metric-value {
        font-size: 22px;
        font-weight: 600;
    }

    .metric-label {
        margin-top: 2px;
        font-size: 12px;
        color: var(--text-secondary, #909399);
    }
}

.main-area {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 12px;
    flex: 1;
    min-height: 0;
}

.domain-panel,
.record-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    background: var(--bg-card, rgba(255, 255, 255, 0.04));
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    min-height: 0;
}

.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .panel-title {
        font-weight: 600;
        font-size: 14px;
    }

    .panel-count {
        font-size: 12px;
        color: var(--text-secondary, #909399);
    }
}

.panel-filters {
    display: flex;
    gap: 8px;
}

.domain-list {
    flex: 1;
    overflow-y: auto;
    min-height: 120px;
}

.domain-item {
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
    }

    &.active {
        background: rgba(80, 120, 255, 0.18);
    }

    .domain-name {
        font-size: 13px;
        font-weight: 500;
        word-break: break-all;
    }

    .domain-meta {
        display: flex;
        justify-content: space-between;
        margin-top: 2px;
        font-size: 12px;
        color: var(--text-secondary, #909399);
    }
}
</style>

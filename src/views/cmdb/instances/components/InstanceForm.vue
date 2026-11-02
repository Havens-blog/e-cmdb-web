<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="instance-form">
    <el-form-item label="模型" prop="uid">
      <el-select
        v-model="form.uid"
        placeholder="请选择模型"
        filterable
        :disabled="isEdit"
        style="width: 100%"
      >
        <el-option
          v-for="model in models"
          :key="model.uid"
          :label="model.name"
          :value="model.uid"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="资产ID" prop="asset_id">
      <el-input
        v-model="form.asset_id"
        placeholder="云厂商资产ID，如 i-bp1234567890"
        :disabled="isEdit"
      />
    </el-form-item>

    <el-form-item label="资产名称" prop="asset_name">
      <el-input v-model="form.asset_name" placeholder="资产名称" />
    </el-form-item>

    <!-- 租户由登录会话决定，新建时不由用户填写；仅在编辑既有实例时只读展示 -->
    <el-form-item v-if="props.isEdit" label="租户ID" prop="tenant_id">
      <el-input v-model="form.tenant_id" disabled />
    </el-form-item>

    <el-form-item label="云账号ID" prop="account_id">
      <el-input-number
        v-model="form.account_id"
        :min="0"
        placeholder="云账号ID"
        style="width: 100%"
        controls-position="right"
      />
    </el-form-item>

    <!--
      按模型定义渲染字段。
      背景：此前选中模型后不渲染该模型的任何字段，用户必须手动输入「属性名/属性值」，
      即使模型已定义 hostname / ip_address / status 等字段也看不到。
      这里仅解决「有定义却不能让用户填」的展示问题，值仍写入同一个 attributes。
    -->
    <template v-if="visibleAttrs.length">
      <el-divider content-position="left">
        模型字段
        <span v-if="attrsLoading" class="attr-loading">（加载中…）</span>
      </el-divider>

      <!-- 提交时若有未填的模型必填字段，明确列出，避免用户只看到"某处有错" -->
      <el-alert
        v-if="missingRequired.length"
        class="missing-required"
        type="error"
        show-icon
        :closable="false"
        title="请先填写以下必填字段"
      >
        <div class="missing-list">{{ missingRequired.join('、') }}</div>
      </el-alert>

      <el-form-item
        v-for="a in visibleAttrs"
        :key="a.field_uid"
        :label="a.display_name || a.field_name || a.field_uid"
        :required="a.required"
        :rules="attrRulesFor(a)"
      >
        <!-- 枚举：下拉选择 -->
        <el-select
          v-if="a.field_type === 'enum' && enumOptions(a).length"
          v-model="attrValues[a.field_uid]"
          :placeholder="a.placeholder || '请选择'"
          clearable
          style="width: 100%"
        >
          <el-option v-for="opt in enumOptions(a)" :key="opt" :label="opt" :value="opt" />
        </el-select>

        <!-- 布尔：开关 -->
        <el-switch
          v-else-if="a.field_type === 'bool'"
          :model-value="attrValues[a.field_uid] === 'true'"
          @update:model-value="(v: any) => (attrValues[a.field_uid] = String(v))"
        />

        <!-- 数字 -->
        <el-input
          v-else-if="a.field_type === 'int' || a.field_type === 'float'"
          v-model="attrValues[a.field_uid]"
          type="number"
          :placeholder="a.placeholder || `请输入${a.display_name || a.field_uid}`"
        />

        <!-- 其余（string / datetime / json / array / link）：文本输入 -->
        <el-input
          v-else
          v-model="attrValues[a.field_uid]"
          :placeholder="a.placeholder || `请输入${a.display_name || a.field_uid}`"
        />

        <div v-if="a.description" class="attr-desc">{{ a.description }}</div>
      </el-form-item>
    </template>

    <el-divider content-position="left">其他属性（手动填写）</el-divider>

    <div class="attributes-editor">
      <div v-for="(attr, index) in attributeList" :key="index" class="attr-row">
        <el-input v-model="attr.key" placeholder="属性名" class="attr-key" />
        <el-input v-model="attr.value" placeholder="属性值" class="attr-value" />
        <el-button type="danger" text @click="removeAttribute(index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
      <el-button type="primary" text @click="addAttribute">
        <el-icon><Plus /></el-icon>
        添加属性
      </el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { createCmdbInstanceApi, updateCmdbInstanceApi } from '@/api'
// listAttributesApi 未纳入 @/api 桶导出（桶仅 re-export 页面曾用到的函数），按需从模块直接引入
import { listAttributesApi } from '@/api/cmdb'
import type { AttributeVO, InstanceVO, ModelVO } from '@/api/types/cmdb'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps<{
  instance: InstanceVO | null
  isEdit: boolean
  models: ModelVO[]
}>()

const formRef = ref<FormInstance>()

const form = reactive({
  uid: '',
  asset_id: '',
  asset_name: '',
  // 后端 InstanceVO.tenant_id 为 int64（number）；租户由会话决定，本字段仅在编辑时只读回显
  tenant_id: undefined as number | undefined,
  account_id: undefined as number | undefined,
})

const attributeList = ref<{ key: string; value: string }[]>([])

/**
 * 当前模型已定义的字段（用于按定义渲染输入项）。
 *
 * 背景（实测 2026-11-01）：
 * 原表单选中模型后**完全不渲染该模型的字段**，只有一个「动态属性」区，
 * 要求用户手动输入「属性名 / 属性值」。实测选「主机」模型后，
 * hostname / ip_address / status / os_type 一个都没有出现，
 * 用户必须自己知道字段名才能填。
 *
 * 本改动只解决「有字段定义却不让用户填」的展示问题：
 * 按 field_type 渲染对应控件，值仍然写入同一个 attributes map，
 * **不改变任何数据语义，也不新增校验**（校验强度需产品决策，另行确认）。
 */
const modelAttrs = ref<AttributeVO[]>([])
const attrsLoading = ref(false)

/**
 * 未填写的模型必填字段名（中文）。提交时若有值则阻断并内联提示。
 * 见 validate() 的说明：动态字段无法走 el-form rules，需手动校验。
 */
const missingRequired = ref<string[]>([])

/** 按字段定义顺序、仅取可显示字段 */
const visibleAttrs = computed(() =>
  modelAttrs.value
    .filter((a) => a.display !== false)
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
)

/** 字段值：统一存字符串，提交时按 type 还原 */
const attrValues = reactive<Record<string, string>>({})

/** enum 字段的候选项（后端 option 可能是数组或 JSON 字符串） */
const enumOptions = (attr: AttributeVO): string[] => {
  const raw = attr.option
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) return parsed.map((x) => String(x))
    if (parsed && typeof parsed === 'object') return Object.keys(parsed)
  } catch {
    /* 非法 JSON 时降级为空，交由自由输入 */
  }
  return []
}

/** 拉取某个模型的字段定义 */
const loadModelAttrs = async (modelUid: string) => {
  modelAttrs.value = []
  if (!modelUid) return
  attrsLoading.value = true
  try {
    const resp = await listAttributesApi(modelUid, { limit: 200 })
    const data = (resp.data as any)?.data || resp.data
    modelAttrs.value = data?.attributes || data?.items || []
    // 用字段默认值初始化未填项
    for (const a of modelAttrs.value) {
      if (attrValues[a.field_uid] === undefined && a.default) {
        attrValues[a.field_uid] = String(a.default)
      }
    }
    // 字段定义到位后，把「其他属性」里与模型字段重名的行剔除，
    // 避免同一字段两处渲染、且手动区覆盖模型字段的编辑结果。
    pruneAttrList()
  } catch {
    // 字段定义拉取失败不阻塞表单：退化为原有的手动「动态属性」录入
    modelAttrs.value = []
  } finally {
    attrsLoading.value = false
  }
}

// 模型切换时重新加载字段定义
//
// 注意：这里**不能无条件清空 attrValues**。
// 编辑既有实例时的执行顺序是：
//   1) watch(props.instance) 先设置 form.uid，再回填 attrValues（已有属性）
//   2) form.uid 的变化又触发本 watch —— 若在此清空，会把刚回填的值全部抹掉
// 实测后果（2026-11-01）：打开 ecs 实例编辑，模型定义的 17 个字段中
// 有 12 个在数据里存在（provider/region/status/cpu/memory/os_type/private_ip…），
// 但表单只回填了 4 个通用字段，模型字段全空。
// 修正：仅当模型**真的变化**（与上次加载的不同）时才清空。
let lastLoadedUid = ''
watch(
  () => form.uid,
  (uid) => {
    if (uid !== lastLoadedUid) {
      for (const k of Object.keys(attrValues)) delete attrValues[k]
      lastLoadedUid = uid
    }
    void loadModelAttrs(uid)
  }
)

const rules: FormRules = {
  uid: [{ required: true, message: '请选择模型', trigger: 'change' }],
  asset_id: [{ required: true, message: '请输入资产ID', trigger: 'blur' }],
}

/**
 * 模型字段的必填校验规则。
 *
 * 缺陷修复（实测 2026-11-02）：表单此前只把「模型」「资产ID」两个通用字段标为必填，
 * **模型定义里 required=true 的字段完全没有必填标记，也不做客户端校验** ——
 * 实测新建 ecs 实例时表单只显示 2 个必填项，而 ecs 实际有 7 个必填字段。
 * 用户在毫不知情的情况下提交，只能等后端拒绝后才知道要填什么。
 *
 * 注意：这些字段的值存在 `attrValues` 而不是 `form` 上，el-form 的 rules 无法按
 * prop 路径取到，因此这里用**函数式校验**（custom validator）直接读 attrValues。
 */
const attrRulesFor = (a: any): FormItemRule[] => {
  if (!a?.required) return []
  return [
    {
      required: true,
      validator: (_rule: any, _value: any, callback: (e?: Error) => void) => {
        const raw = attrValues[a.field_uid]
        const empty = raw === undefined || raw === null || String(raw).trim() === ''
        callback(empty ? new Error(`请填写${a.display_name || a.field_name || a.field_uid}`) : undefined)
      },
      trigger: ['blur', 'change'],
    },
  ]
}

// 监听实例变化，填充表单
const reset = () => {
  form.uid = ''
  form.asset_id = ''
  form.asset_name = ''
  form.tenant_id = undefined
  form.account_id = undefined
  attributeList.value = []
  // 新建时清空模型字段值与「已加载模型」标记
  for (const k of Object.keys(attrValues)) delete attrValues[k]
  lastLoadedUid = ''
  formRef.value?.resetFields()
}

watch(
  () => props.instance,
  (val) => {
    if (val) {
      // 先记下本次要展示的模型，避免随后的 watch(form.uid) 把刚回填的属性清空。
      // （watch 回调是异步的：本函数先回填 attrValues，之后 form.uid 的 watcher
      //  才会触发；若不预置该标记，它会把回填值全部 delete 掉。）
      lastLoadedUid = val.model_uid
      form.uid = val.model_uid
      form.asset_id = val.asset_id
      form.asset_name = val.asset_name || ''
      form.tenant_id = val.tenant_id
      form.account_id = val.account_id

      // 解析属性
      if (val.attributes) {
        attributeList.value = Object.entries(val.attributes).map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        }))
        // 同时把已有值回填到「按定义渲染」的字段上（供编辑时直接修改）
        for (const [k, v] of Object.entries(val.attributes)) {
          attrValues[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
        }
      } else {
        attributeList.value = []
      }
    } else {
      reset()
    }
  },
  { immediate: true }
)

const addAttribute = () => {
  attributeList.value.push({ key: '', value: '' })
}

/**
 * 从「其他属性」列表里剔除已由模型字段渲染的键。
 *
 * 缺陷修复（实测 2026-11-01）：选中 ecs 模型编辑实例时，其 44 个 attributes 键中
 * 有 **12 个与模型字段同名**（provider / region / status / cpu / memory / os_type /
 * private_ip / public_ip / vpc_id / zone / instance_type / cloud_account_id）。
 * 这些键会同时出现在「模型字段」区与「其他属性」区两处，
 * 而 buildAttributes 中手动区的写入在后、会**覆盖**模型字段的值
 * → 用户在模型字段里做的修改被静默丢弃，保存后看起来「没生效」。
 *
 * 处理：模型字段负责这些键，手动区只保留模型未定义的键，
 * 保证同一字段在表单上只出现一处、只有一个来源。
 */
const pruneAttrList = () => {
  if (!modelAttrs.value.length) return
  const modelKeys = new Set(modelAttrs.value.map((a) => a.field_uid))
  const kept = attributeList.value.filter((row) => !modelKeys.has(row.key.trim()))
  if (kept.length !== attributeList.value.length) {
    attributeList.value = kept
  }
}

const removeAttribute = (index: number) => {
  attributeList.value.splice(index, 1)
}

const buildAttributes = () => {
  const attrs: Record<string, any> = {}

  // 1) 按模型定义渲染的字段：按 field_type 还原类型后写入
  for (const a of visibleAttrs.value) {
    const raw = attrValues[a.field_uid]
    if (raw === undefined || raw === null || String(raw).trim() === '') continue
    attrs[a.field_uid] = coerceByType(String(raw), a.field_type)
  }

  // 2) 手动「动态属性」：保留原行为（显式填写的优先，可覆盖上面的同名项）
  attributeList.value.forEach(({ key, value }) => {
    if (key.trim()) {
      // 尝试解析 JSON
      try {
        attrs[key.trim()] = JSON.parse(value)
      } catch {
        attrs[key.trim()] = value
      }
    }
  })
  return attrs
}

/**
 * 按字段类型把字符串形式的输入还原为对应类型。
 *
 * 只做「明显无损」的转换：数字型能解析才转，否则保留原字符串，
 * 避免把用户输入静默变成 NaN 或被丢弃。
 * 注意：这里**不做合法性拦截**（如必填、枚举越界），
 * 校验强度属产品决策，需另行确认后实现。
 */
function coerceByType(value: string, fieldType: string): any {
  const t = (fieldType || '').toLowerCase()
  if (t === 'int') {
    const n = Number(value)
    return Number.isFinite(n) ? Math.trunc(n) : value
  }
  if (t === 'float') {
    const n = Number(value)
    return Number.isFinite(n) ? n : value
  }
  if (t === 'bool') {
    if (value === 'true' || value === '1') return true
    if (value === 'false' || value === '0') return false
    return value
  }
  if (t === 'json' || t === 'array') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

/**
 * 表单校验，返回是否通过。
 *
 * Element Plus 的 validate() 校验失败时抛异常而非返回 false，
 * 父组件 handleSubmit 依赖布尔结果（`if (!valid) return`），
 * 故在此收敛为 boolean，避免异常穿透导致点击确定后无任何反馈。
 *
 * 另：模型动态字段的值存在 `attrValues`（不在 `form` 上），
 * el-form 的 rules 按 prop 路径取值取不到它们，即使给 el-form-item 传了 :rules
 * 也不会真正校验（实测：必填星号显示了，但空值仍能提交）。
 * 因此这里**手动补充一轮必填校验**，把缺失字段写入 missingRequired 供模板提示。
 */
const validate = async (): Promise<boolean> => {
  let formOK = true
  try {
    await formRef.value?.validate()
  } catch {
    formOK = false
  }

  missingRequired.value = visibleAttrs.value
    .filter((a) => a.required)
    .filter((a) => {
      const raw = attrValues[a.field_uid]
      return raw === undefined || raw === null || String(raw).trim() === ''
    })
    .map((a) => a.display_name || a.field_name || a.field_uid)

  return formOK && missingRequired.value.length === 0
}

const submit = async () => {
  if (!(await validate())) return

  const attributes = buildAttributes()

  if (props.isEdit && props.instance) {
    await updateCmdbInstanceApi(props.instance.id, {
      asset_name: form.asset_name || undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    })
  } else {
    // 后端 CreateInstanceReq 字段名为 model_uid（必填）；租户由会话 claims 决定，
    // 不接受前端传 tenant_id（传入也会被忽略，属冗余字段）。
    await createCmdbInstanceApi({
      model_uid: form.uid,
      asset_id: form.asset_id,
      asset_name: form.asset_name || undefined,
      account_id: form.account_id,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    })
  }
}

defineExpose({ submit, reset, validate })
</script>

<style scoped lang="scss">
.instance-form {
  :deep(.el-divider__text) {
    font-size: 13px;
    color: var(--text-tertiary);
  }
}

.attributes-editor {
  padding: 0 0 0 100px;

  .attr-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;

    .attr-key {
      width: 140px;
      flex-shrink: 0;
    }

    .attr-value {
      flex: 1;
    }
  }
}

/* 按模型定义渲染的字段：说明文字与加载态 */
.attr-desc {
  width: 100%;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-tertiary, #909399);
}

.attr-loading {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary, #909399);
}

/* 未填必填字段提示：列出具体字段名，而不是笼统的"表单有误" */
.missing-required {
  margin-bottom: 12px;

  .missing-list {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
  }
}</style>

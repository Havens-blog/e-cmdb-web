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

    <el-divider content-position="left">动态属性</el-divider>

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
import type { InstanceVO, ModelVO } from '@/api/types/cmdb'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref, watch } from 'vue'

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

const rules: FormRules = {
  uid: [{ required: true, message: '请选择模型', trigger: 'change' }],
  asset_id: [{ required: true, message: '请输入资产ID', trigger: 'blur' }],
}

// 监听实例变化，填充表单
const reset = () => {
  form.uid = ''
  form.asset_id = ''
  form.asset_name = ''
  form.tenant_id = undefined
  form.account_id = undefined
  attributeList.value = []
  formRef.value?.resetFields()
}

watch(
  () => props.instance,
  (val) => {
    if (val) {
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

const removeAttribute = (index: number) => {
  attributeList.value.splice(index, 1)
}

const buildAttributes = () => {
  const attrs: Record<string, any> = {}
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
 * 表单校验，返回是否通过。
 *
 * Element Plus 的 validate() 校验失败时抛异常而非返回 false，
 * 父组件 handleSubmit 依赖布尔结果（`if (!valid) return`），
 * 故在此收敛为 boolean，避免异常穿透导致点击确定后无任何反馈。
 */
const validate = async (): Promise<boolean> => {
  try {
    await formRef.value?.validate()
    return true
  } catch {
    return false
  }
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
</style>

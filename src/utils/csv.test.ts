import { describe, it, expect } from 'vitest'
import { parseTable } from './csv'

describe('parseTable', () => {
    it('解析逗号分隔 CSV', () => {
        const r = parseTable('model_uid,asset_id,asset_name\necs,i-1,主机A\necs,i-2,主机B')
        expect(r.headers).toEqual(['model_uid', 'asset_id', 'asset_name'])
        expect(r.total).toBe(2)
        expect(r.rows[0]).toEqual({ model_uid: 'ecs', asset_id: 'i-1', asset_name: '主机A' })
    })

    it('解析制表符分隔 TSV', () => {
        const r = parseTable('model_uid\tasset_id\nhost\th-1\nhost\th-2')
        expect(r.headers).toEqual(['model_uid', 'asset_id'])
        expect(r.total).toBe(2)
        expect(r.rows[1]!.asset_id).toBe('h-2')
    })

    it('处理双引号包裹的含分隔符字段', () => {
        const r = parseTable('model_uid,asset_id,asset_name\necs,i-1,"主机,A"\n')
        expect(r.rows[0]!.asset_name).toBe('主机,A')
    })

    it('跳过空行', () => {
        const r = parseTable('model_uid,asset_id\necs,i-1\n\n\necs,i-2\n')
        expect(r.total).toBe(2)
    })

    it('处理 BOM 与 CRLF', () => {
        const r = parseTable('\uFEFFmodel_uid,asset_id\r\necs,i-1\r\n')
        expect(r.headers[0]).toBe('model_uid')
        expect(r.total).toBe(1)
    })

    it('空文本返回空结果', () => {
        const r = parseTable('')
        expect(r.headers).toEqual([])
        expect(r.total).toBe(0)
    })
})

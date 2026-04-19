import { useMemo, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { fetchSchools } from '../../services/api'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
  accent: '#F4A261',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

type School = {
  id: number
  name: string
  province?: string
  city?: string
  age_range?: string
  school_type?: string
  has_xuji?: boolean
  fee?: string
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')

  const loadSchools = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchSchools()
      setSchools(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('loadSchools error:', err)
      setError(err?.message || '读取学习社区数据失败')
      Taro.showToast({ title: '学习社区数据读取失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => { loadSchools() })

  usePullDownRefresh(async () => {
    await loadSchools()
    Taro.stopPullDownRefresh()
  })

  const filteredSchools = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return schools
    return schools.filter((item) => {
      const haystack = [item.name, item.province, item.city, item.school_type, item.age_range, item.fee]
        .filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [schools, keyword])

  const goToDetail = (item: School) => {
    Taro.navigateTo({ url: `/pages/school-detail/index?id=${item.id}` })
  }

  const goToSubmit = () => {
    Taro.navigateTo({ url: '/pages/schools/submit' })
  }

  return (
    <View style={{
      padding: '16px', backgroundColor: palette.bg,
      minHeight: '100vh', boxSizing: 'border-box',
    }}>
      <View style={{
        backgroundColor: palette.card, borderRadius: '20px',
        padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '8px' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>学习社区库</Text>
          </View>
          <View onClick={goToSubmit} style={{
            padding: '7px 12px', borderRadius: '999px', backgroundColor: palette.accentSoft,
          }}>
            <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold' }}>推荐新学习社区</Text>
          </View>
        </View>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          搜索、筛选、查看学习社区详情，也可以提交新的社区推荐，进入人工审核队列。
        </Text>
        <View style={{
          backgroundColor: palette.cardSoft, borderRadius: '14px',
          padding: '10px 12px', marginTop: '14px',
        }}>
          <Input
            type='text'
            value={keyword}
            placeholder='搜索学习社区名 / 城市 / 类型'
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
      </View>

      <View style={{ marginBottom: '14px' }}>
        <Text style={{ color: palette.subtext, fontSize: '13px' }}>
          {loading ? '加载中...' : `共 ${filteredSchools.length} / ${schools.length} 个学习社区`}
        </Text>
      </View>

      {error ? (
        <View style={{
          padding: '12px', marginBottom: '16px', backgroundColor: '#FFF1F0',
          borderRadius: '14px', border: '1px solid #FFD8D2',
        }}>
          <Text style={{ color: '#CF1322' }}>{error}</Text>
        </View>
      ) : null}

      {!loading && filteredSchools.length === 0 ? (
        <View style={{
          padding: '16px', backgroundColor: palette.card,
          borderRadius: '16px', border: `1px solid ${palette.line}`,
        }}>
          <Text style={{ color: palette.subtext }}>没有匹配结果</Text>
        </View>
      ) : null}

      {filteredSchools.map((item) => (
        <View
          key={item.id}
          onClick={() => goToDetail(item)}
          style={{
            backgroundColor: palette.card, borderRadius: '20px',
            padding: '16px', marginBottom: '14px',
            boxSizing: 'border-box', border: `1px solid ${palette.line}`,
          }}
        >
          <View style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px',
          }}>
            <View style={{
              width: '38px', height: '38px', borderRadius: '12px',
              backgroundColor: '#FFE8D6', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginRight: '10px',
            }}>
              <Text style={{ fontSize: '18px' }}>🏫</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text }}>
                {item.name}
              </Text>
            </View>
          </View>

          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}>
            <View style={{
              padding: '5px 10px', borderRadius: '999px',
              backgroundColor: palette.accentSoft, marginRight: '8px', marginBottom: '8px',
            }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                {item.province || '未知'} {item.city || ''}
              </Text>
            </View>
            <View style={{
              padding: '5px 10px', borderRadius: '999px',
              backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '8px',
            }}>
              <Text style={{ fontSize: '12px', color: palette.green }}>
                {item.school_type || '未填写'}
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: '#FFFDF9', borderRadius: '14px',
            padding: '12px', marginBottom: '10px',
          }}>
            <View style={{ marginBottom: '6px' }}>
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>
                适合阶段：{item.age_range || '未填写'}
              </Text>
            </View>
            <View>
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>
                费用：{item.fee || '未填写'}
              </Text>
            </View>
          </View>

          <Text style={{ color: palette.accentDeep, fontSize: '13px', fontWeight: 'bold' }}>
            点击查看详情
          </Text>
        </View>
      ))}
    </View>
  )
}

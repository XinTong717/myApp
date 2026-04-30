import { useMemo, useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { getSchools } from '../../services/school'
import { palette } from '../../theme/palette'
import { ListSkeleton } from '../../components/common/Skeleton'

const ALL_FILTER = '全部'

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

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <View onClick={props.onClick} style={{
      padding: '6px 12px',
      borderRadius: '999px',
      marginRight: '8px',
      marginBottom: '8px',
      backgroundColor: props.active ? palette.accentDeep : palette.tag,
      border: `1px solid ${props.active ? palette.accentDeep : palette.line}`,
    }}>
      <Text style={{ fontSize: '12px', color: props.active ? '#FFF' : palette.tagText }}>{props.label}</Text>
    </View>
  )
}

function splitTokens(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueValues(values: string[], max = 12) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, max)
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedProvince, setSelectedProvince] = useState(ALL_FILTER)
  const [selectedType, setSelectedType] = useState(ALL_FILTER)
  const [selectedAgeRange, setSelectedAgeRange] = useState(ALL_FILTER)

  const loadSchools = async (options: { forceRefresh?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      const result = await getSchools({ forceRefresh: !!options.forceRefresh })
      const nextSchools = Array.isArray(result.schools) ? result.schools : []
      setSchools(nextSchools)
      if (!result?.ok && nextSchools.length === 0) {
        setError(result?.message || '读取学习社区数据失败')
      }
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
    await loadSchools({ forceRefresh: true })
    Taro.stopPullDownRefresh()
  })

  const provinceOptions = useMemo(() => [ALL_FILTER, ...uniqueValues(schools.map((item) => item.province || ''))], [schools])
  const typeOptions = useMemo(() => [ALL_FILTER, ...uniqueValues(schools.flatMap((item) => splitTokens(item.school_type)))], [schools])
  const ageOptions = useMemo(() => [ALL_FILTER, ...uniqueValues(schools.flatMap((item) => splitTokens(item.age_range)))], [schools])

  const filteredSchools = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return schools.filter((item) => {
      const haystack = [item.name, item.province, item.city, item.school_type, item.age_range, item.fee]
        .filter(Boolean).join(' ').toLowerCase()
      if (q && !haystack.includes(q)) return false
      if (selectedProvince !== ALL_FILTER && item.province !== selectedProvince) return false
      if (selectedType !== ALL_FILTER && !splitTokens(item.school_type).includes(selectedType)) return false
      if (selectedAgeRange !== ALL_FILTER && !splitTokens(item.age_range).includes(selectedAgeRange)) return false
      return true
    })
  }, [schools, keyword, selectedProvince, selectedType, selectedAgeRange])

  const resetFilters = () => {
    setKeyword('')
    setSelectedProvince(ALL_FILTER)
    setSelectedType(ALL_FILTER)
    setSelectedAgeRange(ALL_FILTER)
  }

  const goToDetail = (item: School) => {
    Taro.navigateTo({ url: `/pages/school-detail/index?id=${item.id}` })
  }

  const goToSubmit = () => {
    Taro.navigateTo({ url: '/pkg/schools/submit/index' })
  }

  return (
    <View style={{
      padding: '16px', backgroundColor: palette.bg,
      minHeight: '100vh', boxSizing: 'border-box',
    }}>
      <View style={{
        backgroundColor: palette.card, borderRadius: '22px',
        padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '8px' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>学习社区库</Text>
          </View>
          <View onClick={goToSubmit} style={{
            padding: '7px 12px', borderRadius: '999px', background: palette.primaryGradient,
          }}>
            <Text style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 'bold' }}>推荐新学习社区</Text>
          </View>
        </View>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          搜索、筛选、查看学习社区详情，也可以提交新的社区推荐，进入人工审核队列。
        </Text>
        <View style={{
          backgroundColor: palette.surface, borderRadius: '16px',
          padding: '10px 12px', marginTop: '14px', border: `1px solid ${palette.line}`,
        }}>
          <Input
            type='text'
            value={keyword}
            placeholder='搜索学习社区名 / 城市 / 类型'
            placeholderStyle={`color:${palette.muted}`}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
      </View>

      <View style={{ backgroundColor: palette.card, borderRadius: '18px', padding: '12px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <View style={{ marginBottom: '8px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '13px', fontWeight: 'bold', color: palette.text }}>筛选</Text>
          <Text onClick={resetFilters} style={{ fontSize: '12px', color: palette.link }}>重置</Text>
        </View>

        <ScrollView scrollX style={{ whiteSpace: 'nowrap', marginBottom: '6px' }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {provinceOptions.map((option) => (
              <FilterChip key={option} label={option} active={selectedProvince === option} onClick={() => setSelectedProvince(option)} />
            ))}
          </View>
        </ScrollView>

        <ScrollView scrollX style={{ whiteSpace: 'nowrap', marginBottom: '6px' }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {typeOptions.map((option) => (
              <FilterChip key={option} label={option} active={selectedType === option} onClick={() => setSelectedType(option)} />
            ))}
          </View>
        </ScrollView>

        <ScrollView scrollX style={{ whiteSpace: 'nowrap' }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {ageOptions.map((option) => (
              <FilterChip key={option} label={option} active={selectedAgeRange === option} onClick={() => setSelectedAgeRange(option)} />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginBottom: '14px' }}>
        <Text style={{ color: palette.muted, fontSize: '13px' }}>
          {loading ? '加载中...' : `共 ${filteredSchools.length} / ${schools.length} 个学习社区`}
        </Text>
      </View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}

      {error ? (
        <View style={{
          padding: '12px', marginBottom: '16px', backgroundColor: palette.errorSoft,
          borderRadius: '14px', border: `1px solid ${palette.brandSoft}`,
        }}>
          <Text style={{ color: palette.error }}>{error}</Text>
          <View onClick={() => loadSchools({ forceRefresh: true })} style={{ marginTop: '10px', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '8px 12px', alignSelf: 'flex-start' }}>
            <Text style={{ color: palette.accentDeep, fontSize: '12px', fontWeight: 'bold' }}>重新加载</Text>
          </View>
        </View>
      ) : null}

      {!loading && filteredSchools.length === 0 ? (
        <View style={{
          padding: '16px', backgroundColor: palette.card,
          borderRadius: '18px', border: `1px solid ${palette.line}`,
        }}>
          <Text style={{ color: palette.subtext }}>没有匹配结果</Text>
        </View>
      ) : null}

      {!loading && filteredSchools.map((item, index) => {
        const iconBgRotation = [palette.iconBg, palette.brandSoft, palette.accent2Soft, palette.greenSoft]
        const iconBg = iconBgRotation[index % iconBgRotation.length]

        return (
          <View
            key={item.id}
            onClick={() => goToDetail(item)}
            style={{
              backgroundColor: palette.card, borderRadius: '22px',
              padding: '16px', marginBottom: '14px',
              boxSizing: 'border-box', border: `1px solid ${palette.line}`,
            }}
          >
            <View style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px',
            }}>
              <View style={{
                width: '38px', height: '38px', borderRadius: '14px',
                backgroundColor: iconBg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginRight: '10px',
                border: `1px solid ${palette.lineSoft}`,
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
                backgroundColor: palette.tag, marginRight: '8px', marginBottom: '8px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.tagText }}>
                  {item.province || '未知'} {item.city || ''}
                </Text>
              </View>
              <View style={{
                padding: '5px 10px', borderRadius: '999px',
                backgroundColor: palette.tag, marginRight: '8px', marginBottom: '8px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.tagText }}>
                  {item.school_type || '未填写'}
                </Text>
              </View>
            </View>

            <View style={{
              backgroundColor: palette.surface, borderRadius: '16px',
              padding: '12px', marginBottom: '10px', border: `1px solid ${palette.line}`,
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

            <Text style={{ color: palette.link, fontSize: '13px', fontWeight: 'bold' }}>
              查看详情 ›
            </Text>
          </View>
        )
      })}
    </View>
  )
}

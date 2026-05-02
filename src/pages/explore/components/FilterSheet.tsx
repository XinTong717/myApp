import { Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { CHILD_AGE_OPTIONS } from '../../../constants/profile'
import { exploreTheme, ghostButtonStyle, primaryButtonStyle, sheetStyle } from '../styles'
import type { ProfileCompletenessFilter, UserRoleFilter } from '../types'
import { FilterChip } from './Chips'

type FilterSheetProps = {
  visible: boolean
  selectedUserRole: UserRoleFilter
  setSelectedUserRole: (role: UserRoleFilter) => void
  selectedChildAgeRange: string
  setSelectedChildAgeRange: (stage: string) => void
  selectedProfileCompleteness: ProfileCompletenessFilter
  setSelectedProfileCompleteness: (value: ProfileCompletenessFilter) => void
  selectedUserCity: string
  setSelectedUserCity: (city: string) => void
  userCityOptions: string[]
  onReset: () => void
  onClose: () => void
}

const ROLE_OPTIONS: UserRoleFilter[] = ['全部', '家长', '教育者', '同行者']

export default function FilterSheet(props: FilterSheetProps) {
  const {
    visible,
    selectedUserRole,
    setSelectedUserRole,
    selectedChildAgeRange,
    setSelectedChildAgeRange,
    selectedProfileCompleteness,
    setSelectedProfileCompleteness,
    selectedUserCity,
    setSelectedUserCity,
    onReset,
    onClose,
  } = props

  if (!visible) return null

  const resetClientOnlyFilters = () => {
    if (selectedProfileCompleteness !== '全部') setSelectedProfileCompleteness('全部')
    if (selectedUserCity !== '全部') setSelectedUserCity('全部')
  }

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(event: any) => event?.stopPropagation?.()} style={sheetStyle}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '14px' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: exploreTheme.text }}>筛选同路人</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: exploreTheme.subtext }}>身份和孩子学段会同步影响地图聚合数字；学习社区点位不受影响</Text>
            </View>
          </View>
          <View onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '999px', backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: '16px', color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        <View style={{ marginBottom: '14px' }}>
          <Text style={{ fontSize: '13px', fontWeight: 'bold', color: palette.brand }}>身份</Text>
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '8px' }}>
            {ROLE_OPTIONS.map((role) => (
              <FilterChip
                key={role}
                active={selectedUserRole === role}
                tone={role === '教育者' ? 'educator' : role === '家长' ? 'brand' : role === '同行者' ? 'user' : 'neutral'}
                text={role}
                onClick={() => {
                  resetClientOnlyFilters()
                  setSelectedUserRole(role)
                  if (role !== '家长') setSelectedChildAgeRange('全部')
                }}
              />
            ))}
          </View>
        </View>

        {selectedUserRole === '家长' && (
          <View style={{ marginBottom: '14px' }}>
            <Text style={{ fontSize: '13px', fontWeight: 'bold', color: palette.brand }}>孩子学段</Text>
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '8px' }}>
              {(['全部', ...CHILD_AGE_OPTIONS] as const).map((stage) => (
                <FilterChip
                  key={stage}
                  active={selectedChildAgeRange === stage}
                  tone='brand'
                  text={stage}
                  onClick={() => {
                    resetClientOnlyFilters()
                    setSelectedChildAgeRange(stage)
                  }}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ backgroundColor: palette.cardSoft, borderRadius: '14px', padding: '10px 12px', marginBottom: '18px', border: `1px solid ${palette.line}` }}>
          <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
            资料完整度和城市筛选已暂时收起，避免全国聚合数字和前端二次过滤结果不一致。后续若需要，会改为服务端统一筛选后再恢复。
          </Text>
        </View>

        <View style={{ display: 'flex', flexDirection: 'row' }}>
          <View onClick={onReset} style={{ ...ghostButtonStyle, flex: 1, marginRight: '10px' }}>
            <Text style={{ fontSize: '14px', color: exploreTheme.tagText, fontWeight: 'bold' }}>重置</Text>
          </View>
          <View onClick={onClose} style={{ ...primaryButtonStyle, flex: 1 }}>
            <Text style={{ fontSize: '14px', color: '#FFF', fontWeight: 'bold' }}>完成</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

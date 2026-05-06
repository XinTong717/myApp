import { Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { CHILD_AGE_OPTIONS } from '../../../constants/profile'
import { exploreTheme } from '../styles'
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
      <View onClick={(event: any) => event?.stopPropagation?.()} style={{ width: '100%', backgroundColor: exploreTheme.surface, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: `${space(4)} ${space(4)} ${space(6)}`, boxSizing: 'border-box', borderTop: `1px solid ${exploreTheme.border}` }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(4) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.title, color: exploreTheme.text }}>筛选同路人</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: exploreTheme.subtext }}>身份和孩子学段会同步影响地图聚合数字；学习社区点位不受影响</Text>
            </View>
          </View>
          <View onClick={onClose} style={{ width: space(7), height: space(7), borderRadius: radius.pill, backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...typography.sectionTitle, color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        <View style={{ marginBottom: space(4) }}>
          <Text style={{ ...typography.bodyStrong, color: palette.brand }}>身份</Text>
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: space(2) }}>
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
          <View style={{ marginBottom: space(4) }}>
            <Text style={{ ...typography.bodyStrong, color: palette.brand }}>孩子学段</Text>
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: space(2) }}>
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

        <View style={{ backgroundColor: palette.cardSoft, borderRadius: radius.md, padding: `${space(3)} ${space(3)}`, marginBottom: space(5), border: `1px solid ${palette.line}` }}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>
            资料完整度和城市筛选已暂时收起，避免全国聚合数字和前端二次过滤结果不一致。后续若需要，会改为服务端统一筛选后再恢复。
          </Text>
        </View>

        <View style={{ display: 'flex', flexDirection: 'row' }}>
          <View onClick={onReset} style={{ flex: 1, marginRight: space(3), backgroundColor: exploreTheme.tag, borderRadius: radius.md, padding: space(4), textAlign: 'center' }}>
            <Text style={{ ...typography.button, color: exploreTheme.tagText }}>重置</Text>
          </View>
          <View onClick={onClose} style={{ flex: 1, backgroundColor: palette.brand, borderRadius: radius.md, padding: space(4), textAlign: 'center' }}>
            <Text style={{ ...typography.button, color: '#FFF' }}>完成</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

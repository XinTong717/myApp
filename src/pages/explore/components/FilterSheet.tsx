import { ScrollView, Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { CHILD_AGE_OPTIONS } from '../../../constants/profile'
import { exploreTheme, ghostButtonStyle, primaryButtonStyle, sheetStyle } from '../styles'
import type { ProfileCompletenessFilter, UserRoleFilter } from '../types'
import { FilterChip, ProvinceChip } from './Chips'

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
const COMPLETENESS_OPTIONS: ProfileCompletenessFilter[] = ['全部', '有简介', '有联络说明']

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
    userCityOptions,
    onReset,
    onClose,
  } = props

  if (!visible) return null

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(event: any) => event?.stopPropagation?.()} style={sheetStyle}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '14px' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: exploreTheme.text }}>筛选同路人</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: exploreTheme.subtext }}>只影响地图上的同路人，不影响学习社区点位</Text>
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
                  onClick={() => setSelectedChildAgeRange(stage)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ marginBottom: '14px' }}>
          <Text style={{ fontSize: '13px', fontWeight: 'bold', color: palette.brand }}>资料完整度</Text>
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '8px' }}>
            {COMPLETENESS_OPTIONS.map((item) => (
              <FilterChip
                key={item}
                active={selectedProfileCompleteness === item}
                tone='neutral'
                text={item}
                onClick={() => setSelectedProfileCompleteness(item)}
              />
            ))}
          </View>
        </View>

        <View style={{ marginBottom: '18px' }}>
          <Text style={{ fontSize: '13px', fontWeight: 'bold', color: palette.brand }}>城市</Text>
          <ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', height: '34px', marginTop: '8px' }}>
            <View style={{ display: 'inline-flex', flexDirection: 'row' }}>
              {userCityOptions.map((city) => (
                <ProvinceChip
                  key={city}
                  active={selectedUserCity === city}
                  text={city}
                  onClick={() => setSelectedUserCity(city)}
                />
              ))}
            </View>
          </ScrollView>
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

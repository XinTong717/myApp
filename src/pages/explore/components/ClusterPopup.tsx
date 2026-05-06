import { ScrollView, Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { exploreTheme } from '../styles'
import type { AppUser, MarkerItem } from '../types'
import { normalizeRolesForDisplay } from '../types'

type ClusterPopupProps = {
  cluster: MarkerItem | null
  onClose: () => void
  onOpenUser: (user: AppUser, cluster: MarkerItem) => void
}

const sheetStyle = {
  width: '100%',
  backgroundColor: exploreTheme.surface,
  borderTopLeftRadius: radius.md,
  borderTopRightRadius: radius.md,
  padding: `${space(4)} ${space(4)} ${space(6)}`,
  boxSizing: 'border-box',
  borderTop: `1px solid ${exploreTheme.border}`,
} as const

const panelStyle = {
  backgroundColor: exploreTheme.surface,
  borderRadius: radius.md,
  padding: `${space(3)} ${space(3)}`,
  border: `1px solid ${exploreTheme.border}`,
} as const

export default function ClusterPopup(props: ClusterPopupProps) {
  const { cluster, onClose, onOpenUser } = props

  if (!cluster) return null

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(e: any) => e?.stopPropagation?.()} style={{ ...sheetStyle, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: space(3) }}>
          <View style={{ flex: 1, paddingRight: space(3) }}>
            <Text style={{ ...typography.title, color: exploreTheme.text }}>{cluster.name}</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: exploreTheme.subtext }}>{cluster.clusterUsers?.length || 0} 位同路人在这个区域</Text>
            </View>
          </View>
          <View onClick={onClose} style={{ width: space(7), height: space(7), borderRadius: radius.pill, backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...typography.sectionTitle, color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        <ScrollView scrollY style={{ maxHeight: '48vh' }}>
          {(cluster.clusterUsers || []).map((user) => {
            const name = user.displayName?.trim() || '同路人'
            const roles = normalizeRolesForDisplay(user.roles || []).join(' / ')
            return (
              <View key={user._id} onClick={() => onOpenUser(user, cluster)} style={{ ...panelStyle, marginBottom: space(3) }}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.button, color: exploreTheme.text }}>{name}</Text>
                    <View style={{ marginTop: space(1) }}>
                      <Text style={{ ...typography.caption, color: exploreTheme.subtext }}>{[roles, user.city].filter(Boolean).join(' · ') || '同路人'}</Text>
                    </View>
                  </View>
                  <Text style={{ ...typography.caption, color: palette.brand }}>查看 ›</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

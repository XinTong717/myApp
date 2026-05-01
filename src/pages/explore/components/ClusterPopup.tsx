import { ScrollView, Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { exploreTheme, panelStyle, sheetStyle } from '../styles'
import type { AppUser, MarkerItem } from '../types'
import { normalizeRolesForDisplay } from '../types'

type ClusterPopupProps = {
  cluster: MarkerItem | null
  onClose: () => void
  onOpenUser: (user: AppUser, cluster: MarkerItem) => void
}

export default function ClusterPopup(props: ClusterPopupProps) {
  const { cluster, onClose, onOpenUser } = props

  if (!cluster) return null

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(e: any) => e?.stopPropagation?.()} style={{ ...sheetStyle, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: '12px' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: exploreTheme.text }}>{cluster.name}</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: exploreTheme.subtext }}>{cluster.clusterUsers?.length || 0} 位同路人在这个区域</Text>
            </View>
          </View>
          <View onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '999px', backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: '16px', color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        <ScrollView scrollY style={{ maxHeight: '48vh' }}>
          {(cluster.clusterUsers || []).map((user) => {
            const name = user.displayName?.trim() || '同路人'
            const roles = normalizeRolesForDisplay(user.roles || []).join(' / ')
            return (
              <View key={user._id} onClick={() => onOpenUser(user, cluster)} style={{ ...panelStyle, marginBottom: '10px' }}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '15px', fontWeight: 'bold', color: exploreTheme.text }}>{name}</Text>
                    <View style={{ marginTop: '4px' }}>
                      <Text style={{ fontSize: '12px', color: exploreTheme.subtext }}>{[roles, user.city].filter(Boolean).join(' · ') || '同路人'}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: '12px', color: palette.brand, fontWeight: 'bold' }}>查看 ›</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

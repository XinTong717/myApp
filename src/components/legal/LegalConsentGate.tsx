import { useEffect, useState, type ReactNode } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'
import {
  hasCurrentLocalLegalConsent,
  recordLegalConsent,
} from '../../services/legalConsent'

declare const getCurrentPages: undefined | (() => Array<{ route?: string; options?: Record<string, unknown> }>)

type ConsentChecks = {
  terms: boolean
  privacy: boolean
  adult: boolean
}

const initialChecks: ConsentChecks = {
  terms: false,
  privacy: false,
  adult: false,
}

const LEGAL_PAGE_ROUTES = new Set([
  'pages/user-agreement/index',
  'pages/privacy-policy/index',
  'pkg/legal/user-agreement/index',
  'pkg/legal/privacy-policy/index',
])

const TAB_PAGE_ROUTES = new Set([
  'pages/explore/index',
  'pages/schools/index',
  'pages/events/index',
  'pages/profile/index',
])

function getCurrentRouteInfo() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  const route = String(current?.route || '')
  const options = current?.options || {}
  const query = Object.keys(options)
    .filter((key) => options[key] !== undefined && options[key] !== null && options[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(options[key]))}`)
    .join('&')

  return {
    route,
    url: route ? `/${route}${query ? `?${query}` : ''}` : '/pages/explore/index',
  }
}

function isLegalPageRoute(route: string) {
  return LEGAL_PAGE_ROUTES.has(route)
}

function ConsentCheckbox(props: {
  checked: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <View
      onClick={props.onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 0',
      }}
    >
      <View
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '6px',
          flexShrink: 0,
          marginTop: '1px',
          backgroundColor: props.checked ? palette.brand : '#FFFFFF',
          border: `1px solid ${props.checked ? palette.brand : palette.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>{props.checked ? '✓' : ''}</Text>
      </View>
      <View style={{ flex: 1 }}>{props.children}</View>
    </View>
  )
}

export default function LegalConsentGate() {
  const [visible, setVisible] = useState(false)
  const [checks, setChecks] = useState<ConsentChecks>(initialChecks)
  const [submitting, setSubmitting] = useState(false)

  const refreshVisibility = () => {
    const { route } = getCurrentRouteInfo()
    if (hasCurrentLocalLegalConsent() || isLegalPageRoute(route)) {
      setVisible(false)
      return
    }
    setVisible(true)
  }

  useEffect(() => {
    refreshVisibility()
  }, [])

  useDidShow(() => {
    refreshVisibility()
  })

  if (!visible) return null

  const toggle = (key: keyof ConsentChecks) => {
    setChecks((current) => ({ ...current, [key]: !current[key] }))
  }

  const openUserAgreement = () => {
    setVisible(false)
    Taro.navigateTo({ url: '/pages/user-agreement/index' })
  }

  const openPrivacyPolicy = () => {
    setVisible(false)
    Taro.navigateTo({ url: '/pages/privacy-policy/index' })
  }

  const reloadCurrentPage = () => {
    const { route, url } = getCurrentRouteInfo()
    if (isLegalPageRoute(route)) return
    if (TAB_PAGE_ROUTES.has(route)) {
      Taro.switchTab({ url: `/${route}` })
      return
    }
    Taro.redirectTo({ url }).catch(() => {
      Taro.reLaunch({ url })
    })
  }

  const handleAgree = async () => {
    if (!checks.terms) {
      Taro.showToast({ title: '请先阅读并同意用户协议', icon: 'none' })
      return
    }
    if (!checks.privacy) {
      Taro.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' })
      return
    }
    if (!checks.adult) {
      Taro.showToast({ title: '请先确认已满18周岁', icon: 'none' })
      return
    }

    setSubmitting(true)
    const result = await recordLegalConsent()
    setSubmitting(false)

    if (!result.ok) {
      Taro.showToast({ title: result.message || '确认失败，请稍后重试', icon: 'none' })
      return
    }

    setVisible(false)
    Taro.showToast({ title: '已确认', icon: 'success' })
    reloadCurrentPage()
  }

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(31, 26, 23, 0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 18px',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: '360px',
          backgroundColor: palette.card,
          borderRadius: '24px',
          padding: '22px 18px 18px',
          boxShadow: '0 18px 48px rgba(80, 43, 30, 0.18)',
          border: `1px solid ${palette.line}`,
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ ...typography.sectionTitle, color: palette.text, display: 'block', marginBottom: '8px' }}>
          欢迎来到可雀
        </Text>
        <Text style={{ ...typography.body, color: palette.subtext, display: 'block', marginBottom: '14px' }}>
          可雀目前仅面向18岁及以上用户。继续使用前，请阅读并同意用户协议与隐私政策；我们会处理你的微信用户标识，用于登录、安全与基础服务提供。
        </Text>
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: '16px',
            padding: '10px 12px',
            border: `1px solid ${palette.lineSoft}`,
            marginBottom: '12px',
          }}
        >
          <Text style={{ ...typography.caption, color: palette.subtext }}>
            请不要填写或上传可直接识别未成年人的姓名、学校、住址、联系方式或精确行程。
          </Text>
        </View>

        <ConsentCheckbox checked={checks.terms} onClick={() => toggle('terms')}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>我已阅读并同意</Text>
          <Text onClick={openUserAgreement} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>《用户协议》</Text>
        </ConsentCheckbox>

        <ConsentCheckbox checked={checks.privacy} onClick={() => toggle('privacy')}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>我已阅读并同意</Text>
          <Text onClick={openPrivacyPolicy} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>《隐私政策》</Text>
        </ConsentCheckbox>

        <ConsentCheckbox checked={checks.adult} onClick={() => toggle('adult')}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>我确认本人已满18周岁</Text>
        </ConsentCheckbox>

        <Button
          loading={submitting}
          disabled={submitting}
          onClick={handleAgree}
          style={{
            marginTop: '10px',
            height: '44px',
            lineHeight: '44px',
            borderRadius: '999px',
            backgroundColor: palette.brand,
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '15px',
            border: 'none',
          }}
        >
          {submitting ? '保存中...' : '同意并继续'}
        </Button>
      </View>
    </View>
  )
}

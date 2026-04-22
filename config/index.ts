import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'webpack5'>(async (merge, { mode }) => {
  const runtimeEnv = process.env.NODE_ENV || mode || 'development'
  const fallbackCloudEnvId = 'cloud1-9g8njw4c79fb1322'
  const devCloudEnvId = process.env.TARO_APP_CLOUD_ENV_DEV || fallbackCloudEnvId
  const prodCloudEnvId = process.env.TARO_APP_CLOUD_ENV_PROD || fallbackCloudEnvId
  const cloudEnvId = runtimeEnv === 'development' ? devCloudEnvId : prodCloudEnvId
  const isSharedCloudEnv = devCloudEnvId === prodCloudEnvId

  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'myApp',
    date: '2026-2-20',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      '@tarojs/plugin-generator'
    ],
    defineConstants: {
      __WEAPP_CLOUD_ENV_ID__: JSON.stringify(cloudEnvId),
      __WEAPP_RUNTIME_ENV__: JSON.stringify(runtimeEnv),
      __WEAPP_IS_SHARED_CLOUD_ENV__: JSON.stringify(isSharedCloudEnv),
    },
    copy: {
      patterns: [
        { from: 'src/assets/', to: 'dist/assets/', ignore: ['*.ts'] },
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})

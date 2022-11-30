import nodeResolve from '@rollup/plugin-node-resolve'
import typescript2 from 'rollup-plugin-typescript2'
import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'lib/live2d-cubism-framework.ts',
    output: {
      file: 'lib/RepackedFramework/live2d-cubism-framework.js',
      format: 'umd',
      name: 'Live2DCubismFramework'
    },
    plugins: [
      nodeResolve({ extensions: ['.ts'], rootDir: 'lib' }),
      typescript2({ tsconfig: 'lib/Framework/tsconfig.json' })
    ]
  },
  {
    input: 'lib/live2d-cubism-framework.ts',
    output: {
      file: 'lib/RepackedFramework/live2d-cubism-framework.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  }
]

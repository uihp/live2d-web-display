// import alias from '@rollup/plugin-alias'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript2 from 'rollup-plugin-typescript2'
import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'index.ts',
    output: {
      file: 'dist/live2d-web-display.js',
      format: 'umd',
      name: 'Live2DWebDisplay',
      globals: id => id.includes('@framework') && 'Live2DCubismFramework'
    },
    plugins: [
      nodeResolve({ extensions: ['.ts'], rootDir: 'src' }),
      typescript2()
    ],
    external: [/@framework\/*/]
  },
  {
    input: 'index.ts',
    output: {
      file: 'dist/live2d-web-display.d.ts',
      format: 'esm'
    },
    plugins: [
      // alias({ entries: [{ find: /^@framework\/(.*)$/, replacement: 'lib/RepackedFramework/Framework/src/$1.d.ts' }] }),
      dts()
    ],
    external: [/@framework\/*/] // remove this line if you wanna bundle with repacked framework declaration files.
  }
]

// Punto de entrada de la función serverless en Vercel.
//
// Cargamos el backend YA COMPILADO por `nest build` (tsc, con emitDecoratorMetadata),
// porque el bundler de Vercel no emite por sí mismo la metadata de decoradores que
// NestJS necesita para su inyección de dependencias. El `buildCommand` de vercel.json
// ejecuta `npm run build` antes de empaquetar la función, así que /dist ya existe.
// @ts-ignore: '../dist/serverless' se genera en el build (puede no existir en lint).
import handler from '../dist/serverless';

export default handler;

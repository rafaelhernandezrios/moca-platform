# 🚀 Despliegue en Vercel (a través de GitHub)

Esta guía despliega la plataforma como **dos proyectos de Vercel** que apuntan al
**mismo repositorio de GitHub**, cada uno con un *Root Directory* distinto:

1. **Backend** (`/backend`) → NestJS como **función serverless**.
2. **Frontend** (`/frontend`) → app Vite estática.

> ¿Por qué dos proyectos? Vercel solo ejecuta funciones serverless (no servidores
> persistentes). NestJS corre como una función; el frontend se sirve como estático.
> Mantenerlos separados evita builds mezclados y es lo más simple de operar.

---

## 0. Prerrequisitos

- Repo subido a GitHub (`git push`).
- Una cuenta de Vercel conectada a tu GitHub.
- Tu cluster de **MongoDB Atlas** con acceso de red abierto a Vercel
  (en Atlas → *Network Access* agrega `0.0.0.0/0`, ya que las IPs de Vercel son dinámicas).
- Tu **API Key de OpenAI**.

---

## 1. Desplegar el BACKEND

1. En Vercel: **Add New → Project** → importa el repo de GitHub.
2. En la configuración del proyecto:
   - **Root Directory**: `backend`
   - **Framework Preset**: *Other* (lo detecta por `vercel.json`).
   - Build/Install los toma de `backend/vercel.json` (`npm run build`).
3. **Environment Variables** (Settings → Environment Variables):

   | Nombre | Valor |
   |---|---|
   | `MONGO_URI` | `mongodb+srv://usuario:pass@cluster.mongodb.net/MOCKA?retryWrites=true&w=majority` |
   | `JWT_SECRET` | una cadena larga y aleatoria |
   | `OPENAI_API_KEY` | `sk-...` |
   | `TRANSCRIBE_MODEL` | *(opcional)* `gpt-4o-mini-transcribe` |

   > No definas `PORT` (en serverless no aplica).
4. **Deploy**. Al terminar tendrás una URL como `https://moca-backend.vercel.app`.
5. Verifica que responde: abre `https://moca-backend.vercel.app/health` → debe devolver `{"status":"ok"}`.

## 2. Desplegar el FRONTEND

1. En Vercel: **Add New → Project** → importa **el mismo repo** otra vez.
2. Configuración:
   - **Root Directory**: `frontend`
   - **Framework Preset**: *Vite* (autodetectado).
3. **Environment Variables**:

   | Nombre | Valor |
   |---|---|
   | `VITE_API_URL` | la URL del backend del paso 1, p.ej. `https://moca-backend.vercel.app` |

4. **Deploy**. Obtendrás algo como `https://moca-frontend.vercel.app`.

## 3. Verificación

- Abre la URL del frontend (HTTPS ⇒ el **micrófono** funciona).
- Regístrate / inicia sesión (crea un profesional), crea un paciente e inicia una evaluación.
- Prueba un módulo con voz (Atención/Lenguaje/Memoria) y uno de dibujo (Visuoespacial).
- El reporte con puntajes debe verse **solo en el dashboard**.

---

## Notas y solución de problemas

- **CORS**: el backend ya usa `enableCors()` abierto, por lo que el frontend puede
  llamarlo desde otro dominio. Si prefieres mismo-origen, puedes en su lugar añadir un
  *rewrite* `/api/* → https://TU-BACKEND.vercel.app/*` en `frontend/vercel.json` y dejar
  `VITE_API_URL=/api`.
- **MongoDB Atlas / Network Access**: si el backend responde 500 al loguearse, casi
  siempre es que Atlas no permite la IP; agrega `0.0.0.0/0`.
- **Estado en memoria**: el módulo Visuoespacial ya evalúa la imagen en una sola llamada
  (`/tests/:id/visuospatial/:task/submit-and-evaluate`), sin depender de memoria entre
  requests (necesario en serverless).
- **NestJS en serverless**: la función (`backend/api/index.ts`) carga el backend **ya
  compilado** por `nest build` (en `dist/`), porque el bundler de Vercel no emite la
  metadata de decoradores que Nest requiere. Si ves errores de inyección de dependencias,
  confirma que el *Build Command* (`npm run build`) se ejecutó correctamente en el deploy.
- **Cold starts**: la primera petición tras inactividad puede tardar unos segundos
  mientras la función arranca Nest y conecta a Mongo. Es normal en serverless.
- **Límite de payload**: Vercel Hobby limita el body a ~4.5 MB. Los dibujos (PNG) y los
  audios cortos quedan muy por debajo.
- **Redeploys automáticos**: cada `git push` a la rama conectada dispara un nuevo deploy
  en ambos proyectos.

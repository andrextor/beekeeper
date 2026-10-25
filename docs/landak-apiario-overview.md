# LANDAK APIARIO
## Documento maestro de contexto, producto y transferencia técnica para Claude

**Fecha de consolidación:** 21 de octubre de 2026  
**Estado del documento:** punto de partida para auditar y continuar el proyecto, no certificación de funcionalidades terminadas.  
**Nombre de trabajo:** Landak Apiario (el nombre comercial definitivo no está cerrado).  
**Proyecto impulsor:** Finca Landak — Agroecología Integral.

---

## 1. Resumen ejecutivo

Queremos desarrollar **una aplicación Android de gestión apícola, gratuita y útil para cualquier apicultor**, no solamente para Finca Landak. Debe permitir administrar varias organizaciones/explotaciones, fincas, apiarios y colmenas, identificar cada colmena con un **código QR único**, registrar visitas e inspecciones **hablando** en lugar de rellenar largos formularios y consultar el historial de cada colonia. La aplicación debe estar pensada para trabajar **sin cobertura de internet**: guardar las operaciones localmente y sincronizarlas cuando vuelva la señal.

**Flujo estrella:** `Escanear QR de colmena → abrir ficha e historial → dictar revisión → convertir voz en datos editables → comprobar/corregir → guardar localmente → sincronizar cuando sea posible`.

Debe ser una herramienta de campo: pocos toques, buen contraste exterior, formularios cortos, botones grandes, estados de sincronización comprensibles y cero pérdida de datos. El producto debe poder crecer desde el registro individual hasta la planificación sanitaria, la gestión de cosechas, la trazabilidad, el trabajo colaborativo y la analítica de apiarios.

### Principios no negociables que ya se acordaron

- **Gratuita para los apicultores.** Evitar dependencias de pago que impidan usar las funciones esenciales; los posibles costos de IA y sincronización deben analizarse, no ocultarse.
- **Android primero**, con instalación sencilla vía **APK**. Publicación en Play Store, más adelante.
- **Multiapicultor y multifinca desde el principio**, no como adaptación tardía; aislamiento de datos por propietario/organización.
- **Offline-first de verdad**: una revisión debe poder registrarse aunque no exista internet.
- **QR globalmente único** por colmena, con estrategia de versionado o reasignación controlada sin imprimir etiquetas innecesariamente.
- **Registro por voz con confirmación humana**: conservar el texto original, proponer campos estructurados y permitir corregirlos antes de guardar.
- **Historial completo y trazabilidad** de cada colmena.
- **Diseño práctico para el apicultor**, sin sacrificar seguridad o fiabilidad por efectos visuales.

---

## 2. Personas y escenarios de uso

### Usuarios

1. **Apicultor individual:** gestiona una o varias fincas, apiarios y colmenas; inspecciona y consulta historial.
2. **Apicultor o empresa con equipo:** comparte explotación/apiarios con trabajadores, técnicos y observadores.
3. **Finca Landak:** primer entorno para pilotos y validaciones reales, sin que sus datos se mezclen con los de otros apicultores.

### Roles previstos

`owner`, `admin`, `worker`, `viewer`. El alcance exacto de permisos debe auditarse y cerrarse: propietario controla la organización y colaboradores; administrador gestiona recursos; trabajador registra acciones autorizadas; observador consulta sin editar. No basta con ocultar controles: el servidor debe aplicar permisos y RLS.

### Escenario principal

Un apicultor llega al apiario, escanea el QR de una colmena, consulta la última visita, dicta en lenguaje natural lo que observó, corrige un campo si la transcripción o interpretación es incorrecta y guarda la revisión. Si está sin cobertura, puede pasar a la siguiente colmena con el dato guardado localmente; al recuperar señal, el dispositivo sincroniza sin duplicar revisiones.

---

## 3. Modelo funcional

### Jerarquía de organización

`ORGANIZACIÓN / EXPLOTACIÓN → FINCA → APIARIO → COLMENA → EVENTOS Y REVISIONES`.

Una persona puede participar en más de una organización si sus permisos lo permiten. Cada organización conserva datos separados de las demás.

### Funciones esenciales del MVP / V1

| Área | Funcionalidad esperada |
|---|---|
| Acceso | Registro, inicio/cierre de sesión, recuperación de acceso y elección de organización según permisos. |
| Organización | Crear/editar explotación y gestionar miembros y roles, según alcance de MVP. |
| Fincas | Alta, edición, listado, descripción y localización opcional. |
| Apiarios | Crear, listar y asociar a una finca. |
| Colmenas | Crear, editar, identificar, consultar estado e historial. |
| QR | Crear/mostrar identificador único, imprimir/compartir etiqueta, escanear y abrir colmena correcta. |
| Revisiones | Formulario estructurado con fecha, observaciones, acciones y próxima revisión. |
| Voz | Dictado, transcripción, propuesta de campos y paso de confirmación editable. Conservar transcripción original. |
| Evidencias | Fotografías asociadas a colmena/revisión, si se confirma viable dentro de V1. |
| Offline | Consultar datos previamente descargados, crear revisiones sin señal y ver qué falta sincronizar. |
| Sincronización | Envío posterior a Supabase, reintentos, deduplicación y gestión visible de errores. |
| Historial | Línea de tiempo legible de revisiones y eventos por colmena. |
| Google Sheets/Forms | Integración contemplada desde el origen; verificar si sigue siendo necesaria para V1 y, en tal caso, tratarla como exportación/salida, no como dependencia del uso sin señal. |

### Contenido de una revisión de colmena

La definición preliminar incluía bloques:

- **Identificación:** colmena, apiario, fecha/hora, responsable de la visita.
- **Colonia:** fuerza de población (escala 1–5), reina vista, postura, celdas reales.
- **Cría y reservas:** número/estado de cuadros de cría, miel/alimento/reservas.
- **Sanidad:** plagas, síntomas, enfermedades sospechadas, varroa, tratamientos y observaciones; no inferir diagnósticos sin fundamento.
- **Trabajo:** alimentación, acciones realizadas, tareas pendientes, grado de atención requerido, próxima revisión y notas.
- **Trazabilidad de captura:** texto original dictado, campos propuestos, campos confirmados, responsable y estado de sincronización.

Los campos y valores son una **propuesta inicial** recuperada del alcance anterior, no un formulario final aprobado. Claude debe convertirlos en un esquema revisable por un apicultor experto, permitiendo `desconocido` y `no observado` en vez de forzar falsos datos.

### Ejemplo ilustrativo de interacción por voz

> “Colmena 12. La reina no se vio, hay buena postura, tres cuadros de cría, reservas bajas. Alimentar y revisar en ocho días.”

La app transcribe el dictado y propone: `queen_seen=false`, `laying_status=buena`, `brood_frames=3`, `stores=bajas`, `action=alimentación`, `next_review=fecha calculada`. **El usuario confirma o corrige antes del guardado.** Lo importante es no convertir una inferencia dudosa en un dato sanitario confirmado.

### Eventos previstos, además de revisiones

Tipos de evento discutidos: `review`, `feeding`, `treatment`, `queen_change`, `harvest`, `split`, `swarm`, `transfer`, `loss`, `note`. También se contemplaron unión de colmenas y enjambrazón. Estos eventos deberían compartir una línea de tiempo, con detalles propios por tipo y trazabilidad del autor.

---

## 4. Experiencia de uso (UX/UI)

La app debe optimizarse para llevar guantes, tener poco tiempo, recibir luz solar intensa y trabajar con conexión intermitente.

**Navegación inicial sugerida:** Inicio / Mis fincas o apiarios / Escanear / Actividad o pendientes / Perfil. Es propuesta de diseño, no implementación confirmada.

**Pantallas del proyecto inicial:** Home, Apiary, Hive y Review; en el último punto de desarrollo había que probar el recorrido `Crear cuenta → Explotación → Finca → Apiario → Colmena`.

**Principios de diseño:**

- El escáner y «Nueva revisión» deben estar siempre a un toque o dos.
- El registro manual debe funcionar si no se puede usar el micrófono.
- Siempre mostrar «guardado en este dispositivo», «pendiente de sincronizar», «sincronizado» o «requiere atención».
- Formularios accesibles con controles claros, campos opcionales y posibilidad de guardar borrador.
- Evitar bloquear una revisión por una transcripción imperfecta.
- Mostrar claramente a qué apiario y colmena pertenece cada operación.
- Evitar eliminar definitivamente un historial; usar correcciones y trazabilidad cuando corresponda.

### Identidad visual

Usar el **Manual de Identidad de Finca Landak (2025)** como referencia si se adopta su identidad en la app. La identidad debe ser reconocible, pero sin hacer creer que cada cuenta pertenece a Finca Landak.

- Verde principal: `#0c6511`
- Azul verde oscuro: `#04303b`
- Verde claro: `#82c75c`
- Amarillo naranja: `#ffb545`
- Amarillo claro: `#e8e454`
- Tipografías declaradas en el manual: **Arsenal** (principal), **pastyu** (secundaria) y **Bellota Text Light** (complementaria). Confirmar licencias, legibilidad móvil y disponibilidad de archivos antes de implementarlas.

Priorizar accesibilidad, contraste y lectura móvil frente a la aplicación literal de todos los colores.

---

## 5. Arquitectura técnica elegida

### Stack ya escogido en septiembre de 2026

- **Frontend:** React + TypeScript + Vite.
- **Aplicación Android:** Capacitor 8; en el prototipo inicial se mencionó Capacitor `8.5.2`.
- **Persistencia remota y autenticación:** Supabase (PostgreSQL, Auth, RLS y, si se usa para fotos, Storage).
- **Persistencia local:** SQLite en Android.
- **Sincronización offline:** cola local `outbox` y sincronizador de subida/reintentos.
- **Distribución inicial:** archivo APK para instalación y pruebas en Android.

No migrar de stack por preferencia estética sin auditar primero el código y justificar el beneficio/riesgo.

### Flujo offline-first

`Interfaz → SQLite local → operación en outbox → [hay conexión/autenticación] → sincronizador → Supabase → confirmación local`.

Criterios arquitectónicos:

- Crear IDs en cliente para operaciones offline, idealmente UUID.
- Persistir localmente la acción antes de declarar que fue guardada.
- Evitar duplicados cuando se repite un envío; operaciones idempotentes.
- Usar `id`, `updated_at`, `version` u otra estrategia explícita para detectar cambios concurrentes y resolver conflictos.
- El usuario debe saber qué registros están pendientes o fallaron.
- Asegurar que eventos y revisiones mantengan su relación con la colmena incluso con fallos parciales.
- Registrar cambios en fechas y autores de manera consistente.
- Los datos de otras organizaciones nunca deben llegar a un usuario por fallo del cliente, consulta o RLS.

**Advertencia de arquitectura:** el guardado offline de audio y la conversión de voz a texto son problemas distintos. Si el reconocimiento de voz requiere conexión o servicio de pago, la aplicación debe permitir guardar el audio/borrador offline y procesarlo posteriormente, o disponer de un motor local viable. No prometer reconocimiento completo sin red hasta que se pruebe.

### Modelo de datos en Supabase (versión reportada V0.2)

El 21 de septiembre se informó de la existencia de 7 tablas en el proyecto Supabase **Apiario**:

1. `organizations`
2. `organization_members`
3. `farms`
4. `apiaries`
5. `hives`
6. `hive_events`
7. `hive_reviews`

También se reportaron políticas RLS, roles `owner/admin/worker/viewer` y QR único/versionable. **Esto es un registro del avance anterior, no una auditoría actual de las tablas o sus políticas.** Hay que contrastarlo con migraciones y base de datos recuperada.

Modelo conceptual propuesto:

```text
Auth user
  └─ organization_members (organization_id, user_id, role)
       └─ organizations
            └─ farms
                 └─ apiaries
                      └─ hives (id, qr identity, status, ...)
                           ├─ hive_reviews
                           └─ hive_events
```

Fotos, archivos, cola outbox, dispositivos, operaciones de sincronización y notificaciones pueden requerir modelos adicionales. No inventar su existencia actual: diseñarlos solo tras inspección del repositorio.

### Seguridad y privacidad

- RLS por pertenencia y rol en organización, incluyendo todas las tablas y recursos asociados.
- Un código QR no debe ser una llave de acceso a datos privados: escanear identifica, **la sesión y los permisos autorizan**.
- La llave `service_role` de Supabase no debe estar en el cliente Android o la web.
- Almacenamiento local sensible debe diseñarse considerando pérdida/robo del móvil y cierre de sesión.
- Logs de sincronización útiles, sin revelar secretos o datos de otras organizaciones.

---

## 6. Integraciones y decisiones abiertas

### Google Forms / Google Sheets

En la idea original se contemplaron formularios y una estructura de hojas `APICULTORES → APIARIOS → COLMENAS → REVISIONES → RESUMEN`; hubo un intento de creación de hoja que quedó bloqueado por permisos. **No se verificó una hoja final ni una integración funcionando.**

Recomendación técnica para evaluar con Claude: mantener PostgreSQL/Supabase como sistema operativo principal y usar Sheets como exportación, reporte o integración opcional; una hoja no debería ser necesaria para inspeccionar colmenas offline. Esta es una **recomendación actual**, no una decisión previa cerrada.

### Voz e IA

Separar tres capacidades: (1) grabar o dictar; (2) transcribir; (3) estructurar observaciones y sugerir campos. Definir explícitamente proveedor/costo, idiomas y acentos, privacidad de audio, errores frecuentes y fallback manual. Garantizar que el apicultor pueda ver/corregir cualquier interpretación.

### Fotos

Prever captura offline, reducción de tamaño, relación con eventos o revisiones, envío diferido y manejo de errores. Su inclusión concreta en el primer APK debe ajustarse a viabilidad y tiempo, aunque formaba parte de la visión V1 inicial.

### QR

Definir formato estable, impresión y rotulación, unicidad global, reasignación segura, manejo de duplicados, QR dañado y lectura sin red. El QR puede codificar un identificador opaco sin exponer información personal ni datos privados.

---

## 7. Roadmap histórico y evolución futura

El alcance de septiembre tenía una secuencia de **fases 0 a 9**. A continuación se recompone como plan de trabajo; los criterios específicos son propuestas para organizar la ejecución.

| Fase | Objetivo | Entregable / prueba de éxito |
|---|---|---|
| **0. Fundación** | Proyecto, dependencias, arquitectura, CI/build y base local | App arranca y build reproducible; diagnósticos de seguridad básicos. |
| **1. Multiapicultor** | Auth, organización, miembros, finca y apiario | Cada persona ve únicamente sus datos y tiene permisos correctos. |
| **2. QR** | Identidad de colmena, generación, etiqueta y lector | Escaneo lleva a la ficha correcta online y con información local. |
| **3. Revisiones** | Formulario estructurado, historia y eventos básicos | Revisar y consultar una colmena end-to-end. |
| **4. Offline** | SQLite, outbox, reintentos y conflictos | Crear varias revisiones en modo avión y sincronizarlas sin duplicados. |
| **5. Voz y fotos** | Audio, transcripción, extracción editable y evidencia visual | Dictar, corregir, guardar y recuperar una revisión. |
| **6. Jornada de campo** | Flujo para visitar varias colmenas en secuencia | Una jornada puede gestionarse rápidamente y retomarse tras interrupciones. |
| **7. Sanidad y producción** | Tratamientos, alimentación, reina, cosechas, pérdidas, divisiones | Registrar acciones importantes y consultar trazabilidad. |
| **8. Gestión y análisis** | Indicadores, avisos, comparativas y exportación Sheets/Excel/PDF | Dashboard útil y datos exportables sin pérdida. |
| **9. Distribución** | APK estable, pruebas reales, actualizaciones, eventual Play Store | Instalar y actualizar con proceso comprensible. |

### Agrupación de entregas prevista

**MVP utilizable en campo:** alta de usuario/organización/finca/apiario/colmena; QR; revisión; historial; guardado offline y sincronización; APK Android. La voz es una capacidad central de la propuesta y debe tener prioridad alta, pero si su procesamiento no funciona sin red no debe bloquear el registro manual.

**V1:** consolidar flujo de voz→campos, fotografías y conexión/exportación a Sheets si aún se considera estratégica.

**V1.1:** alertas, cambios de reina, cosechas y operaciones especializadas.

**V2:** métricas históricas, trazabilidad detallada de reinas, comparación entre apiarios, análisis de productividad y salud, apoyo a decisiones de manejo; siempre evitando presentar inferencias automáticas como diagnósticos veterinarios concluyentes.

### Oportunidades adicionales por evaluar, no compromisos anteriores

- Inventarios de materiales, alimento y tratamientos.
- Planificación de visitas y tareas por responsable.
- Georreferenciación de apiarios con controles de privacidad.
- Calendario de floración y observaciones de clima vinculado al territorio.
- Etiquetas e informes imprimibles.
- Respaldos, importación/exportación y migración de datos.
- Indicadores de mortalidad, cosecha, inspecciones vencidas y costos.
- Integración con sensores únicamente si surge necesidad real de campo.

Estas ideas no deben desplazar la validación de QR, revisiones, offline y sincronización.

---

## 8. Historial de versiones y estado real recuperado

| Fecha / versión | Qué se reportó | Qué NO está comprobado |
|---|---|---|
| 20/09/2026, definición | Alcance: app gratis, multiapicultor/multifinca, QR, voz, historial, offline y conexión a Forms/Sheets. | Desarrollo implementado en ese momento. |
| 21/09/2026, starter | `apiario-android-mvp-starter.zip`; arquitectura Android/Capacitor + Supabase + SQLite. | Build, base de datos y uso real. |
| 21/09/2026, V0.1 | `apiario-android-mvp-v0.1.zip`; pantallas Home/Apiary/Hive/Review, datos demo/local, outbox preliminar y QR/SQLite preparados. | Build completo; dependencias interrumpidas/timeout durante instalación. |
| 21/09/2026, V0.2 | `apiario-android-mvp-v0.2.zip`; se reportó Supabase Apiario activo, 7 tablas y RLS. | Que todos los flujos desde la app persistieran realmente en Supabase. |
| 21/09/2026, V0.3 | Hubo fallo de instalación por dependencia inexistente `@capacitor/network@8.0.3`. | Instalación limpia. |
| 21/09/2026, V0.3.1 | `apiario-android-mvp-v0.3.1.zip`; dependencia corregida a `@capacitor/network@8.0.1`; usuario confirmó `npm install` y servidor web Vite listo. | APK instalado, voz real, QR escaneado, sincronización real, seguridad RLS auditada, recorrido completo de altas. |

**Última prueba confirmada:** en Windows, desde una carpeta local identificada como `apiario-android-mvp 2`, `npm install` finalizó (reportó 3 vulnerabilidades moderadas) y `npm run dev` mostró `VITE v8.3.0 ready` con URL `http://localhost:5173/`. El siguiente paso pendiente era probar `Crear cuenta → Explotación → Finca → Apiario → Colmena` y verificar guardado y consulta.

### Supabase anterior

- Nombre de proyecto: `Apiario`.
- ID/ref: `kcqnnlzmhzkrwwlgxlmu`.
- URL del proyecto: `https://kcqnnlzmhzkrwwlgxlmu.supabase.co`.
- Región reportada: `sa-east-1`.
- Plan/costo reportado en ese momento: sin cargo (esto no garantiza costo futuro).
- **Verificación actual (21/10/2026):** el proyecto no figura entre los proyectos disponibles en las cuentas Supabase conectadas actualmente. Tampoco se pudo consultar su esquema por falta de permisos. **No afirmar que fue eliminado.** Puede estar en otra cuenta u organización, suspendido o requerir reconexión.

### Archivos que se deberían recuperar

- `apiario-android-mvp-starter.zip`
- `apiario-android-mvp-v0.1.zip`
- `apiario-android-mvp-v0.2.zip`
- `apiario-android-mvp-v0.3.1.zip` (**prioritario**).
- Migraciones SQL, `.env.example`, `package-lock.json`, manifiesto de Capacitor y activos de marca.
- Manual `MANUAL DE MARCA - LANDAK 2025.pdf` (adjuntarlo si Claude debe aplicar la identidad visual).

**Los nombres indican entregables referidos en conversaciones anteriores; sus archivos reales no están adjuntos a este documento.** Claude debe pedir/inspeccionar el ZIP real de V0.3.1 antes de asegurar qué código contiene.

---

## 9. Riesgos que deben controlarse desde el comienzo

1. **Estado de proyecto vs. prototipo:** que una pantalla arranque en navegador no demuestra que el APK, SQLite nativo ni QR funcionen.
2. **Pérdida o duplicación de inspecciones offline:** hay que probar persistencia, interrupciones y reintentos.
3. **Aislamiento multiusuario:** RLS tiene que validarse con usuarios de distintas organizaciones.
4. **Costos de IA:** no comprometer la gratuidad del producto con llamadas inevitables a servicios de pago.
5. **Voz en campo:** ruido, guantes, conexión, acentos y términos apícolas; siempre corrección manual.
6. **Incompatibilidad de dependencias:** instalar limpiamente, fijar versiones y revisar las 3 vulnerabilidades moderadas reportadas.
7. **Integraciones innecesarias:** Google Sheets debe poder fallar o estar desconectado sin bloquear el registro local.
8. **Reasignación física de QR:** prevenir asociación errónea de una etiqueta con otra colonia.
9. **Seguridad de fotos, audio y geolocalizaciones:** permisos y controles de acceso consistentes.

---

## 10. Definición de terminado para el primer piloto real

No considerar «V1 lista para campo» hasta completar con evidencia lo siguiente:

- [ ] Se puede instalar un APK en un Android de prueba y abrirlo sin ordenador.
- [ ] Se puede registrar/iniciar sesión y crear organización, finca, apiario y colmena.
- [ ] Dos usuarios de organizaciones distintas no pueden leer o editar datos ajenos.
- [ ] Se genera y escanea un QR real que abre la colmena correcta.
- [ ] Hay una revisión manual usable, y la colmena muestra después su historial.
- [ ] En modo avión se puede registrar una revisión y conservarla tras cerrar y reabrir la app.
- [ ] Al volver internet, esa revisión se sincroniza una vez y aparece en el servidor.
- [ ] Si la red falla a mitad de sincronización, no se pierde ni se duplica la revisión.
- [ ] El flujo de voz funciona con confirmación/corrección o tiene un fallback claro que no bloquea la revisión.
- [ ] El usuario puede comprobar qué está sincronizado y qué está pendiente.
- [ ] Se han ensayado los permisos de cámara, micrófono y almacenamiento usados.
- [ ] Se entregan instrucciones reproducibles de instalación, actualización y respaldo.

---

## 11. Trabajo prioritario pedido a Claude

**No reescribir ni rediseñar el proyecto desde cero todavía.** El primer trabajo es una auditoría verificable del ZIP/código disponible y de la conexión con Supabase. Separar siempre: `EXISTE Y FUNCIONA`, `EXISTE PERO NO FUNCIONA`, `SÓLO ESTÁ PREPARADO`, `NO EXISTE`, `NO SE PUEDE VERIFICAR`.

### Primera sesión: auditoría técnica

1. Examinar árbol del proyecto, `package.json`, lockfile, Capacitor, SQLite, Supabase client, routing, pantallas, servicios y migraciones.
2. Identificar dependencias incompatibles, secretos accidentalmente incluidos, errores de compilación y de tipado.
3. Ejecutar (en el entorno disponible) instalación, chequeos, build web y build Android; registrar resultados y bloqueos.
4. Comprobar si hay datos ficticios y qué pantallas se conectan a Supabase realmente.
5. Verificar modelo multi-tenant, pertenencia a organización y RLS.
6. Rastrear si el outbox persiste realmente en SQLite nativo, maneja reintentos e impide duplicaciones.
7. Evaluar scanner QR, voz, fotos, permisos y comportamiento offline real; nada de dar por funcional una función preparada.
8. Buscar el proyecto de Supabase previo solo con credenciales y permisos aportados por el dueño; si no es accesible, preparar estrategia de restauración basada en migraciones.
9. Entregar tabla de hallazgos, prioridad de fallos, plan de recuperación y primer PR/cambio pequeño y verificable.

### Orden sugerido tras auditoría

**P0:** arranque estable + auth + jerarquía + persistencia real + aislamiento de datos.  
**P1:** QR funcional + revisión manual e historial.  
**P2:** SQLite/outbox y pruebas de sincronización sin red.  
**P3:** voz→campos con confirmación + fotos.  
**P4:** jornada, sanidad/producción, exportaciones, alertas y analítica.  
**P5:** distribución refinada, actualizaciones y tienda.

Si una dependencia obliga a variar este orden, justificarlo con evidencia.

### Cómo trabajar

- Presentar cambios incrementales y verificables, sin prometer funcionalidades no ensayadas.
- Priorizar código sencillo, tipado, modular, con tests para lógica de sincronización y permisos.
- Documentar comandos para Windows y Android.
- Evitar decisiones irreversibles hasta recuperar código/base de datos.
- Mantener el producto fácil de usar para apicultores no técnicos.
- **No inventar credenciales ni valores secretos.** Crear `.env.example` y registrar claramente variables faltantes.

---

## 12. Preguntas pendientes que Claude debe resolver en el proyecto, no suponer

1. ¿Dónde está el código fuente más reciente de V0.3.1 y existe repositorio con historial?
2. ¿En qué cuenta/org está el Supabase `kcqnnlzmhzkrwwlgxlmu`? ¿Se recuperan proyecto y migraciones?
3. ¿Qué pantallas son datos demo y cuáles escriben en Supabase?
4. ¿Hay SQLite Android real y mecanismo de outbox probado, o solo esqueletos?
5. ¿El QR almacena un ID opaco y requiere permisos para abrir el recurso?
6. ¿Cómo se hará voz a texto gratuitamente o con costos sustentables? ¿Qué parte funciona sin conexión?
7. ¿Cuál es el conjunto mínimo aprobado de campos de revisión y reglas de validación apícola?
8. ¿Qué hacer ante conflicto de cambios entre dispositivos?
9. ¿Google Sheets será un exportador opcional, una sincronización recurrente o se descartará para V1?
10. ¿Las fotografías se incluyen en el primer piloto o tras validar el flujo principal?
11. ¿Cómo se publicarán actualizaciones APK y cómo migrará la base local sin pérdida?
12. ¿Qué pruebas de campo hará Finca Landak y con cuántas colmenas piloto?

---

## 13. Prompt inicial listo para pegar en Claude

> Actúa como **arquitecto de software, ingeniero senior full-stack y diseñador UX móvil**, especializado en aplicaciones Android offline-first, React/TypeScript, Capacitor, SQLite, Supabase, QR y workflows de voz.  
> Estoy retomando **Landak Apiario**, una app gratuita y multiapicultor para gestión de fincas, apiarios y colmenas. Adjunto el overview maestro y te proporcionaré el código más reciente (V0.3.1) y los recursos que consiga recuperar.  
> **Primera tarea: audita, no reescribas.** Identifica qué existe y funciona realmente, qué es demo, qué está incompleto y qué no se puede verificar. Comprueba dependencias, compilación, flujo de alta, Supabase/RLS, SQLite/outbox, QR, historial, voz y APK.  
> Devuélveme: (1) mapa de arquitectura real, (2) matriz implementado/pendiente con evidencia, (3) errores bloqueantes y de seguridad priorizados, (4) plan de trabajo en hitos cortos, (5) primera corrección concreta con archivos y pruebas.  
> Respeta las decisiones de producto: gratis, Android primero, múltiples propietarios y fincas, datos aislados por organización, escanear QR → dictar/editar revisión → guardar offline → sincronizar, sin pérdida ni duplicación. No asumas que el proyecto Supabase anterior sigue accesible y no hagas afirmaciones de funcionalidad sin prueba. Antes de sustituir tecnología, explícame razones, migración y costo.

---

### Origen y límites de este documento

Consolidado a partir de decisiones y avances conversados entre el 20 y 21 de septiembre de 2026, la revisión de accesos Supabase realizada el 21 de octubre de 2026 y el Manual de Marca de Finca Landak 2025. No sustituye una auditoría del código ni una consulta al apicultor para validar criterios zootécnicos. Todo lo marcado como **propuesto, futuro, sugerido o pendiente** debe entenderse como alcance a discutir, no implementación confirmada.

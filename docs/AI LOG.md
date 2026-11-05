# Bitácora de uso de IA

**Proyecto:** UberClone — Versión Conductor
**Integrante:** Juan Banquet (proyecto individual)
**Herramienta usada:** Claude (claude.ai)

Esta bitácora registra todo uso de herramientas de inteligencia artificial en el proyecto, según el instructivo de la sección 8 del taller. Los prompts se copian tal como se escribieron. Los bloques de código asistidos están marcados con el comentario `// AI-assisted: see docs/AI_LOG.md #N`.

---

### Entrada #1
- Fecha: 2026-11-03
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai) — https://claude.ai/share/09548f7e-96e1-4d05-89f5-d6923d596a4e
- Objetivo: Planear el desarrollo del taller por fases y crear la función de cálculo de tarifa.
- Prompt: "Necesito que me instrullas para realizar este taller y me des recomendaciones de por donde empiezo" (con el PDF del taller adjunto)
- Resumen de la respuesta: Plan de trabajo en fases (preparación, esqueleto de navegación, tarifas, registro, ubicación, solicitudes, viaje, pagos, ganancias e historial, cierre), librerías alternativas compatibles con Expo Go y la función pura `calculateFare` con sus parámetros centralizados en `pricing.js`.
- Qué se usó / modificó / descartó: Se usaron el plan por fases, `pricing.js` y `calculateFare.js`. 
- Archivos y commit: `src/config/pricing.js`, `src/utils/calculateFare.js`
- Verificación: Prueba con el ejemplo de la sección 5 (8,5 km y 22 min): Económico 19.200 / 3.840 / 15.360 COP y XL 26.900 / 5.380 / 21.520 COP.
- Aprendizaje: La tarifa se redondea a 100 antes de calcular la comisión, y cada viaje guarda el `commissionRate` aplicado para que un cambio de porcentaje no altere el historial. 
---

### Entrada #2
- Fecha: 2026-11-03
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai) — https://claude.ai/share/09548f7e-96e1-4d05-89f5-d6923d596a4e
- Objetivo: Crear el esqueleto de navegación (Stack, Tabs y Drawer) y el contexto de sesión del conductor.
- Prompt: "vale, ahora como le hago para empezar con lo que sigue? que me recomendas hacer? y que metodos utilizar?"
- Resumen de la respuesta: Instalación de React Navigation, pantalla comodín `Placeholder`, `DriverContext` con el hook `useDriver`, los navegadores `TripStack`, `DrawerNavigator` y `RegistrationTabs`, y un `RootNavigator` con navegación condicional según el estado del conductor.
- Archivos y commit: `App.js`, `src/context/DriverContext.js`, `src/navigation/RootNavigator.js`, `src/navigation/TripStack.js`, `src/navigation/DrawerNavigator.js`, `src/navigation/RegistrationTabs.js`, `src/screens/Placeholder.js` 
- Verificación: Recorrido en Expo Go: registro → pendiente → menú lateral → cada sección → cerrar sesión regresa al registro. [COMPLETAR: confirma]
- Aprendizaje: Con navegación condicional no se navega entre grupos de pantallas; el navegador raíz cambia solo cuando cambia el estado. El `useMemo` en el valor del Provider evita renders innecesarios.

---

### Entrada #3
- Fecha: 2026-11-03
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai)
- Objetivo: Pestaña 1 del registro (Datos personales): estado compartido, validadores y componentes de formulario.
- Prompt: "necesito tener listo de momento la pestaña 1 y 2 de este taller de UberClone, ayudame a realizarlo" (con el PDF del taller adjunto)
- Resumen de la respuesta: `RegistrationContext` con estado compartido y errores derivados con `useMemo`, validadores puros, componentes reutilizables (`TextField`, `SelectField` con Modal, `DateField`, `PhotoField`, `PrimaryButton`, `FormScreen`) y pestañas con ícono de check al ser válidas.
- Archivos y commit: `src/context/RegistrationContext.js`, `src/utils/registrationValidators.js`, `src/config/registrationOptions.js`, `src/screens/registration/PersonalDataScreen.js`, `src/components/FormScreen.js`, `src/components/PrimaryButton.js`, `src/components/form/*` 

---

### Entrada #4
- Fecha: 2026-11-03
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai) — https://claude.ai/share/09548f7e-96e1-4d05-89f5-d6923d596a4e
- Objetivo: Corregir que no se podía seleccionar la fecha de nacimiento en el iPhone.
- Prompt (dos mensajes): "listo mano, pero mira que tengo un problema ni el hpta hace rato y no he podido revisate ahi a ver como puedo solucionarlo, no me deja seleccionar la fecha de nacimiento de el apartado datos personales" y luego "revisame esa chimbada yo veo que  es, seguro debe ser una pendejada, y ojala y des con el error porque estoy harto ya" (con el .zip del proyecto adjunto)
- Resumen de la respuesta: La lógica de la fecha estaba bien; el selector sí se abría pero quedaba oculto. El teclado `phone-pad` del iPhone no tiene tecla para cerrarse, `keyboardShouldPersistTaps="handled"` lo dejaba abierto y la rueda se dibujaba en línea debajo del campo. Solución: `Keyboard.dismiss()` al abrir y la rueda dentro de un `Modal` en iOS.
- Qué se usó / modificó / descartó: Se usó la solución completa.
- Archivos y commit: `src/components/form/DateField.js` 
- Verificación: Probado en iPhone con Expo Go: después del cambio la rueda aparece encima de todo y la fecha se guarda en el campo.
- Aprendizaje: El fallo no estaba en la lógica sino en dónde se dibujaba el componente; hay que revisar también el teclado y el área visible, no solo el código del campo. 
---

### Entrada #5
- Fecha: 2026-11-04
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai) — https://claude.ai/share/09548f7e-96e1-4d05-89f5-d6923d596a4e
- Objetivo: Validaciones de la pestaña 2 (Vehículo) y actualización del error de capacidad al cambiar la categoría.
- Prompt: "ya dormi un visaje, ya estoy mas calmado bro, pille le explico la situacion porque ando contra el tiempo, Sigo con mi app de Expo SDK 58 (React Navigation, pruebo en Expo Go en iPhone). Ya tengo la pestaña 1 del registro con un RegistrationContext que comparte el estado de las 3 pestañas, validadores puros en utils/registrationValidators.js y componentes TextField, SelectField y PhotoField. Ahora voy con la pestaña 2, Vehículo: categoría (Económico, XL, Premium, las mismas de `PRICING.multipliers`), placa colombiana ABC123 en mayúsculas, marca y modelo de máximo 30 caracteres, año de 4 dígitos no mayor al actual, color en lista desplegable, capacidad numérica (XL exige mínimo 6) y foto del vehículo donde se vea la placa. ¿Cómo hago `validateVehicle`, y cómo hago que el error de capacidad se actualice si el conductor cambia la categoría después? ¿Qué año mínimo me recomiendas y qué colores pongo en la lista?"
- Resumen de la respuesta: `validateVehicle` con mínimos de capacidad por categoría en configuración y categorías generadas desde `PRICING.multipliers`. El error de capacidad se recalcula solo porque los errores se derivan con `useMemo` del objeto completo del vehículo. Año mínimo 2001 según el requisito de Uber Colombia y lista de 13 colores.
- Archivos y commit: `src/config/registrationOptions.js`, `src/utils/registrationValidators.js`, `src/context/RegistrationContext.js`, `src/navigation/RegistrationTabs.js`, `src/screens/registration/VehicleScreen.js`, `src/components/FormScreen.js`
- Aprendizaje: Un valor que depende de otros se deriva, no se guarda en otro estado con `useEffect`, porque tendría dos fuentes de verdad y llegaría un render tarde.
---

### Entrada #6
- Fecha: 2026-11-04
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai) — https://claude.ai/share/09548f7e-96e1-4d05-89f5-d6923d596a4e
- Objetivo: Pestaña 3 del registro (Documentos y pagos) y habilitación del botón "Enviar registro".
- Prompt:
  > Sigo con la app de Expo SDK 58 (React Navigation, Expo Go en iPhone). Ya tengo las pestañas 1 y 2 del registro con un RegistrationContext que comparte el estado, validadores puros en utils/registrationValidators.js (validatePersonal y validateVehicle) y los componentes TextField, SelectField, DateField (con Modal en iPhone) y PhotoField. Ahora voy con la pestaña 3, Documentos y pagos:
  >
  > * Licencia de conducción: número, foto y fecha de vencimiento posterior a hoy.
  > * SOAT: foto y fecha de vencimiento posterior a hoy.
  > * Revisión técnico-mecánica: foto y fecha de vencimiento, si aplica según el año del vehículo de la pestaña 2.
  > * Correo de la cuenta de Mercado Pago, con validación de formato.
  > * Checkbox obligatorio de términos con el porcentaje de comisión visible (está en `PRICING.commissionRate = 0.2`).
  >
  > El botón “Enviar registro” solo se habilita cuando las 3 pestañas son válidas, y por ahora al enviar solo hago `setDriver({ status: 'pending' })`.
  > ¿Cómo hago `validateDocuments`? ¿Cómo comparo la fecha de vencimiento contra hoy sin que me afecte la hora? ¿Cuál es la regla en Colombia para saber si un carro particular necesita revisión técnico-mecánica según su año? ¿Cómo valido el número de la licencia? ¿Cómo hago el checkbox? ¿Y cómo le muestro al conductor qué pestaña le falta si el botón está deshabilitado?
- Resumen de la respuesta: `validateDocuments` que compara fechas solo por día (formato AAAAMMDD), revisión técnico-mecánica condicional según la Ley 2294 de 2023 (5 años) y el Decreto 019 de 2012 (6 años), aproximada con el año del modelo, y número de licencia igual al documento de identidad. Además, un `CheckboxField` propio y una lista de pestañas pendientes tocable encima del botón.
- Archivos y commit: `src/config/registrationOptions.js`, `src/utils/registrationValidators.js`, `src/context/RegistrationContext.js`, `src/components/form/CheckboxField.js`, `src/screens/registration/DocumentsScreen.js`, `src/navigation/RegistrationTabs.js` 
---

### Entrada #7
- Fecha: 2026-11-05
- Integrante: Juan Banquet
- Herramienta: Claude (claude.ai) — https://claude.ai/share/09548f7e-96e1-4d05-89f5-d6923d596a4e
- Objetivo: Redactar esta bitácora a partir de las conversaciones registradas.
- Prompt: "Ok, realiza porfavor la declaración de IA_LOG.md para subirlo a mi proyecto"
- Resumen de la respuesta: Borrador de la bitácora con las entradas #1 a #7, los prompts copiados textualmente y campos marcados para completar con los datos que solo conoce el integrante (commits, verificaciones y cambios propios).
- Archivos y commit: `docs/AI_LOG.md`
- Verificación: Revisión manual de cada entrada contra las conversaciones y el código del repositorio.
- Aprendizaje: 

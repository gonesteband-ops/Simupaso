# Contrato de runtime SCORM 1.2

## Descubrimiento e inicio

- El player busca `API` en la ventana contenedora y, si corresponde, en `opener`, dentro
  de los límites de la integración SCORM 1.2.
- Si no hay API accesible, inicia en modo autónomo, sin error visible de LMS.
- Cuando hay API, llama `LMSInitialize("")` una sola vez y establece
  `cmi.core.lesson_status = "incomplete"` al iniciar.

## Progreso y cierre

- Al comenzar cada paso y al cambiar de paso, `cmi.core.lesson_location` recibe el id
  del paso activo; luego se hace `LMSCommit("")`.
- Al completar todos los pasos, se establece `cmi.core.lesson_status = "completed"`,
  se informa `cmi.core.session_time` en formato de duración SCORM 1.2 y se hace commit.
- En cierre normal, llamar `LMSFinish("")` como máximo una vez.
- Los errores de API se consultan con `LMSGetLastError` y no se convierten en éxito
  simulado; en modo autónomo estas llamadas no se realizan.
- Los valores escritos por el alumno, incluidos valores aceptados, nunca forman parte
  de `lesson_location`, `session_time`, logs, interacciones, `suspend_data` o cualquier
  otra comunicación con el LMS.

## API simulada

Las pruebas usan un objeto local de API SCORM que registra llamadas y valores. Deben
verificar orden de inicialización, transiciones de estado, ubicación, tiempo, commit y
finish. La prueba simulada no sustituye la importación manual en la plataforma real
seleccionada.
